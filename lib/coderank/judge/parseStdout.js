// Tolerant JSON parsing for harness stdout. Falls back to common scalar
// shapes when stdout isn't strict JSON (e.g. Java prints `true` / `1` raw).

export function parseStdout(stdout) {
  const trimmed = String(stdout ?? '').trim();
  if (trimmed === '') return { ok: true, value: '' };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    if (trimmed === 'true') return { ok: true, value: true };
    if (trimmed === 'false') return { ok: true, value: false };
    if (trimmed === 'null') return { ok: true, value: null };
    if (/^-?\d+$/.test(trimmed)) return { ok: true, value: Number(trimmed) };
    if (/^-?\d+\.\d+(e[+-]?\d+)?$/i.test(trimmed)) return { ok: true, value: Number(trimmed) };
    return { ok: false, value: trimmed };
  }
}

// Strip per-line trailing whitespace; collapse leading/trailing blank lines.
// Identical to the legacy normalize() in grading.js so exact-string fallback
// keeps prior behavior.
export function normalizeLines(out) {
  if (out == null) return '';
  return String(out)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

// Deep structural equality. JSON-ish — treats arrays as ordered, plain
// objects as unordered by key. Numbers compared by ===; NaN is never equal.
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}
