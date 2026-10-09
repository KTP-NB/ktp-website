import { NextResponse } from "next/server";
import { apiError, auditApiRequest } from "@/lib/applications/apiAuth";
import { SORTS, defaultTimeframe, sortTimeframes } from "@/app/company-questions/shared";
import { requireCompanyQuestionsAccess } from "../access";

const DIFFICULTIES = new Set(["EASY", "MEDIUM", "HARD"]);

export async function GET(request, { params }) {
  const auth = await requireCompanyQuestionsAccess(request);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const company = String(params.company || "").trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);

  const { data: facets, error: facetsError } = await auth.service
    .from("leetcode_company_question_facets").select("timeframe").eq("company", company);
  if (facetsError) return apiError("Unable to load questions.", 500);
  const timeframes = sortTimeframes([...new Set((facets || []).map((row) => row.timeframe))]);
  if (!timeframes.length) return apiError("Company not found.", 404);
  const timeframe = url.searchParams.get("timeframe") || defaultTimeframe(timeframes);
  if (!timeframes.includes(timeframe)) return apiError("timeframe is invalid.", 400, { timeframes });

  const difficulty = (url.searchParams.get("difficulty") || "").toUpperCase();
  if (difficulty && !DIFFICULTIES.has(difficulty)) return apiError("difficulty must be EASY, MEDIUM, or HARD.");
  const sort = SORTS.find(([key]) => key === url.searchParams.get("sort"))?.[2] || SORTS[0][2];

  let query = auth.service.from("leetcode_company_questions")
    .select("*", { count: "exact" })
    .eq("company", company)
    .eq("timeframe", timeframe);
  if (difficulty) query = query.eq("difficulty", difficulty);
  const search = (url.searchParams.get("search") || "").trim();
  if (search) query = query.ilike("title", `%${search.replace(/[%_]/g, "")}%`);
  const topic = (url.searchParams.get("topic") || "").trim();
  // postgrest-js only serializes objects, so the containment value must be a JSON string.
  if (topic) query = query.contains("topic_tags", JSON.stringify([{ slug: topic }]));

  const { data, error, count } = await query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order("title", { ascending: true })
    .range((page - 1) * limit, page * limit - 1);
  if (error) return apiError("Unable to load questions.", 500);
  await auditApiRequest(auth.service, auth.key, "company_questions.list", "success");
  return NextResponse.json({
    company,
    timeframe,
    timeframes,
    data: data || [],
    pagination: { page, limit, total: count || 0 },
  });
}
