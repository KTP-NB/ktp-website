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
  "fines.manage",
];
// Roles whose portal tabs a Super Admin curates.
const GRANTABLE_ROLES = ["admin", "manager"];

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
  if ("company_questions_blocked" in body) {
    if (auth.profile.access_role !== "super_admin")
      return NextResponse.json(
        { error: "Only Super Admins can change LC Company Tagged access." },
        { status: 403 },
      );
    updates.company_questions_blocked = Boolean(body.company_questions_blocked);
  }
  if ("access_role" in body || "manager_permissions" in body) {
    if (auth.profile.access_role !== "super_admin")
      return NextResponse.json(
        { error: "Only Super Admins can change permissions." },
        { status: 403 },
      );
    if (!ROLES.includes(body.access_role))
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    updates.access_role = body.access_role;
    updates.manager_permissions = GRANTABLE_ROLES.includes(body.access_role)
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
      "id,user_id,name,email,position,pledge_class,member_status,graduation_year,major,minors,linkedin_url,executive_board,committees,sort_order,photo_url,access_role,manager_permissions,company_questions_blocked,default_application_target,uses_default_application_target,created_at,updated_at",
    )
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    member: {
      ...data,
      current_application_target: noRequirement
        ? 0
        : usesDefault
          ? requestedTarget
          : data.default_application_target,
    },
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
