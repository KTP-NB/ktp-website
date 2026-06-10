// Run with: node --test lib/coderank/__tests__/harness.test.mjs
//
// Structural tests for the profile-driven harness generator. These assert the
// generated program shape per execution kind WITHOUT running it — the live
// execution proof is scripts/coderank/verify_local.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateHarness } from '../harness.js';
import { getProfile } from '../harnessRegistry.js';

const STUB = {
  python: 'class Solution:\n    pass',
  javascript: '// user code',
  java: 'class Solution {}',
};
const gen = (slug, lang) => generateHarness({ language: lang, bareSnippet: STUB[lang], profile: getProfile(slug) });

// ── return_value ─────────────────────────────────────────────────────────────

test('return_value: calls the method and prints its result', () => {
  const py = gen('two-sum', 'python');
  assert.match(py, /Solution\(\)\.twoSum\(data\["nums"\], data\["target"\]\)/);
  const js = gen('two-sum', 'javascript');
  // Calls route through globalThis[name] so recursive `this.fn()` solutions resolve.
  assert.match(js, /console\.log\(JSON\.stringify\(normalizeArray\(globalThis\["twoSum"\]\(/);
  assert.match(js, /globalThis\["twoSum"\] = twoSum;/);
  const java = gen('two-sum', 'java');
  assert.match(java, /new Solution\(\)\.twoSum\(/);
});

test('return_value float: uses number formatting that drops trailing .0', () => {
  assert.match(gen('powx-n', 'python'), /format_number\(/);
  assert.match(gen('powx-n', 'java'), /formatNumber\(/);
});

test('return_value ListNode[] param: parses an array of lists', () => {
  assert.match(gen('merge-k-sorted-lists', 'python'), /lists_to_nodes\(/);
  assert.match(gen('merge-k-sorted-lists', 'javascript'), /\.map\(arrayToList\)/);
  assert.match(gen('merge-k-sorted-lists', 'java'), /parseListNodeArray\(/);
});

test('return_value TreeNode return: serializes level-order', () => {
  assert.match(gen('invert-binary-tree', 'python'), /tree_to_array\(/);
  assert.match(gen('invert-binary-tree', 'java'), /treeToArray\(/);
});

// ── in_place_mutation ────────────────────────────────────────────────────────

test('in_place: prints the MUTATED param, never the void return', () => {
  const py = gen('rotate-image', 'python');
  assert.match(py, /Solution\(\)\.rotate\(matrix\)/);
  assert.match(py, /print\(json\.dumps\(matrix/);
  assert.doesNotMatch(py, /print\(\s*Solution\(\)\.rotate/);

  const js = gen('rotate-image', 'javascript');
  assert.match(js, /console\.log\(JSON\.stringify\(matrix\)\)/);
  assert.doesNotMatch(js, /console\.log\(\s*rotate\(/);
});

test('in_place Java: void call is a statement, not inside System.out.println', () => {
  const java = gen('rotate-image', 'java');
  assert.match(java, /new Solution\(\)\.rotate\(matrix\);/);
  assert.match(java, /System\.out\.println\(toJson\(matrix\)\);/);
  assert.doesNotMatch(java, /System\.out\.println\(\s*new Solution\(\)\.rotate/);
});

test('in_place char-matrix board: Java parses/serializes char[][]', () => {
  const java = gen('surrounded-regions', 'java');
  assert.match(java, /char\[\]\[\] board = parseCharMatrix\(/);
  assert.match(java, /static String toJson\(char\[\]\[\] a\)/);
  assert.match(java, /System\.out\.println\(toJson\(board\)\);/);
});

test('in_place ListNode: reorder-list prints the list as an array', () => {
  assert.match(gen('reorder-list', 'python'), /print\(json\.dumps\(list_to_array\(head\)/);
  assert.match(gen('reorder-list', 'java'), /System\.out\.println\(toJson\(listToArray\(head\)\)\);/);
});

// ── object_design ────────────────────────────────────────────────────────────

test('object_design: replays operations/arguments, no Solution()', () => {
  const py = gen('min-stack', 'python');
  assert.match(py, /obj = MinStack\(\*a\)/);
  assert.match(py, /getattr\(obj, op\)/);
  const java = gen('min-stack', 'java');
  assert.match(java, /Object\[\] callArgs = parseArgs/);
  assert.doesNotMatch(java, /args\[/); // no clash with main(String[] args)
  assert.doesNotMatch(java, /new Solution\(\)/);
});

// ── codec / clone / random / round-trip ─────────────────────────────────────

test('codec_round_trip_tree: deserialize(serialize(root))', () => {
  assert.match(gen('serialize-and-deserialize-binary-tree', 'python'), /codec\.deserialize\(codec\.serialize\(root\)\)/);
  assert.match(gen('serialize-and-deserialize-binary-tree', 'javascript'), /codec\.deserialize\(codec\.serialize\(root\)\)/);
  assert.match(gen('serialize-and-deserialize-binary-tree', 'java'), /codec\.deserialize\(codec\.serialize\(root\)\)/);
});

test('clone_graph: builds the graph, clones, serializes adjacency list', () => {
  assert.match(gen('clone-graph', 'python'), /Solution\(\)\.cloneGraph\(node\)/);
  assert.match(gen('clone-graph', 'python'), /graph_to_adj\(/);
  assert.match(gen('clone-graph', 'java'), /graphToAdj\(/);
});

test('copy_random_list: serializes value + random index', () => {
  assert.match(gen('copy-list-with-random-pointer', 'javascript'), /randomListToArray\(/);
  assert.match(gen('copy-list-with-random-pointer', 'python'), /random_list_to_array\(/);
});

test('round_trip_strings: decode(encode(strs)), never compares encoded form', () => {
  assert.match(gen('encode-and-decode-strings', 'python'), /decode\(encoded\)/);
  assert.match(gen('encode-and-decode-strings', 'javascript'), /decode\(encoded\)/);
});

// ── linked_list_cycle ────────────────────────────────────────────────────────

test('linked_list_cycle: builds the cycle at pos, calls hasCycle(head) only', () => {
  const py = gen('linked-list-cycle', 'python');
  assert.match(py, /nodes\[-1\]\.next = nodes\[pos\]/);
  assert.match(py, /Solution\(\)\.hasCycle\(head\)/);
  assert.doesNotMatch(py, /hasCycle\(head, pos\)/);
  const java = gen('linked-list-cycle', 'java');
  assert.match(java, /nodes\.get\(nodes\.size\(\) - 1\)\.next = nodes\.get\(pos\)/);
  assert.match(java, /new Solution\(\)\.hasCycle\(head\)/);
});

// ── back-compat shim ─────────────────────────────────────────────────────────

test('back-compat: functionMetadata derives a return_value profile', () => {
  const code = generateHarness({
    language: 'python',
    bareSnippet: STUB.python,
    functionMetadata: { name: 'foo', params: [{ name: 'nums', type: 'int[]' }], return: { type: 'int' } },
  });
  assert.match(code, /Solution\(\)\.foo\(data\["nums"\]\)/);
});

test('every registry profile generates all three languages without throwing', async () => {
  const { listSlugs } = await import('../harnessRegistry.js');
  for (const slug of listSlugs()) {
    for (const lang of ['python', 'javascript', 'java']) {
      assert.doesNotThrow(() => gen(slug, lang), `${slug}/${lang}`);
    }
  }
});
