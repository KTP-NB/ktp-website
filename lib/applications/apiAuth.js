import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/coderank/supabaseServer";

const RATE_LIMIT_PER_HOUR = 120;

export function hashApiKey(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createApiKey() {
  const secret = crypto.randomBytes(32).toString("base64url");
  const key = `ktp_live_${secret}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 18) };
}

export async function requireApplicationApiKey(request, scope) {
  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+(ktp_live_[A-Za-z0-9_-]+)$/);
  if (!match) return { error: apiError("A valid bearer API key is required.", 401) };

  const service = getServiceClient();
  const { data: key, error } = await service
    .from("member_api_keys")
    .select("id,user_id,name,scopes,expires_at,revoked_at")
    .eq("key_hash", hashApiKey(match[1]))
    .maybeSingle();
  if (error) return { error: apiError("Authentication failed.", 500) };
  if (!key || key.revoked_at || (key.expires_at && new Date(key.expires_at) <= new Date()))
    return { error: apiError("API key is invalid, expired, or revoked.", 401) };
  if (!(key.scopes || []).includes(scope)) return { error: apiError(`Missing scope: ${scope}.`, 403) };

  const { data: profile, error: profileError } = await service
    .from("member_profiles")
    .select("id,name,member_status")
    .eq("user_id", key.user_id)
    .maybeSingle();
  if (profileError || !profile) return { error: apiError("Member profile not found.", 403) };
  if ((profile.member_status || "").toLowerCase() !== "active")
    return { error: apiError("Only active members can use the application API.", 403) };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await service
    .from("application_api_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", key.user_id)
    .gte("created_at", since);
  if ((count || 0) >= RATE_LIMIT_PER_HOUR) {
    await auditApiRequest(service, key, "request", "rate_limited");
    const response = apiError("Rate limit exceeded. Try again later.", 429);
    response.headers.set("Retry-After", "3600");
    return { error: response };
  }

  await service.from("member_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
  return { service, key, profile };
}

export async function auditApiRequest(service, key, action, outcome, applicationId = null) {
  await service.from("application_api_audit_logs").insert({
    api_key_id: key.id,
    user_id: key.user_id,
    action,
    outcome,
    application_id: applicationId,
  });
}

export function apiError(message, status = 400, details) {
  return NextResponse.json({ error: { message, ...(details ? { details } : {}) } }, { status });
}

export function cleanApplication(input, { partial = false } = {}) {
  const allowedStatuses = new Set(["applied", "assessment", "interviewing", "rejected", "offer", "withdrawn"]);
  const output = {};
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(input || {}, key);
  const text = (key, max) => {
    if (!has(key)) return;
    const value = String(input[key] ?? "").trim();
    if (value.length > max) errors.push(`${key} must be ${max} characters or fewer.`);
    else output[key] = value || null;
  };
  text("company", 160);
  text("position", 200);
  text("details", 5000);
  text("referral_contact", 200);
  text("external_id", 300);
  if (partial && has("company") && !output.company) errors.push("company cannot be empty.");
  if (partial && has("position") && !output.position) errors.push("position cannot be empty.");
  if (!partial && !output.company) errors.push("company is required.");
  if (!partial && !output.position) errors.push("position is required.");
  if (has("date_applied")) {
    const value = String(input.date_applied);
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
      errors.push("date_applied must be a real date in YYYY-MM-DD format.");
    else output.date_applied = value;
  } else if (!partial) output.date_applied = new Date().toISOString().slice(0, 10);
  if (has("status")) {
    if (!allowedStatuses.has(input.status)) errors.push("status is invalid.");
    else output.status = input.status;
  } else if (!partial) output.status = "applied";
  if (has("application_url")) {
    const value = String(input.application_url || "").trim();
    if (value && !/^https?:\/\//i.test(value)) errors.push("application_url must start with http:// or https://.");
    else output.application_url = value || null;
  }
  if (has("referral")) output.referral = Boolean(input.referral);
  else if (!partial) output.referral = false;
  if (partial) delete output.external_id;
  return { value: output, errors };
}
