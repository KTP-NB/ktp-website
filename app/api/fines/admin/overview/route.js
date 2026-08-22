import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';
import { summarizeFines, toAmount } from '@/lib/fines';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requirePermission(request, 'fines.manage');
  if (auth.error) return auth.error;

  const service = getServiceClient();
  const [membersResult, finesResult] = await Promise.all([
    service
      .from('member_profiles')
      .select('id,name,position,pledge_class,member_status,photo_url')
      .order('name'),
    service
      .from('member_fines')
      .select('*')
      .order('date_issued', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  const error = membersResult.error || finesResult.error;
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));

  const finesByMember = new Map();
  for (const fine of finesResult.data || []) {
    const list = finesByMember.get(fine.member_id) || [];
    list.push(fine);
    finesByMember.set(fine.member_id, list);
  }

  const members = (membersResult.data || []).map((member) => ({
    ...member,
    ...summarizeFines(finesByMember.get(member.id) || []),
  }));

  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  const fines = (finesResult.data || []).map((fine) => ({
    ...fine,
    amount: toAmount(fine.amount),
    member_name: memberNames.get(fine.member_id) || 'Unknown member',
  }));

  const totals = summarizeFines(fines);

  return withNoStore(NextResponse.json({ members, fines, totals }));
}
