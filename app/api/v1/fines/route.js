import { NextResponse } from "next/server";
import { apiError, auditApiRequest, requireMemberApiKey } from "@/lib/applications/apiAuth";
import { fineStatus, summarizeFines, toAmount } from "@/lib/fines";

export async function GET(request) {
  const auth = await requireMemberApiKey(request, "applications:read", "fines.view");
  if (auth.error) return auth.error;
  const { data, error } = await auth.service
    .from("member_fines")
    .select("id,date_issued,description,amount,due_date,paid,paid_on,notes")
    .eq("member_id", auth.profile.id)
    .order("date_issued", { ascending: false });
  if (error) return apiError("Unable to load fines.", 500);
  const fines = (data || []).map((fine) => ({
    ...fine,
    amount: toAmount(fine.amount),
    status: fineStatus(fine),
  }));
  await auditApiRequest(auth.service, auth.key, "fines.list", "success");
  return NextResponse.json({ data: fines, summary: summarizeFines(fines) });
}
