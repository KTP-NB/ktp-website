import { NextResponse } from "next/server";
import { apiError, auditApiRequest, requireApplicationApiKey } from "@/lib/applications/apiAuth";
import { currentMonthInTimeZone, effectiveApplicationTarget } from "@/lib/applicationFines.mjs";

export async function GET(request) {
  const auth = await requireApplicationApiKey(request, "applications:read");
  if (auth.error) return auth.error;
  const requested = new URL(request.url).searchParams.get("month");
  if (requested && !/^\d{4}-(0[1-9]|1[0-2])$/.test(requested)) return apiError("month must use YYYY-MM format.");
  const month = requested || currentMonthInTimeZone();
  const start = `${month}-01`;
  const endDate = new Date(`${start}T00:00:00Z`);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);

  const [apps, requirement, chapter, member] = await Promise.all([
    auth.service.from("internship_applications").select("status")
      .eq("user_id", auth.key.user_id).gte("date_applied", start).lt("date_applied", end),
    auth.service.from("application_requirements").select("target_count")
      .eq("user_id", auth.key.user_id).eq("month_start", start).maybeSingle(),
    auth.service.from("chapter_application_requirements").select("default_target")
      .eq("month_start", start).maybeSingle(),
    auth.service.from("member_profiles")
      .select("member_status,default_application_target,uses_default_application_target")
      .eq("id", auth.profile.id).maybeSingle(),
  ]);
  if (apps.error || requirement.error || chapter.error || member.error || !member.data)
    return apiError("Unable to load application progress.", 500);

  const byStatus = {};
  for (const app of apps.data || []) byStatus[app.status] = (byStatus[app.status] || 0) + 1;
  const submitted = (apps.data || []).length;
  const target = effectiveApplicationTarget(
    member.data,
    requirement.data?.target_count,
    chapter.data?.default_target ?? 40,
  );
  await auditApiRequest(auth.service, auth.key, "applications.progress", "success");
  return NextResponse.json({
    data: {
      month,
      submitted,
      target,
      remaining: Math.max(target - submitted, 0),
      met: submitted >= target,
      has_monthly_override: Boolean(requirement.data),
      by_status: byStatus,
    },
  });
}
