// Runtime harness generator for CodeRank.
//
// Given a LeetCode-style bare solution snippet plus a HARNESS PROFILE (from
// lib/coderank/harnessRegistry.js), produces a full runnable program that reads
// a JSON object from stdin keyed by parameter name, drives the user's solution
// according to the profile's execution KIND, and prints a canonical,
// JSON-comparable result to stdout.
//
// Execution kinds (profile.kind):
//   return_value          — parse params, call the method, print its return
//   in_place_mutation     — call a void method, print the MUTATED param
//   object_design         — replay an operations/arguments class API
//   round_trip_strings    — decode(encode(strs)); print the round-tripped list
//   codec_round_trip_tree — Codec().deserialize(serialize(root)); print tree
//   clone_graph           — cloneGraph(node); print the clone's adjacency list
//   copy_random_list      — copyRandomList(head); print [[val,randomIdx],...]
//
// Stdin contract  (cr_test_cases.stdin):  {"<paramName>": <jsonValue>, ...}
// Stdout contract (cr_test_cases.expected_stdout):
//   boolean -> "true"/"false"; int -> digits; float -> digits (no trailing .0
//   when whole); string -> JSON string; arrays -> JSON; ListNode -> flat array;
//   TreeNode -> level-order array. Order-insensitivity is owned by the JUDGE
//   (profile.judge.mode), not the harness.
//
// Back-compat: generateHarness still accepts { functionMetadata, orderInsensitive }
// and derives a return_value profile, so older callers keep working.

import { deriveReturnValueProfile } from './harnessRegistry.js';

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java'];

const TYPES = {
  BOOLEAN: 'boolean',
  INT: 'int',
  FLOAT: 'float',
  STRING: 'string',
  INT_ARRAY: 'int[]',
  STRING_ARRAY: 'string[]',
  INT_MATRIX: 'int[][]',
  STRING_MATRIX: 'string[][]',
  LIST_NODE: 'ListNode',
  LIST_NODE_ARRAY: 'ListNode[]',
  TREE_NODE: 'TreeNode',
};

// Accept a few common aliases so callers can pass LeetCode-ish strings.
function normalizeType(raw) {
  if (!raw) return TYPES.INT_ARRAY;
  const t = String(raw).trim();
  const aliasMap = {
    bool: TYPES.BOOLEAN,
    Boolean: TYPES.BOOLEAN,
    integer: TYPES.INT,
    Integer: TYPES.INT,
    Number: TYPES.INT,
    double: TYPES.FLOAT,
    Double: TYPES.FLOAT,
    float: TYPES.FLOAT,
    String: TYPES.STRING,
    str: TYPES.STRING,
    'List<Integer>': TYPES.INT_ARRAY,
    'List<String>': TYPES.STRING_ARRAY,
    'List<List<Integer>>': TYPES.INT_MATRIX,
    'List<List<String>>': TYPES.STRING_MATRIX,
    'vector<int>': TYPES.INT_ARRAY,
    'vector<string>': TYPES.STRING_ARRAY,
    'vector<vector<int>>': TYPES.INT_MATRIX,
    'vector<vector<string>>': TYPES.STRING_MATRIX,
  };
  if (aliasMap[t]) return aliasMap[t];
  if (Object.values(TYPES).includes(t)) return t;
  return TYPES.INT_ARRAY;
}

// Turn either a profile (has .kind) or a legacy { functionMetadata, orderInsensitive }
// into a canonical profile object the builders understand.
function normalizeProfile({ profile, functionMetadata, orderInsensitive }) {
  let p = profile;
  if (!p) {
    p = deriveReturnValueProfile(functionMetadata);
    if (!p) throw new Error('generateHarness: profile or functionMetadata.name is required');
    if (orderInsensitive && !/^unordered/.test(p.judge?.mode || '')) {
      const ret = p.returnType;
      if (ret === TYPES.INT_MATRIX || ret === TYPES.STRING_MATRIX) p.judge = { mode: 'unordered_nested_array' };
      else if (ret === TYPES.INT_ARRAY || ret === TYPES.STRING_ARRAY) p.judge = { mode: 'unordered_array' };
    }
  }
  const params = Array.isArray(p.params) ? p.params.map((x) => ({ name: String(x.name), type: normalizeType(x.type) })) : [];
  return {
    kind: p.kind || 'return_value',
    name: p.name ? String(p.name) : null,
    params,
    returnType: p.returnType ? normalizeType(p.returnType) : (p.returnType === 'void' ? 'void' : normalizeType(p.returnType)),
    rawReturnType: p.returnType || null,
    mutates: p.mutates || null,
    className: p.className || null,
    ctor: Array.isArray(p.ctor) ? p.ctor : [],
    methods: p.methods || null,
    judge: p.judge || { mode: 'exact' },
  };
}

function generateHarness({ language, bareSnippet, profile, functionMetadata, orderInsensitive = false }) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new Error(`generateHarness: unsupported language "${language}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
  if (typeof bareSnippet !== 'string' || !bareSnippet.trim()) {
    throw new Error('generateHarness: bareSnippet must be a non-empty string');
  }
  const p = normalizeProfile({ profile, functionMetadata, orderInsensitive });
  const builders = KIND_BUILDERS[p.kind];
  if (!builders) throw new Error(`generateHarness: unknown harness kind "${p.kind}"`);
  const build = builders[language];
  if (!build) throw new Error(`generateHarness: kind "${p.kind}" has no ${language} builder`);
  return build({ bareSnippet, profile: p });
}

// orderInsensitive is derived from the judge mode — the registry owns ordering.
function isOrderInsensitive(profile) {
  return /^unordered/.test(profile.judge?.mode || '');
}

// outputType is what actually gets serialized to stdout: the return type for
// return_value, or the mutated param's type for in_place_mutation. Helper
// selection (node classes, toJson overloads, normalizers) keys off it — NOT the
// declared return type, which is `void` for in-place problems.
function harnessNeeds(profile, outputType = profile.returnType) {
  const orderInsensitive = isOrderInsensitive(profile);
  const paramTypes = new Set(profile.params.map((x) => x.type));
  const ret = outputType;
  const allTypes = new Set([...paramTypes, ret]);
  const usesListNodeArray = paramTypes.has(TYPES.LIST_NODE_ARRAY);
  const flatArrayReturn = ret === TYPES.INT_ARRAY || ret === TYPES.STRING_ARRAY;
  const nestedArrayReturn = ret === TYPES.INT_MATRIX || ret === TYPES.STRING_MATRIX;
  return {
    paramTypes,
    usesListNode: allTypes.has(TYPES.LIST_NODE) || usesListNodeArray,
    usesListNodeArray,
    usesTreeNode: allTypes.has(TYPES.TREE_NODE),
    usesFloat: paramTypes.has(TYPES.FLOAT) || ret === TYPES.FLOAT,
    normalizeArray: orderInsensitive && flatArrayReturn,
    normalizeNested: orderInsensitive && nestedArrayReturn,
    toJsonIntArray: ret === TYPES.INT_ARRAY || ret === TYPES.LIST_NODE,
    toJsonStringArray: ret === TYPES.STRING_ARRAY,
    toJsonIntMatrix: ret === TYPES.INT_MATRIX,
    toJsonStringMatrix: ret === TYPES.STRING_MATRIX,
    toJsonIntegerList: ret === TYPES.TREE_NODE,
  };
}

function compactBlocks(blocks) {
  return blocks.filter(Boolean).join('\n\n');
}

function stripPythonCommentedNodes(snippet) {
  return String(snippet || '')
    .replace(/^# class TreeNode:\r?\n(?:#(?: {4}|\t).*(?:\r?\n|$))*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function splitJavaImports(snippet) {
  const imports = [];
  const body = [];
  for (const line of String(snippet || '').replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim();
    if (/^import\s+[\w.*]+;\s*$/.test(trimmed)) imports.push(trimmed);
    else body.push(line);
  }
  return {
    imports: [...new Set(imports)],
    body: body.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd(),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// JavaScript
// ════════════════════════════════════════════════════════════════════════════

function jsListHelpers() {
  return `function arrayToList(values) {
  if (!values || !values.length) return null;
  const dummy = { val: 0, next: null };
  let cur = dummy;
  for (const v of values) { cur.next = { val: v, next: null }; cur = cur.next; }
  return dummy.next;
}
function listToArray(head) {
  const out = [];
  while (head) { out.push(head.val); head = head.next; }
  return out;
}`;
}

function jsTreeHelpers() {
  return `function arrayToTree(values) {
  if (!values || !values.length || values[0] === null) return null;
  const nodes = values.map((v) => (v === null ? null : { val: v, left: null, right: null }));
  let child = 1;
  for (const node of nodes) {
    if (node === null) continue;
    if (child < nodes.length) { node.left = nodes[child++]; }
    if (child < nodes.length) { node.right = nodes[child++]; }
  }
  return nodes[0];
}
function treeToArray(root) {
  if (!root) return [];
  const out = []; const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    if (node === null) { out.push(null); continue; }
    out.push(node.val);
    queue.push(node.left); queue.push(node.right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}`;
}

function jsNormalizeHelpers(needs) {
  const out = [];
  if (needs.normalizeArray || needs.normalizeNested) {
    out.push(`function normalizeArray(values) {
  return [...values].sort((a, b) => (typeof a === 'number' && typeof b === 'number') ? a - b : String(a).localeCompare(String(b)));
}`);
  }
  if (needs.normalizeNested) {
    out.push(`function normalizeNested(groups) {
  return groups.map(normalizeArray).sort((a, b) => a.length - b.length || JSON.stringify(a).localeCompare(JSON.stringify(b)));
}`);
  }
  return out;
}

function jsParamExpr(param) {
  const key = JSON.stringify(param.name);
  switch (param.type) {
    case TYPES.LIST_NODE: return `arrayToList(data[${key}])`;
    case TYPES.LIST_NODE_ARRAY: return `(data[${key}] || []).map(arrayToList)`;
    case TYPES.TREE_NODE: return `arrayToTree(data[${key}])`;
    default: return `data[${key}]`;
  }
}

function jsSerialize(valueExpr, type, orderInsensitive) {
  let value = valueExpr;
  if (type === TYPES.LIST_NODE) value = `listToArray(${value})`;
  if (type === TYPES.TREE_NODE) value = `treeToArray(${value})`;
  if (orderInsensitive) {
    if (type === TYPES.INT_MATRIX || type === TYPES.STRING_MATRIX) value = `normalizeNested(${value})`;
    else if (type === TYPES.INT_ARRAY || type === TYPES.STRING_ARRAY) value = `normalizeArray(${value})`;
  }
  // STRING returns go through JSON.stringify so they print JSON-quoted (e.g.
  // "BANC"), matching how Python json-dumps strings and the stored expected.
  if (type === TYPES.STRING) return `JSON.stringify(${value})`;
  if (type === TYPES.BOOLEAN || type === TYPES.INT || type === TYPES.FLOAT) return value;
  return `JSON.stringify(${value})`;
}

function jsHelpersFor(needs) {
  const helpers = [];
  if (needs.usesListNode) helpers.push(jsListHelpers());
  if (needs.usesTreeNode) helpers.push(jsTreeHelpers());
  helpers.push(...jsNormalizeHelpers(needs));
  return helpers;
}

// Always-injected JS preamble. LeetCode exposes a `Queue` class (and the
// MinPriorityQueue/MaxPriorityQueue heaps) in its judge sandbox; plain Node
// does not, so a solution doing `new Queue()` dies with "Queue is not defined".
// We polyfill Queue here, guarded so a user-defined Queue still wins.
function jsPolyfills() {
  return `if (typeof Queue === 'undefined') {
  globalThis.Queue = class Queue {
    constructor(items) { this._q = Array.isArray(items) ? items.slice() : []; }
    push(x) { this._q.push(x); return this; }
    enqueue(x) { this._q.push(x); return this; }
    pop() { return this._q.shift(); }
    dequeue() { return this._q.shift(); }
    front() { return this._q[0]; }
    peek() { return this._q[0]; }
    back() { return this._q[this._q.length - 1]; }
    size() { return this._q.length; }
    isEmpty() { return this._q.length === 0; }
    toArray() { return this._q.slice(); }
  };
}
// TODO: polyfill MinPriorityQueue / MaxPriorityQueue (LeetCode heap classes).`;
}

// `globals` names the solution function(s) to hoist onto globalThis after the
// user snippet, so we can invoke them as `globalThis[name](...)`. That makes a
// plain call's `this` resolve to globalThis, so recursive solutions that call
// `this.reverseList(...)` keep working instead of throwing "not a function".
function jsProgram(bareSnippet, helpers, body, globals = []) {
  const helperBlock = compactBlocks(helpers);
  const register = globals.length
    ? `\n${globals.map((n) => `if (typeof ${n} !== 'undefined') globalThis[${JSON.stringify(n)}] = ${n};`).join('\n')}\n`
    : '';
  return `${jsPolyfills()}

${bareSnippet.trimEnd()}
${register}
// ── harness ──
const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));

${helperBlock ? `${helperBlock}\n\n` : ''}${body}
`;
}

function buildReturnValueJS({ bareSnippet, profile }) {
  const needs = harnessNeeds(profile);
  const callArgs = profile.params.map(jsParamExpr).join(', ');
  const call = `globalThis[${JSON.stringify(profile.name)}](${callArgs})`;
  const out = jsSerialize(call, profile.returnType, isOrderInsensitive(profile));
  return jsProgram(bareSnippet, jsHelpersFor(needs), `console.log(${out});`, [profile.name]);
}

function buildInPlaceJS({ bareSnippet, profile }) {
  const mutated = profile.params.find((p) => p.name === profile.mutates);
  const needs = harnessNeeds(profile, mutated ? mutated.type : TYPES.INT_ARRAY);
  const lines = profile.params.map((p) => `const ${p.name} = ${jsParamExpr(p)};`);
  const callArgs = profile.params.map((p) => p.name).join(', ');
  const outExpr = jsSerialize(profile.mutates, mutated ? mutated.type : TYPES.INT_ARRAY, false);
  const body = `${lines.join('\n')}
globalThis[${JSON.stringify(profile.name)}](${callArgs});
console.log(${outExpr});`;
  return jsProgram(bareSnippet, jsHelpersFor(needs), body, [profile.name]);
}

function buildRoundTripStringsJS({ bareSnippet, profile }) {
  const key = JSON.stringify(profile.params[0]?.name || 'dummy_input');
  const body = `const strs = data[${key}];
const encoded = encode(strs);
const decoded = decode(encoded);
console.log(JSON.stringify(decoded));`;
  return jsProgram(bareSnippet, [], body);
}

function buildCodecTreeJS({ bareSnippet, profile }) {
  const key = JSON.stringify(profile.params[0]?.name || 'root');
  const body = `const codec = new Codec();
const root = arrayToTree(data[${key}]);
const out = codec.deserialize(codec.serialize(root));
console.log(JSON.stringify(treeToArray(out)));`;
  return jsProgram(bareSnippet, [jsTreeHelpers()], body);
}

function buildCloneGraphJS({ bareSnippet, profile }) {
  const key = JSON.stringify(profile.params[0]?.name || 'edges');
  const helper = `function buildGraph(adj) {
  if (!adj || !adj.length) return null;
  const nodes = adj.map((_, i) => ({ val: i + 1, neighbors: [] }));
  adj.forEach((nbrs, i) => { nodes[i].neighbors = nbrs.map((n) => nodes[n - 1]); });
  return nodes[0];
}
function graphToAdj(node) {
  if (!node) return [];
  const seen = new Map(); const order = [];
  const stack = [node];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur.val)) continue;
    seen.set(cur.val, cur); order.push(cur);
    for (const nb of cur.neighbors) if (!seen.has(nb.val)) stack.push(nb);
  }
  order.sort((a, b) => a.val - b.val);
  return order.map((n) => n.neighbors.map((nb) => nb.val).sort((a, b) => a - b));
}`;
  const body = `const node = buildGraph(data[${key}]);
const cloned = globalThis[${JSON.stringify(profile.name)}](node);
console.log(JSON.stringify(graphToAdj(cloned)));`;
  return jsProgram(bareSnippet, [helper], body, [profile.name]);
}

function buildCopyRandomJS({ bareSnippet, profile }) {
  const key = JSON.stringify(profile.params[0]?.name || 'head');
  const helper = `function buildRandomList(arr) {
  if (!arr || !arr.length) return null;
  const nodes = arr.map(([val]) => ({ val, next: null, random: null }));
  for (let i = 0; i < arr.length; i++) {
    nodes[i].next = i + 1 < nodes.length ? nodes[i + 1] : null;
    const r = arr[i][1];
    nodes[i].random = r === null || r === undefined ? null : nodes[r];
  }
  return nodes[0];
}
function randomListToArray(head) {
  const nodes = []; const index = new Map();
  for (let cur = head, i = 0; cur; cur = cur.next, i++) { nodes.push(cur); index.set(cur, i); }
  return nodes.map((n) => [n.val, n.random === null || n.random === undefined ? null : index.get(n.random)]);
}`;
  const body = `const head = buildRandomList(data[${key}]);
const copied = globalThis[${JSON.stringify(profile.name)}](head);
console.log(JSON.stringify(randomListToArray(copied)));`;
  return jsProgram(bareSnippet, [helper], body, [profile.name]);
}

function buildObjectDesignJS({ bareSnippet, profile }) {
  const voids = JSON.stringify(Object.keys(profile.methods).filter((m) => methodReturn(profile.methods[m]) === 'void'));
  const body = `const voids = new Set(${voids});
const out = [];
let obj = null;
for (let i = 0; i < data.operations.length; i++) {
  const op = data.operations[i];
  const args = data.arguments[i];
  if (op === '${profile.className}') {
    obj = new ${profile.className}(...args);
    out.push(null);
  } else {
    const result = obj[op](...args);
    out.push(voids.has(op) ? null : result);
  }
}
console.log(JSON.stringify(out));`;
  return jsProgram(bareSnippet, [], body);
}

// ════════════════════════════════════════════════════════════════════════════
// Python
// ════════════════════════════════════════════════════════════════════════════

function pyListClass() {
  return `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next`;
}

function pyListHelpers(needsArray) {
  return `def array_to_list(values):
    if not values: return None
    dummy = ListNode()
    cur = dummy
    for v in values:
        cur.next = ListNode(v); cur = cur.next
    return dummy.next
${needsArray ? `
def lists_to_nodes(lists):
    return [array_to_list(values) for values in lists]
` : ''}
def list_to_array(head):
    out = []
    while head:
        out.append(head.val); head = head.next
    return out`;
}

function pyTreeClass() {
  return `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right`;
}

function pyTreeHelpers() {
  return `def array_to_tree(values):
    if not values or values[0] is None: return None
    nodes = [None if v is None else TreeNode(v) for v in values]
    child = 1
    for node in nodes:
        if node is None: continue
        if child < len(nodes): node.left = nodes[child]; child += 1
        if child < len(nodes): node.right = nodes[child]; child += 1
    return nodes[0]

def tree_to_array(root):
    if root is None: return []
    out = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node is None:
            out.append(None); continue
        out.append(node.val)
        queue.append(node.left); queue.append(node.right)
    while out and out[-1] is None: out.pop()
    return out`;
}

function pyNormalizeHelpers(needs) {
  const out = [];
  if (needs.normalizeArray || needs.normalizeNested) out.push(`def normalize_array(values):\n    return sorted(values)`);
  if (needs.normalizeNested) out.push(`def normalize_nested(groups):\n    return sorted([sorted(g) for g in groups], key=lambda g: (len(g), g))`);
  return out;
}

function pyFormatNumberHelper() {
  return `def format_number(x):\n    return int(x) if isinstance(x, float) and x == int(x) else x`;
}

function pyParamExpr(param) {
  const key = JSON.stringify(param.name);
  switch (param.type) {
    case TYPES.LIST_NODE: return `array_to_list(data[${key}])`;
    case TYPES.LIST_NODE_ARRAY: return `lists_to_nodes(data[${key}])`;
    case TYPES.TREE_NODE: return `array_to_tree(data[${key}])`;
    default: return `data[${key}]`;
  }
}

function pySerialize(valueExpr, type, orderInsensitive) {
  let value = valueExpr;
  if (type === TYPES.LIST_NODE) value = `list_to_array(${value})`;
  if (type === TYPES.TREE_NODE) value = `tree_to_array(${value})`;
  if (orderInsensitive) {
    if (type === TYPES.INT_MATRIX || type === TYPES.STRING_MATRIX) value = `normalize_nested(${value})`;
    else if (type === TYPES.INT_ARRAY || type === TYPES.STRING_ARRAY) value = `normalize_array(${value})`;
  }
  if (type === TYPES.STRING) return `json.dumps(${value}, separators=(",", ":"))`;
  if (type === TYPES.INT) return value;
  if (type === TYPES.FLOAT) return `format_number(${value})`;
  if (type === TYPES.BOOLEAN) return `("true" if ${value} else "false")`;
  return `json.dumps(${value}, separators=(",", ":"))`;
}

function pyDefsAndHelpers(needs, { withFormatNumber } = {}) {
  const definitions = [];
  const helpers = [];
  if (needs.usesListNode) { definitions.push(pyListClass()); helpers.push(pyListHelpers(needs.usesListNodeArray)); }
  if (needs.usesTreeNode) { definitions.push(pyTreeClass()); helpers.push(pyTreeHelpers()); }
  helpers.push(...pyNormalizeHelpers(needs));
  if (withFormatNumber) helpers.push(pyFormatNumberHelper());
  return { definitions, helpers };
}

function pyProgram({ snippet, definitions, helpers, body }) {
  const definitionBlock = compactBlocks(definitions);
  const helperBlock = compactBlocks(helpers);
  // LeetCode-style preamble: pre-import the modules/names solutions reach for
  // without importing (collections, heapq, deque, defaultdict, …) so a bare
  // `collections.deque(...)` or `deque(...)` resolves instead of NameError.
  return `import json, sys, collections, heapq, bisect, math, functools, itertools, re, string
from collections import deque, defaultdict, Counter, OrderedDict
from typing import List, Optional, Dict, Tuple, Set

${definitionBlock ? `${definitionBlock}\n\n` : ''}${snippet}

# ── harness ──
${helperBlock ? `${helperBlock}\n\n` : ''}data = json.loads(sys.stdin.read())
${body}
`;
}

function buildReturnValuePy({ bareSnippet, profile }) {
  const snippet = stripPythonCommentedNodes(bareSnippet);
  const needs = harnessNeeds(profile);
  const callArgs = profile.params.map(pyParamExpr).join(', ');
  const call = `Solution().${profile.name}(${callArgs})`;
  const out = pySerialize(call, profile.returnType, isOrderInsensitive(profile));
  const { definitions, helpers } = pyDefsAndHelpers(needs, { withFormatNumber: needs.usesFloat });
  return pyProgram({ snippet, definitions, helpers, body: `print(${out})` });
}

function buildInPlacePy({ bareSnippet, profile }) {
  const snippet = stripPythonCommentedNodes(bareSnippet);
  const mutated = profile.params.find((p) => p.name === profile.mutates);
  const needs = harnessNeeds(profile, mutated ? mutated.type : TYPES.INT_ARRAY);
  const lines = profile.params.map((p) => `${p.name} = ${pyParamExpr(p)}`);
  const callArgs = profile.params.map((p) => p.name).join(', ');
  const out = pySerialize(profile.mutates, mutated ? mutated.type : TYPES.INT_ARRAY, false);
  const { definitions, helpers } = pyDefsAndHelpers(needs);
  const body = `${lines.join('\n')}
Solution().${profile.name}(${callArgs})
print(${out})`;
  return pyProgram({ snippet, definitions, helpers, body });
}

function buildRoundTripStringsPy({ bareSnippet, profile }) {
  const snippet = stripPythonCommentedNodes(bareSnippet);
  const key = JSON.stringify(profile.params[0]?.name || 'dummy_input');
  const body = `encoded = encode(data[${key}])
decoded = decode(encoded)
print(json.dumps(decoded, separators=(",", ":")))`;
  return pyProgram({ snippet, definitions: [], helpers: [], body });
}

function buildCodecTreePy({ bareSnippet, profile }) {
  const snippet = stripPythonCommentedNodes(bareSnippet);
  const key = JSON.stringify(profile.params[0]?.name || 'root');
  const body = `codec = Codec()
root = array_to_tree(data[${key}])
out = codec.deserialize(codec.serialize(root))
print(json.dumps(tree_to_array(out), separators=(",", ":")))`;
  return pyProgram({ snippet, definitions: [pyTreeClass()], helpers: [pyTreeHelpers()], body });
}

function buildCloneGraphPy({ bareSnippet, profile }) {
  const snippet = stripPythonCommentedNodes(bareSnippet);
  const key = JSON.stringify(profile.params[0]?.name || 'edges');
  const defs = [`class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []`];
  const helpers = [`def build_graph(adj):
    if not adj: return None
    nodes = [Node(i + 1) for i in range(len(adj))]
    for i, nbrs in enumerate(adj):
        nodes[i].neighbors = [nodes[n - 1] for n in nbrs]
    return nodes[0]

def graph_to_adj(node):
    if not node: return []
    seen = {}
    stack = [node]
    while stack:
        cur = stack.pop()
        if cur.val in seen: continue
        seen[cur.val] = cur
        for nb in cur.neighbors:
            if nb.val not in seen: stack.append(nb)
    return [sorted(nb.val for nb in seen[v].neighbors) for v in sorted(seen)]`];
  const body = `node = build_graph(data[${key}])
cloned = Solution().cloneGraph(node)
print(json.dumps(graph_to_adj(cloned), separators=(",", ":")))`;
  return pyProgram({ snippet, definitions: defs, helpers, body });
}

function buildCopyRandomPy({ bareSnippet, profile }) {
  const snippet = stripPythonCommentedNodes(bareSnippet);
  const key = JSON.stringify(profile.params[0]?.name || 'head');
  const defs = [`class Node:
    def __init__(self, x, next=None, random=None):
        self.val = int(x)
        self.next = next
        self.random = random`];
  const helpers = [`def build_random_list(arr):
    if not arr: return None
    nodes = [Node(v[0]) for v in arr]
    for i, v in enumerate(arr):
        nodes[i].next = nodes[i + 1] if i + 1 < len(nodes) else None
        nodes[i].random = None if v[1] is None else nodes[v[1]]
    return nodes[0]

def random_list_to_array(head):
    nodes, index = [], {}
    cur, i = head, 0
    while cur:
        nodes.append(cur); index[id(cur)] = i; cur = cur.next; i += 1
    return [[n.val, None if n.random is None else index[id(n.random)]] for n in nodes]`];
  const body = `head = build_random_list(data[${key}])
copied = Solution().copyRandomList(head)
print(json.dumps(random_list_to_array(copied), separators=(",", ":")))`;
  return pyProgram({ snippet, definitions: defs, helpers, body });
}

function buildObjectDesignPy({ bareSnippet, profile }) {
  const snippet = stripPythonCommentedNodes(bareSnippet);
  const voidMethods = Object.keys(profile.methods).filter((m) => methodReturn(profile.methods[m]) === 'void');
  const body = `ops = data["operations"]
args = data["arguments"]
obj = None
out = []
for op, a in zip(ops, args):
    if op == "${profile.className}":
        obj = ${profile.className}(*a)
        out.append(None)
    else:
        result = getattr(obj, op)(*a)
        out.append(None if ${JSON.stringify(voidMethods)}.count(op) else _emit(result))
print(json.dumps(out, separators=(",", ":")))`;
  const helpers = [`def _emit(v):
    if isinstance(v, float) and v == int(v):
        v = int(v)
    return v`];
  // bisect/heapq/defaultdict/deque/OrderedDict now come from pyProgram's preamble.
  return pyProgram({ snippet, definitions: [], helpers, body });
}

// ════════════════════════════════════════════════════════════════════════════
// Java
// ════════════════════════════════════════════════════════════════════════════

const JAVA_TYPE = {
  [TYPES.BOOLEAN]: 'boolean',
  [TYPES.INT]: 'int',
  [TYPES.FLOAT]: 'double',
  [TYPES.STRING]: 'String',
  [TYPES.INT_ARRAY]: 'int[]',
  [TYPES.STRING_ARRAY]: 'String[]',
  [TYPES.INT_MATRIX]: 'int[][]',
  [TYPES.STRING_MATRIX]: 'String[][]',
  [TYPES.LIST_NODE]: 'ListNode',
  [TYPES.LIST_NODE_ARRAY]: 'ListNode[]',
  [TYPES.TREE_NODE]: 'TreeNode',
};

function isJavaCharMatrixParam(param) {
  return param.type === TYPES.STRING_MATRIX && ['board', 'grid'].includes(String(param.name || ''));
}

function javaParseCall(param) {
  const key = JSON.stringify(param.name);
  switch (param.type) {
    case TYPES.BOOLEAN: return `parseBool(valueForKey(input, ${key}))`;
    case TYPES.INT: return `parseInt(valueForKey(input, ${key}))`;
    case TYPES.FLOAT: return `parseDouble(valueForKey(input, ${key}))`;
    case TYPES.STRING: return `parseString(valueForKey(input, ${key}))`;
    case TYPES.INT_ARRAY: return `parseIntArray(valueForKey(input, ${key}))`;
    case TYPES.STRING_ARRAY: return `parseStringArray(valueForKey(input, ${key}))`;
    case TYPES.INT_MATRIX: return `parseIntMatrix(valueForKey(input, ${key}))`;
    case TYPES.STRING_MATRIX:
      return isJavaCharMatrixParam(param)
        ? `parseCharMatrix(valueForKey(input, ${key}))`
        : `parseStringMatrix(valueForKey(input, ${key}))`;
    case TYPES.LIST_NODE: return `arrayToList(parseIntArray(valueForKey(input, ${key})))`;
    case TYPES.LIST_NODE_ARRAY: return `parseListNodeArray(valueForKey(input, ${key}))`;
    case TYPES.TREE_NODE: return `arrayToTree(parseNullableIntArray(valueForKey(input, ${key})))`;
    default: return `parseIntArray(valueForKey(input, ${key}))`;
  }
}

function javaSerializePrint(valueExpr, type, orderInsensitive) {
  let value = valueExpr;
  if (type === TYPES.LIST_NODE) value = `listToArray(${value})`;
  if (type === TYPES.TREE_NODE) value = `treeToArray(${value})`;
  if (orderInsensitive) {
    if (type === TYPES.INT_MATRIX) value = `normalizeNestedInt(${value})`;
    else if (type === TYPES.STRING_MATRIX) value = `normalizeNestedString(${value})`;
    else if (type === TYPES.INT_ARRAY) value = `normalizeIntArray(${value})`;
    else if (type === TYPES.STRING_ARRAY) value = `normalizeStringArray(${value})`;
  }
  switch (type) {
    case TYPES.BOOLEAN:
    case TYPES.INT:
      return `System.out.println(${value});`;
    case TYPES.STRING:
      // Print JSON-quoted (e.g. "BANC") so it matches Python's json.dumps and
      // the stored expected output instead of the bare unquoted token.
      return `System.out.println(jsonStr(${value}));`;
    case TYPES.FLOAT:
      return `System.out.println(formatNumber(${value}));`;
    default:
      return `System.out.println(toJson(${value}));`;
  }
}

function javaJsonStringHelper() {
  return `static String jsonStr(String s) {
    if (s == null) return "null";
    StringBuilder sb = new StringBuilder("\\"");
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '\\\\' || c == '"') sb.append('\\\\').append(c);
      else sb.append(c);
    }
    return sb.append('"').toString();
  }`;
}

// Helper blocks shared by the return_value/in_place Java builders. Returns an
// array of method source strings, emitted only when the profile needs them.
function javaReturnValueHelpers(profile, { printType, outputIsCharMatrix = false }) {
  const needs = harnessNeeds(profile, printType);
  const orderInsensitive = isOrderInsensitive(profile);
  const blocks = [];
  blocks.push(javaValueForKeyHelper());
  if (needs.paramTypes.has(TYPES.BOOLEAN)) blocks.push('static boolean parseBool(String s) { return s.trim().equalsIgnoreCase("true"); }');
  if (needs.paramTypes.has(TYPES.INT)) blocks.push('static int parseInt(String s) { return Integer.parseInt(s.replaceAll("[^0-9-]", "")); }');
  if (needs.paramTypes.has(TYPES.FLOAT)) blocks.push('static double parseDouble(String s) { return Double.parseDouble(s.replaceAll("[^0-9eE+.-]", "")); }');
  if (needs.paramTypes.has(TYPES.STRING)) blocks.push(`static String parseString(String s) { s = s.trim(); return s.length() >= 2 && s.charAt(0) == '"' ? s.substring(1, s.length() - 1) : s; }`);
  if (printType === TYPES.STRING) blocks.push(javaJsonStringHelper());
  if (needs.paramTypes.has(TYPES.INT_ARRAY) || needs.paramTypes.has(TYPES.INT_MATRIX) || needs.usesListNode) blocks.push(javaParseIntArrayHelper());
  if (needs.usesTreeNode) blocks.push(javaParseNullableIntArrayHelper());
  if (needs.paramTypes.has(TYPES.INT_MATRIX)) blocks.push(javaParseIntMatrixHelper());
  if (needs.paramTypes.has(TYPES.STRING_ARRAY) || needs.paramTypes.has(TYPES.STRING_MATRIX)) blocks.push(javaParseStringArrayHelper());
  if (needs.paramTypes.has(TYPES.STRING_MATRIX)) blocks.push(javaParseStringMatrixHelper());
  if (profile.params.some(isJavaCharMatrixParam)) blocks.push(javaParseCharMatrixHelper());
  if (needs.paramTypes.has(TYPES.INT_MATRIX) || needs.paramTypes.has(TYPES.STRING_MATRIX) || needs.usesListNodeArray) blocks.push(javaTopLevelArraysHelper());
  if (needs.usesListNode) blocks.push(javaListHelpers());
  if (needs.usesListNodeArray) blocks.push(javaParseListNodeArrayHelper());
  if (needs.usesTreeNode) blocks.push(javaTreeHelpers());
  if (needs.usesFloat || printType === TYPES.FLOAT) blocks.push('static String formatNumber(double v) { return v == Math.rint(v) && !Double.isInfinite(v) ? String.valueOf((long) v) : String.valueOf(v); }');
  if (orderInsensitive && printType === TYPES.INT_ARRAY) blocks.push('static int[] normalizeIntArray(int[] a) { Arrays.sort(a); return a; }');
  if (orderInsensitive && printType === TYPES.STRING_ARRAY) blocks.push('static String[] normalizeStringArray(String[] a) { Arrays.sort(a); return a; }');
  if (orderInsensitive && printType === TYPES.INT_MATRIX) blocks.push(`static int[][] normalizeNestedInt(int[][] g) {\n    for (int[] row : g) Arrays.sort(row);\n    Arrays.sort(g, (a, b) -> a.length != b.length ? Integer.compare(a.length, b.length) : toJson(a).compareTo(toJson(b)));\n    return g;\n  }`);
  if (orderInsensitive && printType === TYPES.STRING_MATRIX) blocks.push(`static String[][] normalizeNestedString(String[][] g) {\n    for (String[] row : g) Arrays.sort(row);\n    Arrays.sort(g, (a, b) -> a.length != b.length ? Integer.compare(a.length, b.length) : toJson(a).compareTo(toJson(b)));\n    return g;\n  }`);
  if (needs.toJsonIntArray || needs.toJsonIntMatrix || (orderInsensitive && printType === TYPES.INT_MATRIX)) blocks.push(javaToJsonIntArray());
  if (needs.toJsonIntMatrix) { blocks.push(javaToJsonIntMatrix()); blocks.push(javaToJsonIntegerListOfList()); }
  if (!outputIsCharMatrix && (needs.toJsonStringArray || needs.toJsonStringMatrix || (orderInsensitive && printType === TYPES.STRING_MATRIX))) blocks.push(javaToJsonStringArray());
  if (!outputIsCharMatrix && needs.toJsonStringMatrix) blocks.push(javaToJsonStringMatrix());
  if (outputIsCharMatrix) { blocks.push(javaToJsonCharArray()); blocks.push(javaToJsonCharMatrix()); }
  if (needs.toJsonIntegerList) blocks.push(javaToJsonIntegerList());
  return blocks;
}

function javaValueForKeyHelper() {
  return `static String valueForKey(String json, String key) {
    int keyPos = json.indexOf("\\"" + key + "\\"");
    if (keyPos < 0) return json.trim();
    int colon = json.indexOf(':', keyPos);
    int start = colon + 1;
    while (start < json.length() && Character.isWhitespace(json.charAt(start))) start++;
    int end = scanValueEnd(json, start);
    return json.substring(start, end).trim();
  }
  static int scanValueEnd(String s, int start) {
    int depth = 0; boolean str = false, esc = false;
    for (int i = start; i < s.length(); i++) {
      char c = s.charAt(i);
      if (str) { if (esc) esc = false; else if (c == '\\\\') esc = true; else if (c == '"') str = false; continue; }
      if (c == '"') str = true;
      else if (c == '[' || c == '{') depth++;
      else if (c == ']' || c == '}') { if (depth == 0) return i; depth--; }
      else if (c == ',' && depth == 0) return i;
    }
    return s.length();
  }`;
}
function javaParseIntArrayHelper() {
  return `static int[] parseIntArray(String s) {
    ArrayList<Integer> out = new ArrayList<>();
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("-?\\\\d+").matcher(s);
    while (m.find()) out.add(Integer.parseInt(m.group()));
    return out.stream().mapToInt(Integer::intValue).toArray();
  }`;
}
function javaParseNullableIntArrayHelper() {
  return `static Integer[] parseNullableIntArray(String s) {
    ArrayList<Integer> out = new ArrayList<>();
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("null|-?\\\\d+").matcher(s);
    while (m.find()) {
      String tok = m.group();
      out.add(tok.equals("null") ? null : Integer.parseInt(tok));
    }
    return out.toArray(new Integer[0]);
  }`;
}
function javaParseIntMatrixHelper() {
  return `static int[][] parseIntMatrix(String s) {
    ArrayList<int[]> rows = new ArrayList<>();
    for (String row : topLevelArrays(s)) rows.add(parseIntArray(row));
    return rows.toArray(new int[0][]);
  }`;
}
function javaParseStringArrayHelper() {
  return `static String[] parseStringArray(String s) {
    ArrayList<String> out = new ArrayList<>();
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\\\\\"(.*?)\\\\\\"").matcher(s);
    while (m.find()) out.add(m.group(1));
    return out.toArray(new String[0]);
  }`;
}
function javaParseStringMatrixHelper() {
  return `static String[][] parseStringMatrix(String s) {
    ArrayList<String[]> rows = new ArrayList<>();
    for (String row : topLevelArrays(s)) rows.add(parseStringArray(row));
    return rows.toArray(new String[0][]);
  }`;
}
function javaParseCharMatrixHelper() {
  return `static char[][] parseCharMatrix(String s) {
    String[][] str = parseStringMatrix(s);
    char[][] out = new char[str.length][];
    for (int i = 0; i < str.length; i++) {
      out[i] = new char[str[i].length];
      for (int j = 0; j < str[i].length; j++) out[i][j] = str[i][j].charAt(0);
    }
    return out;
  }`;
}
function javaTopLevelArraysHelper() {
  return `static ArrayList<String> topLevelArrays(String s) {
    ArrayList<String> rows = new ArrayList<>(); int depth = 0, start = -1;
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '[') { depth++; if (depth == 2) start = i; }
      else if (c == ']') { if (depth == 2 && start >= 0) rows.add(s.substring(start, i + 1)); depth--; }
    }
    return rows;
  }`;
}
function javaListHelpers() {
  return `static ListNode arrayToList(int[] values) {
    ListNode dummy = new ListNode(0), cur = dummy;
    for (int v : values) { cur.next = new ListNode(v); cur = cur.next; }
    return dummy.next;
  }
  static int[] listToArray(ListNode head) {
    ArrayList<Integer> out = new ArrayList<>();
    while (head != null) { out.add(head.val); head = head.next; }
    return out.stream().mapToInt(Integer::intValue).toArray();
  }`;
}
function javaParseListNodeArrayHelper() {
  return `static ListNode[] parseListNodeArray(String s) {
    ArrayList<ListNode> out = new ArrayList<>();
    for (String row : topLevelArrays(s)) out.add(arrayToList(parseIntArray(row)));
    return out.toArray(new ListNode[0]);
  }`;
}
function javaTreeHelpers() {
  return `static TreeNode arrayToTree(Integer[] values) {
    if (values.length == 0 || values[0] == null) return null;
    TreeNode[] nodes = new TreeNode[values.length];
    for (int i = 0; i < values.length; i++) nodes[i] = values[i] == null ? null : new TreeNode(values[i]);
    int child = 1;
    for (TreeNode node : nodes) {
      if (node == null) continue;
      if (child < nodes.length) node.left = nodes[child++];
      if (child < nodes.length) node.right = nodes[child++];
    }
    return nodes[0];
  }
  static ArrayList<Integer> treeToArray(TreeNode root) {
    ArrayList<Integer> out = new ArrayList<>();
    if (root == null) return out;
    Queue<TreeNode> q = new LinkedList<>(); q.add(root);
    while (!q.isEmpty()) {
      TreeNode n = q.poll();
      if (n == null) { out.add(null); continue; }
      out.add(n.val); q.add(n.left); q.add(n.right);
    }
    while (!out.isEmpty() && out.get(out.size() - 1) == null) out.remove(out.size() - 1);
    return out;
  }`;
}
function javaToJsonIntArray() {
  return `static String toJson(int[] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(a[i]); } return sb.append(']').toString(); }`;
}
function javaToJsonIntMatrix() {
  return `static String toJson(int[][] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(toJson(a[i])); } return sb.append(']').toString(); }`;
}
function javaToJsonIntegerListOfList() {
  return `static String toJson(List<List<Integer>> a) {
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < a.size(); i++) {
      if (i > 0) sb.append(',');
      sb.append('[');
      List<Integer> row = a.get(i);
      for (int j = 0; j < row.size(); j++) { if (j > 0) sb.append(','); sb.append(row.get(j)); }
      sb.append(']');
    }
    return sb.append(']').toString();
  }`;
}
function javaToJsonStringArray() {
  return `static String toJson(String[] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append('"').append(a[i]).append('"'); } return sb.append(']').toString(); }`;
}
function javaToJsonStringMatrix() {
  return `static String toJson(String[][] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(toJson(a[i])); } return sb.append(']').toString(); }`;
}
function javaToJsonIntegerList() {
  return `static String toJson(ArrayList<Integer> a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.size(); i++) { if (i > 0) sb.append(','); sb.append(a.get(i) == null ? "null" : a.get(i).toString()); } return sb.append(']').toString(); }`;
}
function javaToJsonCharArray() {
  return `static String toJson(char[] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append('"').append(a[i]).append('"'); } return sb.append(']').toString(); }`;
}
function javaToJsonCharMatrix() {
  return `static String toJson(char[][] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(toJson(a[i])); } return sb.append(']').toString(); }`;
}

function javaProgram({ snippet, classes, body, helperBlocks }) {
  const importBlock = [...new Set([...snippet.imports, 'import java.io.*;', 'import java.util.*;'])].join('\n');
  return `${importBlock}

${classes.length ? `${classes.join('\n')}\n` : ''}

${snippet.body}

public class Main {
  public static void main(String[] args) throws Exception {
    String input = new String(System.in.readAllBytes());
    ${body}
  }

  ${helperBlocks.join('\n\n  ')}
}
`;
}

function javaNodeClasses(needs) {
  const classes = [];
  if (needs.usesListNode) classes.push('class ListNode { int val; ListNode next; ListNode(int val) { this.val = val; } }');
  if (needs.usesTreeNode) classes.push('class TreeNode { int val; TreeNode left, right; TreeNode(int val) { this.val = val; } }');
  return classes;
}

function buildReturnValueJava({ bareSnippet, profile }) {
  const snippet = splitJavaImports(bareSnippet);
  const needs = harnessNeeds(profile);
  const callArgs = profile.params.map(javaParseCall).join(', ');
  const call = `new Solution().${profile.name}(${callArgs})`;
  const print = javaSerializePrint(call, profile.returnType, isOrderInsensitive(profile));
  return javaProgram({
    snippet,
    classes: javaNodeClasses(needs),
    body: print,
    helperBlocks: javaReturnValueHelpers(profile, { printType: profile.returnType }),
  });
}

function buildInPlaceJava({ bareSnippet, profile }) {
  const snippet = splitJavaImports(bareSnippet);
  const mutatedType = (profile.params.find((p) => p.name === profile.mutates) || profile.params[0]).type;
  const needs = harnessNeeds(profile, mutatedType);
  const decls = profile.params.map((p) => {
    const t = isJavaCharMatrixParam(p) ? 'char[][]' : JAVA_TYPE[p.type];
    return `${t} ${p.name} = ${javaParseCall(p)};`;
  });
  const callArgs = profile.params.map((p) => p.name).join(', ');
  const mutated = profile.params.find((p) => p.name === profile.mutates) || profile.params[0];
  const print = javaSerializePrint(profile.mutates, mutated.type, false);
  const body = `${decls.join('\n    ')}
    new Solution().${profile.name}(${callArgs});
    ${print}`;
  return javaProgram({
    snippet,
    classes: javaNodeClasses(needs),
    body,
    helperBlocks: javaReturnValueHelpers(profile, { printType: mutated.type, outputIsCharMatrix: isJavaCharMatrixParam(mutated) }),
  });
}

function buildRoundTripStringsJava({ bareSnippet, profile }) {
  const snippet = splitJavaImports(bareSnippet);
  const key = JSON.stringify(profile.params[0]?.name || 'dummy_input');
  const body = `List<String> strs = Arrays.asList(parseStringArray(valueForKey(input, ${key})));
    Codec codec = new Codec();
    List<String> decoded = codec.decode(codec.encode(strs));
    System.out.println(toJson(decoded));`;
  const helperBlocks = [
    javaValueForKeyHelper(),
    javaTopLevelArraysHelper(),
    javaParseStringArrayHelper(),
    `static String toJson(List<String> a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.size(); i++) { if (i > 0) sb.append(','); sb.append('"').append(a.get(i)).append('"'); } return sb.append(']').toString(); }`,
  ];
  return javaProgram({ snippet, classes: [], body, helperBlocks });
}

function buildCodecTreeJava({ bareSnippet, profile }) {
  const snippet = splitJavaImports(bareSnippet);
  const key = JSON.stringify(profile.params[0]?.name || 'root');
  const body = `Codec codec = new Codec();
    TreeNode root = arrayToTree(parseNullableIntArray(valueForKey(input, ${key})));
    TreeNode out = codec.deserialize(codec.serialize(root));
    System.out.println(toJson(treeToArray(out)));`;
  const helperBlocks = [
    javaValueForKeyHelper(),
    javaParseNullableIntArrayHelper(),
    javaTreeHelpers(),
    javaToJsonIntegerList(),
  ];
  return javaProgram({ snippet, classes: ['class TreeNode { int val; TreeNode left, right; TreeNode(int val) { this.val = val; } }'], body, helperBlocks });
}

function buildCloneGraphJava({ bareSnippet, profile }) {
  const snippet = splitJavaImports(bareSnippet);
  const key = JSON.stringify(profile.params[0]?.name || 'edges');
  const body = `int[][] adj = parseIntMatrix(valueForKey(input, ${key}));
    Node node = buildGraph(adj);
    Node cloned = new Solution().cloneGraph(node);
    System.out.println(graphToAdj(cloned));`;
  const helperBlocks = [
    javaValueForKeyHelper(),
    javaParseIntArrayHelper(),
    javaParseIntMatrixHelper(),
    javaTopLevelArraysHelper(),
    `static Node buildGraph(int[][] adj) {
    if (adj.length == 0) return null;
    Node[] nodes = new Node[adj.length];
    for (int i = 0; i < adj.length; i++) nodes[i] = new Node(i + 1);
    for (int i = 0; i < adj.length; i++) for (int n : adj[i]) nodes[i].neighbors.add(nodes[n - 1]);
    return nodes[0];
  }`,
    `static String graphToAdj(Node node) {
    TreeMap<Integer, Node> seen = new TreeMap<>();
    Deque<Node> stack = new ArrayDeque<>();
    if (node != null) stack.push(node);
    while (!stack.isEmpty()) {
      Node cur = stack.pop();
      if (seen.containsKey(cur.val)) continue;
      seen.put(cur.val, cur);
      for (Node nb : cur.neighbors) if (!seen.containsKey(nb.val)) stack.push(nb);
    }
    StringBuilder sb = new StringBuilder("[");
    boolean first = true;
    for (Node n : seen.values()) {
      if (!first) sb.append(','); first = false;
      ArrayList<Integer> vals = new ArrayList<>();
      for (Node nb : n.neighbors) vals.add(nb.val);
      Collections.sort(vals);
      sb.append('[');
      for (int i = 0; i < vals.size(); i++) { if (i > 0) sb.append(','); sb.append(vals.get(i)); }
      sb.append(']');
    }
    return sb.append(']').toString();
  }`,
  ];
  return javaProgram({ snippet, classes: ['class Node { public int val; public List<Node> neighbors; public Node(int val) { this.val = val; this.neighbors = new ArrayList<>(); } }'], body, helperBlocks });
}

function buildCopyRandomJava({ bareSnippet, profile }) {
  const snippet = splitJavaImports(bareSnippet);
  const key = JSON.stringify(profile.params[0]?.name || 'head');
  const body = `Node head = buildRandomList(valueForKey(input, ${key}));
    Node copied = new Solution().copyRandomList(head);
    System.out.println(randomListToArray(copied));`;
  const helperBlocks = [
    javaValueForKeyHelper(),
    javaTopLevelArraysHelper(),
    `static Node buildRandomList(String s) {
    ArrayList<String> rows = topLevelArrays(s);
    if (rows.isEmpty()) return null;
    int n = rows.size();
    Node[] nodes = new Node[n];
    Integer[] randoms = new Integer[n];
    for (int i = 0; i < n; i++) {
      String inner = rows.get(i).trim();
      inner = inner.substring(1, inner.length() - 1).trim();
      String[] parts = inner.split(",");
      nodes[i] = new Node(Integer.parseInt(parts[0].trim()));
      String r = parts[1].trim();
      randoms[i] = r.equals("null") ? null : Integer.parseInt(r);
    }
    for (int i = 0; i < n; i++) {
      nodes[i].next = i + 1 < n ? nodes[i + 1] : null;
      nodes[i].random = randoms[i] == null ? null : nodes[randoms[i]];
    }
    return nodes[0];
  }`,
    `static String randomListToArray(Node head) {
    ArrayList<Node> nodes = new ArrayList<>();
    IdentityHashMap<Node, Integer> index = new IdentityHashMap<>();
    for (Node cur = head; cur != null; cur = cur.next) { index.put(cur, nodes.size()); nodes.add(cur); }
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < nodes.size(); i++) {
      if (i > 0) sb.append(',');
      Node n = nodes.get(i);
      sb.append('[').append(n.val).append(',').append(n.random == null ? "null" : index.get(n.random)).append(']');
    }
    return sb.append(']').toString();
  }`,
  ];
  return javaProgram({ snippet, classes: ['class Node { int val; Node next; Node random; public Node(int val) { this.val = val; this.next = null; this.random = null; } }'], body, helperBlocks });
}

function buildObjectDesignJava({ bareSnippet, profile }) {
  const snippet = splitJavaImports(bareSnippet);
  const { className, ctor, methods } = profile;
  const ctorCall = `new ${className}(${ctor.map((type, idx) => typedArg(type, idx)).join(', ')})`;
  const cases = Object.entries(methods).map(([name, sig]) => {
    const call = `obj.${name}(${methodArgs(sig).map((type, idx) => typedArg(type, idx)).join(', ')})`;
    const returnType = methodReturn(sig);
    return `      case "${name}": {
        ${returnType === 'void' ? `${call}; out.add(null);` : `out.add(formatValue(${call}));`}
        break;
      }`;
  }).join('\n');
  const body = `ArrayList<String> ops = parseStringArray(valueForKey(input, "operations"));
    ArrayList<String> argRows = topLevelArrays(valueForKey(input, "arguments"));
    ${className} obj = null;
    ArrayList<Object> out = new ArrayList<>();
    for (int i = 0; i < ops.size(); i++) {
      String op = ops.get(i);
      Object[] callArgs = parseArgs(argRows.get(i));
      if (op.equals("${className}")) { obj = ${ctorCall}; out.add(null); continue; }
      switch (op) {
${cases}
        default: throw new RuntimeException("Unknown op: " + op);
      }
    }
    System.out.println(toJson(out));`;
  return javaProgram({ snippet, classes: [], body, helperBlocks: [javaObjectDesignHelpers()] });
}

// One big helper block ported from the original custom object-design harness.
function javaObjectDesignHelpers() {
  return `static String valueForKey(String json, String key) {
    int keyPos = json.indexOf("\\"" + key + "\\"");
    if (keyPos < 0) return json.trim();
    int colon = json.indexOf(':', keyPos), start = colon + 1;
    while (start < json.length() && Character.isWhitespace(json.charAt(start))) start++;
    int end = scanValueEnd(json, start);
    return json.substring(start, end).trim();
  }
  static int scanValueEnd(String s, int start) {
    int depth = 0; boolean str = false, esc = false;
    for (int i = start; i < s.length(); i++) {
      char c = s.charAt(i);
      if (str) { if (esc) esc = false; else if (c == '\\\\') esc = true; else if (c == '"') str = false; continue; }
      if (c == '"') str = true;
      else if (c == '[' || c == '{') depth++;
      else if (c == ']' || c == '}') { if (depth == 0) return i; depth--; }
      else if (c == ',' && depth == 0) return i;
    }
    return s.length();
  }
  static int[] parseIntArray(String s) {
    ArrayList<Integer> out = new ArrayList<>();
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("-?\\\\d+").matcher(s);
    while (m.find()) out.add(Integer.parseInt(m.group()));
    return out.stream().mapToInt(Integer::intValue).toArray();
  }
  static ArrayList<String> parseStringArray(String s) {
    ArrayList<String> out = new ArrayList<>();
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\\\\\"(.*?)\\\\\\"").matcher(s);
    while (m.find()) out.add(m.group(1));
    return out;
  }
  static ArrayList<String> topLevelArrays(String s) {
    ArrayList<String> rows = new ArrayList<>(); int depth = 0, start = -1;
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '[') { depth++; if (depth == 2) start = i; }
      else if (c == ']') { if (depth == 2 && start >= 0) rows.add(s.substring(start, i + 1)); depth--; }
    }
    return rows;
  }
  static Object[] parseArgs(String s) {
    ArrayList<Object> out = new ArrayList<>();
    for (String v : splitTopLevel(s)) out.add(parseValue(v));
    return out.toArray();
  }
  static ArrayList<String> splitTopLevel(String s) {
    String body = s.trim();
    if (body.startsWith("[") && body.endsWith("]")) body = body.substring(1, body.length() - 1);
    ArrayList<String> out = new ArrayList<>(); int depth = 0, start = 0; boolean str = false, esc = false;
    for (int i = 0; i < body.length(); i++) {
      char c = body.charAt(i);
      if (str) { if (esc) esc = false; else if (c == '\\\\') esc = true; else if (c == '"') str = false; continue; }
      if (c == '"') str = true; else if (c == '[') depth++; else if (c == ']') depth--; else if (c == ',' && depth == 0) { out.add(body.substring(start, i).trim()); start = i + 1; }
    }
    if (!body.trim().isEmpty()) out.add(body.substring(start).trim());
    return out;
  }
  static Object parseValue(String s) {
    s = s.trim();
    if (s.startsWith("\\"")) return s.substring(1, s.length() - 1);
    if (s.startsWith("[")) return parseIntArray(s);
    if (s.contains(".")) return Double.parseDouble(s);
    return Integer.parseInt(s);
  }
  static Object formatValue(Object v) { if (v instanceof Double && ((Double) v) % 1 == 0) return ((Double) v).intValue(); return v; }
  static String toJson(Object v) {
    if (v == null) return "null";
    if (v instanceof String) return "\\"" + v + "\\"";
    if (v instanceof int[]) return toJson((int[]) v);
    if (v instanceof Object[]) return toJson(Arrays.asList((Object[]) v));
    if (v instanceof Iterable) { StringBuilder sb = new StringBuilder("["); int i = 0; for (Object item : (Iterable<?>) v) { if (i++ > 0) sb.append(','); sb.append(toJson(item)); } return sb.append(']').toString(); }
    return String.valueOf(v);
  }
  static String toJson(int[] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(a[i]); } return sb.append(']').toString(); }`;
}

// ── object-design shared bits ───────────────────────────────────────────────
function methodArgs(sig) {
  return Array.isArray(sig?.args) ? sig.args : [];
}
function methodReturn(sig) {
  return typeof sig === 'string' ? sig : sig?.returnType || 'void';
}
function typedArg(type, idx) {
  if (type === 'int') return `(int)(Integer)callArgs[${idx}]`;
  if (type === 'string') return `(String)callArgs[${idx}]`;
  if (type === 'int[]') return `(int[])callArgs[${idx}]`;
  if (type === 'float') return `(double)(Double)callArgs[${idx}]`;
  return `callArgs[${idx}]`;
}

// ════════════════════════════════════════════════════════════════════════════

// ── linked_list_cycle ───────────────────────────────────────────────────────
// hasCycle(head) takes only the head, but the test stdin carries `pos`, the
// index the tail links back to. The harness builds the (possibly cyclic) list
// from the array + pos, then calls hasCycle(head). The generic return_value
// harness got this wrong: it passed `pos` as a phantom 2nd arg and built an
// acyclic list, so every cyclic case returned false.

function buildLinkedListCyclePy({ bareSnippet, profile }) {
  const snippet = stripPythonCommentedNodes(bareSnippet);
  const [head, pos] = profile.params;
  const body = `arr = data[${JSON.stringify(head.name)}]
pos = data[${JSON.stringify(pos.name)}]
head = array_to_list(arr)
if pos is not None and pos >= 0 and arr:
    nodes = []
    cur = head
    while cur:
        nodes.append(cur); cur = cur.next
    nodes[-1].next = nodes[pos]
print("true" if Solution().${profile.name}(head) else "false")`;
  return pyProgram({ snippet, definitions: [pyListClass()], helpers: [pyListHelpers(false)], body });
}

function buildLinkedListCycleJS({ bareSnippet, profile }) {
  const [head, pos] = profile.params;
  const body = `const arr = data[${JSON.stringify(head.name)}];
const pos = data[${JSON.stringify(pos.name)}];
const head = arrayToList(arr);
if (pos !== undefined && pos >= 0 && arr.length) {
  const nodes = []; let cur = head;
  while (cur) { nodes.push(cur); cur = cur.next; }
  nodes[nodes.length - 1].next = nodes[pos];
}
console.log(globalThis[${JSON.stringify(profile.name)}](head) ? 'true' : 'false');`;
  return jsProgram(bareSnippet, [jsListHelpers()], body, [profile.name]);
}

function buildLinkedListCycleJava({ bareSnippet, profile }) {
  const snippet = splitJavaImports(bareSnippet);
  const [head, pos] = profile.params;
  const body = `int[] arr = parseIntArray(valueForKey(input, ${JSON.stringify(head.name)}));
    int pos = parseInt(valueForKey(input, ${JSON.stringify(pos.name)}));
    ListNode head = arrayToList(arr);
    if (pos >= 0 && arr.length > 0) {
      ArrayList<ListNode> nodes = new ArrayList<>();
      for (ListNode c = head; c != null; c = c.next) nodes.add(c);
      nodes.get(nodes.size() - 1).next = nodes.get(pos);
    }
    System.out.println(new Solution().${profile.name}(head));`;
  const helperBlocks = [
    javaValueForKeyHelper(),
    javaParseIntArrayHelper(),
    'static int parseInt(String s) { return Integer.parseInt(s.replaceAll("[^0-9-]", "")); }',
    `static ListNode arrayToList(int[] values) {
    ListNode dummy = new ListNode(0), cur = dummy;
    for (int v : values) { cur.next = new ListNode(v); cur = cur.next; }
    return dummy.next;
  }`,
  ];
  return javaProgram({ snippet, classes: ['class ListNode { int val; ListNode next; ListNode(int val) { this.val = val; } }'], body, helperBlocks });
}

const KIND_BUILDERS = {
  return_value: { javascript: buildReturnValueJS, python: buildReturnValuePy, java: buildReturnValueJava },
  linked_list_cycle: { javascript: buildLinkedListCycleJS, python: buildLinkedListCyclePy, java: buildLinkedListCycleJava },
  in_place_mutation: { javascript: buildInPlaceJS, python: buildInPlacePy, java: buildInPlaceJava },
  object_design: { javascript: buildObjectDesignJS, python: buildObjectDesignPy, java: buildObjectDesignJava },
  round_trip_strings: { javascript: buildRoundTripStringsJS, python: buildRoundTripStringsPy, java: buildRoundTripStringsJava },
  codec_round_trip_tree: { javascript: buildCodecTreeJS, python: buildCodecTreePy, java: buildCodecTreeJava },
  clone_graph: { javascript: buildCloneGraphJS, python: buildCloneGraphPy, java: buildCloneGraphJava },
  copy_random_list: { javascript: buildCopyRandomJS, python: buildCopyRandomPy, java: buildCopyRandomJava },
};

export { generateHarness, SUPPORTED_LANGUAGES, TYPES, normalizeType };
