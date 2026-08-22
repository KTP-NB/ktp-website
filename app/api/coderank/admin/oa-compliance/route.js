import { NextResponse } from 'next/server';
import { requirePermission, requireUser } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Noon on the 1st, Eastern, so the SQL side lands inside the right month. */
function asOfFor(month) {
  return `${month}-01T12:00:00-05:00`;
}

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year').value;
  const month = parts.find((part) => part.type === 'month').value;
  return `${year}-${month}`;
}

export async function GET(request) {
  const auth = await requirePermission(request, 'coderank.manage');
  if (auth.error) return auth.error;

  const requested = new URL(request.url).searchParams.get('month');
  const month = MONTH_PATTERN.test(requested || '') ? requested : currentMonth();

  const { data, error } = await getServiceClient().rpc('oa_compliance', { as_of: asOfFor(month) });
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));

  return withNoStore(
    NextResponse.json({
      month,
      currentMonth: currentMonth(),
      canEdit: auth.profile.access_role === 'super_admin',
      members: data || [],
    })
  );
}

/**
 * Set or clear a Super Admin override for one member/month.
 * completed: true credits the month, false revokes credit, null clears the
 * override and falls back to whatever CodeRank recorded.
 */
export async function PUT(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const service = getServiceClient();
  const { data: profile } = await service
    .from('member_profiles')
    .select('access_role')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (profile?.access_role !== 'super_admin') {
    return withNoStore(
      NextResponse.json({ error: 'Only Super Admins can change OA credit.' }, { status: 403 })
    );
  }

  const body = await request.json().catch(() => ({}));
  const memberId = String(body.member_id || '');
  const month = String(body.month || '');
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) {
    return withNoStore(NextResponse.json({ error: 'Select a valid member.' }, { status: 400 }));
  }
  if (!MONTH_PATTERN.test(month)) {
    return withNoStore(NextResponse.json({ error: 'A valid month is required.' }, { status: 400 }));
  }

  const monthStart = `${month}-01`;

  if (body.completed === null || body.completed === undefined) {
    const { error } = await service
      .from('member_oa_overrides')
      .delete()
      .eq('member_id', memberId)
      .eq('month_start', monthStart);
    if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
    return withNoStore(NextResponse.json({ override: null }));
  }

  const { data, error } = await service
    .from('member_oa_overrides')
    .upsert(
      {
        member_id: memberId,
        month_start: monthStart,
        completed: Boolean(body.completed),
        note: String(body.note || '').trim() || null,
        set_by: auth.user.id,
        set_at: new Date().toISOString(),
      },
      { onConflict: 'member_id,month_start' }
    )
    .select('*')
    .single();

  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({ override: data }));
}
