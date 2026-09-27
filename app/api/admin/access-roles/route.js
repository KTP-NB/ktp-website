import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/coderank/auth';
import { getServiceClient } from '@/lib/coderank/supabaseServer';
import { withNoStore } from '@/lib/coderank/noStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function snapshot(service) {
  const [rolesResult, definitionsResult, assignmentsResult] = await Promise.all([
    service.from('access_roles').select('*').order('sort_order'),
    service.from('permission_definitions').select('*').order('sort_order'),
    service.from('role_permissions').select('role_key,permission_key'),
  ]);
  const error = rolesResult.error || definitionsResult.error || assignmentsResult.error;
  if (error) return { error };
  const assignments = {};
  for (const role of rolesResult.data || []) assignments[role.role_key] = [];
  for (const row of assignmentsResult.data || []) {
    if (assignments[row.role_key]) assignments[row.role_key].push(row.permission_key);
  }
  return {
    roles: rolesResult.data || [],
    permissions: definitionsResult.data || [],
    assignments,
  };
}

export async function GET(request) {
  const auth = await requirePermission(request, 'roles.manage');
  if (auth.error) return auth.error;
  const result = await snapshot(getServiceClient());
  if (result.error) return withNoStore(NextResponse.json({ error: result.error.message }, { status: 500 }));
  return withNoStore(NextResponse.json(result));
}

export async function PUT(request) {
  const auth = await requirePermission(request, 'roles.manage');
  if (auth.error) return auth.error;
  if (auth.profile.access_role !== 'super_admin') {
    return withNoStore(NextResponse.json({ error: 'Only Super Admins can edit role permissions.' }, { status: 403 }));
  }

  const body = await request.json().catch(() => ({}));
  const roleKey = String(body.role_key || '').trim();
  const permissions = [...new Set(
    (Array.isArray(body.permissions) ? body.permissions : [])
      .map((permission) => String(permission || '').trim())
      .filter(Boolean),
  )];
  if (!['pledge', 'member', 'manager', 'admin'].includes(roleKey)) {
    return withNoStore(NextResponse.json({ error: 'That role cannot be edited.' }, { status: 400 }));
  }

  const service = getServiceClient();
  const { error } = await service.rpc('replace_role_permissions', {
    target_role: roleKey,
    requested_permissions: permissions,
    actor: auth.user.id,
  });
  if (error) return withNoStore(NextResponse.json({ error: error.message }, { status: 400 }));

  const result = await snapshot(service);
  if (result.error) return withNoStore(NextResponse.json({ error: result.error.message }, { status: 500 }));
  return withNoStore(NextResponse.json(result));
}
