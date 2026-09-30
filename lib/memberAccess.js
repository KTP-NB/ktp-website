export const MEMBER_PERMISSIONS = Object.freeze({
  PROFILE: 'account.profile',
  APPLICATIONS: 'applications.use',
  FINES: 'fines.view',
  RESUME: 'resumes.use',
  CODERANK: 'coderank.take',
  STUDY_TOOLS: 'study_tools.use',
  COMPANY_QUESTIONS: 'company_questions.use',
  REFERRAL_FINDER: 'referral_finder.use',
  INTEGRATIONS: 'integrations.use',
});

export const ADMIN_PERMISSIONS = Object.freeze({
  PORTAL: 'admin.portal',
  MEMBERS: 'members.manage',
  RESUMES: 'resumes.manage',
  CODERANK: 'coderank.manage',
  APPLICATIONS: 'applications.manage',
  FINES: 'fines.manage',
  ROLES: 'roles.manage',
});

const PLEDGE_PERMISSIONS = new Set([
  MEMBER_PERMISSIONS.PROFILE,
  MEMBER_PERMISSIONS.APPLICATIONS,
  MEMBER_PERMISSIONS.FINES,
  MEMBER_PERMISSIONS.RESUME,
  MEMBER_PERMISSIONS.CODERANK,
  MEMBER_PERMISSIONS.INTEGRATIONS,
]);

export function roleHasMemberPermission(role, permission) {
  if (!role) return false;
  if (role === 'pledge') return PLEDGE_PERMISSIONS.has(permission);
  return ['member', 'manager', 'admin', 'super_admin'].includes(role);
}

export function hasPermission(permissions, permission) {
  return Array.isArray(permissions) && permissions.includes(permission);
}
