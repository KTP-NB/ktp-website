import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractApplicationId, extractSharedViewDataPath } from '../ingestion/internList/fetchAirtableView.js';
import { parseInternListAirtablePayload } from '../ingestion/internList/parseAirtableView.js';
import { parseNewGradAirtablePayload } from '../ingestion/internList/parseNewGradView.js';
import { runInternListIngestion } from '../ingestion/internList/runInternListIngestion.js';

test('extracts Airtable shared-view fetch metadata from public embed HTML', () => {
  const html = `
    <script>
      var headers = {"x-airtable-application-id":"appExample"};
      window.__stashedPrefetch = { urlWithParams: "\\u002Fv0.3\\u002Fview\\u002FviwExample\\u002FreadSharedViewData?accessPolicy=signed" };
    </script>
  `;

  assert.equal(extractApplicationId(html), 'appExample');
  assert.equal(extractSharedViewDataPath(html), '/v0.3/view/viwExample/readSharedViewData?accessPolicy=signed');
});

test('parses Intern List Airtable rows into canonical source records', () => {
  const records = parseInternListAirtablePayload(airtablePayload(), sourceRow(), {
    cycleStartedAt: '2026-08-25T12:00:00.000Z',
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].provider, 'intern_list');
  assert.equal(records[0].sourceExternalId, '6a8e02e725fc4e7ae3dbf3d7');
  assert.equal(records[0].company, 'Zip');
  assert.equal(records[0].title, 'Software Engineer Intern (Summer 2027)');
  assert.equal(records[0].careerCategory, 'software_engineering');
  assert.equal(records[0].employmentType, 'internship');
  assert.equal(records[0].workplaceType, 'hybrid');
  assert.equal(records[0].sourcePostedDate, '2026-08-25T04:00:00.000Z');
  assert.equal(records[0].applicationUrl, 'https://jobright.ai/jobs/info/6a8e02e725fc4e7ae3dbf3d7?utm_source=1099&utm_campaign=Software%20Engineer');
  assert.match(records[0].description, /Computer Science/);
});

test('Intern List ingestion runs one enabled source and upserts jobs', async () => {
  const service = createMemoryService({
    job_board_sources: [sourceRow()],
  });

  const summary = await runInternListIngestion({
    service,
    cycleStartedAt: '2026-08-25T12:00:00.000Z',
    fetcher: async (url) => {
      if (String(url).includes('/embed/')) return response(embedHtml());
      return response(airtablePayload(), { json: true });
    },
  });

  assert.equal(summary.sources, 1);
  assert.equal(summary.fetched, 1);
  assert.equal(summary.inserted, 1);
  assert.equal(summary.failed, 0);
  assert.equal(service.tables.job_board_jobs.length, 1);
  assert.equal(service.tables.job_board_jobs[0].source, 'intern_list');
  assert.equal(service.tables.job_board_jobs[0].employment_type, 'internship');
  assert.equal(service.tables.job_board_jobs[0].career_category, 'software_engineering');
  assert.equal(service.tables.job_board_source_links[0].provider, 'intern_list');
});

test('NewGrad parser admits only flagged US non-intern roles', () => {
  const payload = newGradPayload();
  const records = parseNewGradAirtablePayload(payload, newGradSourceRow(), {
    cycleStartedAt: '2026-09-29T12:00:00.000Z',
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].provider, 'new_grad_jobs');
  assert.equal(records[0].employmentType, 'new_grad');
  assert.equal(records[0].sourcePostedDate, '2026-09-28T04:00:00.000Z');
});

test('NewGrad source runs through the Airtable pipeline and upserts jobs', async () => {
  const service = createMemoryService({ job_board_sources: [newGradSourceRow()] });
  const summary = await runInternListIngestion({
    service,
    provider: 'new_grad_jobs',
    cycleStartedAt: '2026-09-29T12:00:00.000Z',
    fetcher: async (url) => String(url).includes('/embed/')
      ? response(embedHtml())
      : response(newGradPayload(), { json: true }),
  });
  assert.equal(summary.sources, 1);
  assert.equal(summary.fetched, 1);
  assert.equal(summary.inserted, 1);
  assert.equal(summary.failed, 0);
  assert.equal(service.tables.job_board_jobs[0].source, 'new_grad_jobs');
  assert.equal(service.tables.job_board_jobs[0].employment_type, 'new_grad');
  assert.equal(service.tables.job_board_source_links[0].provider, 'new_grad_jobs');
});

test('Intern List ingestion preserves older jobs when a source snapshot is unexpectedly small', async () => {
  const service = createMemoryService({
    job_board_sources: [sourceRow()],
    job_board_ingestion_runs: [{
      id: 'prior-run',
      source_id: 'intern-list-swe',
      status: 'completed',
      fetched_count: 300,
      created_at: '2026-08-24T12:00:00.000Z',
    }],
    job_board_source_links: [{
      id: 'older-link',
      source_id: 'intern-list-swe',
      source_external_id: 'older-job',
      last_seen_at: '2026-08-20T12:00:00.000Z',
    }],
  });

  const summary = await runInternListIngestion({
    service,
    cycleStartedAt: '2026-08-25T12:00:00.000Z',
    fetcher: async (url) => (
      String(url).includes('/embed/') ? response(embedHtml()) : response(airtablePayload(), { json: true })
    ),
  });

  assert.equal(summary.failed, 0);
  assert.equal(summary.partialInventories, 1);
  assert.equal(summary.staleArchived, 0);
  assert.equal(service.tables.job_board_source_links[0].last_seen_at, '2026-08-25T12:00:00.000Z');
  assert.deepEqual(service.tables.job_board_ingestion_runs[1].errors[0], {
    code: 'partial_source_snapshot',
    fetched: 1,
    baseline: 300,
  });
});

test('Intern List ingestion marks stalled sources failed without hanging the cycle', async () => {
  const service = createMemoryService({
    job_board_sources: [sourceRow()],
  });

  const summary = await runInternListIngestion({
    service,
    cycleStartedAt: '2026-08-25T12:00:00.000Z',
    timeoutMs: 1,
    fetcher: async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }),
  });

  assert.equal(summary.sources, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.runs[0].status, 'failed');
  assert.match(summary.runs[0].error, /timed out/i);
  assert.equal(service.tables.job_board_ingestion_runs[0].status, 'failed');
  assert.equal(service.tables.job_board_ingestion_runs[0].errors[0].code, 'timeout');
});

function embedHtml() {
  return `
    <script>
      var headers = {"x-airtable-application-id":"appExample"};
      window.__stashedPrefetch = { urlWithParams: "\\u002Fv0.3\\u002Fview\\u002FviwExample\\u002FreadSharedViewData?accessPolicy=signed" };
    </script>
  `;
}

function airtablePayload() {
  const columns = [
    column('fldTitle', 'Position Title', 'multilineText'),
    column('fldDate', 'Date', 'multilineText'),
    column('fldApply', 'Apply', 'button'),
    column('fldWork', 'Work Model', 'select', {
      selHybrid: { id: 'selHybrid', name: 'Hybrid' },
    }),
    column('fldLocation', 'Location', 'multilineText'),
    column('fldCompany', 'Company', 'multilineText'),
    column('fldSalary', 'Salary', 'text'),
    column('fldHire', 'Hire Time', 'multilineText'),
    column('fldGrad', 'Graduate Time', 'multilineText'),
    column('fldIndustry', 'Company Industry', 'multiSelect', {
      selAi: { id: 'selAi', name: 'Artificial Intelligence (AI)' },
      selErp: { id: 'selErp', name: 'Enterprise Resource Planning (ERP)' },
    }),
    column('fldSize', 'Company Size', 'select'),
    column('fldQualifications', 'Qualifications', 'multilineText'),
  ];

  return {
    msg: 'SUCCESS',
    data: {
      table: {
        columns,
        rows: [{
          id: 'recZip',
          cellValuesByColumnId: {
            fldTitle: 'Software Engineer Intern (Summer 2027)',
            fldDate: '2026-08-25',
            fldApply: {
              label: 'Apply',
              url: 'https://jobright.ai/jobs/info/6a8e02e725fc4e7ae3dbf3d7?utm_source=1099&utm_campaign=Software%20Engineer',
            },
            fldWork: 'selHybrid',
            fldLocation: 'San Francisco, CA, United States',
            fldCompany: 'Zip',
            fldSalary: '$56-$60 /hr',
            fldHire: '2027-Summer',
            fldGrad: '2027-December / 2028-June',
            fldIndustry: ['selAi', 'selErp'],
            fldSize: '1001-5000',
            fldQualifications: 'Pursuing a BS or MS in Computer Science. Experience with React and GraphQL.',
          },
        }],
      },
    },
  };
}

function newGradPayload() {
  const payload = structuredClone(airtablePayload());
  payload.data.table.columns.push(column('fldNewGrad', 'Is New Grad', 'select', {
    selYes: { id: 'selYes', name: 'yes' },
  }));
  const first = payload.data.table.rows[0];
  first.cellValuesByColumnId.fldTitle = 'Software Engineer New Grad';
  first.cellValuesByColumnId.fldDate = '2026-09-28';
  first.cellValuesByColumnId.fldNewGrad = 'selYes';
  payload.data.table.rows.push(
    { ...structuredClone(first), id: 'recCanada', cellValuesByColumnId: { ...first.cellValuesByColumnId, fldLocation: 'Toronto, ON, Canada' } },
    { ...structuredClone(first), id: 'recUnflagged', cellValuesByColumnId: { ...first.cellValuesByColumnId, fldNewGrad: null } },
    { ...structuredClone(first), id: 'recIntern', cellValuesByColumnId: { ...first.cellValuesByColumnId, fldTitle: 'Software Engineer Intern' } },
    { ...structuredClone(first), id: 'recCoop', cellValuesByColumnId: { ...first.cellValuesByColumnId, fldTitle: 'Software Engineer Co-op' } },
  );
  return payload;
}

function newGradSourceRow() {
  return sourceRow({
    id: 'new-grad-swe',
    provider: 'new_grad_jobs',
    source_name: 'NewGrad Jobs US Software Engineering',
    repository_owner: 'newgrad-jobs',
    employment_type: 'new_grad',
    metadata: {
      country: 'US',
      newGradCategory: 'Software Engineering',
      airtableEmbedUrl: 'https://airtable.com/embed/appExample/shrExample?viewControls=on',
    },
  });
}

function column(id, name, type, choices = null) {
  return {
    id,
    name,
    type,
    typeOptions: choices ? { choices } : null,
  };
}

function sourceRow(overrides = {}) {
  return {
    id: 'intern-list-swe',
    provider: 'intern_list',
    source_name: 'Intern List US Software Engineering Internships',
    repository_owner: 'intern-list',
    repository_name: 'us-swe',
    branch: 'main',
    source_url: 'https://www.intern-list.com/?selectedKey=Software%20Engineering',
    source_type: 'airtable_shared_view',
    source_classification: 'specialized',
    career_category: 'software_engineering',
    employment_type: 'internship',
    enabled: true,
    priority: 10,
    parser_version: 'intern-list-airtable-v1',
    last_attempt_at: null,
    last_success_at: null,
    consecutive_failures: 0,
    last_fetched_etag: null,
    metadata: {
      country: 'US',
      internListCategory: 'Software Engineering',
      airtableEmbedUrl: 'https://airtable.com/embed/appExample/shrExample?viewControls=on',
    },
    created_at: '2026-08-25T00:00:00.000Z',
    updated_at: '2026-08-25T00:00:00.000Z',
    ...overrides,
  };
}

function response(body, options = {}) {
  return {
    ok: true,
    status: 200,
    async text() {
      return String(body);
    },
    async json() {
      return options.json ? body : JSON.parse(body);
    },
  };
}

function createMemoryService(initialTables = {}) {
  const tables = {
    job_board_sources: [],
    job_board_ingestion_runs: [],
    job_board_jobs: [],
    job_board_source_links: [],
    ...initialTables,
  };

  return {
    tables,
    async rpc(name, args) {
      const source = tables.job_board_sources.find((row) => row.id === args.p_source_id);
      if (!source) return { data: false, error: null };
      if (name === 'job_board_acquire_ingestion_lock') {
        const active = source.ingestion_lock_token
          && new Date(source.ingestion_lock_expires_at).getTime() > new Date(args.p_now).getTime();
        if (active && source.ingestion_lock_token !== args.p_lock_token) {
          return { data: false, error: null };
        }
        source.ingestion_lock_token = args.p_lock_token;
        source.ingestion_lock_expires_at = new Date(
          new Date(args.p_now).getTime() + args.p_lease_seconds * 1000,
        ).toISOString();
        return { data: true, error: null };
      }
      if (name === 'job_board_release_ingestion_lock') {
        if (source.ingestion_lock_token !== args.p_lock_token) return { data: false, error: null };
        source.ingestion_lock_token = null;
        source.ingestion_lock_expires_at = null;
        return { data: true, error: null };
      }
      if (name === 'job_board_finalize_source_inventory') {
        const seen = new Set(args.p_seen_external_ids || []);
        const links = tables.job_board_source_links.filter((link) => (
          link.source_id === args.p_source_id
          && (args.p_inventory_unchanged || seen.has(link.source_external_id))
        ));
        links.forEach((link) => {
          link.last_seen_at = args.p_cycle_started_at;
          link.updated_at = args.p_cycle_started_at;
        });
        return {
          data: { refreshed_count: links.length, archived_count: 0 },
          error: null,
        };
      }
      return { data: null, error: new Error(`Unknown RPC: ${name}`) };
    },
    from(table) {
      return createQuery(tables, table);
    },
  };
}

function createQuery(tables, table) {
  const state = {
    filters: [],
    orders: [],
    operation: 'select',
    payload: null,
    limitCount: null,
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
    order(column, options = {}) {
      state.orders.push({ column, ascending: options.ascending !== false });
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
    upsert(payload) {
      state.operation = 'upsert';
      state.payload = payload;
      return query;
    },
    maybeSingle() {
      return execute(true);
    },
    single() {
      return execute(true, true);
    },
    then(resolve) {
      return execute(false).then(resolve);
    },
  };

  async function execute(single = false, requireSingle = false) {
    tables[table] ||= [];
    let rows = tables[table].filter((row) => state.filters.every((filter) => {
      if (filter.type === 'in') return filter.values.includes(row[filter.column]);
      return row[filter.column] === filter.value;
    }));

    if (state.operation === 'insert') {
      const payload = Array.isArray(state.payload) ? state.payload : [state.payload];
      const start = tables[table].length;
      rows = payload.map((row, index) => ({
        id: row.id || `${table}-${start + index + 1}`,
        ...row,
      }));
      tables[table].push(...rows);
    }

    if (state.operation === 'upsert') {
      const payload = Array.isArray(state.payload) ? state.payload : [state.payload];
      rows = payload.map((row) => {
        const existing = findUpsertTarget(tables[table], table, row);
        if (existing) {
          Object.assign(existing, row);
          return existing;
        }
        const inserted = { id: row.id || `${table}-${tables[table].length + 1}`, ...row };
        tables[table].push(inserted);
        return inserted;
      });
    }

    if (state.operation === 'update') {
      rows = rows.map((row) => {
        Object.assign(row, state.payload);
        return row;
      });
    }

    for (const order of [...state.orders].reverse()) {
      rows = rows.slice().sort((a, b) => {
        const result = String(a[order.column] ?? '').localeCompare(String(b[order.column] ?? ''));
        return order.ascending ? result : -result;
      });
    }

    if (state.limitCount != null) rows = rows.slice(0, state.limitCount);

    if (single) {
      if (requireSingle && !rows[0]) return { data: null, error: new Error('No rows') };
      return { data: rows[0] || null, error: null };
    }
    return { data: rows, error: null };
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
