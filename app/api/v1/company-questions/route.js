import { NextResponse } from "next/server";
import { apiError, auditApiRequest } from "@/lib/applications/apiAuth";
import { requireCompanyQuestionsAccess } from "./access";

export async function GET(request) {
  const auth = await requireCompanyQuestionsAccess(request);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase().replace(/\s+/g, "-");
  let query = auth.service.from("leetcode_companies")
    .select("company,question_count,timeframe_counts", { count: "exact" })
    .order("question_count", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  // Companies are stored as slugs such as "capital-one".
  if (search) query = query.ilike("company", `%${search.replace(/[%_]/g, "")}%`);
  const { data, error, count } = await query;
  if (error) return apiError("Unable to load companies.", 500);
  await auditApiRequest(auth.service, auth.key, "company_questions.companies", "success");
  return NextResponse.json({ data: data || [], pagination: { page, limit, total: count || 0 } });
}
