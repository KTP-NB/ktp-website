export class GithubFetchError extends Error {
  constructor(message, { status, code, retryAfter } = {}) {
    super(message);
    this.name = 'GithubFetchError';
    this.status = status || null;
    this.code = code || 'github_fetch_error';
    this.retryAfter = retryAfter || null;
  }
}

export function githubStatusCode(status) {
  if (status === 304) return 'unchanged';
  if (status === 403 || status === 429) return 'rate_limited';
  if (status === 404) return 'not_found';
  if (status >= 500) return 'server_error';
  return 'failed';
}
