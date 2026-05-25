import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';

export const dynamic = 'force-dynamic';

// PUT replaces the full assignment list.
// Body: { assignments: [{ type: 'all' | 'pledge_class' | 'user', value?: string }] }
export async function PUT(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { assignments = [] } = await request.json().catch(() => ({}));
  for (const a of assignments) {
    if (!['all', 'pledge_class', 'user'].includes(a.type)) {
      return NextResponse.json({ error: `Invalid assignment type: ${a.type}` }, { status: 400 });
    }
    if (a.type !== 'all' && !a.value) {
      return NextResponse.json({ error: 'value is required for pledge_class/user assignments' }, { status: 400 });
    }
  }

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
    .from('cr_assignments')
    .delete()
    .eq('assessment_id', params.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (assignments.length) {
    const rows = assignments.map((a) => ({
      assessment_id: params.id,
      assigned_to_type: a.type,
      assigned_to_value: a.type === 'all' ? null : a.value,
      created_by: auth.user.id,
    }));
    const { error: insErr } = await service.from('cr_assignments').insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: assignments.length });
}
