import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeJobRecord, createContentFingerprint, normalizeApplicationUrl } from '../ingestion/canonicalize.js';
import { upsertCanonicalJobs } from '../ingestion/upsertCanonicalJobs.js';

test('normalizes application URLs by removing tracking and fragments', () => {
  assert.equal(
    normalizeApplicationUrl('https://jobs.example.com/apply/?utm_source=simplify&gh_src=abc&job=1#section'),
    'https://jobs.example.com/apply?job=1'
  );
});

test('unwraps safe redirect URL parameters without external requests', () => {
  const record = canonicalizeJobRecord({
    company: 'Acme',
    title: 'Software Engineer',
    sourcePostedDate: '2026-08-09T04:00:00.000Z',
    applicationUrl: 'https://simplify.jobs/redirect?url=https%3A%2F%2Fcareers.example.com%2Facme%2Fsoftware%3Futm_medium%3Djob',
  });

  assert.equal(record.canonicalUrl, 'https://careers.example.com/acme/software');
});

test('removes PostgreSQL-invalid NUL characters from nested source data', () => {
  const record = canonicalizeJobRecord({
    company: 'Acme',
    title: 'ML Intern',
    description: 'Build\u0000 models',
    applicationUrl: 'https://example.com/apply',
    rawSourceRecord: { qualifications: 'Python\u0000 and SQL', tags: ['ML\u0000AI'] },
  });

  assert.equal(record.description, 'Build models');
  assert.deepEqual(record.rawSourceRecord, { qualifications: 'Python and SQL', tags: ['MLAI'] });
  assert.equal(JSON.stringify(record).includes('\\u0000'), false);
});

test('creates content fingerprint without location', () => {
  const first = createContentFingerprint({
    company: 'Acme Labs',
    title: 'Software Engineer I',
    location: 'New York, NY',
    sourcePostedDate: '2026-08-09T04:00:00.000Z',
  });
  const second = createContentFingerprint({
    company: 'Acme Labs',
    title: 'Software Engineer I',
    location: 'Remote',
    sourcePostedDate: '2026-08-09T04:00:00.000Z',
  });

  assert.equal(first, second);
  assert.equal(first, 'acme-labs:software-engineer-i:2026-08-09');
});

test('canonical upsert preserves both source links for cross-provider duplicates', async () => {
  const service = createMemoryService();
  const cycleStartedAt = '2026-08-09T12:00:00.000Z';
  const first = jobRecord({
    provider: 'jobright',
    sourceId: 'jobright-source',
    sourceExternalId: 'jr-1',
    applicationUrl: 'https://jobs.example.com/acme/software?utm_source=jobright#apply',
    location: 'New York, NY',
  });
  const second = jobRecord({
    provider: 'simplify',
    sourceId: 'simplify-source',
    sourceExternalId: 'simp-1',
    applicationUrl: 'https://jobs.example.com/acme/software?ref=simplify',
    location: 'Remote',
  });

  const firstResult = await upsertCanonicalJobs(service, [first], { cycleStartedAt });
  const secondResult = await upsertCanonicalJobs(service, [second], { cycleStartedAt: '2026-08-09T13:00:00.000Z' });

  assert.equal(firstResult.inserted, 1);
  assert.equal(secondResult.inserted, 0);
  assert.equal(secondResult.updated, 1);
  assert.equal(secondResult.duplicate, 1);
  assert.equal(service.tables.job_board_jobs.length, 1);
  assert.equal(service.tables.job_board_source_links.length, 2);
  assert.deepEqual(service.tables.job_board_source_links.map((link) => link.provider).sort(), ['jobright', 'simplify']);
  assert.equal(service.tables.job_board_jobs[0].last_seen_at, '2026-08-09T13:00:00.000Z');
});

test('canonical upsert recovers when another source inserts the same URL concurrently', async () => {
  const service = createMemoryService();
  const originalFrom = service.from.bind(service);
  let conflicts = 0;
  service.from = (table) => {
    const query = originalFrom(table);
    if (table !== 'job_board_jobs') return query;
    const originalUpsert = query.upsert;
    query.upsert = (payload, options) => {
      if (conflicts++ < 2) {
        if (conflicts === 1) {
          service.tables.job_board_jobs.push({
            id: 'concurrent-job',
            source: 'intern_list',
            external_id: 'concurrent-external',
            canonical_url: 'https://jobs.example.com/acme/software',
            posted_at: '2026-08-09T04:00:00.000Z',
            source_payload: {},
          });
        }
        return { select: () => Promise.resolve({
          data: null,
          error: { code: '23505', message: 'duplicate key violates unique constraint "job_board_jobs_canonical_url_unique_idx"' },
        }) };
      }
      return originalUpsert(payload, options);
    };
    return query;
  };

  const result = await upsertCanonicalJobs(service, [jobRecord()], {
    cycleStartedAt: '2026-08-09T12:00:00.000Z',
  });

  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 1);
  assert.equal(result.duplicate, 1);
  assert.equal(service.tables.job_board_jobs.length, 1);
  assert.equal(service.tables.job_board_source_links[0].job_id, 'concurrent-job');
});

test('canonical upsert merges general and H1B Jobright records and reopens archived jobs', async () => {
  const service = createMemoryService({
    job_board_jobs: [{
      id: 'existing-job',
      external_id: 'jobright-123',
      source: 'jobright',
      company: 'Acme Labs',
      title: 'Software Engineer',
      location: 'New York, NY',
      workplace_type: 'onsite',
      employment_type: 'full_time',
      career_category: 'software_engineering',
      status: 'archived',
      inactive_at: '2026-09-13T12:00:00.000Z',
      canonical_url: 'https://jobright.ai/jobs/info/jobright-123',
      content_fingerprint: 'acme-labs:software-engineer:2026-09-14',
      visa_sponsorship_status: 'unknown',
      visa_sponsorship_confidence: 'unknown',
      source_payload: {},
    }],
    job_board_source_links: [{
      id: 'general-link',
      job_id: 'existing-job',
      source_id: 'general-source',
      source_external_id: 'jobright-123',
      provider: 'jobright',
      first_seen_at: '2026-09-13T12:00:00.000Z',
    }],
  });

  const result = await upsertCanonicalJobs(service, [jobRecord({
    provider: 'jobright_h1b',
    sourceId: 'h1b-source',
    sourceExternalId: 'jobright-123',
    title: 'Software Engineer',
    applicationUrl: 'https://jobright.ai/jobs/info/jobright-123?utm_source=1008',
    sourcePostedDate: '2026-09-14T04:00:00.000Z',
    visaSponsorshipStatus: 'explicit_h1b_sponsor',
    visaSponsorshipConfidence: 'explicit',
    visaSponsorshipNotes: 'H1B sponsorship is explicitly mentioned in the job description.',
  })], { cycleStartedAt: '2026-09-14T12:00:00.000Z' });

  assert.equal(result.inserted, 0);
  assert.equal(result.duplicate, 1);
  assert.equal(service.tables.job_board_jobs.length, 1);
  assert.equal(service.tables.job_board_jobs[0].status, 'open');
  assert.equal(service.tables.job_board_jobs[0].inactive_at, null);
  assert.equal(service.tables.job_board_jobs[0].visa_sponsorship_status, 'explicit_h1b_sponsor');
  assert.equal(service.tables.job_board_source_links.length, 2);
  assert.deepEqual(
    service.tables.job_board_source_links.map((link) => link.provider).sort(),
    ['jobright', 'jobright_h1b'],
  );
});

test('canonical upsert is idempotent for repeated source cycles', async () => {
  const service = createMemoryService();
  const firstResult = await upsertCanonicalJobs(service, [jobRecord()], {
    cycleStartedAt: '2026-08-09T12:00:00.000Z',
  });
  const secondResult = await upsertCanonicalJobs(service, [jobRecord()], {
    cycleStartedAt: '2026-08-09T14:00:00.000Z',
  });

  assert.equal(firstResult.inserted, 1);
  assert.equal(secondResult.inserted, 0);
  assert.equal(secondResult.updated, 1);
  assert.equal(service.tables.job_board_jobs.length, 1);
  assert.equal(service.tables.job_board_source_links.length, 1);
  assert.equal(service.tables.job_board_source_links[0].first_seen_at, '2026-08-09T12:00:00.000Z');
  assert.equal(service.tables.job_board_source_links[0].last_seen_at, '2026-08-09T14:00:00.000Z');
});

test('bulk upsert preserves generated IDs when existing and new rows share a batch', async () => {
  const service = createMemoryService();
  await upsertCanonicalJobs(service, [jobRecord()], { cycleStartedAt: '2026-08-09T12:00:00.000Z' });

  const result = await upsertCanonicalJobs(service, [
    jobRecord(),
    jobRecord({
      sourceExternalId: 'external-2',
      title: 'Software Engineer II',
      applicationUrl: 'https://jobs.example.com/acme/software-2',
    }),
  ], { cycleStartedAt: '2026-08-09T14:00:00.000Z' });

  assert.equal(result.updated, 1);
  assert.equal(result.inserted, 1);
  assert.equal(service.tables.job_board_jobs.length, 2);
  assert.equal(service.tables.job_board_source_links.length, 2);
});

test('canonical upsert replaces stale markdown titles with clean source titles', async () => {
  const service = createMemoryService({
    job_board_jobs: [{
      id: 'existing-job',
      external_id: 'external-1',
      source: 'github',
      company: 'Acme Labs',
      title: String.raw`[**[Software Engineer\]\(https://jobright.ai/jobs/info/abc)**](https://jobright.ai/jobs/info/abc)`,
      location: 'Remote',
      workplace_type: 'remote',
      employment_type: 'internship',
      career_category: 'software_engineering',
      status: 'open',
      canonical_url: 'https://jobright.ai/jobs/info/abc',
      content_fingerprint: 'acme-labs:software-engineer:2026-08-09',
      source_payload: {},
    }],
    job_board_source_links: [{
      id: 'existing-link',
      job_id: 'existing-job',
      source_id: 'source-a',
      source_external_id: 'external-1',
      provider: 'jobright',
      first_seen_at: '2026-08-09T12:00:00.000Z',
    }],
  });

  await upsertCanonicalJobs(service, [jobRecord({
    title: 'Software Engineer',
    applicationUrl: 'https://jobright.ai/jobs/info/abc',
  })], { cycleStartedAt: '2026-08-09T14:00:00.000Z' });

  assert.equal(service.tables.job_board_jobs[0].title, 'Software Engineer');
});

test('canonical upsert keeps different dates as separate jobs and ignores location variation', async () => {
  const service = createMemoryService();
  await upsertCanonicalJobs(service, [
    jobRecord({
      sourceId: 'source-a',
      sourceExternalId: 'source-a-1',
      applicationUrl: 'https://jobs.example.com/acme/software-a',
      location: 'New York, NY',
    }),
    jobRecord({
      sourceId: 'source-b',
      sourceExternalId: 'source-b-1',
      applicationUrl: 'https://jobs.example.com/acme/software-b',
      location: 'Remote',
    }),
    jobRecord({
      sourceId: 'source-c',
      sourceExternalId: 'source-c-1',
      applicationUrl: 'https://jobs.example.com/acme/software-c',
      sourcePostedDate: '2026-08-08T04:00:00.000Z',
      location: 'Remote',
    }),
  ], { cycleStartedAt: '2026-08-09T12:00:00.000Z' });

  assert.equal(service.tables.job_board_jobs.length, 2);
  assert.equal(service.tables.job_board_source_links.length, 3);
});

test('canonical upsert batches repeated source records with few table operations', async () => {
  const service = createMemoryService();
  const records = Array.from({ length: 25 }, (_, index) => jobRecord({
    sourceExternalId: `external-${index}`,
    applicationUrl: `https://jobs.example.com/acme/software-${index}`,
    title: `Software Engineer ${index}`,
  }));

  const result = await upsertCanonicalJobs(service, records, {
    cycleStartedAt: '2026-08-09T12:00:00.000Z',
  });

  assert.equal(result.inserted, 25);
  assert.equal(result.updated, 0);
  assert.equal(service.tables.job_board_jobs.length, 25);
  assert.equal(service.tables.job_board_source_links.length, 25);
  assert.ok(service.calls.length <= 8, `expected batched calls, saw ${service.calls.length}`);
});

test('canonical lookups keep long values below the gateway header limit', async () => {
  const service = createMemoryService();
  const records = Array.from({ length: 120 }, (_, index) => jobRecord({
    sourceExternalId: `external-${index}`,
    applicationUrl: `https://jobs.example.com/acme/software-${index}`,
    title: `Software Engineer ${index} ${'specialized-platform-'.repeat(10)}`,
  }));

  await upsertCanonicalJobs(service, records, { cycleStartedAt: '2026-08-09T12:00:00.000Z' });

  const lookupFilters = service.calls.flatMap((call) => call.filters.filter((filter) => filter.type === 'in'));
  assert.ok(lookupFilters.length > 3);
  assert.ok(lookupFilters.every((filter) => filter.values.length <= 50));
});

function jobRecord(overrides = {}) {
  return {
    provider: 'jobright',
    sourceId: 'source-a',
    sourceName: 'Source A',
    sourceRepository: 'owner/repo',
    repository: 'owner/repo',
    sourceExternalId: 'external-1',
    company: 'Acme Labs',
    title: 'Software Engineer I',
    location: 'New York, NY',
    locations: ['New York, NY'],
    applicationUrl: 'https://jobs.example.com/acme/software',
    sourceUrl: 'https://github.com/owner/repo',
    careerCategory: 'software_engineering',
    employmentType: 'new_grad',
    sourcePostedDate: '2026-08-09T04:00:00.000Z',
    sourceDateRaw: 'Today',
    firstSeenAt: '2026-08-09T12:00:00.000Z',
    isClosed: false,
    status: 'open',
    rawSourceRecord: { company: 'Acme Labs' },
    rejected: false,
    rejectionReasons: [],
    ...overrides,
  };
}

function createMemoryService(initialTables = {}) {
  const tables = {
    job_board_jobs: [],
    job_board_source_links: [],
    ...initialTables,
  };

  return {
    tables,
    calls: [],
    from(table) {
      return createQuery(tables, table, this.calls);
    },
  };
}

function createQuery(tables, table, calls) {
  const state = {
    filters: [],
    operation: 'select',
    payload: null,
    limitCount: null,
    upsertOptions: null,
  };

  const query = {
    select() {
      return query;
    },
    eq(column, value) {
      state.filters.push({ column, value, type: 'eq' });
      return query;
    },
    in(column, values) {
      state.filters.push({ column, values, type: 'in' });
      return query;
    },
    limit(count) {
      state.limitCount = count;
      return query;
    },
    insert(payload) {
      state.operation = 'insert';
      state.payload = payload;
      return query;
    },
    update(payload) {
      state.operation = 'update';
      state.payload = payload;
      return query;
    },
    upsert(payload, options) {
      state.operation = 'upsert';
      state.payload = payload;
      state.upsertOptions = options;
      return query;
    },
    maybeSingle() {
      return execute(true);
    },
    single() {
      return execute(false);
    },
    then(resolve, reject) {
      return execute(false, true).then(resolve, reject);
    },
  };

  function execute(maybe = false, arrayResult = false) {
    if (!tables[table]) tables[table] = [];
    calls.push({ table, operation: state.operation, filters: state.filters });
    if (state.operation === 'insert') {
      const payload = Array.isArray(state.payload) ? state.payload : [state.payload];
      const start = tables[table].length;
      const inserted = payload.map((row, index) => ({
        ...row,
        id: row.id || `${table}-${start + index + 1}`,
      }));
      tables[table].push(...inserted);
      return Promise.resolve({ data: arrayResult ? inserted : inserted[0], error: null });
    }
    if (state.operation === 'upsert') {
      const payload = Array.isArray(state.payload) ? state.payload : [state.payload];
      if (payload.some((row) => row.id) && payload.some((row) => !row.id) && state.upsertOptions?.defaultToNull !== false) {
        return Promise.resolve({ data: null, error: new Error('Missing ID was sent as null') });
      }
      const rows = payload.map((row) => {
        const existing = findUpsertTarget(tables[table], table, row);
        if (existing) {
          Object.assign(existing, row);
          return existing;
        }
        const inserted = { ...row, id: row.id || `${table}-${tables[table].length + 1}` };
        tables[table].push(inserted);
        return inserted;
      });
      return Promise.resolve({ data: arrayResult ? rows : rows[0], error: null });
    }
    if (state.operation === 'update') {
      const matches = matchingRows();
      matches.forEach((row) => Object.assign(row, state.payload));
      return Promise.resolve({ data: arrayResult ? matches : matches[0] || null, error: null });
    }

    const rows = matchingRows();
    const limited = state.limitCount ? rows.slice(0, state.limitCount) : rows;
    if (arrayResult) return Promise.resolve({ data: limited, error: null });
    if (limited.length === 0 && maybe) return Promise.resolve({ data: null, error: null });
    return Promise.resolve({ data: limited[0] || null, error: null });
  }

  function matchingRows() {
    return tables[table].filter((row) => (
      state.filters.every((filter) => {
        if (filter.type === 'in') return filter.values.includes(row[filter.column]);
        return row[filter.column] === filter.value;
      })
    ));
  }

  return query;
}

function findUpsertTarget(rows, table, row) {
  if (row.id) {
    const match = rows.find((existing) => existing.id === row.id);
    if (match) return match;
  }
  if (table === 'job_board_source_links') {
    return rows.find((existing) => (
      existing.source_id === row.source_id
      && existing.source_external_id === row.source_external_id
    ));
  }
  return null;
}
