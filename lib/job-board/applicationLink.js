export function applicationLinkLabel(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (hostname === 'jobright.ai' || hostname.endsWith('.jobright.ai')) {
      return 'View on Jobright';
    }
  } catch {
    return 'Open application';
  }
  return 'Open application';
}
