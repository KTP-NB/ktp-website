import { NextResponse } from 'next/server';
import { extractAccessToken, getServiceClient, getUserClient } from './supabaseServer';

const ADMIN_POSITION_PATTERNS = ['vp of tech development', 'vp of prof development'];
const BLOCKED_TEST_STATUSES = ['alumni', 'inactive'];

function positionIsAdmin(position) {
  if (!position) return false;
  const lower = position.toLowerCase();
  return ADMIN_POSITION_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Verify the caller is authenticated. Returns `{ user, error }` where error is
 * a NextResponse you can return immediately if present.
 */
export async function requireUser(request) {
  const token = extractAccessToken(request);
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userClient = getUserClient(token);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    return { error: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }
  return { user: data.user, token };
}

/**
 * Verify the caller is one of the admin VPs. Uses the service-role client to
 * look up `member_profiles.position` (RLS-bypassing read is safe here because
 * we already authenticated the user via their JWT).
 */
export async function requireAdmin(request) {
  const auth = await requireUser(request);
  if (auth.error) return auth;

  const service = getServiceClient();
  const { data: profile, error } = await service
    .from('member_profiles')
    .select('position, pledge_class')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: 'Lookup failed' }, { status: 500 }) };
  }
  if (!positionIsAdmin(profile?.position)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: auth.user, profile, token: auth.token };
}

/**
 * Return the caller's member_profile row, regardless of admin status.
 * Used to look up pledge_class for assignment-resolution.
 */
export async function getProfile(userId) {
  const service = getServiceClient();
  const { data } = await service
    .from('member_profiles')
    .select('id, name, position, pledge_class, email, member_status')
    .eq('user_id', userId)
    .maybeSingle();
  return data || null;
}

function canTakeCodeRankAssessment(profile) {
  if (!profile) return false;
  const status = (profile.member_status || '').trim().toLowerCase();
  return !BLOCKED_TEST_STATUSES.includes(status);
}

export { positionIsAdmin, canTakeCodeRankAssessment };
