export class InternListFetchError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'InternListFetchError';
    this.status = details.status || null;
    this.code = details.code || null;
  }
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function fetchInternListAirtableView(source, options = {}) {
  const fetcher = options.fetcher || fetch;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const embedUrl = source.metadata?.airtableEmbedUrl || source.metadata?.airtable_embed_url;
  if (!embedUrl) {
    throw new InternListFetchError(`Intern List source ${source.sourceName} is missing an Airtable embed URL.`, { code: 'missing_embed_url' });
  }

  const embedResponse = await fetchWithTimeout(fetcher, embedUrl, {
    method: 'GET',
    timeoutMs,
    timeoutMessage: 'Airtable embed request timed out.',
  });
  if (!embedResponse?.ok) {
    throw new InternListFetchError(`Airtable embed request failed with status ${embedResponse?.status || 'unknown'}.`, {
      status: embedResponse?.status,
      code: 'embed_fetch_failed',
    });
  }

  const embedHtml = await embedResponse.text();
  const sharedViewPath = extractSharedViewDataPath(embedHtml);
  const applicationId = extractApplicationId(embedHtml) || parseAirtableApplicationId(embedUrl);
  if (!sharedViewPath || !applicationId) {
    throw new InternListFetchError(`Airtable embed did not expose shared-view data for ${source.sourceName}.`, {
      code: 'missing_shared_view_data',
    });
  }

  const dataUrl = new URL(sharedViewPath, 'https://airtable.com').toString();
  const dataResponse = await fetchWithTimeout(fetcher, dataUrl, {
    method: 'GET',
    headers: {
      'x-airtable-application-id': applicationId,
      'X-Requested-With': 'XMLHttpRequest',
      'x-airtable-inter-service-client': 'webClient',
      'x-time-zone': options.timeZone || 'America/New_York',
      'x-user-locale': 'en',
    },
    timeoutMs,
    timeoutMessage: 'Airtable shared-view data request timed out.',
  });

  if (!dataResponse?.ok) {
    throw new InternListFetchError(`Airtable shared-view data request failed with status ${dataResponse?.status || 'unknown'}.`, {
      status: dataResponse?.status,
      code: 'shared_view_fetch_failed',
    });
  }

  const payload = await dataResponse.json();
  if (payload?.msg !== 'SUCCESS' || !payload?.data?.table?.rows) {
    throw new InternListFetchError(`Airtable shared-view data was not in the expected format for ${source.sourceName}.`, {
      code: 'invalid_shared_view_payload',
    });
  }

  return {
    payload,
    applicationId,
    sharedViewUrl: dataUrl,
    embedUrl,
  };
}

async function fetchWithTimeout(fetcher, url, options) {
  const { timeoutMs, timeoutMessage, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new InternListFetchError(timeoutMessage, { code: 'timeout' });
    }
    if (error instanceof InternListFetchError) throw error;
    throw new InternListFetchError(error.message || 'Airtable request failed.', { code: 'network_error' });
  } finally {
    clearTimeout(timeout);
  }
}

export function extractSharedViewDataPath(html) {
  const match = String(html || '').match(/urlWithParams:\s*"([^"]+)"/);
  if (!match) return null;
  return match[1].replaceAll('\\u002F', '/').replaceAll('&amp;', '&');
}

export function extractApplicationId(html) {
  const headerMatch = String(html || '').match(/"x-airtable-application-id":"([^"]+)"/);
  if (headerMatch) return headerMatch[1];
  const initMatch = String(html || '').match(/"singleApplicationId":"([^"]+)"/);
  if (initMatch) return initMatch[1];
  return null;
}

function parseAirtableApplicationId(embedUrl) {
  const match = String(embedUrl || '').match(/\/embed\/(app[^/]+)/);
  return match?.[1] || null;
}
