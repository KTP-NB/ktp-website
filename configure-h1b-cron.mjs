import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Supabase URL or service key is missing');

const existing = spawnSync('supabase', ['secrets', 'list'], { encoding: 'utf8' });
if (existing.status !== 0) throw new Error('Could not check existing Edge secrets');
if (existing.stdout.includes('JOB_INGEST_CRON_SECRET')) {
  throw new Error('Cron is already configured; refusing to rotate its secret');
}

const secret = randomBytes(32).toString('hex');
const result = spawnSync('supabase', ['secrets', 'set', `JOB_INGEST_CRON_SECRET=${secret}`], {
  encoding: 'utf8',
});
if (result.status !== 0) {
  throw new Error(`Could not set Edge secret: ${result.stderr || result.stdout}`);
}

const endpoint = `${url}/functions/v1/job-github-ingest`;
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-job-ingest-secret': secret },
  body: JSON.stringify({ provider: 'jobright_h1b' }),
});
const payload = await response.json();
if (!response.ok) throw new Error(`H1B ingestion failed (${response.status}): ${JSON.stringify(payload)}`);
console.log('H1B ingestion:', payload.summary);

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await service.rpc('job_board_configure_h1b_cron', {
  p_secret: secret,
  p_function_url: endpoint,
});
if (error) throw new Error(`Could not schedule Cron: ${error.message}`);
console.log('Scheduled H1B ingestion at 00:00 and 12:00 UTC.');
