export async function invokeGithubIngestionEdge({ supabaseUrl, accessToken, sourceId, provider, fetcher = fetch }) {
  if (!supabaseUrl || !accessToken) throw new Error('GitHub ingestion is not configured.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId || '')) {
    const error = new Error('Choose a valid GitHub source.');
    error.status = 400;
    throw error;
  }

  const url = new URL('/functions/v1/job-github-ingest', supabaseUrl);
  if (url.protocol !== 'https:') throw new Error('GitHub ingestion requires a secure Supabase URL.');
  const response = await fetcher(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sourceId, provider }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `GitHub ingestion returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  if (!payload.summary) throw new Error('GitHub ingestion returned no summary.');
  return payload.summary;
}
