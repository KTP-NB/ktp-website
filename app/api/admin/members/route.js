import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";

const FIELDS =
  "id,user_id,name,email,position,pledge_class,member_status,graduation_year,major,minors,linkedin_url,executive_board,committees,sort_order,photo_url,resume_url,access_role,manager_permissions,default_application_target,uses_default_application_target,created_at,updated_at";

export async function GET(request) {
  const auth = await requirePermission(request, "members.manage");
  if (auth.error) return auth.error;
  const service = getServiceClient();
  const { data, error } = await service
    .from("member_profiles")
    .select(FIELDS)
    .order("name");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const month = `${new Date().toISOString().slice(0, 7)}-01`;
  const { data: chapterSetting, error: settingError } = await service
    .from("chapter_application_requirements")
    .select("default_target")
    .eq("month_start", month)
    .maybeSingle();
  if (settingError)
    return NextResponse.json({ error: settingError.message }, { status: 500 });
  const chapterDefault = chapterSetting?.default_target ?? 40;
  return NextResponse.json({
    members: (data || []).map((m) => ({
      ...m,
      current_application_target: ["Inactive", "Alumni"].includes(m.member_status)
        ? 0
        : m.uses_default_application_target
          ? chapterDefault
          : m.default_application_target ?? 40,
    })),
    viewerRole: auth.profile.access_role,
    chapterDefault,
  });
}

export async function POST(request) {
  const auth = await requirePermission(request, "members.manage");
  if (auth.error) return auth.error;
  const body = await request.json();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const name = String(body.name || "").trim();
  const requiredProfile = {
    name,
    email,
    position: String(body.position || "").trim(),
    pledge_class: String(body.pledge_class || "").trim(),
    graduation_year: String(body.graduation_year || "").trim(),
    major: String(body.major || "").trim(),
  };
  if (Object.values(requiredProfile).some((value) => !value))
    return NextResponse.json(
      { error: "Name, email, position, pledge class, graduation year, and major are required." },
      { status: 400 },
    );
  const service = getServiceClient();
  const month = `${new Date().toISOString().slice(0, 7)}-01`;
  const { data: chapterSetting } = await service
    .from("chapter_application_requirements")
    .select("default_target")
    .eq("month_start", month)
    .maybeSingle();
  const requestedTarget = Number(body.current_application_target ?? 40);
  const { data: invited, error: inviteError } =
    await service.auth.admin.inviteUserByEmail(email, {
      data: { name, must_set_password: true },
      redirectTo: `${new URL(request.url).origin}/update-password`,
    });
  if (inviteError)
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  const { data, error } = await service
    .from("member_profiles")
    .upsert(
      {
        email,
        name,
        position: requiredProfile.position,
        user_id: invited.user.id,
        pledge_class: requiredProfile.pledge_class,
        graduation_year: requiredProfile.graduation_year,
        major: requiredProfile.major,
        minors: String(body.minors || "").trim() || null,
        linkedin_url: String(body.linkedin_url || "").trim() || null,
        member_status: "Active",
        access_role: "member",
        default_application_target: requestedTarget,
        uses_default_application_target: requestedTarget === (chapterSetting?.default_target ?? 40),
        source_key: `invite:${invited.user.id}`,
      },
      { onConflict: "email" },
    )
    .select(FIELDS)
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data }, { status: 201 });
}
