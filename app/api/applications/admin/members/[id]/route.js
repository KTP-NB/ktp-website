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
  const { data: member, error: memberError } = await service.from('member_profiles').select('id,user_id,name,member_status,default_application_target,uses_default_application_target').eq('id', params.id).maybeSingle();
  if (memberError) return withNoStore(NextResponse.json({ error: memberError.message }, { status: 500 }));
  if (!member?.user_id) return withNoStore(NextResponse.json({ error: 'Member account is not linked.' }, { status: 404 }));
  const [apps, requirements, chapterRequirements] = await Promise.all([
    service.from('internship_applications').select('*').eq('user_id', member.user_id).order('date_applied', { ascending: false }),
    service.from('application_requirements').select('*').eq('user_id', member.user_id).order('month_start', { ascending: false }),
    service.from('chapter_application_requirements').select('month_start,default_target').order('month_start', { ascending: false }),
  ]);
  const error = apps.error || requirements.error || chapterRequirements.error;
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({
    applications: apps.data || [],
    requirements: requirements.data || [],
    chapter_requirements: chapterRequirements.data || [],
    default_target: member.default_application_target ?? 40,
    uses_default_application_target: member.uses_default_application_target ?? true,
    member_status: member.member_status,
  }));
}

export async function PUT(request, { params }) {
  const auth = await requirePermission(request, 'applications.manage');
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month || '')) return withNoStore(NextResponse.json({ error: 'A valid month is required.' }, { status: 400 }));
  const target = Number(body.target_count);
  if (!Number.isInteger(target) || target < 0 || target > 1000) return withNoStore(NextResponse.json({ error: 'Target must be between 0 and 1000.' }, { status: 400 }));
  const service = getServiceClient();
  const { data: member } = await service.from('member_profiles').select('user_id,member_status,default_application_target,uses_default_application_target').eq('id', params.id).maybeSingle();
  if (!member?.user_id) return withNoStore(NextResponse.json({ error: 'Member account is not linked.' }, { status: 404 }));
  const useBaseline = Boolean(body.use_baseline);
  const { data: chapterSetting, error: chapterError } = await service
    .from('chapter_application_requirements')
    .select('default_target')
    .eq('month_start', `${body.month}-01`)
    .maybeSingle();
  if (chapterError) return withNoStore(NextResponse.json({ error: chapterError.message }, { status: 500 }));
  const noRequirement = ['Inactive','Alumni'].includes(member.member_status);
  const baselineTarget = noRequirement
    ? 0
    : member.uses_default_application_target
      ? chapterSetting?.default_target ?? 40
      : member.default_application_target ?? 40;
  if (useBaseline) {
    const { error } = await service
      .from('application_requirements')
      .delete()
      .eq('user_id', member.user_id)
      .eq('month_start', `${body.month}-01`);
    if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
    return withNoStore(NextResponse.json({
      requirement: null,
      effective_target: baselineTarget,
      has_monthly_override: false,
    }));
  }
  const effectiveTarget = noRequirement ? 0 : target;
  const { data, error } = await service.from('application_requirements').upsert({
    user_id: member.user_id, month_start: `${body.month}-01`, target_count: effectiveTarget,
    is_exempt: false, exemption_reason: String(body.exemption_reason || '').trim() || null,
    updated_by: auth.user.id,
  }, { onConflict: 'user_id,month_start' }).select('*').single();
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({
    requirement: data,
    effective_target: effectiveTarget,
    has_monthly_override: true,
  }));
}
