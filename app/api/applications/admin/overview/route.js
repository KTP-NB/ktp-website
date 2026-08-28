import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function validMonth(value) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || ''); }

export async function GET(request) {
  const auth = await requirePermission(request, 'applications.manage');
  if (auth.error) return auth.error;

  const requested = new URL(request.url).searchParams.get('month');
  const month = validMonth(requested) ? requested : new Date().toISOString().slice(0, 7);
  const start = `${month}-01`;
  const endDate = new Date(`${start}T00:00:00Z`);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);
  const service = getServiceClient();

  const [membersResult, appsResult, requirementsResult, chapterResult] = await Promise.all([
    service.from('member_profiles').select('id,user_id,name,email,pledge_class,member_status,photo_url,default_application_target,uses_default_application_target').not('user_id', 'is', null).order('name'),
    service.from('internship_applications').select('user_id,status').gte('date_applied', start).lt('date_applied', end),
    service.from('application_requirements').select('*').eq('month_start', start),
    service.from('chapter_application_requirements').select('default_target,fine_amount').eq('month_start', start).maybeSingle(),
  ]);
  const error = membersResult.error || appsResult.error || requirementsResult.error || chapterResult.error;
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));

  const appsByUser = new Map();
  for (const app of appsResult.data || []) {
    const current = appsByUser.get(app.user_id) || { count: 0, offers: 0, interviews: 0 };
    current.count += 1;
    if (app.status === 'offer') current.offers += 1;
    if (app.status === 'interviewing') current.interviews += 1;
    appsByUser.set(app.user_id, current);
  }
  const reqByUser = new Map((requirementsResult.data || []).map((row) => [row.user_id, row]));
  const chapterDefault = chapterResult.data?.default_target ?? 40;
  const members = (membersResult.data || []).map((member) => {
    const stats = appsByUser.get(member.user_id) || { count: 0, offers: 0, interviews: 0 };
    const requirement = reqByUser.get(member.user_id);
    const baselineTarget = member.uses_default_application_target
      ? chapterDefault
      : member.default_application_target ?? 40;
    const target = ['Inactive', 'Alumni'].includes(member.member_status)
      ? 0
      : requirement?.target_count ?? baselineTarget;
    return {
      ...member,
      ...stats,
      target,
      baseline_target: baselineTarget,
      has_monthly_override: Boolean(requirement),
      met: stats.count >= target,
    };
  });

  return withNoStore(NextResponse.json({
    month,
    chapter_default: chapterDefault,
    fine_amount: Number(chapterResult.data?.fine_amount ?? 0),
    members,
  }));
}
