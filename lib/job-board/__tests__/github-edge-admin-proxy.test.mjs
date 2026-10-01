import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { invokeGithubIngestionEdge } from '../ingestion/github/edgeAdminProxy.js';

const sourceId = '12345678-1234-1234-1234-123456789abc';

test('admin GitHub run forwards only the member token and chosen source to Supabase', async () => {
  let request;
  const summary = await invokeGithubIngestionEdge({
    supabaseUrl: 'https://project.supabase.co',
    accessToken: 'member-token',
    sourceId,
    provider: 'jobright_h1b',
    fetcher: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ summary: { inserted: 2, failed: 0 } }) };
    },
  });
  assert.deepEqual(summary, { inserted: 2, failed: 0 });
  assert.equal(request.url, 'https://project.supabase.co/functions/v1/job-github-ingest');
  assert.equal(request.options.headers.Authorization, 'Bearer member-token');
  assert.deepEqual(JSON.parse(request.options.body), { sourceId, provider: 'jobright_h1b' });
});

test('admin GitHub run rejects invalid sources and preserves Edge failures', async () => {
  await assert.rejects(invokeGithubIngestionEdge({
    supabaseUrl: 'https://project.supabase.co', accessToken: 'member-token', sourceId: '../wrong',
    fetcher: async () => assert.fail('Must not call Edge for an invalid source'),
  }), (error) => error.status === 400);

  await assert.rejects(invokeGithubIngestionEdge({
    supabaseUrl: 'https://project.supabase.co', accessToken: 'member-token', sourceId,
    fetcher: async () => ({ ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) }),
  }), (error) => error.status === 403 && error.message === 'Forbidden');
});

test('Supabase GitHub ingestion checks delegated role permissions like the website', () => {
  const edge = readFileSync(new URL('../../../supabase/functions/job-github-ingest/index.ts', import.meta.url), 'utf8');
  assert.match(edge, /\.from\('role_permissions'\)/);
  assert.match(edge, /profile\.permissions = \[\.\.\.new Set/);
});
