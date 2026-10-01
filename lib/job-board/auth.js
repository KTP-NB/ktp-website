import { NextResponse } from 'next/server';
import { extractAccessToken, getJobBoardServiceClient, getJobBoardUserClient } from './supabaseServer';
import { jobBoardDevAdminEnabled, profileCanManageJobBoard, profileCanUseJobBoard } from './adminAccess';
import { isAuthServiceUnavailable } from './authErrors';

export async function requireJobBoardUser(request) {
  const token = extractAccessToken(request);
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let data;
  let error;

  try {
    const userClient = getJobBoardUserClient(token);
    ({ data, error } = await userClient.auth.getUser());
  } catch (err) {
    console.error('Job Board auth validation failed:', err);
    return {
      error: NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 },
      ),
    };
  }

  if (isAuthServiceUnavailable(error)) {
    console.error('Job Board auth service unavailable:', error);
    return {
      error: NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 },
      ),
    };
  }

  if (error || !data?.user) {
    return { error: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await getJobBoardServiceClient()
    .from('member_profiles')
    .select('access_role, manager_permissions')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (profileError) {
    return { error: NextResponse.json({ error: 'Member lookup failed' }, { status: 500 }) };
  }
  if (profile) {
    const { data: rolePermissions, error: permissionError } = await getJobBoardServiceClient()
      .from('role_permissions')
      .select('permission_key')
      .eq('role_key', profile.access_role);
    if (permissionError) {
      return { error: NextResponse.json({ error: 'Permission lookup failed' }, { status: 500 }) };
    }
    profile.permissions = [...new Set([
      ...(rolePermissions || []).map((row) => row.permission_key),
      ...(profile.manager_permissions || []),
    ])];
  }
  if (!profileCanUseJobBoard(profile)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: data.user, token, profile };
}

export async function requireJobBoardAdmin(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth;

  if (!profileCanManageJobBoard(auth.profile)) {
    if (jobBoardDevAdminEnabled()) {
      return { ...auth, devAdmin: true };
    }
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return auth;
}

export { jobBoardDevAdminEnabled, profileCanManageJobBoard, profileCanUseJobBoard };
