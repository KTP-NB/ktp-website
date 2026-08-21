import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function noStoreFetch(input, init = {}) {
  return fetch(input, { ...init, cache: 'no-store' });
}

if (!SUPABASE_URL) {
  console.warn('[coderank] NEXT_PUBLIC_SUPABASE_URL is missing.');
}

/**
 * Service-role client. NEVER expose to the browser. Used for trusted
 * server-side operations (timer-stamping, code execution, hidden test cases).
 */
export function getServiceClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase service-role credentials are not configured.');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: noStoreFetch },
  });
}

/**
 * Anon-key client bound to a specific user's JWT — useful when we want to
 * verify the JWT is genuine via `auth.getUser()`. We do not use this for
 * data access (we use service-role for that), only to identify the caller.
 */
export function getUserClient(accessToken) {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error('Supabase anon credentials are not configured.');
  }
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: noStoreFetch,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/**
 * Extract the Supabase JWT from an incoming request (either
 * `Authorization: Bearer ...` or the `sb-access-token` cookie).
 */
export function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1];

  // Supabase JS stores its session in `sb-<project-ref>-auth-token` cookies.
  // The user-client fallback works without this if the client always sends
  // the Authorization header (which our fetch wrappers do).
  return null;
}
