import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';
import { parseFinePayload } from '../payload';
import { parseFineMemberIds } from '@/lib/fines';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await requirePermission(request, 'fines.manage');
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const parsedMembers = parseFineMemberIds(body);
  if (parsedMembers.error) return withNoStore(NextResponse.json({ error: parsedMembers.error }, { status: 400 }));
  const parsed = parseFinePayload(
    { ...body, member_id: parsedMembers.memberIds[0] },
    { requireAll: true },
  );
  if (parsed.error) return withNoStore(NextResponse.json({ error: parsed.error }, { status: 400 }));

  const service = getServiceClient();
  const { data: members, error: memberError } = await service
    .from('member_profiles')
    .select('id')
    .in('id', parsedMembers.memberIds);
  if (memberError) return withNoStore(NextResponse.json({ error: memberError.message }, { status: 500 }));
  if ((members || []).length !== parsedMembers.memberIds.length) {
    return withNoStore(NextResponse.json({ error: 'One or more selected members no longer exist.' }, { status: 404 }));
  }

  const fineValues = { ...parsed.values };
  delete fineValues.member_id;
  const rows = parsedMembers.memberIds.map((memberId) => ({
    ...fineValues,
    member_id: memberId,
    created_by: auth.user.id,
  }));

  const { data, error } = await service
    .from('member_fines')
    .insert(rows)
    .select('*');

  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({ fine: data?.[0] || null, fines: data || [], created: data?.length || 0 }, { status: 201 }));
}
