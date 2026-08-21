import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/coderank/supabaseServer";

const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

async function invitation(token) {
  return getServiceClient()
    .from("member_invites")
    .select("*")
    .eq("token_hash", hash(token))
    .eq("active", true)
    .maybeSingle();
}

export async function GET(_request, { params }) {
  const { data } = await invitation(params.token);
  const valid =
    data &&
    new Date(data.expires_at) > new Date() &&
    data.use_count < data.max_uses;
  if (!valid)
    return NextResponse.json(
      { error: "This invitation is invalid or expired." },
      { status: 404 },
    );
  return NextResponse.json({
    invite: {
      label: data.label,
      pledge_class: data.pledge_class,
      requiresApprovedEmail: data.allowed_emails.length > 0,
    },
  });
}

export async function POST(request, { params }) {
  const { data: invite } = await invitation(params.token);
  if (
    !invite ||
    new Date(invite.expires_at) <= new Date() ||
    invite.use_count >= invite.max_uses
  ) {
    return NextResponse.json(
      { error: "This invitation is invalid or expired." },
      { status: 404 },
    );
  }
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
  if (invite.allowed_emails.length && !invite.allowed_emails.includes(email)) {
    return NextResponse.json(
      { error: "This email is not on the approved invitation list." },
      { status: 403 },
    );
  }
  const service = getServiceClient();
  const { data: invited, error: inviteError } =
    await service.auth.admin.inviteUserByEmail(email, {
      data: { name, must_set_password: true },
      redirectTo: `${new URL(request.url).origin}/update-password`,
    });
  if (inviteError)
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  const month = `${new Date().toISOString().slice(0, 7)}-01`;
  const { data: chapterSetting } = await service
    .from("chapter_application_requirements")
    .select("default_target")
    .eq("month_start", month)
    .maybeSingle();
  const chapterDefault = chapterSetting?.default_target ?? 40;
  const usesDefault = invite.default_application_target === chapterDefault;
  const { error: profileError } = await service.from("member_profiles").upsert(
    {
      email,
      name,
      user_id: invited.user.id,
      pledge_class: invite.pledge_class,
      member_status: "Active",
      access_role: "member",
      default_application_target: invite.default_application_target,
      uses_default_application_target: usesDefault,
      source_key: `invite:${invited.user.id}`,
    },
    { onConflict: "email" },
  );
  if (profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!usesDefault)
    await service
      .from("application_requirements")
      .upsert({
        user_id: invited.user.id,
        month_start: month,
        target_count: invite.default_application_target,
        is_exempt: false,
        updated_by: invite.created_by,
      });
  await service
    .from("member_invites")
    .update({ use_count: invite.use_count + 1 })
    .eq("id", invite.id)
    .eq("use_count", invite.use_count);
  return NextResponse.json({
    message: "Check your email for your secure account invitation.",
  });
}
