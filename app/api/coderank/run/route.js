import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { gradeSubmission } from '@/lib/coderank/grading';

export const dynamic = 'force-dynamic';

/**
 * Run user code against visible test cases (+ optional custom stdin).
 * Does NOT count toward the submission limit.
 */
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { attempt_id, question_id, language, code, custom_stdin } = body;

  if (!attempt_id || !question_id || !language || typeof code !== 'string') {
    return NextResponse.json({ error: 'attempt_id, question_id, language, code are required' }, { status: 400 });
  }

  const service = getServiceClient();

  // Verify the attempt belongs to the user, is in_progress, and contains this question.
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
  const dueExpired = attempt.cr_assessments?.due_at && new Date(attempt.cr_assessments.due_at) <= new Date();
  const timerExpired = Number(attempt.cr_assessments?.time_limit_minutes) > 0 && new Date(attempt.expires_at) < new Date();
  if (timerExpired || dueExpired) {
    await service.from('cr_attempts').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', attempt_id);
    return NextResponse.json({ error: 'Time has expired; assessment auto-submitted.' }, { status: 409 });
  }

  const order = Array.isArray(attempt.question_order) ? attempt.question_order : [];
  if (order.length && !order.includes(question_id)) {
    return NextResponse.json({ error: 'Question is not part of this attempt' }, { status: 400 });
  }

  const { data: aq } = await service
    .from('cr_assessment_questions')
    .select('question_id')
    .eq('assessment_id', attempt.assessment_id)
    .eq('question_id', question_id)
    .maybeSingle();
  if (!aq) return NextResponse.json({ error: 'Question is not part of this assessment' }, { status: 400 });

  // Fetch visible test cases (NEVER hidden).
  const { data: visibleTests, error: tErr } = await service
    .from('cr_test_cases')
    .select('id, stdin, expected_stdout, is_hidden, ordinal')
    .eq('question_id', question_id)
    .eq('is_hidden', false)
    .order('ordinal');
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const tests = [...(visibleTests || [])];
  if (custom_stdin) {
    // We have nothing to compare against — show stdout but report as "n/a".
    tests.push({
      id: 'custom',
      stdin: String(custom_stdin),
      expected_stdout: '__CUSTOM__',
      is_hidden: false,
      ordinal: 9999,
    });
  }

  const report = await gradeSubmission({ language, code, tests, revealHidden: false });

  // Mark the custom-input result as "n/a" instead of pass/fail
  if (custom_stdin) {
    const last = report.results[report.results.length - 1];
    if (last) {
      last.passed = null;
      last.expected = null;
      last.is_custom = true;
    }
  }

  return NextResponse.json({ report });
}

