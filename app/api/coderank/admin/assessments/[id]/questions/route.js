import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';

export const dynamic = 'force-dynamic';

// PUT replaces the entire question set in one shot.
// Body: { question_ids: string[] }   (order = ordinal)
export async function PUT(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { question_ids = [] } = await request.json().catch(() => ({}));
  const service = getServiceClient();
  const { data: assessment, error: assessmentErr } = await service
    .from('cr_assessments')
    .select('due_at')
    .eq('id', params.id)
    .maybeSingle();
  if (assessmentErr) return NextResponse.json({ error: assessmentErr.message }, { status: 500 });
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (assessment.due_at && new Date(assessment.due_at) <= new Date()) {
    return NextResponse.json({ error: 'Expired assessments cannot be edited.' }, { status: 409 });
  }

  const { error: delErr } = await service
    .from('cr_assessment_questions')
    .delete()
    .eq('assessment_id', params.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (question_ids.length) {
    const rows = question_ids.map((qid, idx) => ({
      assessment_id: params.id,
      question_id: qid,
      ordinal: idx,
      points: 100,
    }));
    const { error: insErr } = await service.from('cr_assessment_questions').insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: question_ids.length });
}
