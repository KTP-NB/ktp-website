/**
 * Apply strict no-cache headers so CodeRank API responses are never reused
 * by the browser, Next data cache, Netlify edge, or any intermediate proxy.
 */
export function withNoStore(response) {
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');
  return response;
}
