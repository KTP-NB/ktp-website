import { getJobBoardServiceClient } from '../supabaseServer.js';
import { dedupeJobs } from './dedupe.js';
import { normalizeJob } from './normalize.js';
import { upsertJobs } from './upsert.js';
import { validateJobs } from './validate.js';

export async function runScraper({ adapter, sourceUrl, fetcher }) {
  if (!adapter?.source || typeof adapter.fetchJobs !== 'function') {
    throw new Error('A scraper adapter with source and fetchJobs is required.');
  }

  const service = getJobBoardServiceClient();
  const startedAt = new Date().toISOString();
  const run = await createScraperRun(service, {
    source: adapter.source,
    sourceUrl,
    startedAt,
  });

  try {
    const rawJobs = await adapter.fetchJobs({ url: sourceUrl, fetcher });
    const normalizedJobs = rawJobs.map((rawJob) => normalizeJob(rawJob, adapter.source));
    const { validJobs, invalidJobs } = validateJobs(normalizedJobs);
    const { dedupedJobs, duplicates } = dedupeJobs(validJobs);
    const result = await upsertJobs(service, dedupedJobs);

    await finishScraperRun(service, run.id, {
      status: 'completed',
      jobsSeen: rawJobs.length,
      jobsCreated: result.created,
      jobsUpdated: result.updated,
    });

    return {
      runId: run.id,
      source: adapter.source,
      jobsSeen: rawJobs.length,
      jobsValid: validJobs.length,
      jobsInvalid: invalidJobs.length,
      duplicatesSkipped: duplicates.length,
      jobsCreated: result.created,
      jobsUpdated: result.updated,
      jobs: result.rows,
      invalidJobs,
    };
  } catch (error) {
    await finishScraperRun(service, run.id, {
      status: 'failed',
      errorMessage: error.message,
    });
    throw error;
  }
}

async function createScraperRun(service, { source, sourceUrl, startedAt }) {
  const { data, error } = await service
    .from('job_board_scraper_runs')
    .insert({
      source,
      source_url: sourceUrl,
      status: 'running',
      started_at: startedAt,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function finishScraperRun(service, runId, result) {
  const { error } = await service
    .from('job_board_scraper_runs')
    .update({
      status: result.status,
      jobs_seen: result.jobsSeen || 0,
      jobs_created: result.jobsCreated || 0,
      jobs_updated: result.jobsUpdated || 0,
      error_message: result.errorMessage || null,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (error) throw error;
}
