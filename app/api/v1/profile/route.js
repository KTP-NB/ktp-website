import { NextResponse } from "next/server";
import { apiError, auditApiRequest, requireMemberApiKey } from "@/lib/applications/apiAuth";

const FIELDS =
  "id,name,email,position,pledge_class,member_status,graduation_year,major,minors,linkedin_url,photo_url,public_directory_visible,access_role";
// The same fields a member can edit on the website profile page.
const EDITABLE = { name: 120, graduation_year: 20, major: 200, minors: 200, linkedin_url: 300 };

export async function GET(request) {
  const auth = await requireMemberApiKey(request, "applications:read", "account.profile");
  if (auth.error) return auth.error;
  const { data, error } = await auth.service
    .from("member_profiles").select(FIELDS).eq("id", auth.profile.id).maybeSingle();
  if (error || !data) return apiError("Unable to load profile.", 500);
  await auditApiRequest(auth.service, auth.key, "profile.read", "success");
  return NextResponse.json({ data });
}

export async function PATCH(request) {
  const auth = await requireMemberApiKey(request, "applications:write", "account.profile");
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body || Array.isArray(body)) return apiError("Request body must be a JSON object.");

  const updates = {};
  const errors = [];
  for (const [key, max] of Object.entries(EDITABLE)) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const value = String(body[key] ?? "").trim();
    if (value.length > max) errors.push(`${key} must be ${max} characters or fewer.`);
    else updates[key] = value || null;
  }
  if ("name" in updates && !updates.name) errors.push("name cannot be empty.");
  if (updates.linkedin_url && !/^https?:\/\//i.test(updates.linkedin_url))
    errors.push("linkedin_url must start with http:// or https://.");
  if (errors.length) return apiError("Validation failed.", 400, errors);
  if (!Object.keys(updates).length) return apiError("No supported fields were provided.");

  const { data, error } = await auth.service
    .from("member_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", auth.profile.id)
    .select(FIELDS)
    .single();
  if (error) return apiError("Unable to update profile.", 500);
  await auditApiRequest(auth.service, auth.key, "profile.update", "success");
  return NextResponse.json({ data });
}
