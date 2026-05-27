import { supabase } from '@/lib/supabase';

const CODERANK_API_URL = (process.env.NEXT_PUBLIC_CODERANK_API_URL || '').replace(/\/+$/, '');

/**
 * Authenticated fetch — always attaches the current Supabase access token.
 * Throws on non-2xx with the JSON `error` field, if present.
 */
export async function api(path, options = {}) {
  return authedFetch(path, options);
}

/**
 * Authenticated fetch to the external CodeRank execution backend.
 * This backend proxies Piston; the browser should never call Piston directly.
 */
export async function coderankBackendApi(path, options = {}) {
  if (!CODERANK_API_URL) {
    throw new Error('NEXT_PUBLIC_CODERANK_API_URL is not configured.');
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return authedFetch(`${CODERANK_API_URL}${normalizedPath}`, options);
}

async function authedFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) {
    throw new Error('You must be signed in.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Cache-Control', 'no-cache');
  headers.set('Pragma', 'no-cache');

  const method = String(options.method || 'GET').toUpperCase();
  let finalPath = path;
  if (method === 'GET') {
    const separator = finalPath.includes('?') ? '&' : '?';
    finalPath = `${finalPath}${separator}_t=${Date.now()}`;
  }

  const res = await fetch(finalPath, { ...options, method, headers, cache: 'no-store' });
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const body = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const message = (isJson && body?.error) || (typeof body === 'string' && body) || res.statusText;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}
