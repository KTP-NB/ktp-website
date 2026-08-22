import { NextResponse } from "next/server";
import { requireUser } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";

export async function DELETE(request, { params }) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { data, error } = await getServiceClient()
    .from("member_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", auth.user.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Active key not found." }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
