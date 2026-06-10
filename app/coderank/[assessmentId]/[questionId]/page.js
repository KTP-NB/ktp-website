'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft, Loader2, Clock, Play, Send, AlertCircle, CheckCircle2, XCircle,
  AlertTriangle, RotateCcw, ChevronLeft, ChevronRight, Lock,
  Check, Plus,
} from 'lucide-react';
import AuthGate from '@/components/authgate';
import { useConfirmToast } from '@/components/ConfirmToast';
import { api } from '@/lib/coderank/clientFetch';
import { generateHarness } from '@/lib/coderank/harness';
import { getProfile } from '@/lib/coderank/harnessRegistry';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e] text-white/50">
      <Loader2 className="animate-spin" />
    </div>
  ),
});

function defineCodeRankTheme(monaco) {
  monaco.editor.defineTheme('coderank-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569cd6' },
      { token: 'keyword.control', foreground: 'c586c0' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'type', foreground: '4ec9b0' },
      { token: 'function', foreground: 'dcdcaa' },
      { token: 'delimiter.parenthesis', foreground: 'ffd700' },
      { token: 'delimiter.square', foreground: 'ffd700' },
      { token: 'delimiter.curly', foreground: 'ffd700' },
      { token: 'identifier', foreground: 'd4d4d4' },
    ],
    colors: {
      'editor.background': '#1F1F1F',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editorGutter.background': '#1F1F1F',
      'editor.lineHighlightBackground': '#2B2B2B',
      'editor.lineHighlightBorder': '#00000000',
      'editorCursor.foreground': '#FFFFFF',
      'editor.selectionBackground': '#3A3D41',
      'editor.inactiveSelectionBackground': '#2D2F33',
      'editorIndentGuide.background1': '#404040',
      'editorIndentGuide.activeBackground1': '#707070',
      'editorBracketMatch.background': '#264F7826',
      'editorBracketMatch.border': '#60A5FA80',
      'editorWidget.background': '#252526',
      'editorSuggestWidget.background': '#252526',
      'editorSuggestWidget.border': '#3E3E42',
      'scrollbar.shadow': '#00000000',
    },
  });
}

const MONACO_LANG = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  java: 'java',
  c: 'c',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  csharp: 'csharp',
  kotlin: 'kotlin',
  swift: 'swift',
  php: 'php',
};

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java'];
const UNLIMITED_SUBMISSIONS = 2147483647;

const BLANK_TEMPLATES = {
  javascript: "function solve(input) {\n  // TODO: implement\n  return null;\n}\n",
  typescript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8');\n\n// Write your solution here.\n",
  python: "class Solution:\n    def solve(self, input):\n        # TODO: implement\n        return None\n",
  java: "import java.io.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    // Write your solution here.\n  }\n}\n",
  c: "#include <stdio.h>\n\nint main(void) {\n  // Write your solution here.\n  return 0;\n}\n",
  go: "package main\n\nfunc main() {\n  // Write your solution here.\n}\n",
  ruby: "input = STDIN.read\n\n# Write your solution here.\n",
  csharp: "using System;\n\npublic class Program {\n  public static void Main() {\n    // Write your solution here.\n  }\n}\n",
  kotlin: "fun main() {\n  // Write your solution here.\n}\n",
  swift: "import Foundation\n\n// Write your solution here.\n",
};

function editorCodeForStarter(starter, language, question = null) {
  if (!starter) return generatedStarter(language, question);
  if (language === 'python') return pythonEditorCodeForStarter(starter, question);
  if (language === 'javascript') return javascriptEditorCodeForStarter(starter, question);
  if (language === 'java') return javaEditorCodeForStarter(starter, question);
  return starter;
}

function executableCodeForEditor(editorCode, starter, language) {
  if (!starter) return editorCode;
  if (looksLikeStandaloneHarness(editorCode, language)) return editorCode;
  if (looksLikeStandaloneHarness(starter, language)) return customHarnessExecutableCode(editorCode, starter, language);
  if (language === 'python') return pythonExecutableCode(editorCode, starter);
  if (language === 'javascript') return javascriptExecutableCode(editorCode, starter);
  if (language === 'java') return javaExecutableCode(editorCode, starter);
  return editorCode;
}

// Harness assembly. The per-question harness registry (lib/coderank/harnessRegistry.js)
// is the source of truth: it maps the slug to an explicit execution-kind PROFILE
// and lib/coderank/harness.js wraps the user's bare snippet accordingly. We guard
// with looksLikeStandaloneHarness so that during the migration window — before
// seed_profiles.mjs has replaced a question's baked starter_code with the bare
// snippet — an editor still showing a full baked program falls back to the legacy
// splice path instead of being double-wrapped.
function prepareCodeForExecution({ editorCode, starter, language, question }) {
  const profile = question?.slug ? getProfile(question.slug) : null;
  if (profile && !looksLikeStandaloneHarness(editorCode, language)) {
    return generateHarness({ language, bareSnippet: editorCode, profile });
  }
  // Fallbacks for questions not yet in the registry (or mid-migration).
  if (question?.use_runtime_harness && question?.function_metadata) {
    const meta = question.function_metadata;
    return generateHarness({
      language,
      bareSnippet: editorCode,
      functionMetadata: meta,
      orderInsensitive: Boolean(meta.orderInsensitive),
    });
  }
  return executableCodeForEditor(editorCode, starter, language);
}

function logRuntimeHarnessFields(question, language, action) {
  console.log('[CodeRank prepareCodeForExecution]', {
    action,
    slug: question?.slug,
    language,
    use_runtime_harness: question?.use_runtime_harness,
    function_metadata: question?.function_metadata,
  });
}

function looksLikeStandaloneHarness(code, language) {
  const text = String(code || '');
  if (language === 'python') return /json\.loads\(sys\.stdin\.read\(\)\)/.test(text) && /print\s*\(/.test(text);
  if (language === 'javascript') return /require\('fs'\)\.readFileSync\(0,\s*'utf8'\)/.test(text) && /console\.log\s*\(/.test(text);
  if (language === 'java') return /public\s+class\s+Main\b/.test(text) && /System\.in\.readAllBytes\(\)/.test(text);
  return false;
}

function normalizeSavedEditorCode(saved, language, question) {
  if (saved == null) return saved;
  const text = String(saved);
  if (!text.trim()) return null;
  const looksLikePythonHarness = language === 'python' && /data\s*=\s*json\.loads\(sys\.stdin\.read\(\)\)/.test(text);
  const looksLikeJsHarness = language === 'javascript' && /const\s+data\s*=\s*JSON\.parse\(require\('fs'\)\.readFileSync\(0,\s*'utf8'\)\)/.test(text);
  const looksLikeJavaHarness = language === 'java' && /public\s+class\s+Main\b/.test(text);
  if (looksLikePythonHarness || looksLikeJsHarness || looksLikeJavaHarness) {
    return editorCodeForStarter(text, language, question);
  }
  return text;
}

function generatedStarter(language, question) {
  if (!question) return '';
  const meta = inferProblemSignature(question);
  if (language === 'javascript') return javascriptStarter(meta);
  if (language === 'java') return javaStarter(meta);
  return '';
}

function inferProblemSignature(question) {
  const pythonStarter = question?.starter_code?.python || '';
  const jsStarter = question?.starter_code?.javascript || '';
  const fn = pythonStarter.match(/def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/)
    || jsStarter.match(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
  const rawMethod = fn?.[1] || camelName(question?.slug || question?.title || 'solve');
  const args = (fn?.[2] || inferArgsFromPrompt(question))
    .split(',')
    .map((arg) => arg.trim().split(/[:=]/)[0].trim())
    .filter((arg) => arg && arg !== 'self');
  const text = `${question?.title || ''}\n${question?.prompt_md || ''}\n${question?.constraints_md || ''}`;
  const returnType = inferReturnType(text, rawMethod);
  return {
    method: rawMethod,
    args: args.length ? args : ['input'],
    returnType,
    unorderedOutput: isUnorderedOutput(text, rawMethod, returnType),
  };
}

function inferArgsFromPrompt(question) {
  const text = `${question?.prompt_md || ''}\n${question?.constraints_md || ''}`;
  const receives = text.match(/function receives\s+([^\.\n]+)/i)?.[1];
  if (receives) return receives.replace(/\band\b/g, ',');
  return 'input';
}

function camelName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+([a-z0-9])/g, (_m, c) => c.toUpperCase())
    .replace(/[^a-z0-9]/g, '') || 'solve';
}

function inferReturnType(text, method) {
  const lower = String(text || '').toLowerCase();
  if (isGroupAnagramsMethod(method)) return 'String[][]';
  const explicit = lower.match(/return type:\s*([^\.\n]+)/)?.[1]?.trim();
  if (explicit) return typeFromText(explicit, method);
  if (/list\s*<\s*list\s*<\s*string|vector\s*<\s*vector\s*<\s*string|string\[\]\[\]|string\[\]\s*\[\]/i.test(text)) return 'String[][]';
  if (/list\s*<\s*string|vector\s*<\s*string|string\[\]/i.test(text)) return 'String[]';
  if (/list\s*<\s*integer|vector\s*<\s*int|integer\[\]|int\[\]/i.test(text)) return 'int[]';
  if (/listnode|linked list/i.test(text) || /list/i.test(method)) return 'ListNode';
  if (/boolean|return\s+true|return\s+false|\bis valid\b|\bvalid\b|duplicate|palindrome/i.test(text)) return 'boolean';
  if (/string/i.test(text)) return 'String';
  if (/integer|index|profit|count|length|number/i.test(text)) return 'int';
  return 'int[]';
}

function typeFromText(text, method) {
  const normalized = String(text || '').toLowerCase().replace(/\s+/g, ' ');
  if (/string\s*\[\]\s*\[\]|string\s*matrix|list\s*of\s*list.*string|2d.*string/.test(normalized)) return 'String[][]';
  if (/integer\s*\[\]\s*\[\]|int\s*\[\]\s*\[\]|matrix|2d.*integer|2d.*int/.test(normalized)) return 'int[][]';
  if (/string\s*\[\]|list.*string|array.*string/.test(normalized)) return 'String[]';
  if (/integer\s*\[\]|int\s*\[\]|list.*integer|array.*integer|array.*int/.test(normalized)) return 'int[]';
  if (/boolean|bool/.test(normalized)) return 'boolean';
  if (/string/.test(normalized)) return 'String';
  if (/listnode|linked/.test(normalized) || /list/i.test(method)) return 'ListNode';
  if (/integer|int|number/.test(normalized)) return 'int';
  return 'int[]';
}

function isUnorderedOutput(text, method, returnType) {
  const lower = String(text || '').toLowerCase();
  return /any order|order does not matter|in any sequence|return.*without.*order/.test(lower)
    || isGroupAnagramsMethod(method)
    || (returnType.endsWith('[]') && /indices.*any order/.test(lower));
}

function isGroupAnagramsMethod(method) {
  return /^group_?anagrams$/i.test(String(method || ''));
}

function normalizedOutputExpression(expr, meta, language) {
  if (!meta.unorderedOutput) return expr;
  if (meta.returnType === 'String[][]' || meta.returnType === 'int[][]') return `normalizeNested(${expr})`;
  if (meta.returnType === 'String[]' || meta.returnType === 'int[]') return `normalizeArray(${expr})`;
  return expr;
}

function javaTypeForArg(arg) {
  if (/^(s|t|str|word|haystack|needle)$/i.test(arg)) return 'String';
  if (/^(strs|words)$/i.test(arg)) return 'String[]';
  if (/^(board)$/i.test(arg)) return 'String[][]';
  if (/^(matrix|grid|intervals|points)$/i.test(arg)) return 'int[][]';
  if (/^(head|list|l1|l2|list1|list2|node)$/i.test(arg)) return 'ListNode';
  if (/^(k|target|n|m|x)$/i.test(arg)) return 'int';
  return 'int[]';
}

function javaReturnType(type) {
  if (type === 'boolean') return 'boolean';
  if (type === 'int') return 'int';
  if (type === 'String') return 'String';
  if (type === 'String[]') return 'String[]';
  if (type === 'int[][]') return 'int[][]';
  if (type === 'String[][]') return 'List<List<String>>';
  if (type === 'ListNode') return 'ListNode';
  return 'int[]';
}

function javaDefaultReturn(type) {
  if (type === 'boolean') return 'false';
  if (type === 'int') return '0';
  if (type === 'String') return '""';
  if (type === 'String[]') return 'new String[0]';
  if (type === 'int[][]') return 'new int[0][0]';
  if (type === 'String[][]') return 'new ArrayList<>()';
  if (type === 'ListNode') return 'null';
  return 'new int[0]';
}

function javaParseCall(arg) {
  const type = javaTypeForArg(arg);
  const key = JSON.stringify(arg);
  if (type === 'String') return `parseString(valueForKey(input, ${key}))`;
  if (type === 'String[]') return `parseStringArray(valueForKey(input, ${key}))`;
  if (type === 'String[][]') return `parseStringMatrix(valueForKey(input, ${key}))`;
  if (type === 'int[][]') return `parseIntMatrix(valueForKey(input, ${key}))`;
  if (type === 'ListNode') return `listFromArray(parseIntArray(valueForKey(input, ${key})))`;
  if (type === 'int') return `parseInt(valueForKey(input, ${key}))`;
  return `parseIntArray(valueForKey(input, ${key}))`;
}

function javaPrintExpr(expr, type) {
  if (type === 'boolean' || type === 'int') return `System.out.println(${expr});`;
  if (type === 'String') return `System.out.println(${expr});`;
  if (type === 'ListNode') return `System.out.println(toJson(listToArray(${expr})));`;
  return `System.out.println(toJson(${expr}));`;
}

function javascriptStarter(meta) {
  const method = camelName(meta.method);
  const args = meta.args.join(', ');
  const callArgs = meta.args.map((arg) => `inputValue(data, ${JSON.stringify(arg)})`).join(', ');
  const call = `${method}(${callArgs})`;
  const output = normalizedOutputExpression(call, meta, 'javascript');
  const defaultReturn = meta.returnType === 'boolean'
    ? 'false'
    : meta.returnType === 'int'
      ? '0'
      : meta.returnType === 'String'
        ? "''"
        : '[]';
  return `const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));

function inputValue(data, key) {
  return data && typeof data === 'object' && !Array.isArray(data) ? data[key] : data;
}

function normalizeArray(values) {
  return [...values].sort((a, b) => typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)));
}

function normalizeNested(groups) {
  return groups
    .map((group) => normalizeArray(group))
    .sort((a, b) => a.length - b.length || JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function ${method}(${args}) {
  // TODO: implement
  return ${defaultReturn};
}

console.log(JSON.stringify(${output}));
`;
}

function javaStarter(meta) {
  const method = camelName(meta.method);
  const args = meta.args.map((arg) => `${javaTypeForArg(arg)} ${arg}`).join(', ');
  const ret = javaReturnType(meta.returnType);
  const parsed = meta.args.map((arg) => `${javaParseCall(arg)}`).join(', ');
  const call = `new Solution().${method}(${parsed})`;
  const javaOutputType = meta.returnType;
  const javaOutputExpr = normalizedOutputExpression(call, meta, 'java');
  return `import java.io.*;\nimport java.util.*;\n\nclass ListNode { int val; ListNode next; ListNode(int val) { this.val = val; } }\n\nclass Solution {\n  public ${ret} ${method}(${args}) {\n    // TODO: implement\n    return ${javaDefaultReturn(meta.returnType)};\n  }\n}\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    String input = new String(System.in.readAllBytes());\n    ${javaPrintExpr(javaOutputExpr, javaOutputType)}\n  }\n\n  static String valueForKey(String json, String key) {\n    int keyPos = json.indexOf(\"\\\"\" + key + \"\\\"\");\n    if (keyPos < 0) return json.trim();\n    int colon = json.indexOf(':', keyPos);\n    int start = colon + 1;\n    while (start < json.length() && Character.isWhitespace(json.charAt(start))) start++;\n    int end = scanValueEnd(json, start);\n    return json.substring(start, end).trim();\n  }\n  static int scanValueEnd(String s, int start) {\n    int depth = 0; boolean str = false, esc = false;\n    for (int i = start; i < s.length(); i++) {\n      char c = s.charAt(i);\n      if (str) { if (esc) esc = false; else if (c == '\\\\') esc = true; else if (c == '\"') str = false; continue; }\n      if (c == '\"') str = true; else if (c == '[' || c == '{') depth++; else if (c == ']' || c == '}') { if (depth == 0) return i; depth--; } else if (c == ',' && depth == 0) return i;\n    }\n    return s.length();\n  }\n  static int parseInt(String s) { return Integer.parseInt(s.replaceAll(\"[^0-9-]\", \"\")); }\n  static String parseString(String s) { s = s.trim(); return s.length() >= 2 && s.charAt(0) == '\"' ? s.substring(1, s.length() - 1) : s; }\n  static int[] parseIntArray(String s) { ArrayList<Integer> out = new ArrayList<>(); java.util.regex.Matcher m = java.util.regex.Pattern.compile(\"-?\\\\d+\").matcher(s); while (m.find()) out.add(Integer.parseInt(m.group())); return out.stream().mapToInt(Integer::intValue).toArray(); }\n  static int[][] parseIntMatrix(String s) { ArrayList<int[]> rows = new ArrayList<>(); for (String row : topLevelArrays(s)) rows.add(parseIntArray(row)); return rows.toArray(new int[0][]); }\n  static String[] parseStringArray(String s) { ArrayList<String> out = new ArrayList<>(); java.util.regex.Matcher m = java.util.regex.Pattern.compile(\"\\\\\\\"(.*?)\\\\\\\"\").matcher(s); while (m.find()) out.add(m.group(1)); return out.toArray(new String[0]); }\n  static String[][] parseStringMatrix(String s) { ArrayList<String[]> rows = new ArrayList<>(); for (String row : topLevelArrays(s)) rows.add(parseStringArray(row)); return rows.toArray(new String[0][]); }\n  static ArrayList<String> topLevelArrays(String s) { ArrayList<String> rows = new ArrayList<>(); int depth = 0, start = -1; for (int i = 0; i < s.length(); i++) { char c = s.charAt(i); if (c == '[') { depth++; if (depth == 2) start = i; } else if (c == ']') { if (depth == 2 && start >= 0) rows.add(s.substring(start, i + 1)); depth--; } } return rows; }\n  static ListNode listFromArray(int[] values) { ListNode dummy = new ListNode(0), cur = dummy; for (int v : values) { cur.next = new ListNode(v); cur = cur.next; } return dummy.next; }\n  static int[] listToArray(ListNode head) { ArrayList<Integer> out = new ArrayList<>(); while (head != null) { out.add(head.val); head = head.next; } return out.stream().mapToInt(Integer::intValue).toArray(); }\n  static int[] normalizeArray(int[] values) { Arrays.sort(values); return values; }\n  static String[] normalizeArray(String[] values) { Arrays.sort(values); return values; }\n  static int[][] normalizeNested(int[][] rows) { for (int[] row : rows) Arrays.sort(row); Arrays.sort(rows, (a, b) -> a.length == b.length ? toJson(a).compareTo(toJson(b)) : Integer.compare(a.length, b.length)); return rows; }\n  static List<List<String>> normalizeNested(List<List<String>> groups) { for (List<String> group : groups) Collections.sort(group); groups.sort((a, b) -> a.size() != b.size() ? Integer.compare(a.size(), b.size()) : a.toString().compareTo(b.toString())); return groups; }\n  static String toJson(int[] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(a[i]); } return sb.append(']').toString(); }\n  static String toJson(int[][] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(toJson(a[i])); } return sb.append(']').toString(); }\n  static String toJson(String[] a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append('"').append(a[i]).append('"'); } return sb.append(']').toString(); }\n  static String toJson(List<List<String>> a) { StringBuilder sb = new StringBuilder("["); for (int i = 0; i < a.size(); i++) { if (i > 0) sb.append(','); sb.append(toJson(a.get(i).toArray(new String[0]))); } return sb.append(']').toString(); }\n}\n`;
}

function pythonEditorCodeForStarter(starter, question = null) {
  const lines = String(starter).replace(/\r\n/g, '\n').split('\n');
  const imports = lines.filter((line) => /^from\s+\S+\s+import\s+/.test(line));
  const visible = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^data\s*=/.test(line)) break;
    if (/^def\s+emit\s*\(/.test(line)) break;
    if (/^(class\s+(TreeNode|ListNode)\b|def\s+(list_to_tree|tree_to_list|list_to_linked|linked_to_list)\s*\()/.test(line)) {
      i = skipPythonSupportBlock(lines, i);
      continue;
    }
    if (/^(import\s+json|import\s+sys|import\s+json,\s*sys)/.test(line)) continue;
    if (/^from\s+typing\s+import\s+/.test(line)) continue;
    if (!line.trim() && visible.length === 0) continue;
    visible.push(line);
  }

  const body = visible.join('\n').trimEnd();
  if (!body) return starter;
  const definitions = pythonDefinitionComments(question);
  if (/^class\s+/m.test(body)) return [definitions, imports.join('\n'), body].filter(Boolean).join('\n\n');

  const converted = body
    .split('\n')
    .map((line) => {
      if (/^def\s+/.test(line)) return `    ${line.replace(/\(([^)]*)\)/, (_match, args) => `(${prependSelf(args)})`)}`;
      if (line.trim()) return `    ${line}`;
      return line;
    })
    .join('\n');

  return [definitions, imports.join('\n'), 'class Solution:', converted].filter(Boolean).join('\n');
}

function skipPythonSupportBlock(lines, start) {
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line && !line.startsWith(' ') && !line.startsWith('\t')) {
      return i - 1;
    }
  }
  return lines.length - 1;
}

function pythonDefinitionComments(question) {
  const text = [
    question?.title,
    question?.prompt_md,
    question?.constraints_md,
  ].filter(Boolean).join('\n');
  const comments = [];

  if (/ListNode/i.test(text) || /linked[-\s]?list/i.test(text)) {
    comments.push([
      '# Definition for singly-linked list.',
      '# class ListNode:',
      '#     def __init__(self, val=0, next=None):',
      '#         self.val = val',
      '#         self.next = next',
    ].join('\n'));
  }

  if (/TreeNode/i.test(text) || /binary tree/i.test(text)) {
    comments.push([
      '# Definition for a binary tree node.',
      '# class TreeNode:',
      '#     def __init__(self, val=0, left=None, right=None):',
      '#         self.val = val',
      '#         self.left = left',
      '#         self.right = right',
    ].join('\n'));
  }

  return comments.join('\n');
}

function prependSelf(args) {
  const trimmed = args.trim();
  if (!trimmed) return 'self';
  if (trimmed === 'self' || trimmed.startsWith('self,')) return trimmed;
  return `self, ${trimmed}`;
}

function javascriptEditorCodeForStarter(starter, question = null) {
  const lines = String(starter).replace(/\r\n/g, '\n').split('\n');
  const visible = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^const\s+data\s*=/.test(line)) {
      if (visible.length > 0) break;
      continue;
    }
    if (/^const\s+(strs|encoded|decoded)\s*=/.test(line)) break;
    if (/^function\s+(inputValue|normalizeArray|normalizeNested)\s*\(/.test(line)) {
      i = skipJsFunction(lines, i);
      continue;
    }
    if (/^console\.log\(/.test(line)) break;
    if (/^[A-Za-z_$][\w$]*\(/.test(line) && line.endsWith(';')) break;
    if (!line.trim() && visible.length === 0) continue;
    visible.push(line);
  }
  const body = visible.join('\n').trimEnd() || starter;
  const definitions = javascriptDefinitionComments(question);
  return [definitions, body].filter(Boolean).join('\n\n');
}

function skipJsFunction(lines, start) {
  let depth = 0;
  for (let i = start; i < lines.length; i += 1) {
    for (const ch of lines[i]) {
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
    }
    if (i > start && depth <= 0) return i;
  }
  return lines.length - 1;
}

function javaEditorCodeForStarter(starter, question = null) {
  const source = String(starter || '').replace(/\r\n/g, '\n');
  const body = extractJavaEditableBlock(source) || source;
  const definitions = javaDefinitionComments(question);
  return [definitions, body].filter(Boolean).join('\n\n');
}

function extractJavaEditableBlock(source) {
  const candidates = [
    'class Solution',
    'class Codec',
    'class LRUCache',
    'class MinStack',
    'class Trie',
    'class WordDictionary',
    'class TimeMap',
    'class KthLargest',
    'class Twitter',
    'class MedianFinder',
    'class DetectSquares',
  ];
  for (const candidate of candidates) {
    const block = extractBlock(source, source.indexOf(candidate));
    if (block) return block;
  }
  return '';
}

function definitionFlags(question) {
  const text = [
    question?.title,
    question?.prompt_md,
    question?.constraints_md,
  ].filter(Boolean).join('\n');
  return {
    list: /ListNode/i.test(text) || /linked[-\s]?list/i.test(text),
    tree: /TreeNode/i.test(text) || /binary tree/i.test(text),
  };
}

function javascriptDefinitionComments(question) {
  const flags = definitionFlags(question);
  const comments = [];
  if (flags.list) {
    comments.push([
      '// Definition for singly-linked list.',
      '// function ListNode(val, next) {',
      '//   this.val = (val === undefined ? 0 : val);',
      '//   this.next = (next === undefined ? null : next);',
      '// }',
    ].join('\n'));
  }
  if (flags.tree) {
    comments.push([
      '// Definition for a binary tree node.',
      '// function TreeNode(val, left, right) {',
      '//   this.val = (val === undefined ? 0 : val);',
      '//   this.left = (left === undefined ? null : left);',
      '//   this.right = (right === undefined ? null : right);',
      '// }',
    ].join('\n'));
  }
  return comments.join('\n');
}

function javaDefinitionComments(question) {
  const flags = definitionFlags(question);
  const comments = [];
  if (flags.list) {
    comments.push([
      '// Definition for singly-linked list.',
      '// class ListNode {',
      '//   int val;',
      '//   ListNode next;',
      '//   ListNode(int val) { this.val = val; }',
      '// }',
    ].join('\n'));
  }
  if (flags.tree) {
    comments.push([
      '// Definition for a binary tree node.',
      '// class TreeNode {',
      '//   int val;',
      '//   TreeNode left;',
      '//   TreeNode right;',
      '//   TreeNode(int val) { this.val = val; }',
      '// }',
    ].join('\n'));
  }
  return comments.join('\n');
}

function extractBlock(source, start) {
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  let str = null;
  let esc = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (str) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === str) str = null;
      continue;
    }
    if (ch === '"' || ch === "'") str = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        if (source[end] === ';') end += 1;
        return source.slice(start, end).trimEnd();
      }
    }
  }
  return '';
}

function pythonExecutableCode(editorCode, starter) {
  const code = String(editorCode || '').trimEnd();
  const starterText = String(starter || '').replace(/\r\n/g, '\n');
  const imports = [
    'import json, sys',
    'from typing import List, Optional, Dict, Tuple, Set',
    ...code.split('\n').filter((line) => /^from\s+\S+\s+import\s+/.test(line)),
  ];
  const needsTreeNode = /TreeNode/i.test(code);
  const needsListNode = /ListNode/i.test(code);
  const emitBlock = [
    '',
    'def input_value(data, key):',
    '    return data.get(key) if isinstance(data, dict) else data',
    '',
    'def normalize_groups(groups):',
    '    return sorted([sorted(group) for group in groups])',
    '',
    'def emit(value):',
    '    print(json.dumps(value, separators=(",", ":")))',
    '',
  ].join('\n');
  const solutionCode = /^class\s+Solution\b/m.test(code) ? code : pythonEditorCodeForStarter(code);
  const dataBlock = extractPythonDataBlock(starterText) || fallbackPythonDataBlock(solutionCode, { tree: needsTreeNode, list: needsListNode });
  const isSolutionClass = /^class\s+Solution\b/m.test(solutionCode);
  const helpers = pythonNodeHelpers({ tree: needsTreeNode, list: needsListNode });
  const callableDataBlock = isSolutionClass
    ? rewritePythonCallsToSolution(dataBlock, solutionCode)
    : dataBlock;
  const executableDataBlock = rewritePythonNodeInputsAndOutputs(
    callableDataBlock,
    solutionCode,
    { tree: needsTreeNode, list: needsListNode },
  );

  return `${dedupeLines(imports).join('\n')}\n\n${helpers}${solutionCode}\n${emitBlock}${executableDataBlock}\n`;
}

function extractPythonDataBlock(starter) {
  const lines = starter.split('\n');
  const start = lines.findIndex((line) => /^data\s*=/.test(line));
  if (start === -1) return '';
  return lines.slice(start).join('\n').trimEnd();
}

function fallbackPythonDataBlock(solutionCode, needs) {
  const methodMatch = solutionCode.match(/^\s+def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/m);
  if (!methodMatch) return '';
  const methodName = methodMatch[1];
  const args = methodMatch[2]
    .split(',')
    .map((arg) => arg.trim().split(/[:=]/)[0].trim())
    .filter((arg) => arg && arg !== 'self');
  if (!args.length) return '';
  const callArgs = args.map((arg) => pythonInputExpression(arg, needs)).join(', ');
  return [
    'raw_input = sys.stdin.read()',
    'try:',
    '    data = json.loads(raw_input)',
    'except Exception:',
    '    data = raw_input',
    isGroupAnagramsMethod(methodName)
      ? `emit(normalize_groups(${methodName}(${callArgs})))`
      : `emit(${methodName}(${callArgs}))`,
  ].join('\n');
}

function pythonInputExpression(arg, needs) {
  const key = JSON.stringify(arg);
  if (needs.tree && /^(root|tree|node|p|q)$/i.test(arg)) {
    return `list_to_tree(input_value(data, ${key}))`;
  }
  if (needs.list && /^(head|list|node|l\d+|list\d+)$/i.test(arg)) {
    return `list_to_linked(input_value(data, ${key}))`;
  }
  return `input_value(data, ${key})`;
}

function collapseDuplicatePythonConversions(block) {
  return block
    .replace(/list_to_tree\(list_to_tree\(([^\n]+?)\)\)/g, 'list_to_tree($1)')
    .replace(/list_to_linked\(list_to_linked\(([^\n]+?)\)\)/g, 'list_to_linked($1)');
}

function rewritePythonCallsToSolution(block, solutionCode) {
  if (!block) return block;
  const methodNames = [...solutionCode.matchAll(/^\s+def\s+([A-Za-z_]\w*)\s*\(/gm)].map((match) => match[1]);
  if (!methodNames.length) return block;

  let rewritten = 'solution = Solution()\n' + block;
  for (const name of methodNames) {
    rewritten = rewritten.replace(new RegExp(`(?<![\\w.])${name}\\(`, 'g'), `solution.${name}(`);
  }
  return rewritten;
}

function rewritePythonNodeInputsAndOutputs(block, solutionCode, needs) {
  if (!block) return block;
  const methodMatch = solutionCode.match(/^\s+def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/m);
  if (!methodMatch) return block;
  const methodName = methodMatch[1];

  const args = methodMatch[2]
    .split(',')
    .map((arg) => arg.trim().split(/[:=]/)[0].trim())
    .filter((arg) => arg && arg !== 'self');

  let rewritten = block;
  for (const arg of args) {
    const getterPattern = new RegExp(`data\\.get\\(${JSON.stringify(arg)}\\)`, 'g');
    rewritten = rewritten.replace(getterPattern, pythonInputExpression(arg, needs));
  }

  rewritten = collapseDuplicatePythonConversions(rewritten);

  return rewritten
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('emit(solution.')) return line;
      const indent = line.slice(0, line.indexOf(trimmed));
      if (needs.tree && returnsTreeNode(methodName)) {
        return `${indent}emit(tree_to_list(${trimmed.slice('emit('.length, -1)}))`;
      }
      if (needs.list && returnsListNode(methodName)) {
        return `${indent}emit(linked_to_list(${trimmed.slice('emit('.length, -1)}))`;
      }
      return line;
    })
    .join('\n');
}

function returnsTreeNode(methodName) {
  return [
    'invert_tree',
    'build_tree',
    'construct_from_preorder_and_inorder',
    'merge_trees',
    'lowest_common_ancestor',
  ].includes(methodName);
}

function returnsListNode(methodName) {
  return [
    'reverse_list',
    'merge_two_lists',
    'remove_nth_from_end',
    'add_two_numbers',
    'merge_k_lists',
    'swap_pairs',
    'reverse_k_group',
    'detect_cycle',
  ].includes(methodName);
}

function pythonNodeHelpers({ tree, list }) {
  const helpers = [];

  if (tree) {
    helpers.push([
      'class TreeNode:',
      '    def __init__(self, val=0, left=None, right=None):',
      '        self.val = val',
      '        self.left = left',
      '        self.right = right',
      '',
      'def list_to_tree(values):',
      '    if not values:',
      '        return None',
      '    nodes = [None if value is None else TreeNode(value) for value in values]',
      '    child = 1',
      '    for node in nodes:',
      '        if node is not None:',
      '            if child < len(nodes):',
      '                node.left = nodes[child]',
      '                child += 1',
      '            if child < len(nodes):',
      '                node.right = nodes[child]',
      '                child += 1',
      '    return nodes[0]',
      '',
      'def tree_to_list(root):',
      '    if root is None:',
      '        return []',
      '    out = []',
      '    queue = [root]',
      '    while queue:',
      '        node = queue.pop(0)',
      '        if node is None:',
      '            out.append(None)',
      '            continue',
      '        out.append(node.val)',
      '        queue.append(node.left)',
      '        queue.append(node.right)',
      '    while out and out[-1] is None:',
      '        out.pop()',
      '    return out',
      '',
    ].join('\n'));
  }

  if (list) {
    helpers.push([
      'class ListNode:',
      '    def __init__(self, val=0, next=None):',
      '        self.val = val',
      '        self.next = next',
      '',
      'def list_to_linked(values):',
      '    dummy = ListNode()',
      '    cur = dummy',
      '    for value in values or []:',
      '        cur.next = ListNode(value)',
      '        cur = cur.next',
      '    return dummy.next',
      '',
      'def linked_to_list(head):',
      '    out = []',
      '    while head:',
      '        out.append(head.val)',
      '        head = head.next',
      '    return out',
      '',
    ].join('\n'));
  }

  return helpers.length ? `${helpers.join('\n')}\n` : '';
}

function javascriptExecutableCode(editorCode, starter) {
  const code = String(editorCode || '').trimEnd();
  const starterText = String(starter || '').replace(/\r\n/g, '\n');
  const dataLine = starterText.split('\n').find((line) => /^const\s+data\s*=/.test(line))
    || "const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));";
  const helper = extractJsFunction(starterText, 'inputValue');
  let tail = starterText.split('\n').find((line) => /^console\.log\(/.test(line))
    || starterText
      .split('\n')
      .find((line) => /^[A-Za-z_$][\w$]*\(/.test(line) && line.endsWith(';'))
    || '';
  const method = code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/)?.[1]
    || inferProblemSignature({ starter_code: { javascript: starterText } }).method;
  const meta = { method, returnType: inferReturnType(starterText, method), unorderedOutput: isUnorderedOutput(starterText, method, inferReturnType(starterText, method)) };
  if (meta.unorderedOutput) {
    const call = tail.match(/JSON\.stringify\((.*)\)\)/)?.[1] || tail.match(/console\.log\((.*)\)/)?.[1];
    if (call) tail = `console.log(JSON.stringify(${normalizedOutputExpression(call, meta, 'javascript')}))`;
  }
  const normalizer = meta.unorderedOutput ? `function normalizeArray(values) {\n  return [...values].sort((a, b) => typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)));\n}\n\nfunction normalizeNested(groups) {\n  return groups\n    .map((group) => normalizeArray(group))\n    .sort((a, b) => a.length - b.length || JSON.stringify(a).localeCompare(JSON.stringify(b)));\n}\n\n` : '';
  return `${dataLine}\n\n${helper ? `${helper}\n\n` : ''}${normalizer}${code}\n\n${tail}\n`;
}

function extractJsFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  return extractBlock(source, start);
}

function javaExecutableCode(editorCode, starter) {
  const source = String(starter || '').replace(/\r\n/g, '\n');
  const solutionCode = String(editorCode || '').replace(/\bpublic\s+class\s+Solution\b/, 'class Solution');
  return replaceSolutionBlock(source, solutionCode, 'public class Main');
}

function customHarnessExecutableCode(editorCode, starter, language) {
  const source = String(starter || '').replace(/\r\n/g, '\n');
  const code = String(editorCode || '').replace(/\r\n/g, '\n').trimEnd();

  if (language === 'python') {
    const marker = source.includes('\n\ndef format_number') ? '\n\ndef format_number' : '\n\ndata =';
    if (/^class\s+Solution\b/m.test(source)) return replaceBetween(source, 'class Solution:', marker, code, true);
    if (/^def\s+encode\s*\(/m.test(source)) return replaceBetween(source, 'def encode(', '\ndata =', code, true);
    return pythonExecutableCode(code, source);
  }

  if (language === 'javascript') {
    if (/class\s+[A-Za-z_$][\w$]*\s*\{/.test(source)) {
      const className = code.match(/class\s+([A-Za-z_$][\w$]*)\s*\{/)?.[1];
      if (className) return replaceBetween(source, `class ${className} {`, '\n\nconst data =', code, true);
    }
    if (/var\s+encode\s*=/.test(source)) return replaceBetween(source, 'var encode =', '\n\nconst data =', code, true);
    const match = code.match(/var\s+([A-Za-z_$][\w$]*)\s*=/);
    if (match) return replaceBetween(source, `var ${match[1]} =`, '\n\nconst data =', code, true);
    return javascriptExecutableCode(code, source);
  }

  if (language === 'java') {
    const className = code.match(/class\s+([A-Za-z_$][\w$]*)\s*\{/)?.[1] || 'Solution';
    return replaceBetween(source, `class ${className} {`, '\n\npublic class Main', code.replace(/\bpublic\s+class\s+/, 'class '), true);
  }

  return code;
}

function replaceSolutionBlock(source, editorCode, tailMarker) {
  const start = source.indexOf('class Solution');
  const tail = source.indexOf(tailMarker);
  if (start < 0 || tail < 0 || tail <= start) return editorCode;
  return `${source.slice(0, start)}${String(editorCode || '').trimEnd()}

${source.slice(tail)}`;
}

function replaceBetween(source, startNeedle, endNeedle, replacement, includeEnd = false) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start >= 0 ? start : 0);
  if (start < 0 || end < 0 || end <= start) return replacement;
  return `${source.slice(0, start)}${String(replacement || '').trimEnd()}${includeEnd ? source.slice(end) : source.slice(end + endNeedle.length)}`;
}

function dedupeLines(lines) {
  return [...new Set(lines.filter(Boolean))];
}

export default function ProblemPage() {
  return (
    <AuthGate>
      <ProblemWorkspace />
    </AuthGate>
  );
}

function ProblemWorkspace() {
  const { assessmentId, questionId } = useParams();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attempt');

  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    api(`/api/coderank/attempts/${attemptId}`)
      .then((r) => { if (!cancelled) setAttempt(r.attempt); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [attemptId]);

  if (error) {
    return (
      <main className="min-h-screen px-4 pt-28 text-white text-center">
        <AlertCircle size={48} className="mx-auto mb-3 text-red-400" />
        <p className="text-white/70 mb-4">{error}</p>
        <Link href="/coderank" className="text-blue-300 font-bold hover:underline">← Back</Link>
      </main>
    );
  }
  if (!attempt) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </main>
    );
  }

  const questions = (attempt.cr_assessments?.cr_assessment_questions || []).sort(
    (a, b) => a.ordinal - b.ordinal,
  );
  const idx = questions.findIndex((q) => q.question_id === questionId);
  const aq = idx >= 0 ? questions[idx] : null;
  const q = aq?.cr_questions;

  if (!q) {
    return (
      <main className="min-h-screen px-4 pt-28 text-white text-center">
        <p className="text-white/70">Question not found in this assessment.</p>
        <Link href={`/coderank/${assessmentId}`} className="text-blue-300 font-bold hover:underline mt-4 inline-block">← Back</Link>
      </main>
    );
  }

  return (
    <CodingWorkspace
      attempt={attempt}
      question={q}
      points={aq.points}
      visibleTests={attempt.visible_tests_by_question?.[questionId] || []}
      previousSubmissions={(attempt.submissions || []).filter((s) => s.question_id === questionId)}
      prev={idx > 0 ? questions[idx - 1].question_id : null}
      next={idx < questions.length - 1 ? questions[idx + 1].question_id : null}
      indexLabel={`${idx + 1} / ${questions.length}`}
      maxSubmissions={attempt.cr_assessments?.max_submissions_per_question || 3}
      assessmentId={assessmentId}
    />
  );
}

function CodingWorkspace({
  attempt, question, points, visibleTests, previousSubmissions, prev, next, indexLabel,
  maxSubmissions, assessmentId,
}) {
  const router = useRouter();
  const starters = useMemo(() => {
    const source = question.starter_code || {};
    return Object.fromEntries(SUPPORTED_LANGUAGES.map((lang) => [lang, source[lang] || generatedStarter(lang, question)]));
  }, [question]);
  const availableLanguages = SUPPORTED_LANGUAGES;
  const defaultLang = availableLanguages.includes(question.default_language)
    ? question.default_language
    : availableLanguages[0] || 'python';
  const initialLang = (() => {
    if (typeof window === 'undefined') return defaultLang;
    const perQuestion = window.localStorage.getItem(`cr_lang_${attempt.id}_${question.id}`);
    if (perQuestion && availableLanguages.includes(perQuestion)) return perQuestion;
    const perAttempt = window.localStorage.getItem(`cr_lang_${attempt.id}`);
    if (perAttempt && availableLanguages.includes(perAttempt)) return perAttempt;
    return defaultLang;
  })();

  const [language, setLanguage] = useState(initialLang);
  const [code, setCode] = useState(() => (
    editorCodeForStarter(starters[initialLang], initialLang, question) || BLANK_TEMPLATES[initialLang] || ''
  ));
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [activeTab, setActiveTab] = useState('cases'); // cases | output | submissions
  const [runReport, setRunReport] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [problemWidth, setProblemWidth] = useState(42);
  const [consoleHeight, setConsoleHeight] = useState(32);
  const [questionMenuOpen, setQuestionMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const { confirm, confirmationToast } = useConfirmToast();
  const workspaceRef = useRef(null);
  const rightPaneRef = useRef(null);
  const editorRef = useRef(null);
  const codeRef = useRef(code);
  const saveTimerRef = useRef(null);
  const questionMenuRef = useRef(null);
  const languageMenuRef = useRef(null);
  const autoSubmittedRef = useRef(false);

  const unlimitedSubmissions = Number(maxSubmissions) >= UNLIMITED_SUBMISSIONS;
  const submissionsUsed = previousSubmissions.length;
  const submissionsRemaining = unlimitedSubmissions ? Infinity : Math.max(0, maxSubmissions - submissionsUsed);
  const expired = attempt.status !== 'in_progress';
  const unlimitedTime = Number(attempt.cr_assessments?.time_limit_minutes) <= 0;
  const locked = expired || (!unlimitedSubmissions && submissionsRemaining <= 0);
  const allQuestions = (attempt.cr_assessments?.cr_assessment_questions || []).sort((a, b) => a.ordinal - b.ordinal);
  const questionStatuses = Object.fromEntries(allQuestions.map((aq) => {
    const subs = (attempt.submissions || []).filter((s) => s.question_id === aq.question_id);
    const best = subs.reduce((acc, s) => (!acc || s.score > acc.score ? s : acc), null);
    return [aq.question_id, { used: subs.length, best }];
  }));

  // Persist code per-question per-language to localStorage so reloads don't lose work
  const storageKey = `cr_code_${attempt.id}_${question.id}_${language}`;
  useEffect(() => {
    const saved = typeof window !== 'undefined' && window.localStorage.getItem(storageKey);
    const nextCode = normalizeSavedEditorCode(saved, language, question)
      ?? editorCodeForStarter(starters[language], language, question)
      ?? BLANK_TEMPLATES[language]
      ?? '';
    codeRef.current = nextCode;
    setCode(nextCode);
    editorRef.current?.setValue(nextCode);
    setRunReport(null);
    setSubmitResult(null);
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const handleEditorChange = useCallback((value) => {
    const nextCode = value ?? '';
    codeRef.current = nextCode;
    if (typeof window === 'undefined') return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      window.localStorage.setItem(storageKey, codeRef.current);
    }, 400);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`cr_lang_${attempt.id}_${question.id}`, language);
    window.localStorage.setItem(`cr_lang_${attempt.id}`, language);
  }, [attempt.id, question.id, language]);

  const currentEditorCode = useCallback(() => (
    editorRef.current?.getValue() ?? codeRef.current
  ), []);

  async function handleRun() {
    if (locked) return;
    setActionError(null);
    setRunning(true);
    setActiveTab('output');
    try {
      logRuntimeHarnessFields(question, language, 'run');
      const executableCode = prepareCodeForExecution({ editorCode: currentEditorCode(), starter: starters[language], language, question });
      const { report } = await api('/api/coderank/run', {
        method: 'POST',
        body: JSON.stringify({
          attempt_id: attempt.id,
          question_id: question.id,
          language,
          code: executableCode,
          custom_stdin: showCustom && customInput.trim() ? customInput : undefined,
        }),
      });
      setRunReport(report);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setRunning(false);
    }
  }

  const submitCurrentQuestion = useCallback(async ({ requireConfirm = true, autoSubmit = false } = {}) => {
    if (expired) return false;
    if (!unlimitedSubmissions && submissionsRemaining <= 0) {
      setActionError('No submissions remaining for this problem.');
      return false;
    }
    if (requireConfirm) {
      const ok = await confirm({
        title: 'Submit solution?',
        message: unlimitedSubmissions
          ? 'This problem allows unlimited official submissions until you submit the assessment.'
          : `You have ${submissionsRemaining} official submission${submissionsRemaining === 1 ? '' : 's'} remaining for this problem.`,
        confirmLabel: 'Submit',
      });
      if (!ok) return false;
    }

    setActionError(null);
    setSubmitting(true);
    setActiveTab('output');
    try {
      logRuntimeHarnessFields(question, language, autoSubmit ? 'auto-submit-current' : 'submit-current');
      const executableCode = prepareCodeForExecution({ editorCode: currentEditorCode(), starter: starters[language], language, question });
      const result = await api('/api/coderank/submit', {
        method: 'POST',
        body: JSON.stringify({
          attempt_id: attempt.id,
          question_id: question.id,
          language,
          code: executableCode,
          auto_submit: autoSubmit,
        }),
      });
      setSubmitResult(result);
      const full = await api(`/api/coderank/attempts/${attempt.id}`);
      previousSubmissions.length = 0;
      previousSubmissions.push(...((full.attempt.submissions || []).filter((s) => s.question_id === question.id)));
      return true;
    } catch (e) {
      setActionError(e.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [attempt.id, confirm, currentEditorCode, expired, language, previousSubmissions, question, starters, submissionsRemaining, unlimitedSubmissions]);

  async function handleSubmit() {
    if (locked) return;
    await submitCurrentQuestion({ requireConfirm: true });
  }

  function draftForQuestion(aq) {
    const q = aq.cr_questions;
    const qStarters = Object.fromEntries(SUPPORTED_LANGUAGES.map((lang) => [lang, q?.starter_code?.[lang] || generatedStarter(lang, q)]));
    const languages = SUPPORTED_LANGUAGES;
    const defaultLanguage = languages.includes(q?.default_language) ? q.default_language : languages[0] || 'python';

    if (q?.id === question.id) {
      return { question: q, language, editorCode: currentEditorCode(), starters: qStarters, current: true };
    }

    if (typeof window === 'undefined') return null;
    const savedLanguage = window.localStorage.getItem(`cr_lang_${attempt.id}_${q.id}`);
    const candidateLanguages = [savedLanguage, defaultLanguage, ...languages].filter(Boolean);
    for (const candidate of [...new Set(candidateLanguages)]) {
      const saved = window.localStorage.getItem(`cr_code_${attempt.id}_${q.id}_${candidate}`);
      if (saved != null) {
        return {
          question: q,
          language: candidate,
          editorCode: normalizeSavedEditorCode(saved, candidate, q),
          starters: qStarters,
          current: false,
        };
      }
    }
    return null;
  }

  async function submitDraft(draft) {
    logRuntimeHarnessFields(draft.question, draft.language, 'submit-draft');
    const executableCode = prepareCodeForExecution({
      editorCode: draft.editorCode,
      starter: draft.starters[draft.language],
      language: draft.language,
      question: draft.question,
    });
    const result = await api('/api/coderank/submit', {
      method: 'POST',
      body: JSON.stringify({
        attempt_id: attempt.id,
        question_id: draft.question.id,
        language: draft.language,
        code: executableCode,
      }),
    });
    if (draft.question.id === question.id) setSubmitResult(result);
    return result;
  }

  async function handleSubmitAssessment() {
    const completed = allQuestions.filter((aq) => questionStatuses[aq.question_id]?.best).length;
    const incomplete = Math.max(0, allQuestions.length - completed);
    const ok = await confirm({
      title: 'Submit assessment?',
      message: `Completed: ${completed}
Not completed: ${incomplete}

All saved question drafts will be submitted before the assessment closes.`,
      confirmLabel: 'Submit assessment',
      tone: 'danger',
    });
    if (!ok) return;
    setActionError(null);
    setSubmitting(true);
    setActiveTab('output');
    try {
      const drafts = allQuestions
        .map((aq) => ({ aq, draft: draftForQuestion(aq) }))
        .filter(({ aq, draft }) => draft && (unlimitedSubmissions || (questionStatuses[aq.question_id]?.used || 0) < maxSubmissions));

      for (let i = 0; i < drafts.length; i += 1) {
        setActionError(`Submitting saved draft ${i + 1}/${drafts.length} before closing assessment...`);
        await submitDraft(drafts[i].draft);
      }

      await api(`/api/coderank/attempts/${attempt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'submit_assessment' }),
      });
      router.push(`/coderank/${assessmentId}`);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (expired || unlimitedTime || autoSubmittedRef.current) return undefined;
    const expiresAt = new Date(attempt.expires_at).getTime();
    const now = Date.now();
    const submitLeadMs = 5_000;
    const submitDelay = Math.max(0, expiresAt - now - submitLeadMs);
    const closeDelay = Math.max(0, expiresAt - now + 250);
    let autoSubmitPromise = null;

    const submitTimer = setTimeout(() => {
      if (autoSubmittedRef.current || (!unlimitedSubmissions && submissionsRemaining <= 0)) return;
      autoSubmittedRef.current = true;
      setActionError('Time is almost up. Auto-submitting your current work...');
      autoSubmitPromise = submitCurrentQuestion({ requireConfirm: false, autoSubmit: true });
    }, submitDelay);

    const closeTimer = setTimeout(async () => {
      setActionError('Time expired. Closing assessment...');
      try {
        if (!autoSubmittedRef.current && (unlimitedSubmissions || submissionsRemaining > 0)) {
          autoSubmittedRef.current = true;
          autoSubmitPromise = submitCurrentQuestion({ requireConfirm: false, autoSubmit: true });
        }
        if (autoSubmitPromise) await autoSubmitPromise.catch(() => false);
        await api(`/api/coderank/attempts/${attempt.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'submit_assessment' }),
        });
        router.push(`/coderank/${assessmentId}`);
      } catch (e) {
        setActionError(e.message);
      }
    }, closeDelay);

    return () => {
      clearTimeout(submitTimer);
      clearTimeout(closeTimer);
    };
  }, [assessmentId, attempt.expires_at, attempt.id, expired, router, submissionsRemaining, submitCurrentQuestion, unlimitedTime, unlimitedSubmissions]);

  useEffect(() => {
    if (expired || typeof document === 'undefined') return undefined;
    let lastEventAt = 0;
    const logEvent = (event_type) => {
      const now = Date.now();
      if (now - lastEventAt < 2000) return;
      lastEventAt = now;
      api('/api/coderank/monitor', {
        method: 'POST',
        body: JSON.stringify({
          attempt_id: attempt.id,
          event_type,
          metadata: { path: window.location.pathname },
        }),
      }).catch(() => {});
    };
    const onVisibility = () => logEvent(document.hidden ? 'left_tab' : 'returned_to_tab');
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [attempt.id, expired]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (questionMenuRef.current && !questionMenuRef.current.contains(event.target)) setQuestionMenuOpen(false);
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) setLanguageMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function startHorizontalResize(event) {
    event.preventDefault();
    const onMove = (moveEvent) => {
      const rect = workspaceRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setProblemWidth(Math.min(58, Math.max(28, pct)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startVerticalResize(event) {
    event.preventDefault();
    const onMove = (moveEvent) => {
      const rect = rightPaneRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((rect.bottom - moveEvent.clientY) / rect.height) * 100;
      setConsoleHeight(Math.min(52, Math.max(22, pct)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <main className="fixed inset-0 z-[60] flex h-dvh w-full max-w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(96,165,250,0.20),transparent_32%),linear-gradient(135deg,#10264a,#173b70_48%,#0b1930)] text-white">
      {confirmationToast}
      {/* Top bar */}
      <div className="relative z-[90] shrink-0 flex min-h-14 items-center justify-between gap-4 border-b border-white/10 bg-[#10264a]/85 px-4 py-2.5 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href={`/coderank/${assessmentId}`} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white">
            <ArrowLeft size={14}/>Back
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {prev && <NavBtn href={`/coderank/${assessmentId}/${prev}?attempt=${attempt.id}`}><ChevronLeft size={14}/></NavBtn>}
            <span className="text-xs text-white/40 px-2">{indexLabel}</span>
            {next && <NavBtn href={`/coderank/${assessmentId}/${next}?attempt=${attempt.id}`}><ChevronRight size={14}/></NavBtn>}
          </div>
          <h1 className="ml-1 truncate text-sm font-bold sm:text-base">{question.title}</h1>
          <DifficultyPill difficulty={question.difficulty} />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div ref={questionMenuRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setQuestionMenuOpen((open) => !open)}
              className="flex max-w-[340px] items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/7 px-4 py-2 text-left text-sm font-bold text-white shadow-inner shadow-white/[0.03] transition hover:bg-white/10"
            >
              <span className="truncate">{indexLabel.split(' / ')[0]}. {question.title} - {questionStatusLabel(questionStatuses[question.id], maxSubmissions)}</span>
              <ChevronRight size={16} className={`shrink-0 text-white/55 transition ${questionMenuOpen ? 'rotate-90' : ''}`} />
            </button>
            {questionMenuOpen && (
              <div className="pretty-scrollbar absolute right-0 top-full z-[120] mt-3 max-h-[420px] w-[360px] overflow-y-auto rounded-2xl border border-white/15 bg-[#0b1426] p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
                {allQuestions.map((aq, idx) => {
                  const q = aq.cr_questions;
                  const state = questionStatuses[aq.question_id];
                  const active = aq.question_id === question.id;
                  return (
                    <button
                      key={aq.question_id}
                      type="button"
                      onClick={() => {
                        setQuestionMenuOpen(false);
                        router.push(`/coderank/${assessmentId}/${aq.question_id}?attempt=${attempt.id}`);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${active ? 'bg-blue-600 text-white' : 'text-white hover:bg-white/10 hover:text-blue-100'}`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs">{idx + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{q?.title}</span>
                        <span className="text-xs font-semibold text-white/45">{questionStatusLabel(state, maxSubmissions)} · {submissionCountLabel(state?.used || 0, maxSubmissions)}</span>
                      </span>
                      {active && <Check size={16} className="shrink-0 text-blue-100" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <span className="hidden sm:inline text-xs text-white/40">
            <Lock size={12} className="inline -mt-0.5 mr-1"/>{submissionCountLabel(submissionsUsed, maxSubmissions)}
          </span>
          <CountdownBadge expiresAt={attempt.expires_at} status={attempt.status} unlimited={unlimitedTime} />
          <button
            onClick={handleSubmitAssessment}
            disabled={expired}
            className="hidden rounded-md border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-100 transition hover:bg-blue-500/25 disabled:opacity-50 sm:inline-flex"
          >
            Submit Assessment
          </button>
        </div>
      </div>

      {/* Split: problem | editor */}
      <div ref={workspaceRef} className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: problem statement */}
        <section
          className="pretty-scrollbar min-h-0 w-full overflow-y-auto border-b border-white/10 bg-white/[0.055] p-5 shadow-inner shadow-white/[0.03] backdrop-blur-md sm:p-6 lg:min-w-[340px] lg:border-b-0 lg:w-[var(--problem-width)]"
          style={{ '--problem-width': `min(${problemWidth}%, 760px)` }}
        >
          <div className="prose prose-invert max-w-none prose-base prose-p:leading-7 prose-p:text-white/90 prose-li:text-white/90 prose-strong:text-white">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.prompt_md}</ReactMarkdown>
          </div>

          {Array.isArray(question.image_urls) && question.image_urls.length > 0 && (
            <div className="mt-6 space-y-3">
              {question.image_urls.map((src, idx) => (
                <figure key={src} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-lg shadow-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage image domains vary by project env. */}
                  <img
                    src={src}
                    alt={`${question.title} example ${idx + 1}`}
                    className="mx-auto max-h-[420px] w-full rounded-xl object-contain"
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>
          )}

          {Array.isArray(question.examples) && question.examples.length > 0 && (
            <div className="mt-7 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100/80">Examples</h3>
              {question.examples.map((ex, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.07] p-4 text-sm shadow-lg shadow-black/10">
                  <div><span className="text-blue-100/55">Input: </span>{ex.input}</div>
                  <div><span className="text-blue-100/55">Output: </span>{ex.output}</div>
                  {ex.explanation && <div className="mt-2 rounded-lg bg-black/10 px-3 py-2 text-white/65">{ex.explanation}</div>}
                </div>
              ))}
            </div>
          )}

          {question.constraints_md && (
            <div className="mt-7">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-blue-100/80">Constraints</h3>
              <div className="prose prose-invert max-w-none prose-sm prose-p:text-white/90 prose-li:text-white/90">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.constraints_md}</ReactMarkdown>
              </div>
            </div>
          )}
        </section>

        {/* Right: editor + console */}
        <div
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize panels"
          onPointerDown={startHorizontalResize}
          className="hidden w-2 shrink-0 cursor-col-resize border-x border-white/10 bg-white/[0.06] transition hover:bg-blue-300/25 lg:block"
        />

        <section ref={rightPaneRef} className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-xl border-l border-white/10 bg-[#121212]/95 shadow-2xl shadow-black/20">
          {/* Editor toolbar */}
          <div className="relative z-[70] shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#172a47] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <div ref={languageMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setLanguageMenuOpen((open) => !open)}
                  className="flex h-10 min-w-36 items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/7 px-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  {language}
                  <ChevronRight size={16} className={`text-white/55 transition ${languageMenuOpen ? 'rotate-90' : ''}`} />
                </button>
                {languageMenuOpen && (
                  <div className="absolute left-0 top-full z-[120] mt-3 w-56 overflow-hidden rounded-2xl border border-white/15 bg-[#0b1426] p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
                    {availableLanguages.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setLanguage(l);
                          setLanguageMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition ${l === language ? 'bg-blue-600 text-white' : 'text-white hover:bg-white/10 hover:text-blue-100'}`}
                      >
                        {l}
                        {l === language && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Reset code?',
                    message: 'This will replace your current code with the starter template for this language.',
                    confirmLabel: 'Reset',
                    tone: 'danger',
                  });
                  if (!ok) return;
                  const resetCode = editorCodeForStarter(starters[language], language, question) || '';
                  codeRef.current = resetCode;
                  setCode(resetCode);
                  editorRef.current?.setValue(resetCode);
                  window.localStorage.removeItem(storageKey);
                }}
                title="Reset to starter code"
                className="flex h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-white/55 hover:bg-white/5 hover:text-white"
              >
                <RotateCcw size={13}/>Reset
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`hidden rounded-md px-2 py-1 text-xs font-bold sm:inline ${locked ? 'bg-red-500/15 text-red-100' : 'bg-white/5 text-white/55'}`}>
                {locked ? 'Question locked' : unlimitedSubmissions ? 'Unlimited attempts' : `${submissionsRemaining} attempts left`}
              </span>
              <button
                onClick={handleRun}
                disabled={running || locked}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 text-sm font-bold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>}
                Run
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || locked}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-bold shadow-md shadow-emerald-600/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                Submit
              </button>
            </div>
          </div>

          {/* Editor */}
          {locked && (
            <div className="border-b border-red-300/20 bg-red-500/10 px-4 py-2 text-sm text-red-100">
              This question is locked because the assessment is closed or all official submissions were used. Use the question dropdown to move on.
            </div>
          )}
          <div className="relative min-h-[240px] flex-1 overflow-hidden bg-[#1F1F1F]">
            <MonacoEditor
              height="100%"
              language={MONACO_LANG[language] || 'plaintext'}
              defaultValue={code}
              onMount={(editor) => { editorRef.current = editor; }}
              onChange={handleEditorChange}
              beforeMount={defineCodeRankTheme}
              theme="coderank-dark"
              options={{
                fontSize: 15,
                lineHeight: 24,
                fontFamily: 'Consolas, "Courier New", monospace',
                fontLigatures: false,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                readOnly: locked,
                folding: false,
                glyphMargin: false,
                lineDecorationsWidth: 12,
                lineNumbersMinChars: 3,
                overviewRulerBorder: false,
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                renderLineHighlight: 'line',
                renderWhitespace: 'none',
                renderControlCharacters: false,
                roundedSelection: false,
                occurrencesHighlight: 'off',
                selectionHighlight: false,
                links: false,
                guides: {
                  indentation: false,
                  highlightActiveIndentation: false,
                },
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                  useShadows: false,
                },
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                padding: { top: 12, bottom: 28 },
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* Console */}
          <div
            role="separator"
            aria-orientation="horizontal"
            title="Drag to resize console"
            onPointerDown={startVerticalResize}
            className="h-2 shrink-0 cursor-row-resize border-y border-white/10 bg-white/[0.06] transition hover:bg-blue-300/25"
          />
          <div className="flex min-h-[170px] shrink-0 flex-col border-t border-white/10 bg-[#0e1c31]" style={{ height: `${consoleHeight}%` }}>
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs">
                <ConsoleTab active={activeTab === 'cases'} onClick={() => setActiveTab('cases')}>Test Cases</ConsoleTab>
                <ConsoleTab active={activeTab === 'output'} onClick={() => setActiveTab('output')}>Output</ConsoleTab>
                <ConsoleTab active={activeTab === 'submissions'} onClick={() => setActiveTab('submissions')}>Submissions ({previousSubmissions.length})</ConsoleTab>
              </div>
              {actionError && <span className="text-xs text-red-300 truncate max-w-[40%]">{actionError}</span>}
            </div>
            <div className="pretty-scrollbar min-h-0 flex-1 overflow-y-auto">
              {activeTab === 'cases' && (
                <TestCasesTab
                  visibleTests={visibleTests}
                  customInput={customInput}
                  setCustomInput={setCustomInput}
                  showCustom={showCustom}
                  setShowCustom={setShowCustom}
                />
              )}
              {activeTab === 'output' && (
                <OutputTab runReport={runReport} submitResult={submitResult} running={running} submitting={submitting} />
              )}
              {activeTab === 'submissions' && (
                <SubmissionsTab submissions={previousSubmissions} points={points} />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NavBtn({ href, children }) {
  return (
    <Link href={href} className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white">{children}</Link>
  );
}

function questionStatusLabel(state, maxSubmissions) {
  if (state?.best?.status === 'passed') return 'Solved';
  if (state?.best) return 'Attempted';
  if (Number(maxSubmissions) >= UNLIMITED_SUBMISSIONS) return 'Open';
  if ((state?.used || 0) >= maxSubmissions) return 'Locked';
  return 'Open';
}

function submissionCountLabel(used, maxSubmissions) {
  return Number(maxSubmissions) >= UNLIMITED_SUBMISSIONS
    ? `${used}/unlimited submissions`
    : `${used}/${maxSubmissions} submissions`;
}

function ConsoleTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-md px-3 py-1.5 font-bold transition ${active ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
    >
      {children}
    </button>
  );
}

function TestCasesTab({ visibleTests, customInput, setCustomInput, showCustom, setShowCustom }) {
  const [activeCase, setActiveCase] = useState(0);
  const customIndex = visibleTests.length;
  const activeVisible = activeCase < visibleTests.length ? visibleTests[activeCase] : null;
  const customActive = showCustom && activeCase === customIndex;

  useEffect(() => {
    if (!showCustom && activeCase >= visibleTests.length) {
      setActiveCase(Math.max(0, visibleTests.length - 1));
    }
  }, [activeCase, showCustom, visibleTests.length]);

  function openCustomCase() {
    setShowCustom(true);
    setActiveCase(customIndex);
  }

  if (!visibleTests.length && !showCustom) {
    return (
      <div className="p-4">
        <button
          type="button"
          onClick={openCustomCase}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15"
        >
          <Plus size={16} />
          Add custom test input
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {visibleTests.map((test, idx) => (
          <button
            key={test.id || idx}
            type="button"
            onClick={() => setActiveCase(idx)}
            className={`inline-flex h-9 items-center rounded-lg px-5 text-sm font-bold transition ${
              activeCase === idx
                ? 'bg-white/12 text-white'
                : 'bg-transparent text-white/55 hover:bg-white/7 hover:text-white'
            }`}
          >
            Case {idx + 1}
          </button>
        ))}
        {showCustom ? (
          <button
            type="button"
            onClick={() => setActiveCase(customIndex)}
            className={`inline-flex h-9 items-center rounded-lg px-5 text-sm font-bold transition ${
              customActive
                ? 'bg-white/12 text-white'
                : 'bg-transparent text-white/55 hover:bg-white/7 hover:text-white'
            }`}
          >
            Custom
          </button>
        ) : (
          <button
            type="button"
            onClick={openCustomCase}
            title="Add custom test input"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/7 hover:text-white"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {activeVisible && (
        <div className="space-y-5">
          <ResultSection title="Input">
            <div className="space-y-2">
              {formatInputRows(activeVisible.stdin).map((row) => (
                <div key={row.label} className="font-mono text-sm">
                  <span className="text-white/55">{row.label} = </span>
                  <span className="font-bold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </ResultSection>
        </div>
      )}

      {customActive && (
        <section>
          <div className="mb-2 text-sm font-bold text-white/55">Input</div>
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type custom stdin here..."
            rows={5}
            className="block w-full resize-none rounded-lg bg-white/10 px-4 py-3 font-mono text-sm font-bold text-white outline-none ring-1 ring-transparent transition placeholder:text-white/30 focus:ring-blue-300/50"
          />
          <button
            type="button"
            onClick={() => {
              setShowCustom(false);
              setActiveCase(0);
              setCustomInput('');
            }}
            className="mt-3 text-xs font-bold text-white/45 transition hover:text-white/75"
          >
            Remove custom case
          </button>
        </section>
      )}
    </div>
  );
}

function OutputTab({ runReport, submitResult, running, submitting }) {
  if (running) return <div className="p-4 text-sm text-white/60 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/>Running…</div>;
  if (submitting) return <div className="p-4 text-sm text-white/60 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/>Submitting…</div>;

  if (submitResult) {
    const s = submitResult.submission;
    const runtime = s.runtime_ms?.toFixed?.(0) ?? '0';
    return (
      <div className="p-4">
        <SubmissionHeader submission={s} remaining={submitResult.submissions_remaining} />
        {s.error_output && (
          <pre className="mt-3 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100 whitespace-pre-wrap">{s.error_output}</pre>
        )}
        <LeetCodeResultView
          results={s.results}
          status={s.status === 'passed' ? 'Accepted' : s.status === 'partial' ? 'Partial' : 'Wrong Answer'}
          runtime={`${runtime} ms`}
          summary={`Visible: ${s.visible_passed}/${s.visible_total} passed · Hidden: ${s.hidden_passed}/${s.hidden_total} passed`}
        />
      </div>
    );
  }

  if (runReport) {
    const accepted = runReport.total > 0 && runReport.passed === runReport.total;
    return (
      <div className="p-4">
        {runReport.compileError && (
          <pre className="mb-3 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-100 whitespace-pre-wrap">{runReport.compileError}</pre>
        )}
        <LeetCodeResultView
          results={runReport.results}
          status={accepted ? 'Accepted' : 'Wrong Answer'}
          runtime={`${runReport.avgRuntimeMs?.toFixed?.(0) ?? 0} ms`}
          summary={`${runReport.passed}/${runReport.total} visible tests passed`}
        />
      </div>
    );
  }

  return <div className="p-4 text-sm text-white/40">Click Run to test your code, or Submit when you&apos;re ready.</div>;
}

function LeetCodeResultView({ results, status, runtime, summary }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const safeResults = results || [];
  const active = safeResults[Math.min(activeIdx, Math.max(0, safeResults.length - 1))];
  const accepted = status === 'Accepted';

  useEffect(() => {
    setActiveIdx(0);
  }, [results]);

  if (!safeResults.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-white/50">
        No test results returned.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <div className={`text-2xl font-bold ${accepted ? 'text-emerald-400' : status === 'Partial' ? 'text-amber-300' : 'text-red-300'}`}>
          {status}
        </div>
        <div className="text-sm text-white/60">Runtime: {runtime}</div>
        <div className="text-sm text-white/45">{summary}</div>
      </div>

      <div className="flex flex-wrap gap-3">
        {safeResults.map((result, idx) => (
          <button
            key={result.id || idx}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold transition ${
              activeIdx === idx
                ? 'bg-white/12 text-white'
                : 'bg-transparent text-white/55 hover:bg-white/7 hover:text-white'
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded-[4px] ${
              result.passed === true ? 'bg-emerald-500 text-[#101f19]' : result.is_custom ? 'bg-blue-400 text-[#0d1b2f]' : 'bg-red-500 text-white'
            }`}>
              {result.passed === true
                ? <Check size={12} strokeWidth={4} />
                : result.is_custom
                  ? <AlertTriangle size={12} strokeWidth={3} />
                  : <XCircle size={12} strokeWidth={3} />}
            </span>
            Case {idx + 1}
          </button>
        ))}
      </div>

      {active && (
        <div className="space-y-5">
          <ResultSection title="Input">
            <div className="space-y-2">
              {formatInputRows(active.stdin).map((row) => (
                <div key={row.label} className="font-mono text-sm">
                  <span className="text-white/55">{row.label} = </span>
                  <span className="font-bold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </ResultSection>

          <ResultSection title="Output">
            <pre className="font-mono text-sm font-bold text-white whitespace-pre-wrap">{displayValue(active.stdout)}</pre>
          </ResultSection>

          <ResultSection title="Expected">
            <pre className="font-mono text-sm font-bold text-white whitespace-pre-wrap">
              {active.is_custom ? 'Custom input has no expected output.' : displayValue(active.expected)}
            </pre>
          </ResultSection>

          {(active.error || active.stderr) && (
            <ResultSection title="Error">
              <pre className="font-mono text-xs text-red-100 whitespace-pre-wrap">{active.error || active.stderr}</pre>
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, children }) {
  return (
    <section>
      <div className="mb-2 text-sm font-bold text-white/55">{title}</div>
      <div className="rounded-lg bg-white/10 px-4 py-3 shadow-inner shadow-black/10">
        {children}
      </div>
    </section>
  );
}

function formatInputRows(stdin) {
  if (stdin == null) return [{ label: 'stdin', value: '(hidden)' }];
  const raw = String(stdin);
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([label, value]) => ({
        label,
        value: prettyJson(value),
      }));
    }
    return [{ label: 'stdin', value: prettyJson(parsed) }];
  } catch {
    return [{ label: 'stdin', value: raw.trim() || '(empty)' }];
  }
}

function prettyJson(value) {
  return JSON.stringify(value);
}

function displayValue(value) {
  if (value == null) return '(hidden)';
  const text = String(value).trim();
  return text || '(empty)';
}

function TestResultCard({ idx, result }) {
  const status = result.is_custom
    ? 'custom'
    : result.passed === true ? 'pass'
    : result.passed === false ? 'fail'
    : 'unknown';

  const styles = {
    pass: { bg: 'bg-emerald-400/5', border: 'border-emerald-400/30', icon: <CheckCircle2 size={14} className="text-emerald-300"/>, label: 'Passed' },
    fail: { bg: 'bg-red-400/5',     border: 'border-red-400/30',     icon: <XCircle size={14} className="text-red-300"/>,        label: 'Failed' },
    custom: { bg: 'bg-blue-400/5',  border: 'border-blue-400/30',    icon: <AlertTriangle size={14} className="text-blue-300"/>, label: 'Custom (no expected)' },
    unknown: { bg: 'bg-white/5',    border: 'border-white/10',       icon: <AlertCircle size={14} className="text-white/40"/>,    label: 'Skipped' },
  }[status];

  return (
    <div className={`rounded-md ${styles.bg} border ${styles.border} p-2.5`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-xs font-bold">
          {styles.icon}
          {result.is_custom ? 'Custom Input' : `Case ${idx + 1}`} · {styles.label}
        </div>
        <span className="text-xs text-white/40">{result.runtime_ms?.toFixed?.(0) ?? '—'} ms</span>
      </div>
      {result.error && <pre className="text-xs text-red-200 whitespace-pre-wrap">{result.error}</pre>}
      {result.stdin != null && <pre className="text-xs text-white/60 whitespace-pre-wrap">stdin: {result.stdin}</pre>}
      {result.expected != null && <pre className="text-xs text-white/50 whitespace-pre-wrap">expected: {result.expected}</pre>}
      {result.stdout != null && <pre className="text-xs text-white/80 whitespace-pre-wrap">stdout: {result.stdout || '(empty)'}</pre>}
      {result.stderr && <pre className="text-xs text-red-300/70 whitespace-pre-wrap mt-1">stderr: {result.stderr}</pre>}
    </div>
  );
}

function SubmissionHeader({ submission: s, remaining }) {
  const passed = s.status === 'passed';
  return (
    <div className={`rounded-lg p-3 border ${passed ? 'bg-emerald-500/10 border-emerald-400/40' : s.status === 'partial' ? 'bg-amber-500/10 border-amber-400/40' : 'bg-red-500/10 border-red-400/40'}`}>
      <div className="flex items-center gap-2 font-bold">
        {passed ? <CheckCircle2 size={18} className="text-emerald-300"/> : <XCircle size={18} className="text-red-300"/>}
        <span className="capitalize">{s.status}</span>
        <span className="ml-auto text-sm font-bold">{s.score} / {s.points} pts</span>
      </div>
      <div className="text-xs text-white/60 mt-1">
        {s.total_passed}/{s.total_tests} tests passed · {s.runtime_ms?.toFixed?.(0) ?? '—'} ms avg · {remaining} submission{remaining === 1 ? '' : 's'} remaining
      </div>
    </div>
  );
}

function SubmissionsTab({ submissions, points }) {
  if (!submissions.length) return <div className="p-4 text-sm text-white/40">No submissions yet for this problem.</div>;
  return (
    <div className="p-3 space-y-2">
      {submissions.map((s, i) => (
        <div key={s.id} className="rounded-md bg-white/5 border border-white/10 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white/80">#{submissions.length - i}</span>
              <StatusPill status={s.status}/>
              <span className="text-white/40">{new Date(s.submitted_at).toLocaleString()}</span>
            </div>
            <div className="font-bold">{s.score}/{points} pts · {s.total_passed}/{s.total_tests}</div>
          </div>
          {s.error_output && <pre className="text-xs text-red-200/80 mt-1 whitespace-pre-wrap">{s.error_output}</pre>}
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }) {
  const cls = {
    passed: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
    partial: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
    failed: 'bg-red-400/15 text-red-200 border-red-400/30',
    error: 'bg-purple-400/15 text-purple-200 border-purple-400/30',
  }[status] || 'bg-white/10 text-white/70 border-white/20';
  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>;
}

function DifficultyPill({ difficulty }) {
  const cls = difficulty === 'Easy'
    ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
    : difficulty === 'Medium'
      ? 'bg-amber-400/10 text-amber-200 border-amber-400/30'
      : 'bg-red-400/10 text-red-300 border-red-400/30';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${cls}`}>{difficulty}</span>;
}

function CountdownBadge({ expiresAt, status, unlimited = false }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt) - Date.now()));

  useEffect(() => {
    if (status !== 'in_progress' || unlimited) return undefined;
    const t = setInterval(() => setRemaining(Math.max(0, new Date(expiresAt) - Date.now())), 1000);
    return () => clearInterval(t);
  }, [expiresAt, status, unlimited]);

  if (status === 'submitted') return <span className="text-xs font-bold text-emerald-300">Submitted</span>;
  if (unlimited && status === 'in_progress') return <span className="text-xs font-bold text-blue-200">No time limit</span>;
  if (status === 'expired' || remaining <= 0) return <span className="text-xs font-bold text-amber-300">Submitting...</span>;

  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const display = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  const warn = remaining < 60_000;

  return (
    <span className={`flex items-center gap-1 text-xs font-bold tabular-nums px-2 py-1 rounded-md ${warn ? 'bg-red-500/15 text-red-200 animate-pulse' : 'bg-white/5 text-white/80'}`}>
      <Clock size={12}/>{display}
    </span>
  );
}
