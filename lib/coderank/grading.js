import { runOnce } from './piston';

/**
 * Normalize output for comparison: trim trailing whitespace per line, drop
 * leading/trailing blank lines. We deliberately do NOT canonicalize JSON —
 * each problem's I/O scaffolding is responsible for printing the canonical
 * form so that string equality works.
 */
function normalize(out) {
  if (out == null) return '';
  return String(out)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

/**
 * Run user code against a list of test cases.
 * @param {{ language: string, code: string, tests: Array<{id?:string,stdin:string,expected_stdout:string,is_hidden?:boolean,ordinal?:number}> }} args
 * @returns {Promise<{
 *   results: Array<{id?:string, is_hidden:boolean, passed:boolean, runtime_ms:number, stdout:string, stderr:string, expected:string, error?:string}>,
 *   total: number,
 *   passed: number,
 *   visiblePassed: number,
 *   visibleTotal: number,
 *   hiddenPassed: number,
 *   hiddenTotal: number,
 *   avgRuntimeMs: number,
 *   compileError: string|null,
 * }>}
 */
export async function gradeSubmission({ language, code, tests, revealHidden = false }) {
  if (!Array.isArray(tests) || tests.length === 0) {
    return emptyReport();
  }

  // Run all tests in parallel (Piston is per-request stateless).
  const settled = await Promise.allSettled(
    tests.map((t) => runOnce({ language, code, stdin: t.stdin })),
  );

  let compileError = null;
  let totalRuntime = 0;
  const results = settled.map((s, idx) => {
    const test = tests[idx];
    const base = {
      id: test.id,
      ordinal: test.ordinal,
      is_hidden: !!test.is_hidden,
      passed: false,
      runtime_ms: 0,
      stdout: '',
      stderr: '',
      // Only expose expected/stdin to the client for visible tests, unless
      // the caller asked for the full picture (admin review).
      expected: !test.is_hidden || revealHidden ? test.expected_stdout : null,
      stdin: !test.is_hidden || revealHidden ? test.stdin : null,
    };

    if (s.status === 'rejected') {
      return { ...base, error: String(s.reason?.message || s.reason) };
    }

    const r = s.value || {};
    const compile = r.compile;
    if (compile && (compile.code !== 0 || compile.stderr)) {
      // Same compile error will show up for every test — capture once.
      compileError = compileError || (compile.stderr || compile.output || 'Compile error');
    }
    const run = r.run || {};
    const runtimeMs = typeof run.cpu_time === 'number'
      ? run.cpu_time
      : typeof run.wall_time === 'number'
        ? run.wall_time
        : 0;
    totalRuntime += runtimeMs;

    const stdout = normalize(run.stdout);
    const expected = normalize(test.expected_stdout);
    const passed = !compile?.stderr && run.code === 0 && stdout === expected;

    const safeStdout = !test.is_hidden || revealHidden ? run.stdout || '' : null;
    const safeStderr = !test.is_hidden || revealHidden ? run.stderr || '' : null;

    return {
      ...base,
      passed,
      runtime_ms: runtimeMs,
      stdout: safeStdout,
      stderr: safeStderr,
    };
  });

  const visible = results.filter((r) => !r.is_hidden);
  const hidden = results.filter((r) => r.is_hidden);
  const passed = results.filter((r) => r.passed).length;
  const visiblePassed = visible.filter((r) => r.passed).length;
  const hiddenPassed = hidden.filter((r) => r.passed).length;

  return {
    results,
    total: results.length,
    passed,
    visiblePassed,
    visibleTotal: visible.length,
    hiddenPassed,
    hiddenTotal: hidden.length,
    avgRuntimeMs: results.length ? Number((totalRuntime / results.length).toFixed(2)) : 0,
    compileError,
  };
}

function emptyReport() {
  return {
    results: [],
    total: 0,
    passed: 0,
    visiblePassed: 0,
    visibleTotal: 0,
    hiddenPassed: 0,
    hiddenTotal: 0,
    avgRuntimeMs: 0,
    compileError: null,
  };
}
