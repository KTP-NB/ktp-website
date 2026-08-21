import { NextResponse } from "next/server";
import { requireUser } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const { data, error } = await getServiceClient()
    .from("member_profiles")
    .select("id,name,access_role,manager_permissions,member_status")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (
    !data ||
    !["manager", "admin", "super_admin"].includes(data.access_role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ profile: data });
}
