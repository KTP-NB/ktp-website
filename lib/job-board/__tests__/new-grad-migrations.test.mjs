import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEW_GRAD_US_SOURCE_DEFINITIONS } from '../ingestion/github/sourceRegistry.js';

const sources = readFileSync(new URL('../../../supabase/migrations/20260929120000_new_grad_jobs_sources.sql', import.meta.url), 'utf8');
const schedule = readFileSync(new URL('../../../supabase/migrations/20260929130000_schedule_new_grad_jobs.sql', import.meta.url), 'utf8');

test('NewGrad migration seeds ten US feeds without re-enabling disabled sources', () => {
  assert.equal((sources.match(/'https:\/\/airtable\.com\/embed\//g) || []).length, 10);
  for (const source of NEW_GRAD_US_SOURCE_DEFINITIONS) {
    assert.ok(sources.includes(source.metadata.airtableEmbedUrl));
  }
  assert.match(sources, /'new_grad_jobs'/);
  assert.match(sources, /'new_grad', true/);
  assert.doesNotMatch(sources, /enabled\s*=\s*excluded\.enabled/i);
});

test('NewGrad Cron invokes only enabled sources with provider routing', () => {
  assert.match(schedule, /where provider = 'new_grad_jobs' and enabled = true/);
  assert.match(schedule, /jsonb_build_object\('sourceId', v_source\.id, 'provider', 'new_grad_jobs'\)/);
  assert.match(schedule, /'15 8 \* \* \*'/);
  assert.match(schedule, /revoke all on function public\.job_board_invoke_new_grad_ingest\(\) from public, anon, authenticated/);
  assert.match(schedule, /grant execute on function public\.job_board_invoke_new_grad_ingest\(\) to service_role/);
});
