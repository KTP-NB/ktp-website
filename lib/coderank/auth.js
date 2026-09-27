import { NextResponse } from "next/server";
import {
  extractAccessToken,
  getServiceClient,
  getUserClient,
} from "./supabaseServer";
import { profileHasPermission } from "@/lib/adminAccess";
import { MEMBER_PERMISSIONS } from "@/lib/memberAccess";

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
export async function requirePermission(request, permission) {
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

export async function requireAdmin(request) {
  return requirePermission(request, "coderank.manage");
}

export async function requireMemberPermission(request, permission) {
  return requirePermission(request, permission);
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
