import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { gradeSubmission } from '@/lib/coderank/grading';

export const dynamic = 'force-dynamic';
const UNLIMITED_SUBMISSIONS = 2147483647;

/**
 * Official submission. Runs against ALL test cases (visible + hidden),
 * persists the result, and counts toward the per-question submission limit
 * (enforced by a DB trigger as well — see migration).
 */
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { attempt_id, question_id, language, code, auto_submit = false } = await request.json().catch(() => ({}));

  if (!attempt_id || !question_id || !language || typeof code !== 'string') {
    return NextResponse.json({ error: 'attempt_id, question_id, language, code are required' }, { status: 400 });
  }
  if (code.length > 200_000) {
    return NextResponse.json({ error: 'Submission too large' }, { status: 413 });
  }

  const service = getServiceClient();

  // Validate attempt + ownership + state.
  const { data: attempt } = await service
    .from('cr_attempts')
    .select('id, user_id, status, expires_at, assessment_id, question_order, cr_assessments(due_at,time_limit_minutes)')
    .eq('id', attempt_id)
    .maybeSingle();
  if (!attempt || attempt.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: `Attempt is ${attempt.status}` }, { status: 409 });
  }
  const now = new Date();
  const hasTimeLimit = Number(attempt.cr_assessments?.time_limit_minutes) > 0;
  const expiresAt = hasTimeLimit ? new Date(attempt.expires_at) : new Date('9999-12-31T23:59:59.000Z');
  const dueAt = attempt.cr_assessments?.due_at ? new Date(attempt.cr_assessments.due_at) : null;
  const effectiveDeadline = dueAt && dueAt < expiresAt ? dueAt : expiresAt;
  const expired = effectiveDeadline < now;
  const autoSubmitGraceMs = 15_000;
  const canUseAutoSubmitGrace = auto_submit && expired && (now - effectiveDeadline) <= autoSubmitGraceMs;
  if (expired && !canUseAutoSubmitGrace) {
    await service.from('cr_attempts').update({ status: 'submitted', submitted_at: now.toISOString() }).eq('id', attempt_id);
    return NextResponse.json({ error: 'Time has expired; assessment auto-submitted.' }, { status: 409 });
  }

  const order = Array.isArray(attempt.question_order) ? attempt.question_order : [];
  if (order.length && !order.includes(question_id)) {
    return NextResponse.json({ error: 'Question is not part of this attempt' }, { status: 400 });
  }

  // Confirm the question is in this assessment and grab its point value + the max-submissions config.
  const { data: aq } = await service
    .from('cr_assessment_questions')
    .select('points, cr_assessments!inner(max_submissions_per_question)')
    .eq('assessment_id', attempt.assessment_id)
    .eq('question_id', question_id)
    .maybeSingle();
  if (!aq) return NextResponse.json({ error: 'Question is not part of this assessment' }, { status: 400 });

  const maxSubs = aq.cr_assessments.max_submissions_per_question;
  const points = aq.points;

  // Pre-check the submission count for a friendly error before the DB trigger fires.
  const { count: subCount } = await service
    .from('cr_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('attempt_id', attempt_id)
    .eq('question_id', question_id);
  if (Number(maxSubs) > 0 && Number(maxSubs) < UNLIMITED_SUBMISSIONS && (subCount ?? 0) >= maxSubs) {
    return NextResponse.json({ error: `Submission limit (${maxSubs}) reached` }, { status: 429 });
  }

  // Fetch ALL test cases (visible + hidden).
  const { data: tests, error: tErr } = await service
    .from('cr_test_cases')
    .select('id, stdin, expected_stdout, is_hidden, ordinal')
    .eq('question_id', question_id)
    .order('ordinal');
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  if (!tests || tests.length === 0) {
    return NextResponse.json({ error: 'This question has no test cases. Contact an admin.' }, { status: 500 });
  }

  // Grade with hidden details persisted for admins; the client response below still filters them out.
  const report = await gradeSubmission({ language, code, tests, revealHidden: true });

  const score = report.total > 0
    ? Math.round((report.passed / report.total) * points)
    : 0;

  let status = 'failed';
  if (report.compileError) status = 'error';
  else if (report.passed === report.total) status = 'passed';
  else if (report.passed > 0) status = 'partial';

  const { data: insertedRows, error: insErr } = await service
    .from('cr_submissions')
    .insert({
      attempt_id,
      question_id,
      user_id: auth.user.id,
      language,
      code,
      visible_tests_passed: report.visiblePassed,
      visible_tests_total: report.visibleTotal,
      hidden_tests_passed: report.hiddenPassed,
      hidden_tests_total: report.hiddenTotal,
      total_passed: report.passed,
      total_tests: report.total,
      score,
      runtime_ms: report.avgRuntimeMs,
      status,
      // Persist the full report (with hidden details) for admin review.
      test_results: report.results,
      error_output: report.compileError,
    })
    .select()
    .single();

  if (insErr) {
    // Friendlier message when the DB trigger blocks us.
    const msg = /Submission limit/.test(insErr.message)
      ? insErr.message
      : insErr.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const remaining = Math.max(0, maxSubs - ((subCount ?? 0) + 1));

  return NextResponse.json({
    submission: {
      id: insertedRows.id,
      status,
      score,
      points,
      total_passed: report.passed,
      total_tests: report.total,
      visible_passed: report.visiblePassed,
      visible_total: report.visibleTotal,
      hidden_passed: report.hiddenPassed,
      hidden_total: report.hiddenTotal,
      runtime_ms: report.avgRuntimeMs,
      error_output: report.compileError,
      // Only return visible-test detail to the client; hidden tests are pass/fail summary only.
      results: report.results.filter((r) => !r.is_hidden),
    },
    submissions_remaining: remaining,
  });
}

