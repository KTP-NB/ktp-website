import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const email = readFileSync(new URL('../../../supabase/migrations/20260927120000_job_board_email_queue.sql', import.meta.url), 'utf8');
const retention = readFileSync(new URL('../../../supabase/migrations/20260927130000_job_board_posting_retention.sql', import.meta.url), 'utf8');

test('email queue requires fresh consent and is service-role only', () => {
  assert.match(email, /email_enabled set default false/);
  assert.match(email, /set email_enabled = false where email_enabled = true/);
  assert.match(email, /unique \(user_id, period_key\)/);
  assert.match(email, /for update skip locked/i);
  assert.match(email, /revoke all on function public\.job_board_claim_notification_queue\(integer\) from public, anon, authenticated/);
});

test('retention uses posting age, limits each run and protects saved and tracked jobs', () => {
  assert.match(retention, /coalesce\(job\.posted_at, job\.created_at\) < now\(\) - interval '7 days'/);
  assert.match(retention, /not exists \([\s\S]*?job_board_saved_jobs/);
  assert.match(retention, /not exists \([\s\S]*?job_board_applications/);
  assert.match(retention, /not exists \([\s\S]*?internship_applications/);
  assert.match(retention, /least\(greatest\(p_limit, 1\), 200\)/);
  assert.match(retention, /'0 \* \* \* \*'/);
});
