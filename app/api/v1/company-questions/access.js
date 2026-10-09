import { apiError, auditApiRequest, requireMemberApiKey } from "@/lib/applications/apiAuth";

/**
 * LC Company Tagged has standing rules on top of the role permission (admin
 * block, unpaid fines, monthly OA). Run the same database check the website's
 * RLS policy uses so an API key cannot read around them.
 */
export async function requireCompanyQuestionsAccess(request) {
  const auth = await requireMemberApiKey(request, "applications:read", "company_questions.use");
  if (auth.error) return auth;
  const { data: state, error } = await auth.service.rpc("company_questions_access_at", {
    uid: auth.key.user_id,
    as_of: new Date().toISOString(),
  });
  if (error || !state) return { error: apiError("Access check failed.", 500) };
  if (!state.allowed) {
    await auditApiRequest(auth.service, auth.key, "company_questions.use", "denied");
    return { error: apiError("LC Company Tagged is locked for your account.", 403, state) };
  }
  return auth;
}
