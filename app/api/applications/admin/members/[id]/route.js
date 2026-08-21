import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const auth = await requirePermission(request, 'applications.manage');
  if (auth.error) return auth.error;
  const service = getServiceClient();
  const { data: member, error: memberError } = await service.from('member_profiles').select('id,user_id,name,default_application_target').eq('id', params.id).maybeSingle();
  if (memberError) return withNoStore(NextResponse.json({ error: memberError.message }, { status: 500 }));
  if (!member?.user_id) return withNoStore(NextResponse.json({ error: 'Member account is not linked.' }, { status: 404 }));
  const [apps, requirements] = await Promise.all([
    service.from('internship_applications').select('*').eq('user_id', member.user_id).order('date_applied', { ascending: false }),
    service.from('application_requirements').select('*').eq('user_id', member.user_id).order('month_start', { ascending: false }),
  ]);
  const error = apps.error || requirements.error;
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({ applications: apps.data || [], requirements: requirements.data || [], default_target: member.default_application_target ?? 40 }));
}

export async function PUT(request, { params }) {
  const auth = await requirePermission(request, 'applications.manage');
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month || '')) return withNoStore(NextResponse.json({ error: 'A valid month is required.' }, { status: 400 }));
  const target = Number(body.target_count);
  if (!Number.isInteger(target) || target < 0 || target > 1000) return withNoStore(NextResponse.json({ error: 'Target must be between 0 and 1000.' }, { status: 400 }));
  const service = getServiceClient();
  const { data: member } = await service.from('member_profiles').select('user_id,member_status').eq('id', params.id).maybeSingle();
  if (!member?.user_id) return withNoStore(NextResponse.json({ error: 'Member account is not linked.' }, { status: 404 }));
  const { data, error } = await service.from('application_requirements').upsert({
    user_id: member.user_id, month_start: `${body.month}-01`, target_count: target,
    is_exempt: Boolean(body.is_exempt), exemption_reason: String(body.exemption_reason || '').trim() || null,
    updated_by: auth.user.id,
  }, { onConflict: 'user_id,month_start' }).select('*').single();
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  const persistentTarget = ['Inactive','Alumni'].includes(member.member_status) ? 0 : target;
  const { error: profileError } = await service.from('member_profiles').update({ default_application_target: persistentTarget }).eq('id', params.id);
  if (profileError) return withNoStore(NextResponse.json({ error: profileError.message }, { status: 500 }));
  return withNoStore(NextResponse.json({ requirement: data }));
}
