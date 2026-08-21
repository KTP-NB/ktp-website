import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";

const ALLOWED = [
  "name",
  "email",
  "position",
  "pledge_class",
  "member_status",
  "graduation_year",
  "major",
  "minors",
  "linkedin_url",
  "executive_board",
  "committees",
  "sort_order",
];
const ROLES = ["member", "manager", "admin", "super_admin"];
const PERMISSIONS = [
  "members.manage",
  "resumes.manage",
  "coderank.manage",
  "applications.manage",
];

export async function PUT(request, { params }) {
  const auth = await requirePermission(request, "members.manage");
  if (auth.error) return auth.error;
  const body = await request.json();
  const updates = Object.fromEntries(
    ALLOWED.filter((key) => key in body).map((key) => [key, body[key]]),
  );
  const requestedTarget = Number(body.current_application_target ?? 40);
  if (!Number.isInteger(requestedTarget) || requestedTarget < 0 || requestedTarget > 1000)
    return NextResponse.json(
      { error: "Monthly target must be between 0 and 1000." },
      { status: 400 },
    );
  const noRequirement = ["Inactive", "Alumni"].includes(body.member_status);
  const usesDefault = noRequirement ? false : Boolean(body.uses_default_application_target);
  updates.default_application_target = ["Inactive", "Alumni"].includes(body.member_status)
    ? 0
    : requestedTarget;
  updates.uses_default_application_target = usesDefault;
  if ("access_role" in body || "manager_permissions" in body) {
    if (auth.profile.access_role !== "super_admin")
      return NextResponse.json(
        { error: "Only Super Admins can change permissions." },
        { status: 403 },
      );
    if (!ROLES.includes(body.access_role))
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    updates.access_role = body.access_role;
    updates.manager_permissions =
      body.access_role === "manager"
        ? [...new Set(body.manager_permissions || [])].filter((item) =>
            PERMISSIONS.includes(item),
          )
        : [];
  }
  updates.updated_at = new Date().toISOString();
  const service = getServiceClient();
  const { data, error } = await service
    .from("member_profiles")
    .update(updates)
    .eq("id", params.id)
    .select(
      "id,user_id,name,email,position,pledge_class,member_status,graduation_year,major,minors,linkedin_url,executive_board,committees,sort_order,photo_url,resume_url,access_role,manager_permissions,default_application_target,uses_default_application_target,created_at,updated_at",
    )
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  const month = `${new Date().toISOString().slice(0, 7)}-01`;
  const { data: chapterSetting, error: settingError } = await service
    .from("chapter_application_requirements")
    .select("default_target")
    .eq("month_start", month)
    .maybeSingle();
  if (settingError) return NextResponse.json({ error: settingError.message }, { status: 500 });
  const currentTarget = noRequirement
    ? 0
    : usesDefault
      ? chapterSetting?.default_target ?? 40
      : requestedTarget;
  if (data.user_id && "current_application_target" in body) {
    const { data: savedRequirement, error: requirementError } = await service
      .from("application_requirements")
      .upsert({
        user_id: data.user_id,
        month_start: month,
        target_count: currentTarget,
        is_exempt: false,
        exemption_reason: null,
        updated_by: auth.user.id,
      }, { onConflict: "user_id,month_start" })
      .select("target_count")
      .single();
    if (requirementError)
      return NextResponse.json(
        { error: `Member details saved, but the application requirement failed: ${requirementError.message}` },
        { status: 500 },
      );
    return NextResponse.json({
      member: { ...data, current_application_target: savedRequirement.target_count },
    });
  }
  return NextResponse.json({
    member: { ...data, current_application_target: currentTarget },
  });
}

export async function DELETE(request, { params }) {
  const auth = await requirePermission(request, "members.manage");
  if (auth.error) return auth.error;
  if (auth.profile.access_role !== "super_admin")
    return NextResponse.json({ error: "Only Super Admins can remove members." }, { status: 403 });
  const service = getServiceClient();
  const { data: member, error } = await service.from("member_profiles").select("id,user_id,name").eq("id", params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  if (member.user_id === auth.user.id)
    return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
  if (member.user_id) {
    const { error: authError } = await service.auth.admin.deleteUser(member.user_id);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  }
  const { error: deleteError } = await service.from("member_profiles").delete().eq("id", member.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ removed: true });
}
