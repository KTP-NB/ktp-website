import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const service = getServiceClient();
  const { data, error } = await service
    .from('cr_assessments')
    .select(`
      id, title, description, time_limit_minutes, max_submissions_per_question,
      published, publish_at, due_at, randomize_question_order, random_question_count, random_question_difficulties, random_question_categories, created_at, updated_at,
      cr_assessment_questions ( question_id, ordinal, points ),
      cr_assignments ( id, assigned_to_type, assigned_to_value )
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assessments: data });
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const {
    title,
    description,
    time_limit_minutes,
    max_submissions_per_question = 3,
    published = false,
    publish_at = null,
    due_at = null,
    randomize_question_order = false,
    random_question_count = null,
    random_question_difficulties = [],
    random_question_categories = [],
    question_ids = [],
    assignments = [],
  } = body;

  const normalizedTimeLimit = Number(time_limit_minutes);
  if (!title || !Number.isFinite(normalizedTimeLimit) || normalizedTimeLimit < 0) {
    return NextResponse.json({ error: 'title and time_limit_minutes are required' }, { status: 400 });
  }
  const normalizedMaxSubmissions = Number(max_submissions_per_question);
  if (!Number.isInteger(normalizedMaxSubmissions) || normalizedMaxSubmissions < 1) {
    return NextResponse.json({ error: 'max_submissions_per_question must be a positive integer' }, { status: 400 });
  }

  const service = getServiceClient();
  const { data: assessment, error: createErr } = await service
    .from('cr_assessments')
    .insert({
      title,
      description: description ?? null,
      time_limit_minutes: normalizedTimeLimit,
      max_submissions_per_question: normalizedMaxSubmissions,
      published,
      publish_at,
      due_at,
      randomize_question_order,
      random_question_count: random_question_count ? Number(random_question_count) : null,
      random_question_difficulties: Array.isArray(random_question_difficulties) ? random_question_difficulties : [],
      random_question_categories: Array.isArray(random_question_categories) ? random_question_categories : [],
      created_by: auth.user.id,
    })
    .select()
    .single();

  if (createErr) {
    const message = createErr.message || '';
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

  if (question_ids.length) {
    const rows = question_ids.map((qid, idx) => ({
      assessment_id: assessment.id,
      question_id: qid,
      ordinal: idx,
      points: 100,
    }));
    const { error: qErr } = await service.from('cr_assessment_questions').insert(rows);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  if (assignments.length) {
    const rows = assignments.map((a) => ({
      assessment_id: assessment.id,
      assigned_to_type: a.type,
      assigned_to_value: a.value || null,
      created_by: auth.user.id,
    }));
    const { error: aErr } = await service.from('cr_assignments').insert(rows);
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  return NextResponse.json({ assessment }, { status: 201 });
}

