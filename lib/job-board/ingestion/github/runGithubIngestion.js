import { upsertCanonicalJobs } from '../upsertCanonicalJobs.js';
import { acquireSourceLease, releaseSourceLease } from '../sourceLease.js';
import { finalizeSourceInventory } from '../sourceInventory.js';
import { fetchGithubRepositoryContent } from './fetchRepository.js';
import { getGithubSourceById, listEnabledGithubSources } from './sourceRegistry.js';
import { parseJobrightRepository } from './parsers/jobright.js';
import { parseJobrightH1bRepository } from './parsers/jobrightH1b.js';
import { parseSimplifyRepository } from './parsers/simplify.js';

const LOOKBACK_DAYS = 3;

export async function runGithubIngestion(options = {}) {
  const service = options.service;
  if (!service) throw new Error('A Supabase service client is required for GitHub ingestion.');
  const cycleStartedAt = options.cycleStartedAt || new Date().toISOString();
  const sources = options.sourceId
    ? [await getGithubSourceById(service, options.sourceId)].filter(Boolean)
    : await listEnabledGithubSources(service);
  const selectedSources = options.provider
    ? sources.filter((source) => source.provider === options.provider)
    : sources;

  const summary = {
    cycleStartedAt,
    sources: selectedSources.length,
    fetched: 0,
    eligible: 0,
    accepted: 0,
    inserted: 0,
    updated: 0,
    duplicate: 0,
    rejected: 0,
    unchanged: 0,
    inventoryRefreshed: 0,
    staleArchived: 0,
    skippedLocked: 0,
    failed: 0,
    runs: [],
  };

  for (const source of selectedSources) {
    const lease = await acquireSourceLease(service, source.id, {
      now: cycleStartedAt,
      leaseSeconds: options.leaseSeconds,
    });
    if (!lease.acquired) {
      summary.skippedLocked += 1;
      summary.runs.push({ sourceId: source.id, status: 'locked' });
      continue;
    }

    let run = null;
    try {
      run = await createIngestionRun(service, source, cycleStartedAt);
      await markSourceAttempt(service, source.id, cycleStartedAt);
      const fetched = await fetchGithubRepositoryContent(source, {
        fetcher: options.fetcher,
        env: options.env,
        timeoutMs: options.timeoutMs,
      });

      if (fetched.status === 'unchanged') {
        const inventory = await finalizeSourceInventory(service, source.id, [], {
          cycleStartedAt,
          inventoryUnchanged: true,
          staleAfterDays: options.staleAfterDays,
        });
        await finishIngestionRun(service, run.id, {
          status: 'completed',
          fetchedCount: 0,
          eligibleCount: 0,
          acceptedCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          duplicateCount: 0,
          rejectedCount: 0,
          refreshedCount: inventory.refreshed,
          staleArchivedCount: inventory.archived,
          errors: [],
        });
        await markSourceSuccess(service, source.id, cycleStartedAt, fetched.shaOrEtag);
        summary.unchanged += 1;
        summary.inventoryRefreshed += inventory.refreshed;
        summary.staleArchived += inventory.archived;
        summary.runs.push({ id: run.id, sourceId: source.id, status: 'unchanged' });
        continue;
      }

      const parsed = parseGithubRecords(fetched.content, source, { cycleStartedAt });
      const eligible = parsed.filter((record) => withinLookback(record.sourcePostedDate || record.firstSeenAt, cycleStartedAt) || record.rejected);
      const upsert = await upsertCanonicalJobs(service, eligible, { cycleStartedAt });
      const rejected = eligible.filter((record) => record.rejected).length;
      const inventory = await finalizeSourceInventory(service, source.id, parsed, {
        cycleStartedAt,
        staleAfterDays: options.staleAfterDays,
      });

      await finishIngestionRun(service, run.id, {
        status: 'completed',
        fetchedCount: parsed.length,
        eligibleCount: eligible.length,
        acceptedCount: upsert.accepted,
        insertedCount: upsert.inserted,
        updatedCount: upsert.updated,
        duplicateCount: upsert.duplicate,
        rejectedCount: rejected,
        refreshedCount: inventory.refreshed,
        staleArchivedCount: inventory.archived,
        errors: eligible.filter((record) => record.rejected).map((record) => ({
          row: record.sourceRowIndex,
          reasons: record.rejectionReasons,
        })),
      });
      await markSourceSuccess(service, source.id, cycleStartedAt, fetched.shaOrEtag);

      summary.fetched += parsed.length;
      summary.eligible += eligible.length;
      summary.accepted += upsert.accepted;
      summary.inserted += upsert.inserted;
      summary.updated += upsert.updated;
      summary.duplicate += upsert.duplicate;
      summary.rejected += rejected;
      summary.inventoryRefreshed += inventory.refreshed;
      summary.staleArchived += inventory.archived;
      summary.runs.push({ id: run.id, sourceId: source.id, status: 'completed' });
    } catch (error) {
      if (run?.id) {
        await finishIngestionRun(service, run.id, {
          status: 'failed',
          errorMessage: error.message,
          errors: [{ message: error.message, code: error.code || null, status: error.status || null }],
        });
      }
      await markSourceFailure(service, source.id, cycleStartedAt);
      summary.failed += 1;
      summary.runs.push({ id: run?.id || null, sourceId: source.id, status: 'failed', error: error.message });
    } finally {
      await releaseLeaseQuietly(service, source.id, lease.token);
    }
  }

  return summary;
}

async function releaseLeaseQuietly(service, sourceId, token) {
  try {
    await releaseSourceLease(service, sourceId, token);
  } catch (error) {
    console.error('[job-board] Unable to release GitHub ingestion lease.', {
      sourceId,
      error: error.message,
    });
  }
}

export function parseGithubRecords(content, source, options = {}) {
  if (source.provider === 'jobright') return parseJobrightRepository(content, source, options);
  if (source.provider === 'jobright_h1b') return parseJobrightH1bRepository(content, source, options);
  if (source.provider === 'simplify') return parseSimplifyRepository(content, source, options);
  throw new Error(`Unsupported GitHub job source provider: ${source.provider}`);
}

export function withinLookback(sourcePostedDate, cycleStartedAt, lookbackDays = LOOKBACK_DAYS) {
  if (!sourcePostedDate) return false;
  const posted = new Date(sourcePostedDate).getTime();
  const cycle = new Date(cycleStartedAt).getTime();
  if (Number.isNaN(posted) || Number.isNaN(cycle)) return false;
  const min = cycle - lookbackDays * 24 * 60 * 60 * 1000;
  return posted >= min && posted <= cycle + 24 * 60 * 60 * 1000;
}

async function createIngestionRun(service, source, cycleStartedAt) {
  const { data, error } = await service
    .from('job_board_ingestion_runs')
    .insert({
      source_id: source.id,
      provider: source.provider,
      source_name: source.sourceName,
      source_url: source.sourceUrl,
      status: 'running',
      cycle_started_at: cycleStartedAt,
      started_at: cycleStartedAt,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function finishIngestionRun(service, runId, result) {
  const { error } = await service
    .from('job_board_ingestion_runs')
    .update({
      status: result.status,
      fetched_count: result.fetchedCount || 0,
      eligible_count: result.eligibleCount || 0,
      accepted_count: result.acceptedCount || 0,
      inserted_count: result.insertedCount || 0,
      updated_count: result.updatedCount || 0,
      duplicate_count: result.duplicateCount || 0,
      rejected_count: result.rejectedCount || 0,
      refreshed_count: result.refreshedCount || 0,
      stale_archived_count: result.staleArchivedCount || 0,
      error_message: result.errorMessage || null,
      errors: result.errors || [],
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);
  if (error) throw error;
}

async function markSourceAttempt(service, sourceId, timestamp) {
  const { error } = await service
    .from('job_board_sources')
    .update({ last_attempt_at: timestamp, updated_at: timestamp })
    .eq('id', sourceId);
  if (error) throw error;
}

async function markSourceSuccess(service, sourceId, timestamp, shaOrEtag) {
  const payload = {
    last_success_at: timestamp,
    consecutive_failures: 0,
    updated_at: timestamp,
  };
  if (shaOrEtag) payload.last_fetched_etag = shaOrEtag;

  const { error } = await service
    .from('job_board_sources')
    .update(payload)
    .eq('id', sourceId);
  if (error) throw error;
}

async function markSourceFailure(service, sourceId, timestamp) {
  const { data } = await service
    .from('job_board_sources')
    .select('consecutive_failures')
    .eq('id', sourceId)
    .maybeSingle();

  const { error } = await service
    .from('job_board_sources')
    .update({
      consecutive_failures: Number(data?.consecutive_failures || 0) + 1,
      updated_at: timestamp,
    })
    .eq('id', sourceId);
  if (error) throw error;
}
