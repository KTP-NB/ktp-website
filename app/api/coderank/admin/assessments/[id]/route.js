import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = params;
  const service = getServiceClient();

  const { data: assessment, error } = await service
    .from('cr_assessments')
    .select(`
      id, title, description, time_limit_minutes, max_submissions_per_question,
      published, publish_at, due_at, randomize_question_order, created_at, updated_at, created_by,
      cr_assessment_questions (
        question_id, ordinal, points,
        cr_questions ( id, slug, title, difficulty, category, function_metadata, use_runtime_harness )
      ),
      cr_assignments ( id, assigned_to_type, assigned_to_value, created_at )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    const message = error.message || '';
    if (message.includes('cr_assessments_time_limit_minutes_check')) {
      return NextResponse.json({
        error: 'Database constraint still requires a positive time limit. Apply migration 20260525_allow_unlimited_coderank_time_limit.sql.',
      }, { status: 500 });
    }
    if (message.includes('cr_assessments_max_submissions_per_question_check')) {
      return NextResponse.json({
        error: 'Database constraint still caps submissions per question. Apply migration 20260525_allow_unlimited_coderank_submissions.sql.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if (!assessment) return withNoStore(NextResponse.json({ error: 'Not found' }, { status: 404 }));
  return withNoStore(NextResponse.json({ assessment }));
}

export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const allowed = [
    'title',
    'description',
    'time_limit_minutes',
    'max_submissions_per_question',
    'published',
    'publish_at',
    'due_at',
    'randomize_question_order',
  ];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if ('time_limit_minutes' in update) {
    const value = Number(update.time_limit_minutes);
    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json({ error: 'time_limit_minutes must be zero or a positive number' }, { status: 400 });
    }
    update.time_limit_minutes = value;
  }
  if ('max_submissions_per_question' in update) {
    const value = Number(update.max_submissions_per_question);
    if (!Number.isInteger(value) || value < 1) {
      return NextResponse.json({ error: 'max_submissions_per_question must be a positive integer' }, { status: 400 });
    }
    update.max_submissions_per_question = value;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields supplied' }, { status: 400 });
  }

  const service = getServiceClient();
  const { data: current, error: currentErr } = await service
    .from('cr_assessments')
    .select('due_at')
    .eq('id', params.id)
    .maybeSingle();
  if (currentErr) return NextResponse.json({ error: currentErr.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const isExpired = current.due_at && new Date(current.due_at) <= new Date();
  const allowedWhenExpired = new Set(['published', 'due_at']);
  const touchesRestricted = Object.keys(update).some((k) => !allowedWhenExpired.has(k));
  if (isExpired && touchesRestricted) {
    return NextResponse.json({ error: 'Expired assessments cannot be edited.' }, { status: 409 });
  }

  const { data, error } = await service
    .from('cr_assessments')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if ('time_limit_minutes' in update && update.time_limit_minutes === 0) {
    const farFuture = data.due_at || '9999-12-31T23:59:59.000Z';
    await service
      .from('cr_attempts')
      .update({ expires_at: farFuture })
      .eq('assessment_id', params.id)
      .eq('status', 'in_progress');
  }
  return withNoStore(NextResponse.json({ assessment: data }));
}

export async function DELETE(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const service = getServiceClient();

  const { data: attempts, error: attemptsErr } = await service
    .from('cr_attempts')
    .select('id')
    .eq('assessment_id', params.id);
  if (attemptsErr) return NextResponse.json({ error: attemptsErr.message }, { status: 500 });
  const attemptIds = (attempts || []).map((a) => a.id);

  if (attemptIds.length) {
    const { error: subErr } = await service.from('cr_submissions').delete().in('attempt_id', attemptIds);
    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  const monByAssessment = await service.from('cr_monitoring_events').delete().eq('assessment_id', params.id);
  if (monByAssessment.error && !/relation .* does not exist|column .* does not exist/i.test(monByAssessment.error.message)) {
    return NextResponse.json({ error: monByAssessment.error.message }, { status: 500 });
  }
  if (attemptIds.length) {
    const { error: monAttErr } = await service.from('cr_monitoring_events').delete().in('attempt_id', attemptIds);
    if (monAttErr && !/relation .* does not exist/i.test(monAttErr.message)) {
      return NextResponse.json({ error: monAttErr.message }, { status: 500 });
    }
    const { error: attDelErr } = await service.from('cr_attempts').delete().in('id', attemptIds);
    if (attDelErr) return NextResponse.json({ error: attDelErr.message }, { status: 500 });
  }

  const { error: attByAssessmentErr } = await service.from('cr_attempts').delete().eq('assessment_id', params.id);
  if (attByAssessmentErr) return NextResponse.json({ error: attByAssessmentErr.message }, { status: 500 });
  const { error: assignErr } = await service.from('cr_assignments').delete().eq('assessment_id', params.id);
  if (assignErr) return NextResponse.json({ error: assignErr.message }, { status: 500 });
  const { error: aqErr } = await service.from('cr_assessment_questions').delete().eq('assessment_id', params.id);
  if (aqErr) return NextResponse.json({ error: aqErr.message }, { status: 500 });

  const { error } = await service.from('cr_assessments').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return withNoStore(NextResponse.json({ ok: true }));
}
