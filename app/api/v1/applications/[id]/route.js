import { NextResponse } from "next/server";
import { apiError, auditApiRequest, cleanApplication, requireApplicationApiKey } from "@/lib/applications/apiAuth";

const PUBLIC_FIELDS = "id,company,position,date_applied,status,details,application_url,referral,referral_contact,entry_source,external_id,created_at,updated_at";

export async function GET(request, { params }) {
  const auth = await requireApplicationApiKey(request, "applications:read");
  if (auth.error) return auth.error;
  const { data, error } = await auth.service.from("internship_applications")
    .select(PUBLIC_FIELDS).eq("id", params.id).eq("user_id", auth.key.user_id).maybeSingle();
  if (error) return apiError("Unable to load application.", 500);
  if (!data) return apiError("Application not found.", 404);
  await auditApiRequest(auth.service, auth.key, "applications.read", "success", data.id);
  return NextResponse.json({ data });
}

export async function PATCH(request, { params }) {
  const auth = await requireApplicationApiKey(request, "applications:write");
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body || Array.isArray(body)) return apiError("Request body must be a JSON object.");
  const parsed = cleanApplication(body, { partial: true });
  if (parsed.errors.length) return apiError("Validation failed.", 400, parsed.errors);
  if (!Object.keys(parsed.value).length) return apiError("No supported fields were provided.");
  const { data, error } = await auth.service.from("internship_applications")
    .update(parsed.value).eq("id", params.id).eq("user_id", auth.key.user_id).select(PUBLIC_FIELDS).maybeSingle();
  if (error) return apiError("Unable to update application.", 500);
  if (!data) return apiError("Application not found.", 404);
  await auditApiRequest(auth.service, auth.key, "applications.update", "success", data.id);
  return NextResponse.json({ data });
}
