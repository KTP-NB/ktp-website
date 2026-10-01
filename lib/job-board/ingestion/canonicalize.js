import { normalizeSlug } from '../scraper/normalize.js';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gh_src',
  'source',
  'ref',
  'referrer',
  'src',
]);

export function canonicalizeJobRecord(record) {
  const safeRecord = stripPostgresNulls(record);
  const normalizedApplicationUrl = normalizeApplicationUrl(safeRecord.applicationUrl || safeRecord.applyUrl);
  const canonicalUrl = unwrapKnownRedirect(normalizedApplicationUrl);
  const contentFingerprint = createContentFingerprint(safeRecord);

  return {
    ...safeRecord,
    normalizedApplicationUrl,
    canonicalUrl,
    contentFingerprint,
  };
}

function stripPostgresNulls(value) {
  if (typeof value === 'string') return value.replace(/\u0000/g, '');
  if (Array.isArray(value)) return value.map(stripPostgresNulls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, stripPostgresNulls(entry)]));
  }
  return value;
}

export function normalizeApplicationUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        url.searchParams.delete(key);
      }
    }
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return raw.replace(/#.*$/, '').replace(/[/?#]+$/, '');
  }
}

export function createContentFingerprint(record) {
  return [
    normalizeSlug(record.company),
    normalizeSlug(record.title),
    normalizeDateOnly(record.sourcePostedDate),
  ].filter(Boolean).join(':');
}

function unwrapKnownRedirect(urlValue) {
  if (!urlValue) return '';

  try {
    const url = new URL(urlValue);
    for (const key of ['url', 'u', 'redirect', 'redirect_url', 'target']) {
      const target = url.searchParams.get(key);
      if (target && /^https?:\/\//i.test(target)) {
        return normalizeApplicationUrl(target);
      }
    }
    return urlValue;
  } catch {
    return urlValue;
  }
}

function normalizeDateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
