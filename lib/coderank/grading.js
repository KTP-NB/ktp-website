import { runOnce } from './piston';
import { judgeOutput } from './judge/index.js';

/**
 * Run user code against a list of test cases.
 * @param {Object} args
 * @param {string} args.language
 * @param {string} args.code
 * @param {Array<{id?:string,stdin:string,expected_stdout:string,is_hidden?:boolean,ordinal?:number}>} args.tests
 * @param {boolean} [args.revealHidden]
 * @param {{slug?:string, function_metadata?:object}} [args.question] - drives the judge layer. If
 *   omitted, falls back to legacy line-normalized string equality.
 */
export async function gradeSubmission({ language, code, tests, revealHidden = false, question = null }) {
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
      compileError = compileError || (compile.stderr || compile.output || 'Compile error');
    }
    const run = r.run || {};
    const runtimeMs = typeof run.cpu_time === 'number'
      ? run.cpu_time
      : typeof run.wall_time === 'number'
        ? run.wall_time
        : 0;
    totalRuntime += runtimeMs;

    const judgment = judgeOutput({
      slug: question?.slug,
      metadata: question?.function_metadata,
      stdin: test.stdin,
      expectedStdout: test.expected_stdout,
      actualStdout: run.stdout,
      exitCode: run.code,
      stderr: run.stderr,
    });
    const passed = !compile?.stderr && run.code === 0 && judgment.passed;

    const safeStdout = !test.is_hidden || revealHidden ? run.stdout || '' : null;
    const safeStderr = !test.is_hidden || revealHidden ? run.stderr || '' : null;

    return {
      ...base,
      passed,
      runtime_ms: runtimeMs,
      stdout: safeStdout,
      stderr: safeStderr,
      judge_mode: judgment.mode,
      judge_reason: judgment.reason || null,
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
