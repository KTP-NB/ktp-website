import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchGithubRepositoryContent, githubRawReadmeUrl } from '../ingestion/github/fetchRepository.js';
import { GithubFetchError } from '../ingestion/github/errors.js';

const source = {
  id: 'source-1',
  provider: 'simplify',
  repositoryOwner: 'SimplifyJobs',
  repositoryName: 'Summer2026-Internships',
  branch: 'dev',
  lastFetchedEtag: '"old-etag"',
};

test('builds GitHub raw README URL from source registry row', () => {
  assert.equal(
    githubRawReadmeUrl(source),
    'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md'
  );
});

test('fetches GitHub repository content with token and etag headers', async () => {
  const result = await fetchGithubRepositoryContent(source, {
    env: { NODE_ENV: 'production', GITHUB_INGEST_TOKEN: 'token-123' },
    fetcher: async (url, init) => {
      assert.equal(url, githubRawReadmeUrl(source));
      assert.equal(init.headers.Authorization, 'Bearer token-123');
      assert.equal(init.headers['If-None-Match'], '"old-etag"');
      return response({ status: 200, body: '# Jobs', headers: { etag: '"new-etag"' } });
    },
  });

  assert.equal(result.status, 'fetched');
  assert.equal(result.content, '# Jobs');
  assert.equal(result.repository, 'SimplifyJobs/Summer2026-Internships');
  assert.equal(result.shaOrEtag, '"new-etag"');
});

test('returns unchanged response for 304', async () => {
  const result = await fetchGithubRepositoryContent(source, {
    env: { NODE_ENV: 'production', GITHUB_INGEST_TOKEN: 'token-123' },
    fetcher: async () => response({ status: 304, body: '', headers: { etag: '"same-etag"' } }),
  });

  assert.equal(result.status, 'unchanged');
  assert.equal(result.content, '');
  assert.equal(result.shaOrEtag, '"same-etag"');
});

test('fails clearly when deployed without GitHub token', async () => {
  await assert.rejects(
    fetchGithubRepositoryContent(source, {
      env: { NODE_ENV: 'production' },
      fetcher: async () => response({ status: 200, body: '# Jobs' }),
    }),
    (error) => error instanceof GithubFetchError && error.code === 'missing_github_token'
  );
});

test('allows unauthenticated local-development fallback', async () => {
  const result = await fetchGithubRepositoryContent(source, {
    env: { NODE_ENV: 'development' },
    fetcher: async (_url, init) => {
      assert.equal(init.headers.Authorization, undefined);
      return response({ status: 200, body: '# Local Jobs' });
    },
  });

  assert.equal(result.status, 'fetched');
  assert.equal(result.content, '# Local Jobs');
});

test('normalizes 404, rate limit, server, empty, and timeout failures', async () => {
  await assert.rejects(
    fetchGithubRepositoryContent(source, {
      env: { NODE_ENV: 'production', GITHUB_INGEST_TOKEN: 'token-123' },
      fetcher: async () => response({ status: 404, body: 'not found' }),
    }),
    (error) => error.code === 'not_found' && error.status === 404
  );

  await assert.rejects(
    fetchGithubRepositoryContent(source, {
      env: { NODE_ENV: 'production', GITHUB_INGEST_TOKEN: 'token-123' },
      fetcher: async () => response({ status: 429, body: 'slow down', headers: { 'retry-after': '60' } }),
    }),
    (error) => error.code === 'rate_limited' && error.retryAfter === '60'
  );

  await assert.rejects(
    fetchGithubRepositoryContent(source, {
      env: { NODE_ENV: 'production', GITHUB_INGEST_TOKEN: 'token-123' },
      fetcher: async () => response({ status: 503, body: 'bad day' }),
    }),
    (error) => error.code === 'server_error'
  );

  await assert.rejects(
    fetchGithubRepositoryContent(source, {
      env: { NODE_ENV: 'production', GITHUB_INGEST_TOKEN: 'token-123' },
      fetcher: async () => response({ status: 200, body: '  ' }),
    }),
    (error) => error.code === 'empty_content'
  );

  await assert.rejects(
    fetchGithubRepositoryContent(source, {
      env: { NODE_ENV: 'production', GITHUB_INGEST_TOKEN: 'token-123' },
      timeoutMs: 1,
      fetcher: async (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
    }),
    (error) => error.code === 'timeout'
  );
});

function response({ status, body, headers = {} }) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] || headers[name] || null;
      },
    },
    async text() {
      return body;
    },
  };
}
