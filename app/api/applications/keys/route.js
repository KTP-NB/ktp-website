import { NextResponse } from "next/server";
import { requireUser } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";
import { createApiKey } from "@/lib/applications/apiAuth";

const SELECT_FIELDS = "id,name,key_prefix,scopes,last_used_at,expires_at,revoked_at,created_at";
const ALLOWED_SCOPES = new Set(["applications:read", "applications:write"]);

async function activeMember(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth;
  const service = getServiceClient();
  const { data: profile } = await service
    .from("member_profiles")
    .select("id,member_status")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!profile || (profile.member_status || "").toLowerCase() !== "active")
    return { error: NextResponse.json({ error: "Only active members can manage API keys." }, { status: 403 }) };
  return { ...auth, service, profile };
}

export async function GET(request) {
  const auth = await activeMember(request);
  if (auth.error) return auth.error;
  const { data, error } = await auth.service
    .from("member_api_keys")
    .select(SELECT_FIELDS)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data || [] });
}

export async function POST(request) {
  const auth = await activeMember(request);
  if (auth.error) return auth.error;
  const { count: activeKeyCount, error: countError } = await auth.service
    .from("member_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .is("revoked_at", null);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((activeKeyCount || 0) >= 10)
    return NextResponse.json({ error: "Revoke an existing key before creating another. Members may have up to 10 active keys." }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const scopes = [...new Set(Array.isArray(body.scopes) ? body.scopes : ["applications:read", "applications:write"])]
    .filter((scope) => ALLOWED_SCOPES.has(scope));
  if (!name || name.length > 80)
    return NextResponse.json({ error: "Key name must be between 1 and 80 characters." }, { status: 400 });
  if (!scopes.length) return NextResponse.json({ error: "Choose at least one scope." }, { status: 400 });
  const expiration = body.expires_at ? new Date(body.expires_at) : null;
  if (expiration && (Number.isNaN(expiration.getTime()) || expiration <= new Date()))
    return NextResponse.json({ error: "Expiration must be in the future." }, { status: 400 });
  const generated = createApiKey();
  const { data, error } = await auth.service.from("member_api_keys").insert({
    user_id: auth.user.id,
    name,
    scopes,
    key_prefix: generated.prefix,
    key_hash: generated.hash,
    expires_at: expiration?.toISOString() || null,
  }).select(SELECT_FIELDS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ key: data, token: generated.key }, { status: 201 });
}
