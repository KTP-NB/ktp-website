// utils/cache.js
//
// Week 3 Part 1 — extension-side caching for alumni lookup results.
//
// Backed by chrome.storage.local. Each company lookup is cached for 24 hours so
// repeated visits to job postings for the same company never re-hit the backend
// / Supabase. Runs in the MV3 service worker (classic worker scope) and is
// loaded via importScripts("utils/cache.js"), exposing self.KTPCache.
//
// Cache key format:  company:<normalized_name>
// Cache entry shape: { data: AlumniMatch payload, timestamp: number }

const KTP_CACHE_PREFIX = "company:";
const KTP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const KTP_CACHE_MAX_ENTRIES = 500; // bound storage growth (production safety)
const KTP_CACHE_STATS_KEY = "ktp:cache-stats";

// Stripped as whole words. Ordered longest-first so "corporation" is handled
// before "corp" leaves a dangling fragment.
const KTP_COMPANY_SUFFIXES = ["corporation", "corp", "llc", "ltd", "inc"];

// Domain endings removed so "google.com" and "Google" normalize identically.
const KTP_DOMAIN_TLDS = ["com", "org", "net", "io", "co", "ai", "dev", "app"];

const KTP_TLD_PATTERN = new RegExp(
  "\\.(" + KTP_DOMAIN_TLDS.join("|") + ")\\b",
  "g"
);
const KTP_SUFFIX_PATTERN = new RegExp(
  "\\b(" + KTP_COMPANY_SUFFIXES.join("|") + ")\\b",
  "g"
);

// Normalize a raw company string into a stable cache key fragment.
function normalizeCompanyName(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  let result = name.toLowerCase().trim();
  result = result.replace(KTP_TLD_PATTERN, " "); // strip domains like .com
  result = result.replace(/[^a-z0-9\s]/g, " "); // remove punctuation
  result = result.replace(KTP_SUFFIX_PATTERN, " "); // strip legal suffixes
  result = result.replace(/\s+/g, " ").trim(); // collapse whitespace
  return result;
}

function cacheKeyFor(name) {
  return KTP_CACHE_PREFIX + normalizeCompanyName(name);
}

function isCacheKey(key) {
  return typeof key === "string" && key.indexOf(KTP_CACHE_PREFIX) === 0;
}

function isFresh(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.timestamp === "number" &&
    Date.now() - entry.timestamp <= KTP_CACHE_TTL_MS
  );
}

// Returns the cache entry { data, timestamp } if present and unexpired, else
// null. Expired entries are deleted on access.
async function getCachedCompany(name) {
  const normalized = normalizeCompanyName(name);
  if (!normalized) {
    return null;
  }

  const key = KTP_CACHE_PREFIX + normalized;
  try {
    const stored = await chrome.storage.local.get(key);
    const entry = stored[key];

    if (!entry || typeof entry !== "object") {
      return null;
    }

    if (!isFresh(entry)) {
      await chrome.storage.local.remove(key);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

// Drop a single company's cached lookup (e.g. after a forced refresh).
async function removeCachedCompany(name) {
  const normalized = normalizeCompanyName(name);
  if (!normalized) {
    return false;
  }

  try {
    await chrome.storage.local.remove(KTP_CACHE_PREFIX + normalized);
    return true;
  } catch {
    return false;
  }
}

// Cache a lookup result under company:<normalized_name> with the current time.
async function setCachedCompany(name, data) {
  const normalized = normalizeCompanyName(name);
  if (!normalized || data === undefined || data === null) {
    return false;
  }

  const entry = { data, timestamp: Date.now() };

  try {
    await chrome.storage.local.set({ [KTP_CACHE_PREFIX + normalized]: entry });
    await clearExpiredCache();
    return true;
  } catch {
    return false;
  }
}

// Remove expired entries and, if still over the cap, evict the oldest first.
async function clearExpiredCache() {
  try {
    const all = await chrome.storage.local.get(null);
    const now = Date.now();
    const removeKeys = [];
    const live = [];

    for (const key of Object.keys(all)) {
      if (!isCacheKey(key)) {
        continue;
      }

      const entry = all[key];
      if (
        !entry ||
        typeof entry.timestamp !== "number" ||
        now - entry.timestamp > KTP_CACHE_TTL_MS
      ) {
        removeKeys.push(key);
      } else {
        live.push({ key, timestamp: entry.timestamp });
      }
    }

    if (live.length > KTP_CACHE_MAX_ENTRIES) {
      live.sort((a, b) => a.timestamp - b.timestamp);
      const overflow = live.slice(0, live.length - KTP_CACHE_MAX_ENTRIES);
      for (const item of overflow) {
        removeKeys.push(item.key);
      }
    }

    if (removeKeys.length > 0) {
      await chrome.storage.local.remove(removeKeys);
    }

    return removeKeys.length;
  } catch {
    return 0;
  }
}

// Lightweight client-side telemetry for cache effectiveness.
// eventType is one of "cache_hit" | "cache_miss".
async function recordCacheEvent(eventType) {
  if (eventType !== "cache_hit" && eventType !== "cache_miss") {
    return;
  }

  try {
    console.debug(`[KTP cache] ${eventType}`);
    const stored = await chrome.storage.local.get(KTP_CACHE_STATS_KEY);
    const stats = stored[KTP_CACHE_STATS_KEY] || {
      cache_hit: 0,
      cache_miss: 0,
    };
    stats[eventType] = (stats[eventType] || 0) + 1;
    await chrome.storage.local.set({ [KTP_CACHE_STATS_KEY]: stats });
  } catch {
    /* telemetry is best-effort */
  }
}

async function getCacheStats() {
  let counters = { cache_hit: 0, cache_miss: 0 };
  let entries = 0;

  try {
    const all = await chrome.storage.local.get(null);
    const stored = all[KTP_CACHE_STATS_KEY];
    if (stored && typeof stored === "object") {
      counters = {
        cache_hit: stored.cache_hit || 0,
        cache_miss: stored.cache_miss || 0,
      };
    }
    entries = Object.keys(all).filter(isCacheKey).length;
  } catch {
    /* ignore */
  }

  const total = counters.cache_hit + counters.cache_miss;
  return {
    ...counters,
    entries,
    hitRate: total > 0 ? counters.cache_hit / total : 0,
    ttlMs: KTP_CACHE_TTL_MS,
    maxEntries: KTP_CACHE_MAX_ENTRIES,
  };
}

// Remove all cache entries (and stats). Returns count of entries removed.
async function clearAllCache() {
  try {
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter(isCacheKey);
    if (keys.length > 0) {
      await chrome.storage.local.remove(keys);
    }
    await chrome.storage.local.remove(KTP_CACHE_STATS_KEY);
    return keys.length;
  } catch {
    return 0;
  }
}

const KTPCache = {
  normalizeCompanyName,
  cacheKeyFor,
  getCachedCompany,
  removeCachedCompany,
  setCachedCompany,
  clearExpiredCache,
  recordCacheEvent,
  getCacheStats,
  clearAllCache,
};

if (typeof self !== "undefined") {
  self.KTPCache = KTPCache;
}
