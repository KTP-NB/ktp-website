// Runtime harness generator for CodeRank.
//
// Given a LeetCode-style bare `Solution` snippet plus function metadata,
// produces a full runnable program that:
//   1. Reads a JSON object from stdin keyed by parameter name
//   2. Parses each parameter into the language-native type
//   3. Invokes the user's solution method
//   4. Prints the result to stdout in a canonical JSON-compatible form
//
// Stdin contract (set by `cr_test_cases.stdin`):
//   {"<paramName>": <jsonValue>, ...}
//
// Stdout contract (compared against `cr_test_cases.expected_stdout`):
//   - boolean -> "true" / "false"
//   - int     -> decimal digits
//   - string  -> JSON string, e.g. "\"abc\""
//   - arrays  -> JSON form, e.g. "[1,2,3]", "[[1,2],[3,4]]"
//   - ListNode/TreeNode return -> serialized as a flat / level-order array
//
// To add a new language: implement an entry in LANGUAGE_BUILDERS that returns
// a string, then add the canonical name to SUPPORTED_LANGUAGES. See README.

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java'];

// Canonical type names used by functionMetadata. Anything outside this set
// is treated as int[] (with a console.warn) so callers fail loudly.
const TYPES = {
  BOOLEAN: 'boolean',
  INT: 'int',
  STRING: 'string',
  INT_ARRAY: 'int[]',
  STRING_ARRAY: 'string[]',
  INT_MATRIX: 'int[][]',
  STRING_MATRIX: 'string[][]',
  LIST_NODE: 'ListNode',
  TREE_NODE: 'TreeNode',
};

// Accept a few common aliases so callers can pass LeetCode-ish strings.
function normalizeType(raw) {
  if (!raw) return TYPES.INT_ARRAY;
  const t = String(raw).trim();
  const aliasMap = {
    'bool': TYPES.BOOLEAN,
    'Boolean': TYPES.BOOLEAN,
    'integer': TYPES.INT,
    'Integer': TYPES.INT,
    'Number': TYPES.INT,
    'String': TYPES.STRING,
    'str': TYPES.STRING,
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

function normalizeMetadata(meta) {
  if (!meta || !meta.name) {
    throw new Error('generateHarness: functionMetadata.name is required');
  }
  const params = Array.isArray(meta.params) ? meta.params : [];
  return {
    name: String(meta.name),
    params: params.map((p) => ({ name: String(p.name), type: normalizeType(p.type) })),
    return: { type: normalizeType(meta.return?.type) },
  };
}

function generateHarness({ language, bareSnippet, functionMetadata, orderInsensitive = false }) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new Error(`generateHarness: unsupported language "${language}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
  if (typeof bareSnippet !== 'string' || !bareSnippet.trim()) {
    throw new Error('generateHarness: bareSnippet must be a non-empty string');
  }
  const meta = normalizeMetadata(functionMetadata);
  const builder = LANGUAGE_BUILDERS[language];
  return builder({ bareSnippet, meta, orderInsensitive });
}

function harnessNeeds(meta, orderInsensitive) {
  const paramTypes = new Set(meta.params.map((p) => p.type));
  const allTypes = new Set([...paramTypes, meta.return.type]);
  const flatArrayReturn = meta.return.type === TYPES.INT_ARRAY || meta.return.type === TYPES.STRING_ARRAY;
  const nestedArrayReturn = meta.return.type === TYPES.INT_MATRIX || meta.return.type === TYPES.STRING_MATRIX;
  return {
    paramTypes,
    usesListNode: allTypes.has(TYPES.LIST_NODE),
    usesTreeNode: allTypes.has(TYPES.TREE_NODE),
    normalizeArray: orderInsensitive && flatArrayReturn,
    normalizeNested: orderInsensitive && nestedArrayReturn,
    toJsonIntArray: meta.return.type === TYPES.INT_ARRAY || meta.return.type === TYPES.LIST_NODE,
    toJsonStringArray: meta.return.type === TYPES.STRING_ARRAY,
    toJsonIntMatrix: meta.return.type === TYPES.INT_MATRIX,
    toJsonStringMatrix: meta.return.type === TYPES.STRING_MATRIX,
    toJsonIntegerList: meta.return.type === TYPES.TREE_NODE,
  };
}

function compactBlocks(blocks) {
  return blocks.filter(Boolean).join('\n\n');
}

function stripPythonCommentedTreeNode(snippet) {
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
    if (/^import\s+[\w.*]+;\s*$/.test(trimmed)) {
      imports.push(trimmed);
    } else {
      body.push(line);
    }
  }
  return {
    imports: [...new Set(imports)],
    body: body.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// JavaScript
// ────────────────────────────────────────────────────────────────────────────

function jsParamExpr(param) {
  const key = JSON.stringify(param.name);
  switch (param.type) {
    case TYPES.LIST_NODE:
      return `arrayToList(data[${key}])`;
    case TYPES.TREE_NODE:
      return `arrayToTree(data[${key}])`;
    default:
      return `data[${key}]`;
  }
}

function jsOutputExpr(callExpr, returnType, orderInsensitive) {
  let value = callExpr;
  switch (returnType) {
    case TYPES.LIST_NODE:
      value = `listToArray(${value})`;
      break;
    case TYPES.TREE_NODE:
      value = `treeToArray(${value})`;
      break;
    default:
      break;
  }
  if (orderInsensitive) {
    if (returnType === TYPES.INT_MATRIX || returnType === TYPES.STRING_MATRIX) value = `normalizeNested(${value})`;
    else if (returnType === TYPES.INT_ARRAY || returnType === TYPES.STRING_ARRAY) value = `normalizeArray(${value})`;
  }
  if (returnType === TYPES.BOOLEAN || returnType === TYPES.INT || returnType === TYPES.STRING) {
    return value;
  }
  return `JSON.stringify(${value})`;
}

function buildJavaScript({ bareSnippet, meta, orderInsensitive }) {
  const callArgs = meta.params.map(jsParamExpr).join(', ');
  const call = `${meta.name}(${callArgs})`;
  const outExpr = jsOutputExpr(call, meta.return.type, orderInsensitive);
  const needs = harnessNeeds(meta, orderInsensitive);
  const helpers = [];
  if (needs.usesListNode) {
    helpers.push(`function arrayToList(values) {
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
}`);
  }
  if (needs.usesTreeNode) {
    helpers.push(`function arrayToTree(values) {
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
}`);
  }
  if (needs.normalizeArray || needs.normalizeNested) {
    helpers.push(`function normalizeArray(values) {
  return [...values].sort((a, b) => (typeof a === 'number' && typeof b === 'number') ? a - b : String(a).localeCompare(String(b)));
}`);
  }
  if (needs.normalizeNested) {
    helpers.push(`function normalizeNested(groups) {
  return groups.map(normalizeArray).sort((a, b) => a.length - b.length || JSON.stringify(a).localeCompare(JSON.stringify(b)));
}`);
  }
  const helperBlock = compactBlocks(helpers);
  return `${bareSnippet.trimEnd()}

// ── harness ──
const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));

${helperBlock ? `${helperBlock}\n\n` : ''}console.log(${outExpr});
`;
}

// ────────────────────────────────────────────────────────────────────────────
// Python
// ────────────────────────────────────────────────────────────────────────────

function pyParamExpr(param) {
  const key = JSON.stringify(param.name);
  switch (param.type) {
    case TYPES.LIST_NODE:
      return `array_to_list(data[${key}])`;
    case TYPES.TREE_NODE:
      return `array_to_tree(data[${key}])`;
    default:
      return `data[${key}]`;
  }
}

function pyOutputExpr(callExpr, returnType, orderInsensitive) {
  let value = callExpr;
  switch (returnType) {
    case TYPES.LIST_NODE:
      value = `list_to_array(${value})`;
      break;
    case TYPES.TREE_NODE:
      value = `tree_to_array(${value})`;
      break;
    default:
      break;
  }
  if (orderInsensitive) {
    if (returnType === TYPES.INT_MATRIX || returnType === TYPES.STRING_MATRIX) value = `normalize_nested(${value})`;
    else if (returnType === TYPES.INT_ARRAY || returnType === TYPES.STRING_ARRAY) value = `normalize_array(${value})`;
  }
  if (returnType === TYPES.STRING) return `json.dumps(${value}, separators=(",", ":"))`;
  if (returnType === TYPES.INT) return value;
  if (returnType === TYPES.BOOLEAN) return `("true" if ${value} else "false")`;
  return `json.dumps(${value}, separators=(",", ":"))`;
}

function buildPython({ bareSnippet, meta, orderInsensitive }) {
  const snippet = stripPythonCommentedTreeNode(bareSnippet);
  const callArgs = meta.params.map(pyParamExpr).join(', ');
  const call = `Solution().${meta.name}(${callArgs})`;
  const outExpr = pyOutputExpr(call, meta.return.type, orderInsensitive);
  const needs = harnessNeeds(meta, orderInsensitive);
  const definitions = [];
  const helpers = [];
  if (needs.usesListNode) {
    definitions.push(`class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next`);
    helpers.push(`def array_to_list(values):
    if not values: return None
    dummy = ListNode()
    cur = dummy
    for v in values:
        cur.next = ListNode(v); cur = cur.next
    return dummy.next

def list_to_array(head):
    out = []
    while head:
        out.append(head.val); head = head.next
    return out`);
  }
  if (needs.usesTreeNode) {
    definitions.push(`class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right`);
    helpers.push(`def array_to_tree(values):
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
    return out`);
  }
  if (needs.normalizeArray || needs.normalizeNested) {
    helpers.push(`def normalize_array(values):
    return sorted(values)`);
  }
  if (needs.normalizeNested) {
    helpers.push(`def normalize_nested(groups):
    return sorted([sorted(g) for g in groups], key=lambda g: (len(g), g))`);
  }
  const definitionBlock = compactBlocks(definitions);
  const helperBlock = compactBlocks(helpers);
  return `import json, sys
from typing import List, Optional, Dict, Tuple, Set

${definitionBlock ? `${definitionBlock}\n\n` : ''}${snippet}

# ── harness ──
${helperBlock ? `${helperBlock}\n\n` : ''}data = json.loads(sys.stdin.read())
print(${outExpr})
`;
}

// ────────────────────────────────────────────────────────────────────────────
// Java
// ────────────────────────────────────────────────────────────────────────────

const JAVA_TYPE = {
  [TYPES.BOOLEAN]: 'boolean',
  [TYPES.INT]: 'int',
  [TYPES.STRING]: 'String',
  [TYPES.INT_ARRAY]: 'int[]',
  [TYPES.STRING_ARRAY]: 'String[]',
  [TYPES.INT_MATRIX]: 'int[][]',
  [TYPES.STRING_MATRIX]: 'String[][]',
  [TYPES.LIST_NODE]: 'ListNode',
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
    case TYPES.STRING: return `parseString(valueForKey(input, ${key}))`;
    case TYPES.INT_ARRAY: return `parseIntArray(valueForKey(input, ${key}))`;
    case TYPES.STRING_ARRAY: return `parseStringArray(valueForKey(input, ${key}))`;
    case TYPES.INT_MATRIX: return `parseIntMatrix(valueForKey(input, ${key}))`;
    case TYPES.STRING_MATRIX:
      return isJavaCharMatrixParam(param)
        ? `parseCharMatrix(valueForKey(input, ${key}))`
        : `parseStringMatrix(valueForKey(input, ${key}))`;
    case TYPES.LIST_NODE: return `arrayToList(parseIntArray(valueForKey(input, ${key})))`;
    case TYPES.TREE_NODE: return `arrayToTree(parseNullableIntArray(valueForKey(input, ${key})))`;
    default: return `parseIntArray(valueForKey(input, ${key}))`;
  }
}

function javaPrint(callExpr, returnType, orderInsensitive) {
  let value = callExpr;
  if (returnType === TYPES.LIST_NODE) value = `listToArray(${value})`;
  if (returnType === TYPES.TREE_NODE) value = `treeToArray(${value})`;

  if (orderInsensitive) {
    if (returnType === TYPES.INT_MATRIX) value = `normalizeNestedInt(${value})`;
    else if (returnType === TYPES.STRING_MATRIX) value = `normalizeNestedString(${value})`;
    else if (returnType === TYPES.INT_ARRAY) value = `normalizeIntArray(${value})`;
    else if (returnType === TYPES.STRING_ARRAY) value = `normalizeStringArray(${value})`;
  }

  switch (returnType) {
    case TYPES.BOOLEAN:
    case TYPES.INT:
    case TYPES.STRING:
      return `System.out.println(${value});`;
    case TYPES.LIST_NODE:
    case TYPES.TREE_NODE:
    case TYPES.INT_ARRAY:
    case TYPES.INT_MATRIX:
    case TYPES.STRING_ARRAY:
    case TYPES.STRING_MATRIX:
      return `System.out.println(toJson(${value}));`;
    default:
      return `System.out.println(${value});`;
  }
}

function buildJava({ bareSnippet, meta, orderInsensitive }) {
  const snippet = splitJavaImports(bareSnippet);
  const sigParams = meta.params.map((p) => `${JAVA_TYPE[p.type]} ${p.name}`).join(', ');
  const callArgs = meta.params.map(javaParseCall).join(', ');
  const call = `new Solution().${meta.name}(${callArgs})`;
  const printStmt = javaPrint(call, meta.return.type, orderInsensitive);
  const needs = harnessNeeds(meta, orderInsensitive);
  const needsCharMatrix = meta.params.some(isJavaCharMatrixParam);
  const helperBlocks = [];
  const classes = [];
  // sigParams/return-type are not directly emitted — Solution comes from user.
  // We just need them in scope conceptually; suppress lint by referencing length.
  void sigParams;

  if (needs.usesListNode) classes.push('class ListNode { int val; ListNode next; ListNode(int val) { this.val = val; } }');
  if (needs.usesTreeNode) classes.push('class TreeNode { int val; TreeNode left, right; TreeNode(int val) { this.val = val; } }');

  helperBlocks.push(`static String valueForKey(String json, String key) {
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
  }`);

  if (needs.paramTypes.has(TYPES.BOOLEAN)) helperBlocks.push('static boolean parseBool(String s) { return s.trim().equalsIgnoreCase("true"); }');
  if (needs.paramTypes.has(TYPES.INT)) helperBlocks.push('static int parseInt(String s) { return Integer.parseInt(s.replaceAll("[^0-9-]", "")); }');
  if (needs.paramTypes.has(TYPES.STRING)) helperBlocks.push(`static String parseString(String s) { s = s.trim(); return s.length() >= 2 && s.charAt(0) == '"' ? s.substring(1, s.length() - 1) : s; }`);
  if (needs.paramTypes.has(TYPES.INT_ARRAY) || needs.paramTypes.has(TYPES.INT_MATRIX) || needs.usesListNode) {
    helperBlocks.push(`static int[] parseIntArray(String s) {
    ArrayList<Integer> out = new ArrayList<>();
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("-?\\\\d+").matcher(s);
    while (m.find()) out.add(Integer.parseInt(m.group()));
    return out.stream().mapToInt(Integer::intValue).toArray();
  }`);
  }
  if (needs.usesTreeNode) {
    helperBlocks.push(`static Integer[] parseNullableIntArray(String s) {
    ArrayList<Integer> out = new ArrayList<>();
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("null|-?\\\\d+").matcher(s);
    while (m.find()) {
      String tok = m.group();
      out.add(tok.equals("null") ? null : Integer.parseInt(tok));
    }
    return out.toArray(new Integer[0]);
  }`);
  }
  if (needs.paramTypes.has(TYPES.INT_MATRIX)) {
    helperBlocks.push(`static int[][] parseIntMatrix(String s) {
    ArrayList<int[]> rows = new ArrayList<>();
    for (String row : topLevelArrays(s)) rows.add(parseIntArray(row));
    return rows.toArray(new int[0][]);
  }`);
  }
  if (needs.paramTypes.has(TYPES.STRING_ARRAY) || needs.paramTypes.has(TYPES.STRING_MATRIX)) {
    helperBlocks.push(`static String[] parseStringArray(String s) {
    ArrayList<String> out = new ArrayList<>();
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\\\\\"(.*?)\\\\\\"").matcher(s);
    while (m.find()) out.add(m.group(1));
    return out.toArray(new String[0]);
  }`);
  }
  if (needs.paramTypes.has(TYPES.STRING_MATRIX)) {
    helperBlocks.push(`static String[][] parseStringMatrix(String s) {
    ArrayList<String[]> rows = new ArrayList<>();
    for (String row : topLevelArrays(s)) rows.add(parseStringArray(row));
    return rows.toArray(new String[0][]);
  }`);
  }
  if (needsCharMatrix) {
    helperBlocks.push(`static char[][] parseCharMatrix(String s) {
    String[][] str = parseStringMatrix(s);
    char[][] out = new char[str.length][];
    for (int i = 0; i < str.length; i++) {
      out[i] = new char[str[i].length];
      for (int j = 0; j < str[i].length; j++) out[i][j] = str[i][j].charAt(0);
    }
    return out;
  }`);
  }
  if (needs.paramTypes.has(TYPES.INT_MATRIX) || needs.paramTypes.has(TYPES.STRING_MATRIX)) {
    helperBlocks.push(`static ArrayList<String> topLevelArrays(String s) {
    ArrayList<String> rows = new ArrayList<>(); int depth = 0, start = -1;
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '[') { depth++; if (depth == 2) start = i; }
      else if (c == ']') { if (depth == 2 && start >= 0) rows.add(s.substring(start, i + 1)); depth--; }
    }
    return rows;
  }`);
  }
  if (needs.usesListNode) {
    helperBlocks.push(`static ListNode arrayToList(int[] values) {
    ListNode dummy = new ListNode(0), cur = dummy;
    for (int v : values) { cur.next = new ListNode(v); cur = cur.next; }
    return dummy.next;
  }
  static int[] listToArray(ListNode head) {
    ArrayList<Integer> out = new ArrayList<>();
    while (head != null) { out.add(head.val); head = head.next; }
    return out.stream().mapToInt(Integer::intValue).toArray();
  }`);
  }
  if (needs.usesTreeNode) {
    helperBlocks.push(`static TreeNode arrayToTree(Integer[] values) {
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
  }`);
  }
  if (orderInsensitive && meta.return.type === TYPES.INT_ARRAY) helperBlocks.push('static int[] normalizeIntArray(int[] a) { Arrays.sort(a); return a; }');
  if (orderInsensitive && meta.return.type === TYPES.STRING_ARRAY) helperBlocks.push('static String[] normalizeStringArray(String[] a) { Arrays.sort(a); return a; }');
  if (orderInsensitive && meta.return.type === TYPES.INT_MATRIX) {
    helperBlocks.push(`static int[][] normalizeNestedInt(int[][] g) {
    for (int[] row : g) Arrays.sort(row);
    Arrays.sort(g, (a, b) -> a.length != b.length ? Integer.compare(a.length, b.length) : toJson(a).compareTo(toJson(b)));
    return g;
  }`);
  }
  if (orderInsensitive && meta.return.type === TYPES.STRING_MATRIX) {
    helperBlocks.push(`static String[][] normalizeNestedString(String[][] g) {
    for (String[] row : g) Arrays.sort(row);
    Arrays.sort(g, (a, b) -> a.length != b.length ? Integer.compare(a.length, b.length) : toJson(a).compareTo(toJson(b)));
    return g;
  }`);
  }
  if (needs.toJsonIntArray || needs.toJsonIntMatrix || (orderInsensitive && meta.return.type === TYPES.INT_MATRIX)) {
    helperBlocks.push(`static String toJson(int[] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(a[i]); } return sb.append(']').toString(); }`);
  }
  if (needs.toJsonIntMatrix) {
    helperBlocks.push(`static String toJson(int[][] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(toJson(a[i])); } return sb.append(']').toString(); }`);
    helperBlocks.push(`static String toJson(List<List<Integer>> a) {
    StringBuilder sb = new StringBuilder("[");
    for (int i = 0; i < a.size(); i++) {
      if (i > 0) sb.append(',');
      sb.append('[');
      List<Integer> row = a.get(i);
      for (int j = 0; j < row.size(); j++) {
        if (j > 0) sb.append(',');
        sb.append(row.get(j));
      }
      sb.append(']');
    }
    return sb.append(']').toString();
  }`);
  }
  if (needs.toJsonStringArray || needs.toJsonStringMatrix || (orderInsensitive && meta.return.type === TYPES.STRING_MATRIX)) {
    helperBlocks.push(`static String toJson(String[] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append('"').append(a[i]).append('"'); } return sb.append(']').toString(); }`);
  }
  if (needs.toJsonStringMatrix) {
    helperBlocks.push(`static String toJson(String[][] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(toJson(a[i])); } return sb.append(']').toString(); }`);
  }
  if (needs.toJsonIntegerList) {
    helperBlocks.push(`static String toJson(ArrayList<Integer> a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.size(); i++) { if (i > 0) sb.append(','); sb.append(a.get(i) == null ? "null" : a.get(i).toString()); } return sb.append(']').toString(); }`);
  }

  const importBlock = [...new Set([...snippet.imports, 'import java.io.*;', 'import java.util.*;'])].join('\n');

  return `${importBlock}

${classes.length ? `${classes.join('\n')}\n` : ''}

${snippet.body}

public class Main {
  public static void main(String[] args) throws Exception {
    String input = new String(System.in.readAllBytes());
    ${printStmt}
  }

  ${helperBlocks.join('\n\n  ')}
}
`;
}

const LANGUAGE_BUILDERS = {
  javascript: buildJavaScript,
  python: buildPython,
  java: buildJava,
};

export {
  generateHarness,
  SUPPORTED_LANGUAGES,
  TYPES,
  normalizeType,
};
