import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";
import { parseAlumniContactUpdate } from "@/lib/alumniContacts.mjs";

const FIELDS = "id,full_name,graduation_year,major,current_role,linkedin_url,email,is_open_to_refer,chapter,company_id,updated_at";

// The alumni list feeds the referral finder, so only Super Admins may read it
// in bulk or change anyone's contact details.
function superAdminOnly(auth) {
  return auth.profile.access_role === "super_admin"
    ? null
    : NextResponse.json({ error: "Only Super Admins can manage alumni contacts." }, { status: 403 });
}

export async function GET(request) {
  const auth = await requirePermission(request, "members.manage");
  if (auth.error) return auth.error;
  const denied = superAdminOnly(auth);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const limit = Math.min(200, Math.max(1, Number.parseInt(params.get("limit") || "50", 10) || 50));
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const service = getServiceClient();

  let query = service.from("alumni_profiles").select(FIELDS, { count: "exact" })
    .order("full_name", { ascending: true })
    .range((page - 1) * limit, page * limit - 1);
  const search = (params.get("search") || "").trim().replace(/[%_,()]/g, "");
  if (search) query = query.ilike("full_name", `%${search}%`);
  const chapter = (params.get("chapter") || "").trim().replace(/[%_,()]/g, "");
  if (chapter) query = query.ilike("chapter", `%${chapter}%`);
  if (params.get("missing_linkedin") === "true") query = query.or("linkedin_url.is.null,linkedin_url.eq.");
  const company = (params.get("company") || "").trim().replace(/[%_,()]/g, "");
  if (company) {
    const { data: matches, error: companyError } = await service
      .from("companies").select("id").ilike("name", `%${company}%`).limit(200);
    if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 });
    if (!matches?.length)
      return NextResponse.json({ alumni: [], pagination: { page, limit, total: 0 } });
    query = query.in("company_id", matches.map((row) => row.id));
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const companyIds = [...new Set((data || []).map((row) => row.company_id).filter(Boolean))];
  const { data: companies, error: namesError } = companyIds.length
    ? await service.from("companies").select("id,name").in("id", companyIds)
    : { data: [], error: null };
  if (namesError) return NextResponse.json({ error: namesError.message }, { status: 500 });
  const companyNames = new Map((companies || []).map((row) => [row.id, row.name]));

  return NextResponse.json({
    alumni: (data || []).map((row) => ({ ...row, company_name: companyNames.get(row.company_id) || null })),
    pagination: { page, limit, total: count || 0 },
  });
}

// Body: { updates: [{ alumni_id, linkedin_url?, email? }] } — up to 50 per request.
export async function PATCH(request) {
  const auth = await requirePermission(request, "members.manage");
  if (auth.error) return auth.error;
  const denied = superAdminOnly(auth);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const updates = Array.isArray(body.updates) ? body.updates : [];
  if (!updates.length || updates.length > 50)
    return NextResponse.json({ error: "Send between 1 and 50 updates per request." }, { status: 400 });

  const service = getServiceClient();
  const results = [];
  for (const entry of updates) {
    const parsed = parseAlumniContactUpdate(entry);
    if (parsed.error) {
      results.push({ alumni_id: parsed.id || entry?.alumni_id || null, status: "invalid", error: parsed.error });
      continue;
    }
    const { data, error } = await service
      .from("alumni_profiles")
      .update({ ...parsed.values, updated_at: new Date().toISOString() })
      .eq("id", parsed.id)
      .select("id,full_name,linkedin_url,email")
      .maybeSingle();
    if (error) results.push({ alumni_id: parsed.id, status: "invalid", error: error.message });
    else if (!data) results.push({ alumni_id: parsed.id, status: "not_found" });
    else results.push({ alumni_id: parsed.id, status: "updated", alumni: data });
  }
  return NextResponse.json({
    updated: results.filter((item) => item.status === "updated").length,
    failed: results.filter((item) => item.status !== "updated").length,
    results,
  });
}
