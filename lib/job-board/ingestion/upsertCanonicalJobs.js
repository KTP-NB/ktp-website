import { canonicalizeJobRecord } from './canonicalize.js';

const DEFAULT_BATCH_SIZE = 200;
const LOOKUP_BATCH_SIZE = 50;

export async function upsertCanonicalJobs(service, records, { cycleStartedAt } = {}) {
  const now = cycleStartedAt || new Date().toISOString();
  const accepted = records.filter((record) => !record.rejected).map(canonicalizeJobRecord);
  let inserted = 0;
  let updated = 0;
  let duplicate = 0;

  const existingByRecord = await preloadExistingCanonicalJobs(service, accepted);
  const groups = [];
  const pendingGroups = new Map();
  const linkWrites = [];

  for (const record of accepted) {
    const existing = existingByRecord.get(record);
    const group = existing
      ? groupForExistingJob(groups, pendingGroups, existing, record, now)
      : groupForNewJob(groups, pendingGroups, record, now);

    if (group.seen) {
      updated += 1;
      duplicate += 1;
    } else {
      inserted += existing ? 0 : 1;
      updated += existing ? 1 : 0;
      duplicate += existing ? 1 : 0;
    }

    group.seen = true;
    linkWrites.push({ record, group });
  }

  await writeJobGroups(service, groups);
  for (const group of groups) {
    if (group.resolvedConcurrentDuplicate) {
      inserted -= 1;
      updated += 1;
      duplicate += 1;
    }
  }
  await upsertSourceLinks(service, linkWrites, now);

  const rows = linkWrites.map(({ group }) => group.job).filter(Boolean);

  return {
    accepted: accepted.length,
    rejected: records.length - accepted.length,
    inserted,
    updated,
    duplicate,
    rows,
  };
}

async function preloadExistingCanonicalJobs(service, records) {
  const result = new Map();
  if (!records.length) return result;

  const linksBySourceKey = await loadSourceLinksBySourceKey(service, records);
  const linksByExternalId = await loadSourceLinksByExternalId(service, records);
  const linkedJobIds = unique([
    ...[...linksBySourceKey.values()].map((link) => link.job_id),
    ...[...linksByExternalId.values()].map((link) => link.job_id),
  ]);
  const jobsById = await loadJobsById(service, linkedJobIds);
  const jobsByCanonicalUrl = await loadJobsByColumn(service, 'canonical_url', canonicalUrls(records));
  const jobsByFingerprint = await loadJobsByColumn(service, 'content_fingerprint', contentFingerprints(records));

  for (const record of records) {
    const sourceLinkJob = jobForLink(jobsById, linksBySourceKey.get(sourceLinkKey(record)));
    if (sourceLinkJob) {
      result.set(record, sourceLinkJob);
      continue;
    }

    const externalJob = jobForLink(jobsById, linksByExternalId.get(record.sourceExternalId));
    if (externalJob) {
      result.set(record, externalJob);
      continue;
    }

    const canonicalJob = record.canonicalUrl ? jobsByCanonicalUrl.get(record.canonicalUrl) : null;
    if (canonicalJob) {
      result.set(record, canonicalJob);
      continue;
    }

    const normalizedUrlJob = record.normalizedApplicationUrl && record.normalizedApplicationUrl !== record.canonicalUrl
      ? jobsByCanonicalUrl.get(record.normalizedApplicationUrl)
      : null;
    if (normalizedUrlJob) {
      result.set(record, normalizedUrlJob);
      continue;
    }

    const fingerprintJob = record.contentFingerprint ? jobsByFingerprint.get(record.contentFingerprint) : null;
    if (fingerprintJob) result.set(record, fingerprintJob);
  }

  return result;
}

function jobForLink(jobsById, link) {
  return link?.job_id ? jobsById.get(link.job_id) : null;
}

async function loadSourceLinksBySourceKey(service, records) {
  const sourceIds = unique(records.map((record) => record.sourceId));
  const externalIds = unique(records.map((record) => record.sourceExternalId));
  const rows = await selectInChunks(
    service,
    'job_board_source_links',
    'id, job_id, source_id, source_external_id, first_seen_at',
    'source_external_id',
    externalIds,
    (query) => query.in('source_id', sourceIds),
  );

  return new Map(rows.map((row) => [sourceLinkKey(row), row]));
}

async function loadSourceLinksByExternalId(service, records) {
  const rows = await selectInChunks(
    service,
    'job_board_source_links',
    'id, job_id, source_id, source_external_id, first_seen_at',
    'source_external_id',
    unique(records.map((record) => record.sourceExternalId)),
  );

  const linksByExternalId = new Map();
  for (const row of rows) {
    if (!linksByExternalId.has(row.source_external_id)) {
      linksByExternalId.set(row.source_external_id, row);
    }
  }
  return linksByExternalId;
}

async function loadJobsById(service, ids) {
  const rows = await selectInChunks(service, 'job_board_jobs', '*', 'id', ids);
  return new Map(rows.map((row) => [row.id, row]));
}

async function loadJobsByColumn(service, column, values) {
  const rows = await selectInChunks(service, 'job_board_jobs', '*', column, values);
  return new Map(rows.map((row) => [row[column], row]));
}

async function selectInChunks(service, table, columns, column, values, scopeQuery = null) {
  const rows = [];
  for (const chunk of chunks(unique(values), LOOKUP_BATCH_SIZE)) {
    if (!chunk.length) continue;
    let query = service.from(table).select(columns).in(column, chunk);
    if (scopeQuery) query = scopeQuery(query);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

function groupForExistingJob(groups, pendingGroups, existing, record, now) {
  const key = `existing:${existing.id}`;
  let group = pendingGroups.get(key);
  if (!group) {
    group = {
      key,
      existing,
      payload: toJobPayload(record, now, existing),
      seen: false,
      job: null,
    };
    groups.push(group);
    pendingGroups.set(key, group);
  } else {
    group.payload = toJobPayload(record, now, group.payload);
  }
  return group;
}

function groupForNewJob(groups, pendingGroups, record, now) {
  let group = findPendingNewGroup(pendingGroups, record);
  if (!group) {
    group = {
      key: `new:${groups.length + 1}`,
      existing: null,
      payload: toJobPayload(record, now, null),
      seen: false,
      job: null,
    };
    groups.push(group);
  } else {
    group.payload = toJobPayload(record, now, group.payload);
  }

  setPendingNewKeys(pendingGroups, record, group);
  return group;
}

function findPendingNewGroup(pendingGroups, record) {
  for (const key of dedupeKeys(record)) {
    const group = pendingGroups.get(key);
    if (group) return group;
  }
  return null;
}

function setPendingNewKeys(pendingGroups, record, group) {
  for (const key of dedupeKeys(record)) {
    if (!pendingGroups.has(key)) pendingGroups.set(key, group);
  }
}

function dedupeKeys(record) {
  return [
    record.sourceExternalId ? `external:${record.sourceExternalId}` : null,
    record.canonicalUrl ? `canonical:${record.canonicalUrl}` : null,
    record.normalizedApplicationUrl && record.normalizedApplicationUrl !== record.canonicalUrl
      ? `canonical:${record.normalizedApplicationUrl}`
      : null,
    record.contentFingerprint ? `fingerprint:${record.contentFingerprint}` : null,
  ].filter(Boolean);
}

async function writeJobGroups(service, groups) {
  for (const chunk of chunks(groups, DEFAULT_BATCH_SIZE)) {
    if (!chunk.length) continue;
    const { data, error } = await upsertJobChunk(service, chunk);
    if (!error) {
      data.forEach((row, index) => { chunk[index].job = row; });
      continue;
    }
    if (!isCanonicalConflict(error)) throw error;

    // A different source can insert the same URL after our initial lookup.
    for (const group of chunk) {
      let result = await upsertJobChunk(service, [group]);
      if (isCanonicalConflict(result.error) && group.payload.canonical_url) {
        const { data: existing, error: lookupError } = await service
          .from('job_board_jobs').select('*').eq('canonical_url', group.payload.canonical_url).limit(1);
        if (lookupError) throw lookupError;
        if (!existing?.[0]) throw result.error;
        group.existing = existing[0];
        group.resolvedConcurrentDuplicate = true;
        group.payload = {
          ...group.payload,
          source: existing[0].source,
          external_id: existing[0].external_id,
          posted_at: existing[0].posted_at || group.payload.posted_at,
        };
        result = await upsertJobChunk(service, [group]);
      }
      if (result.error) throw result.error;
      group.job = result.data[0];
    }
  }
}

function upsertJobChunk(service, groups) {
  return service.from('job_board_jobs').upsert(groups.map((group) => (
    group.existing ? { ...group.payload, id: group.existing.id } : group.payload
  )), { onConflict: 'source,external_id', defaultToNull: false }).select('*');
}

function isCanonicalConflict(error) {
  return error?.code === '23505' && String(error.message).includes('job_board_jobs_canonical_url_unique_idx');
}

function toJobPayload(record, now, existing) {
  const payload = {
    external_id: existing?.external_id || record.contentFingerprint || record.sourceExternalId,
    source: existing?.source || record.provider || 'github',
    source_url: best(existing?.source_url, record.applicationUrl || record.sourceUrl),
    company: bestText(existing?.company, record.company),
    title: bestText(existing?.title, record.title),
    department: existing?.department || null,
    location: bestLocation(existing?.location, record.location || formatLocations(record.locations)),
    workplace_type: best(existing?.workplace_type, record.workplaceType || inferWorkplace(record.location || formatLocations(record.locations))),
    employment_type: best(existing?.employment_type, record.employmentType),
    career_category: best(existing?.career_category, record.careerCategory),
    description: bestText(existing?.description, record.description),
    apply_url: best(existing?.apply_url, record.applicationUrl || record.applyUrl),
    status: record.status === 'closed' ? 'closed' : 'open',
    posted_at: existing?.posted_at || record.sourcePostedDate || record.firstSeenAt || now,
    scraped_at: now,
    last_seen_at: now,
    inactive_at: record.status === 'closed' ? now : null,
    normalized_fingerprint: existing?.normalized_fingerprint || record.contentFingerprint,
    canonical_url: best(existing?.canonical_url, record.canonicalUrl || record.normalizedApplicationUrl),
    content_fingerprint: best(existing?.content_fingerprint, record.contentFingerprint),
    visa_sponsorship_status: bestVisaStatus(existing?.visa_sponsorship_status, record.visaSponsorshipStatus),
    visa_sponsorship_confidence: bestVisaConfidence(existing?.visa_sponsorship_confidence, record.visaSponsorshipConfidence),
    visa_sponsorship_notes: bestText(existing?.visa_sponsorship_notes, record.visaSponsorshipNotes),
    source_payload: {
      ...(existing?.source_payload || {}),
      latest_github_record: ['intern_list', 'new_grad_jobs'].includes(record.provider) ? (existing?.source_payload?.latest_github_record || null) : compactSourceRecord(record),
      latest_source_record: compactSourceRecord(record),
    },
    updated_at: now,
  };

  return payload;
}

async function upsertSourceLinks(service, linkWrites, now) {
  const existingLinks = await loadSourceLinksBySourceKey(
    service,
    linkWrites.map((write) => write.record),
  );
  const payloadsByKey = new Map();

  for (const { record, group } of linkWrites) {
    const existing = existingLinks.get(sourceLinkKey(record));
    payloadsByKey.set(sourceLinkKey(record), {
      id: existing?.id,
      job_id: group.job.id,
      source_id: record.sourceId,
      provider: record.provider,
      source_url: record.sourceUrl || record.applicationUrl || null,
      source_external_id: record.sourceExternalId,
      canonical_url: record.canonicalUrl || null,
      raw_payload: compactSourceRecord(record),
      source_posted_date: record.sourcePostedDate || null,
      first_seen_at: existing?.first_seen_at || now,
      last_seen_at: now,
      updated_at: now,
    });
  }

  for (const chunk of chunks([...payloadsByKey.values()], DEFAULT_BATCH_SIZE)) {
    if (!chunk.length) continue;
    const { error } = await service
      .from('job_board_source_links')
      .upsert(chunk, { onConflict: 'source_id,source_external_id', defaultToNull: false });
    if (error) throw error;
  }
}

function compactSourceRecord(record) {
  return {
    provider: record.provider,
    sourceId: record.sourceId,
    sourceName: record.sourceName,
    repository: record.repository,
    sourceRowIndex: record.sourceRowIndex,
    sourceDateRaw: record.sourceDateRaw,
    sourcePostedDate: record.sourcePostedDate,
    firstSeenAt: record.firstSeenAt,
    isClosed: record.isClosed,
    applicationUrl: record.applicationUrl,
    workplaceType: record.workplaceType,
    employmentType: record.employmentType,
    careerCategory: record.careerCategory,
    careerSubcategory: record.careerSubcategory,
    visaSponsorshipStatus: record.visaSponsorshipStatus,
    visaSponsorshipConfidence: record.visaSponsorshipConfidence,
    visaSponsorshipNotes: record.visaSponsorshipNotes,
    description: record.description,
    company: record.company,
    title: record.title,
    location: record.location,
    locations: record.locations,
    tags: record.tags,
    raw: record.rawSourceRecord || record.raw,
  };
}

function best(existingValue, newValue) {
  return existingValue || newValue || null;
}

function bestVisaStatus(existingValue, newValue) {
  const priority = {
    unknown: 0,
    does_not_sponsor: 1,
    likely_h1b_sponsor: 2,
    explicit_h1b_sponsor: 3,
  };
  const existing = existingValue || 'unknown';
  const next = newValue || 'unknown';
  return (priority[next] || 0) > (priority[existing] || 0) ? next : existing;
}

function bestVisaConfidence(existingValue, newValue) {
  const priority = {
    unknown: 0,
    historical: 2,
    explicit: 3,
  };
  const existing = existingValue || 'unknown';
  const next = newValue || 'unknown';
  return (priority[next] || 0) > (priority[existing] || 0) ? next : existing;
}

function bestText(existingValue, newValue) {
  const existing = String(existingValue || '').trim();
  const next = String(newValue || '').trim();
  if (!existing) return next || null;
  if (!next) return existing;
  if (looksLikeMarkdown(existing) && !looksLikeMarkdown(next)) return next;
  return next.length > existing.length ? next : existing;
}

function bestLocation(existingValue, newValue) {
  const existing = String(existingValue || '').trim();
  const next = String(newValue || '').trim();
  if (!existing || existing.toLowerCase() === 'multiple locations') return next || existing || null;
  if (!next || next.toLowerCase() === 'multiple locations') return existing;
  return next.length > existing.length ? next : existing;
}

function formatLocations(locations) {
  return Array.isArray(locations) && locations.length ? locations.join('; ') : '';
}

function looksLikeMarkdown(value) {
  return /\\[\[\]()_]|[\[\]]\([^)]*\)|\*\*/.test(String(value || ''));
}

function inferWorkplace(location) {
  const lower = String(location || '').toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  return 'onsite';
}

function canonicalUrls(records) {
  return unique(records.flatMap((record) => (
    record.normalizedApplicationUrl && record.normalizedApplicationUrl !== record.canonicalUrl
      ? [record.canonicalUrl, record.normalizedApplicationUrl]
      : [record.canonicalUrl]
  )));
}

function contentFingerprints(records) {
  return unique(records.map((record) => record.contentFingerprint));
}

function sourceLinkKey(record) {
  return `${record.source_id || record.sourceId}:${record.source_external_id || record.sourceExternalId}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}
