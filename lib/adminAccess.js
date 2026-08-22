/**
 * Admin portal permissions, shared by the API route guards and the tab list.
 * Keep this file free of server-only imports so client components can use it.
 *
 * Super admins can do everything and are the only ones who can hand out
 * access. Admins and managers see exactly the panels a super admin ticked for
 * them in Member Management — nothing is implied by the role itself.
 */

export const GRANTABLE_ROLES = ['admin', 'manager'];

export const PERMISSIONS = [
  'members.manage',
  'resumes.manage',
  'coderank.manage',
  'applications.manage',
  'fines.manage',
];

export function profileHasPermission(profile, permission) {
  if (!profile) return false;
  if (profile.access_role === 'super_admin') return true;
  if (!GRANTABLE_ROLES.includes(profile.access_role)) return false;
  return (profile.manager_permissions || []).includes(permission);
}
