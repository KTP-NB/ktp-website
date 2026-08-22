import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';
import { parseFinePayload } from '../../payload';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const auth = await requirePermission(request, 'fines.manage');
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const parsed = parseFinePayload(body);
  if (parsed.error) return withNoStore(NextResponse.json({ error: parsed.error }, { status: 400 }));

  const service = getServiceClient();
  const { data: existing, error: lookupError } = await service
    .from('member_fines')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (lookupError) return withNoStore(NextResponse.json({ error: lookupError.message }, { status: 500 }));
  if (!existing) return withNoStore(NextResponse.json({ error: 'That fine no longer exists.' }, { status: 404 }));

  // Re-check the date order against whatever the row keeps from before.
  const merged = { ...existing, ...parsed.values };
  if (merged.due_date && merged.date_issued && merged.due_date < merged.date_issued) {
    return withNoStore(NextResponse.json({ error: 'Due date cannot be before the date issued.' }, { status: 400 }));
  }

  const { data, error } = await service
    .from('member_fines')
    .update(parsed.values)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({ fine: data }));
}

export async function DELETE(request, { params }) {
  const auth = await requirePermission(request, 'fines.manage');
  if (auth.error) return auth.error;

  const { error } = await getServiceClient().from('member_fines').delete().eq('id', params.id);
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({ ok: true }));
}
