// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2.104.0';
import { internalSecretMatches } from '../../../lib/job-board/ingestion/edgeRequest.js';
import { runInternListIngestion } from '../../../lib/job-board/ingestion/internList/runInternListIngestion.js';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const secret = Deno.env.get('JOB_INGEST_CRON_SECRET') || '';
  if (!secret) return json({ error: 'Ingestion Cron secret is not configured.' }, 503);
  if (!internalSecretMatches(request.headers.get('x-job-ingest-secret'), secret)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Supabase credentials are not configured.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  if (typeof body?.sourceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.sourceId)) {
    return json({ error: 'A source ID is required.' }, 400);
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    const summary = await runInternListIngestion({
      service,
      sourceId: body.sourceId,
      provider: body.provider === 'new_grad_jobs' ? 'new_grad_jobs' : 'intern_list',
      timeoutMs: 15000,
      leaseSeconds: 900,
      staleAfterDays: 7,
    });
    return json({ summary });
  } catch (error) {
    console.error('[job-board] Airtable Edge ingestion failed.', {
      message: error?.message || 'Unknown ingestion failure',
    });
    return json({ error: 'Airtable ingestion failed.' }, 500);
  }
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}
