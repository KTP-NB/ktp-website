import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const service = getServiceClient();
  const { data: attempt, error } = await service
    .from('cr_attempts')
    .select(`
      id, user_id, assessment_id, started_at, expires_at, submitted_at, status, question_order,
      cr_assessments (
        id, title, description, time_limit_minutes, max_submissions_per_question, due_at, randomize_question_order, random_question_count, random_question_difficulties, random_question_categories,
        cr_assessment_questions (
          question_id, ordinal, points,
          cr_questions ( id, slug, title, difficulty, category, pattern,
                         prompt_md, constraints_md, examples, image_urls, starter_code, default_language,
                         function_metadata, use_runtime_harness )
        )
      )
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (attempt.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Auto-expire on read if past deadline
  const dueExpired = attempt.cr_assessments?.due_at && new Date(attempt.cr_assessments.due_at) <= new Date();
  const timerExpired = Number(attempt.cr_assessments?.time_limit_minutes) > 0 && new Date(attempt.expires_at) < new Date();
  if (attempt.status === 'in_progress' && (timerExpired || dueExpired)) {
    await service.from('cr_attempts').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', params.id);
    attempt.status = 'submitted';
    attempt.submitted_at = new Date().toISOString();
  } else if (!attempt.status || attempt.status === 'not_started') {
    await service.from('cr_attempts').update({ status: 'in_progress' }).eq('id', params.id);
    attempt.status = 'in_progress';
  }

  const order = Array.isArray(attempt.question_order) ? attempt.question_order : [];
  if (order.length && attempt.cr_assessments?.cr_assessment_questions) {
    const allowed = new Set(order);
    const rank = new Map(order.map((qid, idx) => [qid, idx]));
    attempt.cr_assessments.cr_assessment_questions = attempt.cr_assessments.cr_assessment_questions
      .filter((q) => allowed.has(q.question_id))
      .sort((a, b) => (rank.get(a.question_id) ?? a.ordinal) - (rank.get(b.question_id) ?? b.ordinal));
  }

  // Attach visible test cases for each question
  const qIds = (attempt.cr_assessments?.cr_assessment_questions || []).map((aq) => aq.question_id);
  if (qIds.length) {
    const { data: visibleTests } = await service
      .from('cr_test_cases')
      .select('id, question_id, stdin, expected_stdout, ordinal, explanation')
      .in('question_id', qIds)
      .eq('is_hidden', false)
      .order('ordinal');
    const byQ = {};
    (visibleTests || []).forEach((t) => {
      (byQ[t.question_id] ||= []).push(t);
    });
    attempt.visible_tests_by_question = byQ;
  }

  // Attach the user's submissions for this attempt (count + best per q)
  const { data: subs } = await service
    .from('cr_submissions')
    .select('id, question_id, language, code, submitted_at, total_passed, total_tests, score, status, runtime_ms, visible_tests_passed, visible_tests_total, hidden_tests_passed, hidden_tests_total, error_output')
    .eq('attempt_id', params.id)
    .order('submitted_at', { ascending: false });
  attempt.submissions = subs || [];

  return NextResponse.json({ attempt });
}

export async function PATCH(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  if (body.action !== 'submit_assessment') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  const service = getServiceClient();
  const { data: attempt, error } = await service
    .from('cr_attempts')
    .select('id, user_id, status, expires_at, assessment_id, cr_assessments(due_at,time_limit_minutes)')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!attempt || attempt.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: `Attempt is ${attempt.status}` }, { status: 409 });
  }

  const dueExpired = attempt.cr_assessments?.due_at && new Date(attempt.cr_assessments.due_at) <= new Date();
  const timerExpired = Number(attempt.cr_assessments?.time_limit_minutes) > 0 && new Date(attempt.expires_at) < new Date();
  if (timerExpired || dueExpired) {
    const { data: submitted } = await service
      .from('cr_attempts')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();
    return NextResponse.json({ attempt: submitted, auto_submitted: true });
  }

  const { data: updated, error: updErr } = await service
    .from('cr_attempts')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ attempt: updated });
}

