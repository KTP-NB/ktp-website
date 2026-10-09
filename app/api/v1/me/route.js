import { NextResponse } from "next/server";
import { apiError, authenticateApiKey } from "@/lib/applications/apiAuth";
import { getApiKeyProfile } from "@/lib/coderank/auth";

export async function GET(request) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return auth.error;
  const { profile, error } = await getApiKeyProfile(auth);
  if (error || !profile) return apiError("Member profile not found.", 403);
  return NextResponse.json({
    data: {
      member: {
        id: profile.id,
        name: profile.name,
        // The role this key acts with, which may be lower than the member's own.
        access_role: profile.access_role,
        member_status: profile.member_status,
      },
      key: { name: auth.key.name, scopes: auth.key.scopes, acts_as_role: auth.key.acts_as_role || null },
      // Role permissions plus personal grants. Super Admins hold every permission.
      permissions: profile.permissions,
    },
  });
}
