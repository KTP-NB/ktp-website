const cache = new Map();

export function readCachedData(key, maxAgeMs) {
  const memoryEntry = cache.get(key);
  const now = Date.now();

  if (memoryEntry && now - memoryEntry.createdAt < maxAgeMs) {
    return memoryEntry.data;
  }

  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!entry?.createdAt || now - entry.createdAt >= maxAgeMs) return null;

    cache.set(key, entry);
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCachedData(key, data) {
  const entry = {
    createdAt: Date.now(),
    data,
  };

  cache.set(key, entry);

  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Best-effort cache only.
  }
}

export function clearCachedData(key) {
  cache.delete(key);

  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Best-effort cache only.
  }
}
