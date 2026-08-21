import crypto from "crypto";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";

export async function GET(request) {
  const auth = await requirePermission(request, "members.manage");
  if (auth.error) return auth.error;
  const { data, error } = await getServiceClient()
    .from("member_invites")
    .select(
      "id,label,pledge_class,default_application_target,allowed_emails,expires_at,max_uses,use_count,active,created_at",
    )
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invites: data || [] });
}

export async function POST(request) {
  const auth = await requirePermission(request, "members.manage");
  if (auth.error) return auth.error;
  const body = await request.json();
  const token = crypto.randomBytes(32).toString("base64url");
  const token_hash = crypto.createHash("sha256").update(token).digest("hex");
  const allowed_emails = String(body.allowed_emails || "")
    .split(/[\s,]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const row = {
    token_hash,
    label: String(body.label || "").trim(),
    pledge_class: String(body.pledge_class || "").trim() || null,
    default_application_target: Number(body.default_application_target ?? 40),
    allowed_emails,
    expires_at: body.expires_at,
    max_uses: Number(body.max_uses || 100),
    created_by: auth.user.id,
  };
  if (!row.label || !row.expires_at)
    return NextResponse.json(
      { error: "Label and expiration are required." },
      { status: 400 },
    );
  const { data, error } = await getServiceClient()
    .from("member_invites")
    .insert(row)
    .select(
      "id,label,pledge_class,default_application_target,allowed_emails,expires_at,max_uses,use_count,active,created_at",
    )
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(
    { invite: data, url: `${new URL(request.url).origin}/join/${token}` },
    { status: 201 },
  );
}
