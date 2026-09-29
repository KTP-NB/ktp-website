// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2.104.0';
import { profileCanManageJobBoard } from '../../../lib/job-board/adminAccess.js';
import {
  internalSecretMatches,
  readBearerToken,
  summarizeIngestionForResponse,
} from '../../../lib/job-board/ingestion/edgeRequest.js';
import { runGithubIngestion } from '../../../lib/job-board/ingestion/github/runGithubIngestion.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const githubToken = Deno.env.get('GITHUB_INGEST_TOKEN') || '';
  const internalSecret = Deno.env.get('JOB_INGEST_CRON_SECRET') || '';
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'Supabase function credentials are not configured.' }, 500);
  }
  if (!githubToken) {
    return json({ error: 'GitHub ingestion is not configured.' }, 503);
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authorized = await authorizeRequest(request, {
    supabaseUrl,
    anonKey,
    service,
    internalSecret,
  });
  if (!authorized.ok) return json({ error: authorized.error }, authorized.status);

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const summary = await runGithubIngestion({
      service,
      sourceId: typeof body.sourceId === 'string' && body.sourceId ? body.sourceId : null,
      provider: body.provider === 'jobright_h1b' ? 'jobright_h1b' : null,
      timeoutMs: 15000,
      leaseSeconds: 900,
      staleAfterDays: 7,
      env: {
        NODE_ENV: 'production',
        GITHUB_INGEST_TOKEN: githubToken,
      },
    });
    return json({ summary: summarizeIngestionForResponse(summary) });
  } catch (error) {
    console.error('[job-board] Edge ingestion failed.', {
      message: error?.message || 'Unknown ingestion failure',
      code: error?.code || null,
    });
    return json({ error: 'GitHub ingestion failed.' }, Number(error?.status) || 500);
  }
});

async function authorizeRequest(request, options) {
  const providedInternalSecret = request.headers.get('x-job-ingest-secret');
  if (internalSecretMatches(providedInternalSecret, options.internalSecret)) {
    return { ok: true, mode: 'internal' };
  }

  const token = readBearerToken(request.headers.get('authorization'));
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' };

  const userClient = createClient(options.supabaseUrl, options.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: 'Invalid session' };
  }

  const { data: profile, error: profileError } = await options.service
    .from('member_profiles')
    .select('access_role, manager_permissions')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (profileError) return { ok: false, status: 500, error: 'Admin lookup failed' };
  if (!profileCanManageJobBoard(profile)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true, mode: 'admin', userId: userData.user.id };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}
