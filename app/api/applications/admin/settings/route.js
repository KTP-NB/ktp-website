import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/coderank/auth";
import { getServiceClient } from "@/lib/coderank/supabaseServer";
import { withNoStore } from "@/lib/coderank/noStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
}

export async function GET(request) {
  const auth = await requirePermission(request, "applications.manage");
  if (auth.error) return auth.error;
  const month = new URL(request.url).searchParams.get("month");
  if (!validMonth(month))
    return withNoStore(NextResponse.json({ error: "A valid month is required." }, { status: 400 }));
  const { data, error } = await getServiceClient()
    .from("chapter_application_requirements")
    .select("month_start,default_target,fine_amount")
    .eq("month_start", `${month}-01`)
    .maybeSingle();
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({
    month,
    default_target: data?.default_target ?? 40,
    fine_amount: Number(data?.fine_amount ?? 0),
  }));
}

export async function PUT(request) {
  const auth = await requirePermission(request, "applications.manage");
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  if (!validMonth(body.month))
    return withNoStore(NextResponse.json({ error: "A valid month is required." }, { status: 400 }));
  const target = Number(body.default_target);
  if (!Number.isInteger(target) || target < 0 || target > 1000)
    return withNoStore(NextResponse.json({ error: "Default target must be between 0 and 1000." }, { status: 400 }));
  const fineAmount = Number(body.fine_amount);
  if (!Number.isFinite(fineAmount) || fineAmount < 0 || fineAmount > 10000)
    return withNoStore(NextResponse.json({ error: "Fine amount must be between $0 and $10,000." }, { status: 400 }));
  const { data, error } = await getServiceClient()
    .from("chapter_application_requirements")
    .upsert({ month_start: `${body.month}-01`, default_target: target, fine_amount: fineAmount, updated_by: auth.user.id })
    .select("month_start,default_target,fine_amount")
    .single();
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 500 }));
  return withNoStore(NextResponse.json({ setting: data }));
}
