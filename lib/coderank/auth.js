import { NextResponse } from "next/server";
import {
  extractAccessToken,
  getServiceClient,
  getUserClient,
} from "./supabaseServer";
import { profileHasPermission } from "@/lib/adminAccess";
import { MEMBER_PERMISSIONS } from "@/lib/memberAccess";
import {
  apiKeyRoleLimit,
  apiKeyScopeForMethod,
  auditApiRequest,
  authenticateApiKey,
  isApiKeyRequest,
} from "@/lib/applications/apiAuth";

const BLOCKED_TEST_STATUSES = ["alumni", "inactive"];

export async function getAccessProfile(userId) {
  const service = getServiceClient();
  const { data: profile, error } = await service
    .from("member_profiles")
    .select("id,name,email,position,pledge_class,access_role,manager_permissions,member_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !profile) return { profile: null, error };

  const { data: rolePermissions, error: permissionsError } = await service
    .from("role_permissions")
    .select("permission_key")
    .eq("role_key", profile.access_role);
  if (permissionsError) return { profile: null, error: permissionsError };

  profile.permissions = [...new Set([
    ...(rolePermissions || []).map((row) => row.permission_key),
    ...(profile.manager_permissions || []),
  ])];
  return { profile, error: null };
}

/**
 * Verify the caller is authenticated. Returns `{ user, error }` where error is
 * a NextResponse you can return immediately if present.
 */
export async function requireUser(request) {
  const token = extractAccessToken(request);
  if (!token) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userClient = getUserClient(token);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    return {
      error: NextResponse.json({ error: "Invalid session" }, { status: 401 }),
    };
  }
  return { user: data.user, token };
}

/**
 * Verify the caller is one of the admin VPs. Uses the service-role client to
 * look up `member_profiles.position` (RLS-bypassing read is safe here because
 * we already authenticated the user via their JWT).
 */
async function requireSessionPermission(request, permission) {
  const auth = await requireUser(request);
  if (auth.error) return auth;

  const { profile, error } = await getAccessProfile(auth.user.id);

  if (error) {
    return {
      error: NextResponse.json({ error: "Lookup failed" }, { status: 500 }),
    };
  }
  if (!profileHasPermission(profile, permission)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: auth.user, profile, token: auth.token };
}

/**
 * The access profile an API key acts with: its owner's, or — for a key a Super
 * Admin created to act as a lower role — the owner's profile narrowed to that
 * role, so route checks such as `access_role === 'super_admin'` see the limit.
 */
export async function getApiKeyProfile(keyAuth) {
  const { profile, error } = await getAccessProfile(keyAuth.key.user_id);
  if (error || !profile) return { profile: null, error };
  const limit = await apiKeyRoleLimit(keyAuth.service, keyAuth.key);
  if (limit.error) return { profile: null, error: limit.error };
  if (!limit.profile) return { profile, error: null };
  return {
    profile: { ...profile, ...limit.profile, manager_permissions: [] },
    error: null,
  };
}

/**
 * Same permission check for a personal API key (MCP and scripts). The key only
 * identifies its owner; access still comes from the owner's current role and
 * personal grants, so revoking a permission on the website cuts the key off too.
 */
async function requireApiKeyPermission(request, permission) {
  const keyAuth = await authenticateApiKey(request, apiKeyScopeForMethod(request.method));
  if (keyAuth.error) return { error: keyAuth.error };

  const { profile, error } = await getApiKeyProfile(keyAuth);
  if (error) {
    return {
      error: NextResponse.json({ error: "Lookup failed" }, { status: 500 }),
    };
  }

  const action = `${request.method} ${new URL(request.url).pathname}`;
  if (!profileHasPermission(profile, permission)) {
    await auditApiRequest(keyAuth.service, keyAuth.key, action, "denied");
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  await auditApiRequest(keyAuth.service, keyAuth.key, action, "success");
  return { user: { id: keyAuth.key.user_id }, profile, apiKey: keyAuth.key };
}

export async function requirePermission(request, permission) {
  if (isApiKeyRequest(request)) return requireApiKeyPermission(request, permission);
  return requireSessionPermission(request, permission);
}

export async function requireAdmin(request) {
  return requirePermission(request, "coderank.manage");
}

// Website sessions only: taking assessments and managing API keys are never
// available to an API key.
export async function requireMemberPermission(request, permission) {
  return requireSessionPermission(request, permission);
}

/** Identify the caller from either a website session or a personal API key. */
export async function requireUserOrApiKey(request) {
  if (!isApiKeyRequest(request)) return requireUser(request);
  const keyAuth = await authenticateApiKey(request, apiKeyScopeForMethod(request.method));
  if (keyAuth.error) return { error: keyAuth.error };
  const { profile, error } = await getApiKeyProfile(keyAuth);
  if (error || !profile) {
    return {
      error: NextResponse.json({ error: "Lookup failed" }, { status: 500 }),
    };
  }
  return { user: { id: keyAuth.key.user_id }, profile, apiKey: keyAuth.key };
}

/**
 * Return the caller's member_profile row, regardless of admin status.
 * Used to look up pledge_class for assignment-resolution.
 */
export async function getProfile(userId) {
  const { profile } = await getAccessProfile(userId);
  return profile;
}

function canTakeCodeRankAssessment(profile) {
  if (!profile) return false;
  const status = (profile.member_status || "").trim().toLowerCase();
  return !BLOCKED_TEST_STATUSES.includes(status)
    && profileHasPermission(profile, MEMBER_PERMISSIONS.CODERANK);
}

export { profileHasPermission, canTakeCodeRankAssessment };
