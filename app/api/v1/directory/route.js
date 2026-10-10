import { NextResponse } from "next/server";
import { apiError, auditApiRequest, requireMemberApiKey } from "@/lib/applications/apiAuth";

// The curated view behind the public Members page: hidden profiles are already
// filtered out and it carries no emails or access roles.
const FIELDS = "id,name,position,graduation_year,major,minors,linkedin_url,pledge_class,member_status,executive_board,committees";

export async function GET(request) {
  const auth = await requireMemberApiKey(request, "applications:read", "account.profile");
  if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  let query = auth.service.from("public_member_directory").select(FIELDS)
    .order("sort_order", { ascending: true }).order("name", { ascending: true }).limit(1000);
  const search = (params.get("search") || "").trim().replace(/[%_,()]/g, "");
  if (search) query = query.ilike("name", `%${search}%`);
  const pledgeClass = (params.get("pledge_class") || "").trim();
  if (pledgeClass) query = query.ilike("pledge_class", pledgeClass.replace(/[%_]/g, ""));
  const { data, error } = await query;
  if (error) return apiError("Unable to load the member directory.", 500);
  await auditApiRequest(auth.service, auth.key, "directory.list", "success");
  return NextResponse.json({ data: data || [] });
}
