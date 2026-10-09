import { logWarn } from '../../logger.js';
import { GithubFetchError, githubStatusCode } from './errors.js';

const DEFAULT_TIMEOUT_MS = 15000;

export async function fetchGithubRepositoryContent(source, options = {}) {
  const env = options.env || process.env;
  const fetcher = options.fetcher || fetch;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const token = options.token || env.GITHUB_INGEST_TOKEN;
  const deployed = isDeployedEnvironment(env);

  if (!token && deployed) {
    throw new GithubFetchError('GITHUB_INGEST_TOKEN is required for deployed GitHub ingestion.', {
      code: 'missing_github_token',
    });
  }

  if (!token) {
    logWarn('GitHub ingestion is using unauthenticated local-development fetching.', {
      sourceId: source.id,
      repository: repositoryName(source),
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(githubRawReadmeUrl(source), {
      signal: controller.signal,
      headers: githubHeaders({ token, etag: source.lastFetchedEtag }),
    });

    return await normalizeGithubResponse({ source, response });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new GithubFetchError('GitHub repository fetch timed out.', {
        code: 'timeout',
      });
    }
    if (error instanceof GithubFetchError) throw error;
    throw new GithubFetchError(error.message || 'GitHub repository fetch failed.', {
      code: 'network_error',
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function githubRawReadmeUrl(source) {
  return `https://raw.githubusercontent.com/${source.repositoryOwner}/${source.repositoryName}/${source.branch || 'main'}/README.md`;
}

function githubHeaders({ token, etag }) {
  const headers = {
    Accept: 'application/vnd.github.raw+json, text/plain;q=0.9, */*;q=0.8',
    'User-Agent': 'ktp-job-board-ingestion',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (etag) headers['If-None-Match'] = etag;
  return headers;
}

async function normalizeGithubResponse({ source, response }) {
  const fetchedAt = new Date().toISOString();
  const shaOrEtag = response.headers?.get?.('etag') || null;

  if (response.status === 304) {
    return baseResponse({ source, fetchedAt, shaOrEtag, status: 'unchanged', content: '' });
  }

  if (!response.ok) {
    const status = githubStatusCode(response.status);
    const retryAfter = response.headers?.get?.('retry-after') || null;
    throw new GithubFetchError(`GitHub repository fetch failed with ${response.status}.`, {
      status: response.status,
      code: status,
      retryAfter,
    });
  }

  const content = await response.text();
  if (!content.trim()) {
    throw new GithubFetchError('GitHub repository content was empty.', {
      status: response.status,
      code: 'empty_content',
    });
  }

  return baseResponse({ source, fetchedAt, shaOrEtag, status: 'fetched', content });
}

function baseResponse({ source, fetchedAt, shaOrEtag, status, content }) {
  return {
    sourceId: source.id,
    provider: source.provider,
    repository: repositoryName(source),
    fetchedAt,
    content,
    shaOrEtag,
    status,
  };
}

function repositoryName(source) {
  return `${source.repositoryOwner}/${source.repositoryName}`;
}

function isDeployedEnvironment(env) {
  return env.NODE_ENV === 'production' || env.NETLIFY === 'true' || env.VERCEL === '1';
}
