import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set(['left_tab', 'returned_to_tab', 'window_blur', 'window_focus']);

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const { attempt_id, event_type, metadata = {} } = await request.json().catch(() => ({}));
  if (!attempt_id || !ALLOWED_EVENTS.has(event_type)) {
    return NextResponse.json({ error: 'attempt_id and valid event_type are required' }, { status: 400 });
  }

  const service = getServiceClient();
  const { data: attempt, error } = await service
    .from('cr_attempts')
    .select('id, user_id, assessment_id, status')
    .eq('id', attempt_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!attempt || attempt.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { error: insErr } = await service.from('cr_monitoring_events').insert({
    attempt_id,
    assessment_id: attempt.assessment_id,
    user_id: auth.user.id,
    event_type,
    metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
  });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
