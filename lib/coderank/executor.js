/**
 * Thin client for the hardened, internal-only code executor (a pure FastAPI
 * service). This replaces the direct Piston client: this repo owns auth,
 * harness assembly, and judging; the executor only compiles+runs code.
 *
 *   POST {EXECUTOR_URL}/api/execute
 *   header:  X-Executor-Token: <shared secret>
 *   body:    { language, code, stdin }
 *   returns: { stdout, stderr, exit_code, time_ms, compile_error }
 *
 * runOnce() is a DROP-IN for the old Piston runOnce(): same call signature and
 * the same return shape gradeSubmission() consumes — { run: { stdout, stderr,
 * code, cpu_time }, compile?: { code, stderr } }.
 *
 * EXECUTOR_URL / EXECUTOR_TOKEN are SERVER-only env (never NEXT_PUBLIC_*); this
 * module must only be imported from server code (it already is — via grading.js
 * inside the /api/coderank route handlers).
 */

const EXECUTOR_URL = (process.env.EXECUTOR_URL || '').replace(/\/+$/, '');
const EXECUTOR_TOKEN = process.env.EXECUTOR_TOKEN || '';

/**
 * Execute one program against one stdin payload.
 * @param {{language:string, code:string, stdin?:string}} args
 * @returns {Promise<{run:{stdout:string,stderr:string,code:number,cpu_time:number}, compile?:{code:number,stderr:string}}>}
 */
export async function runOnce({ language, code, stdin }) {
  if (!EXECUTOR_URL) throw new Error('EXECUTOR_URL is not configured');
  if (!EXECUTOR_TOKEN) throw new Error('EXECUTOR_TOKEN is not configured');

  const res = await fetch(`${EXECUTOR_URL}/api/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Executor-Token': EXECUTOR_TOKEN,
    },
    body: JSON.stringify({ language, code, stdin: stdin ?? '' }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Executor /api/execute failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const { stdout = '', stderr = '', exit_code = null, time_ms = 0, compile_error = null } = data || {};

  // Map into the Piston-shaped result gradeSubmission() already understands:
  //   run.stdout/stderr/code, run.cpu_time (runtime), and a compile block whose
  //   non-zero code / stderr the grader surfaces as report.compileError.
  const result = {
    run: {
      stdout,
      stderr,
      code: exit_code,
      cpu_time: typeof time_ms === 'number' ? time_ms : 0,
    },
  };
  if (compile_error != null) {
    result.compile = { code: 1, stderr: compile_error };
  }
  return result;
}

export { EXECUTOR_URL };
