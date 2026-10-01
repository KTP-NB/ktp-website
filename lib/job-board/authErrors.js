export function isAuthServiceUnavailable(error) {
  const message = `${error?.message || ''} ${error?.cause?.message || ''}`.toLowerCase();
  return (
    error?.name === 'AuthRetryableFetchError' ||
    message.includes('fetch failed') ||
    message.includes('connect timeout') ||
    message.includes('could not resolve host') ||
    message.includes('failed to fetch')
  );
}
