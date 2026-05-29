// Reusable normalizers used by judge modes. Each returns a canonical form
// suitable for deep-equality against an expected value normalized the same way.

function cmp(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export function normalizeArray(value) {
  if (!Array.isArray(value)) return value;
  return [...value].sort(cmp);
}

// Outer order doesn't matter, inner order doesn't matter. Stable JSON key.
export function normalizeNestedArray(value) {
  if (!Array.isArray(value)) return value;
  return value
    .map((row) => (Array.isArray(row) ? [...row].sort(cmp) : row))
    .sort((a, b) => {
      if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return a.length - b.length;
      return JSON.stringify(a).localeCompare(JSON.stringify(b));
    });
}

// 3Sum-style: outer unordered, inner unordered, numeric sort inside.
export function normalizeTriplets(value) {
  if (!Array.isArray(value)) return value;
  return value
    .map((row) => (Array.isArray(row) ? [...row].map(Number).sort((x, y) => x - y) : row))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

// Outer list unordered, inner content preserved verbatim. Used for
// permutations, N-Queens boards, palindrome partitions, coordinate pairs —
// anywhere the row itself is a meaningful sequence that must not be
// re-ordered.
export function normalizeOuter(value) {
  if (!Array.isArray(value)) return value;
  return [...value].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

// Pacific Atlantic-style: outer unordered list of [r, c] pairs. Same
// implementation as normalizeOuter — kept under a separate name for callers
// that want to express the "list of pairs" intent at the judge-config level.
export function normalizePairs(value) {
  if (!Array.isArray(value)) return value;
  return [...value].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

// Merge-Intervals-style: outer unordered list of [start, end]. Inner order
// is meaningful. Sort outer by JSON for stable comparison.
export function normalizeIntervals(value) {
  if (!Array.isArray(value)) return value;
  return [...value].sort((a, b) => {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a[0] !== b[0]) return a[0] - b[0];
      return (a[1] ?? 0) - (b[1] ?? 0);
    }
    return JSON.stringify(a).localeCompare(JSON.stringify(b));
  });
}

// Level-order tree serialization. Trims trailing nulls so [1,2,3,null] ≡ [1,2,3].
export function normalizeTreeArray(value) {
  if (!Array.isArray(value)) return value;
  const trimmed = [...value];
  while (trimmed.length && trimmed[trimmed.length - 1] === null) trimmed.pop();
  return trimmed;
}

// Linked list: just ensure array form. Already linear in harness output.
export function normalizeLinkedList(value) {
  return Array.isArray(value) ? [...value] : value;
}
