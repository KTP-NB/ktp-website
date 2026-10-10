import { NextResponse } from 'next/server';
import { extractAccessToken, getJobBoardServiceClient, getJobBoardUserClient } from './supabaseServer';
import { jobBoardDevAdminEnabled, profileCanManageJobBoard, profileCanUseJobBoard } from './adminAccess';
import { isAuthServiceUnavailable } from './authErrors';
import {
  apiKeyScopeForMethod,
  auditApiRequest,
  authenticateApiKey,
  isApiKeyRequest,
} from '@/lib/applications/apiAuth';
import { getApiKeyProfile } from '@/lib/coderank/auth';

/**
 * Personal API keys (MCP and scripts) get the same Job Board access as their
 * owner's website session: applications.use to browse, applications.manage for
 * the admin routes. A role-limited key is checked against its limited role.
 */
async function requireJobBoardApiKey(request) {
  const keyAuth = await authenticateApiKey(request, apiKeyScopeForMethod(request.method));
  if (keyAuth.error) return { error: keyAuth.error };

  const { profile, error } = await getApiKeyProfile(keyAuth);
  if (error || !profile) {
    return { error: NextResponse.json({ error: 'Member lookup failed' }, { status: 500 }) };
  }

  const action = `${request.method} ${new URL(request.url).pathname}`;
  if (!profileCanUseJobBoard(profile)) {
    await auditApiRequest(keyAuth.service, keyAuth.key, action, 'denied');
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  await auditApiRequest(keyAuth.service, keyAuth.key, action, 'success');
  return { user: { id: keyAuth.key.user_id }, profile, apiKey: keyAuth.key };
}

export async function requireJobBoardUser(request) {
  if (isApiKeyRequest(request)) return requireJobBoardApiKey(request);

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
    // The local-development admin shortcut is for website sessions only.
    if (!auth.apiKey && jobBoardDevAdminEnabled()) {
      return { ...auth, devAdmin: true };
    }
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return auth;
}

export { jobBoardDevAdminEnabled, profileCanManageJobBoard, profileCanUseJobBoard };
