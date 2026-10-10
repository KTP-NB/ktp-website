import { NextResponse } from "next/server";
import { apiError, auditApiRequest, requireMemberApiKey } from "@/lib/applications/apiAuth";
import { matchCompany } from "@/lib/referrals/matching.mjs";

const ALUMNI_FIELDS = "id,full_name,graduation_year,major,current_role,linkedin_url,email,chapter";
const RUTGERS_CHAPTER = "New Brunswick (Rutgers)";

export async function GET(request) {
  const auth = await requireMemberApiKey(request, "applications:read", "referral_finder.use");
  if (auth.error) return auth.error;
  const company = (new URL(request.url).searchParams.get("company") || "").trim();
  if (!company || company.length > 200) return apiError("company is required (1-200 characters).");

  // Same rule as the browser extension: referrals stay locked while any fine is unpaid.
  const { data: unpaid, error: finesError } = await auth.service
    .from("member_fines").select("amount").eq("member_id", auth.profile.id).eq("paid", false);
  if (finesError) return apiError("Unable to check fines.", 500);
  const outstanding = Number((unpaid || []).reduce((sum, fine) => sum + (Number(fine.amount) || 0), 0).toFixed(2));
  if (outstanding > 0) {
    await auditApiRequest(auth.service, auth.key, "referral_finder.use", "denied");
    return apiError(
      `You have $${outstanding.toFixed(2)} in unpaid fines. Pay them to unlock referrals.`,
      403,
      { reason: "fines_unpaid", outstanding_fines: outstanding, unpaid_fine_count: unpaid.length },
    );
  }

  try {
    const match = await matchCompany(auth.service, company);
    if (!match) {
      await auditApiRequest(auth.service, auth.key, "referrals.lookup", "success");
      return NextResponse.json({ data: { matched: false, company_name: null, match_score: null, alumni: [] } });
    }
    const { data: alumni, error } = await auth.service
      .from("alumni_profiles")
      .select(ALUMNI_FIELDS)
      .eq("company_id", String(match.id))
      .eq("is_open_to_refer", true)
      .order("graduation_year", { ascending: false });
    if (error) throw error;
    // Rutgers alumni first, then most recent graduates.
    const sorted = (alumni || []).sort((left, right) =>
      (left.chapter === RUTGERS_CHAPTER ? 0 : 1) - (right.chapter === RUTGERS_CHAPTER ? 0 : 1)
      || (right.graduation_year || 0) - (left.graduation_year || 0));
    await auditApiRequest(auth.service, auth.key, "referrals.lookup", "success");
    return NextResponse.json({
      data: { matched: true, company_name: match.name || null, match_score: match.match_score, alumni: sorted },
    });
  } catch {
    return apiError("Referral lookup failed.", 500);
  }
}
