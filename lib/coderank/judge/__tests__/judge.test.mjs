// Run with: node --test lib/coderank/judge/__tests__/judge.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeOutput, resolveJudgeConfig } from '../index.js';

// ── resolveJudgeConfig ──────────────────────────────────────────────────────

test('resolveJudgeConfig: explicit judge wins', () => {
  const cfg = resolveJudgeConfig({ judge: { mode: 'unordered_array' } });
  assert.deepEqual(cfg, { mode: 'unordered_array', checker: null, source: 'explicit' });
});

test('resolveJudgeConfig: explicit custom keeps checker', () => {
  const cfg = resolveJudgeConfig({ judge: { mode: 'custom', checker: 'alien_dictionary' } });
  assert.deepEqual(cfg, { mode: 'custom', checker: 'alien_dictionary', source: 'explicit' });
});

test('resolveJudgeConfig: legacy orderInsensitive + int[][] -> unordered_nested_array', () => {
  const cfg = resolveJudgeConfig({ orderInsensitive: true, return: { type: 'int[][]' } });
  assert.equal(cfg.mode, 'unordered_nested_array');
  assert.equal(cfg.source, 'legacy-orderInsensitive');
});

test('resolveJudgeConfig: legacy orderInsensitive + int[] -> unordered_array', () => {
  const cfg = resolveJudgeConfig({ orderInsensitive: true, return: { type: 'int[]' } });
  assert.equal(cfg.mode, 'unordered_array');
});

test('resolveJudgeConfig: legacy orderInsensitive + scalar return -> exact (no-op)', () => {
  const cfg = resolveJudgeConfig({ orderInsensitive: true, return: { type: 'int' } });
  assert.equal(cfg.mode, 'exact');
});

test('resolveJudgeConfig: empty metadata defaults to exact', () => {
  assert.equal(resolveJudgeConfig({}).mode, 'exact');
  assert.equal(resolveJudgeConfig(null).mode, 'exact');
});

// ── exact mode ──────────────────────────────────────────────────────────────

test('exact: matching int passes', () => {
  const r = judgeOutput({ metadata: {}, expectedStdout: '42', actualStdout: '42' });
  assert.equal(r.passed, true);
});

test('exact: mismatching int fails', () => {
  const r = judgeOutput({ metadata: {}, expectedStdout: '42', actualStdout: '41' });
  assert.equal(r.passed, false);
});

test('exact: boolean true vs True (raw) tolerated when JSON parsing kicks in', () => {
  const r = judgeOutput({ metadata: {}, expectedStdout: 'true', actualStdout: 'true' });
  assert.equal(r.passed, true);
});

test('exact: extra trailing whitespace OK', () => {
  const r = judgeOutput({ metadata: {}, expectedStdout: '[1,2,3]', actualStdout: '[1,2,3]\n' });
  assert.equal(r.passed, true);
});

test('exact: JSON-equal but text-different passes (deep-equal preferred)', () => {
  // expected has spaces, actual is compact — deep-equal makes them match.
  const r = judgeOutput({ metadata: {}, expectedStdout: '[1, 2, 3]', actualStdout: '[1,2,3]' });
  assert.equal(r.passed, true);
});

test('exact: same-shaped wrong values fail', () => {
  const r = judgeOutput({ metadata: {}, expectedStdout: '[1,2,3]', actualStdout: '[1,2,4]' });
  assert.equal(r.passed, false);
});

// ── unordered_array ─────────────────────────────────────────────────────────

test('unordered_array: reordered passes', () => {
  const meta = { judge: { mode: 'unordered_array' } };
  const r = judgeOutput({ metadata: meta, expectedStdout: '[1,2,3]', actualStdout: '[3,1,2]' });
  assert.equal(r.passed, true);
});

test('unordered_array: missing element fails', () => {
  const meta = { judge: { mode: 'unordered_array' } };
  const r = judgeOutput({ metadata: meta, expectedStdout: '[1,2,3]', actualStdout: '[3,1]' });
  assert.equal(r.passed, false);
});

// ── unordered_nested_array ──────────────────────────────────────────────────

test('unordered_nested_array: both axes reordered passes', () => {
  const meta = { judge: { mode: 'unordered_nested_array' } };
  const expected = '[["eat","tea","ate"],["tan","nat"],["bat"]]';
  const actual   = '[["bat"],["nat","tan"],["ate","tea","eat"]]';
  const r = judgeOutput({ metadata: meta, expectedStdout: expected, actualStdout: actual });
  assert.equal(r.passed, true);
});

// ── unordered_triplets ──────────────────────────────────────────────────────

test('unordered_triplets: 3Sum across different orderings passes', () => {
  const meta = { judge: { mode: 'unordered_triplets' } };
  const expected = '[[-1,-1,2],[-1,0,1]]';
  const actual   = '[[-1,0,1],[2,-1,-1]]'; // outer swapped, inner unsorted
  const r = judgeOutput({ metadata: meta, expectedStdout: expected, actualStdout: actual });
  assert.equal(r.passed, true);
});

test('unordered_triplets: missing triplet fails', () => {
  const meta = { judge: { mode: 'unordered_triplets' } };
  const r = judgeOutput({ metadata: meta, expectedStdout: '[[-1,-1,2],[-1,0,1]]', actualStdout: '[[-1,0,1]]' });
  assert.equal(r.passed, false);
});

// ── unordered_outer (inner preserved) ───────────────────────────────────────

test('unordered_outer: permutations outer reorder passes', () => {
  const meta = { judge: { mode: 'unordered_outer' } };
  const expected = '[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]';
  const actual   = '[[3,2,1],[1,2,3],[2,1,3],[1,3,2],[3,1,2],[2,3,1]]';
  assert.equal(judgeOutput({ metadata: meta, expectedStdout: expected, actualStdout: actual }).passed, true);
});

test('unordered_outer: inner permutation reorder FAILS (would be a wrong answer)', () => {
  const meta = { judge: { mode: 'unordered_outer' } };
  // [1,2,3] is a different permutation than [3,2,1], so this should NOT match.
  const expected = '[[1,2,3]]';
  const actual   = '[[3,2,1]]';
  assert.equal(judgeOutput({ metadata: meta, expectedStdout: expected, actualStdout: actual }).passed, false);
});

// ── unordered_pairs ─────────────────────────────────────────────────────────

test('unordered_pairs: coordinate list reordered passes', () => {
  const meta = { judge: { mode: 'unordered_pairs' } };
  const r = judgeOutput({ metadata: meta, expectedStdout: '[[0,4],[1,3],[2,2]]', actualStdout: '[[2,2],[0,4],[1,3]]' });
  assert.equal(r.passed, true);
});

// ── unordered_intervals ─────────────────────────────────────────────────────

test('unordered_intervals: same intervals different outer order passes', () => {
  const meta = { judge: { mode: 'unordered_intervals' } };
  const r = judgeOutput({ metadata: meta, expectedStdout: '[[1,6],[8,10],[15,18]]', actualStdout: '[[8,10],[1,6],[15,18]]' });
  assert.equal(r.passed, true);
});

// ── custom: alien_dictionary ────────────────────────────────────────────────

test('alien_dictionary: alternate valid topo order passes', () => {
  const meta = { judge: { mode: 'custom', checker: 'alien_dictionary' } };
  const stdin = JSON.stringify({ words: ['wrt', 'wrf', 'er', 'ett', 'rftt'] });
  // Original LC expected: "wertf". Valid alternate orderings exist.
  const r = judgeOutput({ metadata: meta, stdin, expectedStdout: '"wertf"', actualStdout: '"wertf"' });
  assert.equal(r.passed, true);
});

test('alien_dictionary: invalid prefix expects empty string', () => {
  const meta = { judge: { mode: 'custom', checker: 'alien_dictionary' } };
  const stdin = JSON.stringify({ words: ['abc', 'ab'] });
  assert.equal(judgeOutput({ metadata: meta, stdin, expectedStdout: '""', actualStdout: '""' }).passed, true);
  assert.equal(judgeOutput({ metadata: meta, stdin, expectedStdout: '""', actualStdout: '"abc"' }).passed, false);
});

test('alien_dictionary: cycle expects empty string', () => {
  const meta = { judge: { mode: 'custom', checker: 'alien_dictionary' } };
  // 'z' < 'x', 'x' < 'z' creates a cycle.
  const stdin = JSON.stringify({ words: ['z', 'x', 'z'] });
  assert.equal(judgeOutput({ metadata: meta, stdin, expectedStdout: '""', actualStdout: '""' }).passed, true);
});

test('alien_dictionary: missing character fails', () => {
  const meta = { judge: { mode: 'custom', checker: 'alien_dictionary' } };
  const stdin = JSON.stringify({ words: ['ab', 'ac'] });
  // Valid ordering must include both a and (b or c). Missing b/c.
  const r = judgeOutput({ metadata: meta, stdin, expectedStdout: '"abc"', actualStdout: '"a"' });
  assert.equal(r.passed, false);
});

test('alien_dictionary: violates precedence edge fails', () => {
  const meta = { judge: { mode: 'custom', checker: 'alien_dictionary' } };
  // "ab" before "ac" means b < c. Returning "acb" violates.
  const stdin = JSON.stringify({ words: ['ab', 'ac'] });
  const r = judgeOutput({ metadata: meta, stdin, expectedStdout: '"abc"', actualStdout: '"acb"' });
  assert.equal(r.passed, false);
});

// ── custom: course_schedule_ii ──────────────────────────────────────────────

test('course_schedule_ii: valid topo order passes', () => {
  const meta = { judge: { mode: 'custom', checker: 'course_schedule_ii' } };
  const stdin = JSON.stringify({ numCourses: 4, prerequisites: [[1,0],[2,0],[3,1],[3,2]] });
  // [0,1,2,3] satisfies all prereqs.
  assert.equal(judgeOutput({ metadata: meta, stdin, expectedStdout: '[0,1,2,3]', actualStdout: '[0,2,1,3]' }).passed, true);
});

test('course_schedule_ii: infeasible expects []', () => {
  const meta = { judge: { mode: 'custom', checker: 'course_schedule_ii' } };
  const stdin = JSON.stringify({ numCourses: 2, prerequisites: [[1,0],[0,1]] });
  assert.equal(judgeOutput({ metadata: meta, stdin, expectedStdout: '[]', actualStdout: '[]' }).passed, true);
  assert.equal(judgeOutput({ metadata: meta, stdin, expectedStdout: '[]', actualStdout: '[0,1]' }).passed, false);
});

test('course_schedule_ii: out-of-range course fails', () => {
  const meta = { judge: { mode: 'custom', checker: 'course_schedule_ii' } };
  const stdin = JSON.stringify({ numCourses: 2, prerequisites: [] });
  assert.equal(judgeOutput({ metadata: meta, stdin, expectedStdout: '[0,1]', actualStdout: '[0,5]' }).passed, false);
});

test('course_schedule_ii: violates prereq fails', () => {
  const meta = { judge: { mode: 'custom', checker: 'course_schedule_ii' } };
  const stdin = JSON.stringify({ numCourses: 2, prerequisites: [[1,0]] });
  // 1 depends on 0, so 0 must come first.
  assert.equal(judgeOutput({ metadata: meta, stdin, expectedStdout: '[0,1]', actualStdout: '[1,0]' }).passed, false);
});

// ── custom: accounts_merge ──────────────────────────────────────────────────

test('accounts_merge: reordered groups + reordered emails passes', () => {
  const meta = { judge: { mode: 'custom', checker: 'accounts_merge' } };
  const stdin = JSON.stringify({
    accounts: [
      ['John', 'johnsmith@mail.com', 'john_newyork@mail.com'],
      ['John', 'johnsmith@mail.com', 'john00@mail.com'],
      ['Mary', 'mary@mail.com'],
      ['John', 'johnnybravo@mail.com'],
    ],
  });
  const actual = JSON.stringify([
    ['Mary', 'mary@mail.com'],
    ['John', 'johnnybravo@mail.com'],
    ['John', 'john_newyork@mail.com', 'john00@mail.com', 'johnsmith@mail.com'],
  ]);
  const r = judgeOutput({ metadata: meta, stdin, expectedStdout: '[]', actualStdout: actual });
  assert.equal(r.passed, true);
});

// ── unknown mode ────────────────────────────────────────────────────────────

test('unknown judge mode returns failure', () => {
  const r = judgeOutput({ metadata: { judge: { mode: 'made-up' } }, expectedStdout: '1', actualStdout: '1' });
  assert.equal(r.passed, false);
  assert.match(r.reason, /unknown judge mode/);
});
