import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';
import { parseFinePayload } from '../payload';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await requirePermission(request, 'fines.manage');
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const parsed = parseFinePayload(body, { requireAll: true });
  if (parsed.error) return withNoStore(NextResponse.json({ error: parsed.error }, { status: 400 }));

  const service = getServiceClient();
  const { data: member } = await service
    .from('member_profiles')
    .select('id')
    .eq('id', parsed.values.member_id)
    .maybeSingle();
  if (!member) return withNoStore(NextResponse.json({ error: 'That member no longer exists.' }, { status: 404 }));

  const { data, error } = await service
    .from('member_fines')
    .insert({ ...parsed.values, created_by: auth.user.id })
    .select('*')
    .single();

  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({ fine: data }, { status: 201 }));
}
