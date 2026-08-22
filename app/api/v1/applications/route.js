import { NextResponse } from "next/server";
import {
  apiError,
  auditApiRequest,
  cleanApplication,
  requireApplicationApiKey,
} from "@/lib/applications/apiAuth";

const PUBLIC_FIELDS = "id,company,position,date_applied,status,details,application_url,referral,referral_contact,entry_source,external_id,created_at,updated_at";

export async function GET(request) {
  const auth = await requireApplicationApiKey(request, "applications:read");
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  let query = auth.service.from("internship_applications")
    .select(PUBLIC_FIELDS, { count: "exact" })
    .eq("user_id", auth.key.user_id)
    .order("date_applied", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  const status = url.searchParams.get("status");
  const month = url.searchParams.get("month");
  const validStatuses = new Set(["applied", "assessment", "interviewing", "rejected", "offer", "withdrawn"]);
  if (status && !validStatuses.has(status)) return apiError("status filter is invalid.");
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return apiError("month must use YYYY-MM format.");
  if (status) query = query.eq("status", status);
  if (month) {
    const end = new Date(`${month}-01T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 1);
    query = query.gte("date_applied", `${month}-01`).lt("date_applied", end.toISOString().slice(0, 10));
  }
  const { data, error, count } = await query;
  if (error) return apiError("Unable to load applications.", 500);
  await auditApiRequest(auth.service, auth.key, "applications.list", "success");
  return NextResponse.json({ data: data || [], pagination: { page, limit, total: count || 0 } });
}

export async function POST(request) {
  const auth = await requireApplicationApiKey(request, "applications:write");
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body) return apiError("Request body must be valid JSON.");
  const items = Array.isArray(body.applications) ? body.applications : [body];
  if (!items.length || items.length > 50) return apiError("Submit between 1 and 50 applications per request.");

  const results = [];
  for (let index = 0; index < items.length; index += 1) {
    const parsed = cleanApplication(items[index]);
    if (parsed.errors.length) {
      results.push({ index, status: "invalid", errors: parsed.errors });
      await auditApiRequest(auth.service, auth.key, "applications.create", "invalid");
      continue;
    }
    const payload = { ...parsed.value, user_id: auth.key.user_id, entry_source: "api", api_key_id: auth.key.id };
    const { data, error } = await auth.service.from("internship_applications").insert(payload).select(PUBLIC_FIELDS).single();
    if (error?.code === "23505" && payload.external_id) {
      const { data: existing } = await auth.service.from("internship_applications")
        .select(PUBLIC_FIELDS).eq("user_id", auth.key.user_id).eq("external_id", payload.external_id).maybeSingle();
      results.push({ index, status: "duplicate", application: existing });
      await auditApiRequest(auth.service, auth.key, "applications.create", "duplicate", existing?.id);
    } else if (error) {
      results.push({ index, status: "invalid", errors: [error.message] });
      await auditApiRequest(auth.service, auth.key, "applications.create", "invalid");
    } else {
      results.push({ index, status: "created", application: data });
      await auditApiRequest(auth.service, auth.key, "applications.create", "success", data.id);
    }
  }
  const summary = {
    created: results.filter((item) => item.status === "created").length,
    duplicates: results.filter((item) => item.status === "duplicate").length,
    failed: results.filter((item) => item.status === "invalid").length,
  };
  return NextResponse.json({ ...summary, results }, { status: summary.created ? 201 : 200 });
}
