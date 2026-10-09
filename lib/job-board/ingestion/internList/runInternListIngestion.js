import { getAirtableSourceById, listEnabledAirtableSources } from '../github/sourceRegistry.js';
import { upsertCanonicalJobs } from '../upsertCanonicalJobs.js';
import { acquireSourceLease, releaseSourceLease } from '../sourceLease.js';
import { finalizeSourceInventory } from '../sourceInventory.js';
import { withinLookback } from '../github/runGithubIngestion.js';
import { fetchInternListAirtableView } from './fetchAirtableView.js';
import { parseInternListAirtablePayload } from './parseAirtableView.js';
import { parseNewGradAirtablePayload } from './parseNewGradView.js';

export async function runInternListIngestion(options = {}) {
  const service = options.service;
  if (!service) throw new Error('A Supabase service client is required for Intern List ingestion.');
  const provider = options.provider || 'intern_list';
  const cycleStartedAt = options.cycleStartedAt || new Date().toISOString();
  const sources = options.sourceId
    ? [await getAirtableSourceById(service, options.sourceId, provider)].filter(Boolean)
    : await listEnabledAirtableSources(service, provider);

  const summary = {
    cycleStartedAt,
    sources: sources.length,
    fetched: 0,
    eligible: 0,
    accepted: 0,
    inserted: 0,
    updated: 0,
    duplicate: 0,
    rejected: 0,
    inventoryRefreshed: 0,
    staleArchived: 0,
    skippedLocked: 0,
    partialInventories: 0,
    failed: 0,
    runs: [],
  };

  for (const source of sources) {
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
      const previousMax = await recentFetchedBaseline(service, source.id);
      await markSourceAttempt(service, source.id, cycleStartedAt);
      const fetched = await fetchInternListAirtableView(source, {
        fetcher: options.fetcher,
        timeoutMs: options.timeoutMs,
        timeZone: options.timeZone,
      });
      const parsed = provider === 'new_grad_jobs'
        ? parseNewGradAirtablePayload(fetched.payload, source, { cycleStartedAt })
        : parseInternListAirtablePayload(fetched.payload, source, { cycleStartedAt });
      const partialInventory = previousMax >= 100 && parsed.length < previousMax * 0.6;
      const eligible = parsed.filter((record) => withinLookback(record.sourcePostedDate || record.firstSeenAt, cycleStartedAt) || record.rejected);
      const upsert = await upsertCanonicalJobs(service, eligible, { cycleStartedAt });
      const rejected = eligible.filter((record) => record.rejected).length;
      const inventory = await finalizeSourceInventory(service, source.id, parsed, {
        cycleStartedAt,
        staleAfterDays: options.staleAfterDays,
        inventoryUnchanged: partialInventory,
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
        })).concat(partialInventory ? [{ code: 'partial_source_snapshot', fetched: parsed.length, baseline: previousMax }] : []),
      });
      await markSourceSuccess(service, source.id, cycleStartedAt, fetched.sharedViewUrl);

      summary.fetched += parsed.length;
      summary.eligible += eligible.length;
      summary.accepted += upsert.accepted;
      summary.inserted += upsert.inserted;
      summary.updated += upsert.updated;
      summary.duplicate += upsert.duplicate;
      summary.rejected += rejected;
      summary.inventoryRefreshed += inventory.refreshed;
      summary.staleArchived += inventory.archived;
      if (partialInventory) summary.partialInventories += 1;
      summary.runs.push({ id: run.id, sourceId: source.id, status: 'completed', partialInventory });
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

async function recentFetchedBaseline(service, sourceId) {
  const { data, error } = await service
    .from('job_board_ingestion_runs')
    .select('fetched_count')
    .eq('source_id', sourceId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) throw error;
  return Math.max(0, ...(data || []).map((row) => Number(row.fetched_count || 0)));
}

async function releaseLeaseQuietly(service, sourceId, token) {
  try {
    await releaseSourceLease(service, sourceId, token);
  } catch (error) {
    console.error('[job-board] Unable to release Airtable ingestion lease.', {
      sourceId,
      error: error.message,
    });
  }
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

async function markSourceSuccess(service, sourceId, timestamp, sharedViewUrl) {
  const payload = {
    last_success_at: timestamp,
    consecutive_failures: 0,
    updated_at: timestamp,
  };
  if (sharedViewUrl) payload.last_fetched_etag = sharedViewUrl;

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
