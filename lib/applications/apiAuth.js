import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/coderank/supabaseServer";
import { profileHasPermission } from "@/lib/adminAccess";

const RATE_LIMIT_PER_HOUR = 120;

export function hashApiKey(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createApiKey() {
  const secret = crypto.randomBytes(32).toString("base64url");
  const key = `ktp_live_${secret}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 18) };
}

const API_KEY_HEADER = /^Bearer\s+(ktp_live_[A-Za-z0-9_-]+)$/;

export const API_KEY_SCOPES = Object.freeze({
  READ: "applications:read",
  WRITE: "applications:write",
});

export function isApiKeyRequest(request) {
  return /^Bearer\s+ktp_live_/.test(request.headers.get("authorization") || "");
}

/** Read keys may only issue safe requests; anything that changes data needs Write. */
export function apiKeyScopeForMethod(method) {
  return ["GET", "HEAD"].includes(String(method || "").toUpperCase())
    ? API_KEY_SCOPES.READ
    : API_KEY_SCOPES.WRITE;
}

/**
 * Resolve a bearer API key to its owner. Checks revocation, expiry, the
 * optional scope, active membership, and the hourly rate limit — but not any
 * role permission; callers decide which permission the request needs.
 */
export async function authenticateApiKey(request, scope) {
  const match = (request.headers.get("authorization") || "").match(API_KEY_HEADER);
  if (!match) return { error: apiError("A valid bearer API key is required.", 401) };

  const service = getServiceClient();
  const { data: key, error } = await service
    .from("member_api_keys")
    .select("id,user_id,name,scopes,expires_at,revoked_at,acts_as_role,acts_as_permissions")
    .eq("key_hash", hashApiKey(match[1]))
    .maybeSingle();
  if (error) return { error: apiError("Authentication failed.", 500) };
  if (!key || key.revoked_at || (key.expires_at && new Date(key.expires_at) <= new Date()))
    return { error: apiError("API key is invalid, expired, or revoked.", 401) };
  if (scope && !(key.scopes || []).includes(scope)) return { error: apiError(`Missing scope: ${scope}.`, 403) };

  const { data: profile, error: profileError } = await service
    .from("member_profiles")
    .select("id,name,member_status,access_role")
    .eq("user_id", key.user_id)
    .maybeSingle();
  if (profileError || !profile) return { error: apiError("Member profile not found.", 403) };
  if ((profile.member_status || "").toLowerCase() !== "active")
    return { error: apiError("Only active members can use the application API.", 403) };
  // A role-limited key was minted with Super Admin authority; it dies with it.
  if (key.acts_as_role && profile.access_role !== "super_admin")
    return { error: apiError("This role-limited key no longer works because its owner is not a Super Admin.", 403) };

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

/**
 * API-key guard for the member-owned /api/v1 routes: the key must be valid and
 * its owner must currently hold `permission` through their role or a personal
 * grant (the same has_role_permission check RLS uses for website sessions).
 */
export async function requireMemberApiKey(
  request,
  scope,
  permission,
  deniedMessage = "Your access role does not include this feature.",
) {
  const auth = await authenticateApiKey(request, scope);
  if (auth.error) return auth;
  const { data: allowed, error: permissionError } = await auth.service.rpc("has_role_permission", {
    uid: auth.key.user_id,
    requested_permission: permission,
  });
  if (permissionError) return { error: apiError("Permission lookup failed.", 500) };
  const limit = await apiKeyRoleLimit(auth.service, auth.key);
  if (limit.error) return { error: apiError("Permission lookup failed.", 500) };
  if (!allowed || (limit.profile && !profileHasPermission(limit.profile, permission))) {
    await auditApiRequest(auth.service, auth.key, permission, "denied");
    return { error: apiError(deniedMessage, 403) };
  }
  return auth;
}

/**
 * For a key created to act as a specific role, the access that role has:
 * `{ profile: { access_role, permissions } }` in the shape profileHasPermission
 * expects. `profile` is null for an ordinary key, which follows its owner.
 */
export async function apiKeyRoleLimit(service, key) {
  if (!key.acts_as_role) return { profile: null };
  const { data, error } = await service
    .from("role_permissions")
    .select("permission_key")
    .eq("role_key", key.acts_as_role);
  if (error) return { error };
  // Personal admin grants only apply to admin and manager, as on member profiles.
  const personal = ["admin", "manager"].includes(key.acts_as_role) ? key.acts_as_permissions || [] : [];
  return {
    profile: {
      access_role: key.acts_as_role,
      permissions: [...new Set([...(data || []).map((row) => row.permission_key), ...personal])],
    },
  };
}

export async function requireApplicationApiKey(request, scope) {
  return requireMemberApiKey(
    request,
    scope,
    "applications.use",
    "Your access role cannot use the application tracker.",
  );
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
