import { NextResponse } from 'next/server';
import { requireUser, getProfile, canTakeCodeRankAssessment } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';

export const dynamic = 'force-dynamic';
const NO_TIME_LIMIT_EXPIRES_AT = '9999-12-31T23:59:59.000Z';

/**
 * Start (or resume) an attempt for an assessment.
 * Server stamps started_at and expires_at — the client cannot influence either.
 */
export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { assessment_id } = await request.json().catch(() => ({}));
  if (!assessment_id) {
    return NextResponse.json({ error: 'assessment_id is required' }, { status: 400 });
  }

  const profile = await getProfile(auth.user.id);
  if (!canTakeCodeRankAssessment(profile)) {
    return NextResponse.json({ error: 'CodeRank assessments are only available to active members' }, { status: 403 });
  }

  const service = getServiceClient();

  // Verify the assessment exists, is published, and is assigned to this user.
  const { data: assessment, error: aErr } = await service
    .from('cr_assessments')
    .select(`
      id, time_limit_minutes, published,
      publish_at, due_at, randomize_question_order, random_question_count, random_question_difficulties, random_question_categories,
      cr_assessment_questions ( question_id, ordinal, cr_questions(difficulty, category, function_metadata, use_runtime_harness) ),
      cr_assignments ( assigned_to_type, assigned_to_value )
    `)
    .eq('id', assessment_id)
    .maybeSingle();

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!assessment || !assessment.published) {
    return NextResponse.json({ error: 'Assessment not available' }, { status: 404 });
  }
  const now = new Date();
  if (assessment.publish_at && new Date(assessment.publish_at) > now) {
    return NextResponse.json({ error: 'Assessment is not published yet' }, { status: 403 });
  }
  if (assessment.due_at && new Date(assessment.due_at) <= now) {
    return NextResponse.json({ error: 'Assessment deadline has passed' }, { status: 409 });
  }

  const userPledgeClass = String(profile?.pledge_class || '').trim().toLowerCase();
  const isAssigned = (assessment.cr_assignments || []).some(
    (a) =>
      a.assigned_to_type === 'all' ||
      (a.assigned_to_type === 'pledge_class' && userPledgeClass && String(a.assigned_to_value || '').trim().toLowerCase() === userPledgeClass) ||
      (a.assigned_to_type === 'user' && a.assigned_to_value === auth.user.id),
  );
  if (!isAssigned) {
    return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 });
  }

  // Idempotent: if attempt exists, return it.
  const { data: existing } = await service
    .from('cr_attempts')
    .select('*')
    .eq('assessment_id', assessment_id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (existing) {
    // Mark as expired if past the deadline.
    const dueExpired = assessment.due_at && new Date(assessment.due_at) <= new Date();
    const timerExpired = Number(assessment.time_limit_minutes) > 0 && new Date(existing.expires_at) < new Date();
    if (existing.status === 'in_progress' && (timerExpired || dueExpired)) {
      const { data: expired } = await service
        .from('cr_attempts')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      return NextResponse.json({ attempt: expired });
    }
    return NextResponse.json({ attempt: existing });
  }

  const hasTimeLimit = Number(assessment.time_limit_minutes) > 0;
  const timerExpires = hasTimeLimit
    ? new Date(now.getTime() + Number(assessment.time_limit_minutes) * 60_000)
    : new Date(NO_TIME_LIMIT_EXPIRES_AT);
  const dueAt = assessment.due_at ? new Date(assessment.due_at) : null;
  const expires = dueAt && dueAt < timerExpires ? dueAt : timerExpires;
  const eligibleQuestions = selectEligibleQuestions(assessment);
  const orderedQuestionIds = eligibleQuestions
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((q) => q.question_id);
  const questionOrder = assessment.randomize_question_order || assessment.random_question_count
    ? shuffle(orderedQuestionIds)
    : orderedQuestionIds;

  const { data: created, error: insErr } = await service
    .from('cr_attempts')
    .insert({
      assessment_id,
      user_id: auth.user.id,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      status: 'in_progress',
      question_order: questionOrder,
    })
    .select()
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ attempt: created }, { status: 201 });
}

function shuffle(input) {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function selectEligibleQuestions(assessment) {
  let questions = [...(assessment.cr_assessment_questions || [])];
  const difficulties = Array.isArray(assessment.random_question_difficulties)
    ? assessment.random_question_difficulties.filter(Boolean)
    : [];
  const categories = Array.isArray(assessment.random_question_categories)
    ? assessment.random_question_categories.filter(Boolean)
    : [];

  if (difficulties.length) {
    const allowed = new Set(difficulties.map((d) => String(d).toLowerCase()));
    questions = questions.filter((q) => allowed.has(String(q.cr_questions?.difficulty || '').toLowerCase()));
  }
  if (categories.length) {
    const allowed = new Set(categories.map((c) => String(c).toLowerCase()));
    questions = questions.filter((q) => allowed.has(String(q.cr_questions?.category || '').toLowerCase()));
  }

  const count = Number(assessment.random_question_count || 0);
  if (count > 0) return shuffle(questions).slice(0, Math.min(count, questions.length));
  return questions;
}
