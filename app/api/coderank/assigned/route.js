import { NextResponse } from 'next/server';
import { requireUser, getProfile, canTakeCodeRankAssessment } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * List assessments visible to the current member, with their attempt state.
 */
export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const profile = await getProfile(auth.user.id);
  if (!canTakeCodeRankAssessment(profile)) {
    return NextResponse.json({ assessments: [] });
  }

  const service = getServiceClient();

  const { data: published, error: pErr } = await service
    .from('cr_assessments')
    .select(`
      id, title, description, time_limit_minutes,
      max_submissions_per_question, published, publish_at, due_at, randomize_question_order, random_question_count, random_question_difficulties, random_question_categories, created_at,
      cr_assessment_questions ( question_id, ordinal ),
      cr_assignments ( assigned_to_type, assigned_to_value )
    `)
    .eq('published', true);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const { data: userAttempts } = await service
    .from('cr_attempts')
    .select('assessment_id')
    .eq('user_id', auth.user.id);
  const attemptedIds = new Set((userAttempts || []).map((a) => a.assessment_id));

  const userPledgeClass = normalize(profile?.pledge_class);
  const seen = new Map();
  const now = new Date();
  for (const asmt of published || []) {
    if (!asmt.published) continue;
    if (asmt.publish_at && new Date(asmt.publish_at) > now) continue;
    if (asmt.due_at && new Date(asmt.due_at) <= now) continue;

    const assignments = asmt.cr_assignments || [];
    const matchAssignment = assignments.some((a) =>
      a.assigned_to_type === 'all' ||
      (a.assigned_to_type === 'pledge_class' && normalize(a.assigned_to_value) === userPledgeClass && userPledgeClass) ||
      (a.assigned_to_type === 'user' && a.assigned_to_value === auth.user.id),
    );

    if ((matchAssignment || attemptedIds.has(asmt.id)) && !seen.has(asmt.id)) {
      seen.set(asmt.id, asmt);
    }
  }

  const assessmentIds = [...seen.keys()];
  const attemptsById = new Map();
  if (assessmentIds.length) {
    const { data: attempts } = await service
      .from('cr_attempts')
      .select('id, assessment_id, started_at, expires_at, submitted_at, status, question_order')
      .eq('user_id', auth.user.id)
      .in('assessment_id', assessmentIds);
    const expired = [];
    for (const a of attempts || []) {
      const asmt = seen.get(a.assessment_id);
      const dueExpired = asmt?.due_at && new Date(asmt.due_at) <= new Date();
      const timerExpired = Number(asmt?.time_limit_minutes) > 0 && new Date(a.expires_at) < new Date();
      if (a.status === 'in_progress' && (dueExpired || timerExpired)) {
        expired.push(a.id);
        attemptsById.set(a.assessment_id, { ...a, status: 'submitted', submitted_at: new Date().toISOString() });
      } else {
        attemptsById.set(a.assessment_id, a);
      }
    }
    if (expired.length) {
      await service.from('cr_attempts').update({ status: 'submitted', submitted_at: new Date().toISOString() }).in('id', expired);
    }
  }

  const out = [...seen.values()].map((asmt) => ({
    ...asmt,
    question_count: (attemptsById.get(asmt.id)?.question_order || []).length || (asmt.random_question_count || (asmt.cr_assessment_questions || []).length),
    attempt: attemptsById.get(asmt.id) || null,
  }));

  return NextResponse.json({ assessments: out });
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

