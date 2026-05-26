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
  const debug = new URL(request.url).searchParams.get('debug') === '1';
  const userPledgeClass = normalize(profile?.pledge_class);

  const { data: userAttempts, error: atErr } = await service
    .from('cr_attempts')
    .select('assessment_id')
    .eq('user_id', auth.user.id);
  if (atErr) return NextResponse.json({ error: atErr.message }, { status: 500 });
  const attemptedIds = new Set((userAttempts || []).map((a) => a.assessment_id));

  const { data: publishedRows, error: pErr } = await service
    .from('cr_assessments')
    .select(`
      id, title, description, time_limit_minutes,
      max_submissions_per_question, published, publish_at, due_at, randomize_question_order, random_question_count, random_question_difficulties, random_question_categories, created_at,
      cr_assessment_questions ( question_id, ordinal )
    `)
    .eq('published', true);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const published = publishedRows || [];
  const publishedIds = published.map((a) => a.id).filter(Boolean);
  const { data: allAssignments, error: allAssignmentsErr } = publishedIds.length
    ? await service
        .from('cr_assignments')
        .select('assessment_id, assigned_to_type, assigned_to_value')
        .in('assessment_id', publishedIds)
    : { data: [], error: null };
  if (allAssignmentsErr) return NextResponse.json({ error: allAssignmentsErr.message }, { status: 500 });

  const assignmentsByAssessment = new Map();
  for (const assignment of allAssignments || []) {
    if (!assignmentsByAssessment.has(assignment.assessment_id)) {
      assignmentsByAssessment.set(assignment.assessment_id, []);
    }
    assignmentsByAssessment.get(assignment.assessment_id).push(assignment);
  }

  const seen = new Map();
  const now = new Date();
  const filteredOut = [];
  for (const asmt of published) {
    const assignments = assignmentsByAssessment.get(asmt.id) || [];
    if (!attemptedIds.has(asmt.id) && !matchesAssignment(assignments, auth.user.id, userPledgeClass)) {
      filteredOut.push({ id: asmt.id, title: asmt.title, reason: 'not assigned' });
      continue;
    }
    if (asmt.publish_at && new Date(asmt.publish_at) > now) {
      filteredOut.push({ id: asmt.id, title: asmt.title, reason: 'publish_at in future', publish_at: asmt.publish_at });
      continue;
    }
    if (asmt.due_at && new Date(asmt.due_at) <= now) {
      filteredOut.push({ id: asmt.id, title: asmt.title, reason: 'due_at in past', due_at: asmt.due_at });
      continue;
    }
    if (!seen.has(asmt.id)) seen.set(asmt.id, asmt);
  }

  if (debug) {
    console.log('[assigned debug]', JSON.stringify({
      user_id: auth.user.id,
      pledge_class: profile?.pledge_class,
      assignments_by_assessment: Object.fromEntries(assignmentsByAssessment),
      user_attempts: userAttempts,
      published_rows: published.map((p) => ({ id: p.id, title: p.title, published: p.published, publish_at: p.publish_at, due_at: p.due_at })),
      filtered_out: filteredOut,
      final_ids: [...seen.keys()],
    }, null, 2));
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

  if (debug) {
    return NextResponse.json({
      assessments: out,
      debug: {
        user_id: auth.user.id,
        pledge_class: profile?.pledge_class,
        assignments_by_assessment: Object.fromEntries(assignmentsByAssessment),
        user_attempts: userAttempts,
        published_rows: published.map((p) => ({ id: p.id, title: p.title, published: p.published, publish_at: p.publish_at, due_at: p.due_at })),
        filtered_out: filteredOut,
        final_ids: [...seen.keys()],
      },
    });
  }

  return NextResponse.json({ assessments: out });
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesAssignment(assignments, userId, pledgeClass) {
  if (assignments.some((a) => a.assigned_to_type === 'all') || assignments.length === 0) {
    return true;
  }
  return assignments.some((a) => {
    if (a.assigned_to_type === 'user') return a.assigned_to_value === userId;
    if (a.assigned_to_type === 'pledge_class') return normalize(a.assigned_to_value) === pledgeClass;
    return false;
  });
}

