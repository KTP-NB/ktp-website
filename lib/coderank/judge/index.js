// Judge entry point. The grading pipeline calls judgeOutput() instead of
// comparing stdout to expected directly. Modes are:
//
//   exact                   — JSON deep-equal when both parse, else string ===
//   unordered_array         — flat array, order doesn't matter
//   unordered_nested_array  — nested array (e.g. groups), both axes unordered
//   unordered_triplets      — like nested_array but force numeric sort inside
//   unordered_pairs         — outer unordered, inner ordered (coordinates)
//   unordered_intervals     — sort intervals by [start, end]
//   linked_list_exact       — array-form exact compare (harness already serializes)
//   tree_level_order_exact  — array-form, trim trailing nulls before compare
//   custom                  — dispatch by metadata.judge.checker name
//
// Backward-compat:
//   - function_metadata.judge.mode wins
//   - else legacy function_metadata.orderInsensitive + nested return →
//     unordered_nested_array; with flat array return → unordered_array
//   - else exact

import { parseStdout, normalizeLines, deepEqual } from './parseStdout.js';
import {
  normalizeArray,
  normalizeNestedArray,
  normalizeTriplets,
  normalizeOuter,
  normalizePairs,
  normalizeIntervals,
  normalizeTreeArray,
  normalizeLinkedList,
} from './normalizers.js';
import { customCheckers } from './customCheckers.js';

const KNOWN_MODES = new Set([
  'exact',
  'unordered_array',
  'unordered_nested_array',
  'unordered_triplets',
  'unordered_outer',
  'unordered_pairs',
  'unordered_intervals',
  'linked_list_exact',
  'tree_level_order_exact',
  'custom',
]);

export function resolveJudgeConfig(metadata) {
  const m = metadata || {};
  if (m.judge && typeof m.judge === 'object' && m.judge.mode) {
    return { mode: m.judge.mode, checker: m.judge.checker || null, source: 'explicit' };
  }
  if (m.orderInsensitive) {
    const ret = m.return?.type;
    if (ret === 'int[][]' || ret === 'string[][]') {
      return { mode: 'unordered_nested_array', checker: null, source: 'legacy-orderInsensitive' };
    }
    if (ret === 'int[]' || ret === 'string[]') {
      return { mode: 'unordered_array', checker: null, source: 'legacy-orderInsensitive' };
    }
  }
  return { mode: 'exact', checker: null, source: 'default' };
}

function normalizeFor(mode, value) {
  switch (mode) {
    case 'unordered_array': return normalizeArray(value);
    case 'unordered_nested_array': return normalizeNestedArray(value);
    case 'unordered_triplets': return normalizeTriplets(value);
    case 'unordered_outer': return normalizeOuter(value);
    case 'unordered_pairs': return normalizePairs(value);
    case 'unordered_intervals': return normalizeIntervals(value);
    case 'tree_level_order_exact': return normalizeTreeArray(value);
    case 'linked_list_exact': return normalizeLinkedList(value);
    default: return value;
  }
}

function parseStdinJson(stdin) {
  if (stdin == null || stdin === '') return null;
  try { return JSON.parse(String(stdin)); } catch { return null; }
}

export function judgeOutput({ slug, metadata, stdin, expectedStdout, actualStdout, exitCode = 0, stderr = '' }) {
  // Hard failures bypass any judge logic.
  if (stderr && exitCode !== 0) return { passed: false, reason: 'runtime error' };

  const cfg = resolveJudgeConfig(metadata);
  if (!KNOWN_MODES.has(cfg.mode)) {
    return { passed: false, reason: `unknown judge mode "${cfg.mode}"` };
  }

  const actualParsed = parseStdout(actualStdout);
  const expectedParsed = parseStdout(expectedStdout);

  if (cfg.mode === 'custom') {
    const checker = customCheckers[cfg.checker];
    if (!checker) return { passed: false, reason: `missing custom checker "${cfg.checker}"` };
    const result = checker({
      input: parseStdinJson(stdin),
      expected: expectedParsed.ok ? expectedParsed.value : expectedStdout,
      actual: actualParsed.ok ? actualParsed.value : actualParsed.value, // raw string when not JSON
    });
    return { ...result, mode: 'custom', checker: cfg.checker };
  }

  if (cfg.mode === 'exact') {
    // Prefer JSON deep-equality so formatting differences (extra whitespace,
    // numeric vs string trivia) don't fail correct answers. Fall back to the
    // legacy line-trimmed string compare.
    if (actualParsed.ok && expectedParsed.ok) {
      const passed = deepEqual(actualParsed.value, expectedParsed.value);
      return { passed, mode: 'exact', normalizedActual: actualParsed.value, normalizedExpected: expectedParsed.value };
    }
    const a = normalizeLines(actualStdout);
    const e = normalizeLines(expectedStdout);
    return { passed: a === e, mode: 'exact', normalizedActual: a, normalizedExpected: e };
  }

  // Order-insensitive modes require parsed JSON to normalize meaningfully.
  if (!actualParsed.ok || !expectedParsed.ok) {
    // Fall back to exact string compare so we don't silently pass garbage.
    const a = normalizeLines(actualStdout);
    const e = normalizeLines(expectedStdout);
    return { passed: a === e, mode: cfg.mode, reason: 'unparseable stdout — fell back to string compare', normalizedActual: a, normalizedExpected: e };
  }
  const na = normalizeFor(cfg.mode, actualParsed.value);
  const ne = normalizeFor(cfg.mode, expectedParsed.value);
  return { passed: deepEqual(na, ne), mode: cfg.mode, normalizedActual: na, normalizedExpected: ne };
}

export { parseStdout, deepEqual, customCheckers };
