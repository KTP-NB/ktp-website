import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../../../supabase/migrations/20260926130000_schedule_intern_list_ingestion.sql', import.meta.url), 'utf8');
const edge = readFileSync(new URL('../../../supabase/functions/job-intern-list-ingest/index.ts', import.meta.url), 'utf8');

test('daily Intern List Cron submits only enabled sources independently', () => {
  assert.match(migration, /provider = 'intern_list' and enabled = true/);
  assert.match(migration, /jsonb_build_object\('sourceId', v_source\.id\)/);
  assert.match(migration, /'15 7 \* \* \*'/);
  assert.match(migration, /job_board_h1b_cron_secret/);
  assert.match(migration, /job_board_configure_intern_list_cron\(/);
  assert.match(migration, /revoke all on function public\.job_board_invoke_intern_list_ingest\(\) from public, anon, authenticated/);
});

test('Intern List Edge requires the Cron secret and a single source', () => {
  assert.match(edge, /internalSecretMatches\(request\.headers\.get\('x-job-ingest-secret'\), secret\)/);
  assert.match(edge, /JOB_INGEST_CRON_SECRET/);
  assert.match(edge, /sourceId: body\.sourceId/);
  assert.match(edge, /runInternListIngestion/);
});
