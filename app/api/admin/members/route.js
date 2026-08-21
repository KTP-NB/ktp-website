import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";

const FIELDS =
  "id,user_id,name,email,position,pledge_class,member_status,graduation_year,major,minors,linkedin_url,executive_board,committees,sort_order,photo_url,resume_url,access_role,manager_permissions,default_application_target,created_at,updated_at";

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
  return NextResponse.json({
    members: (data || []).map((m) => ({
      ...m,
      current_application_target: m.default_application_target ?? 40,
    })),
    viewerRole: auth.profile.access_role,
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
  if (!email || !name)
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 },
    );
  const service = getServiceClient();
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
        user_id: invited.user.id,
        pledge_class: body.pledge_class || null,
        graduation_year: body.graduation_year || null,
        major: body.major || null,
        member_status: "Active",
        access_role: "member",
        default_application_target: Number(body.current_application_target ?? 40),
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
