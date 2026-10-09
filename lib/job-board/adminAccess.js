import { profileHasPermission } from '../adminAccess.js';
import { MEMBER_PERMISSIONS, hasPermission } from '../memberAccess.js';

export function profileCanUseJobBoard(profile) {
  return Boolean(profile && hasPermission(profile.permissions, MEMBER_PERMISSIONS.APPLICATIONS));
}

export function profileCanManageJobBoard(profile) {
  return profileHasPermission(profile, 'applications.manage');
}

export function jobBoardDevAdminEnabled(env = process.env) {
  return env.NODE_ENV !== 'production' && (
    env.JOB_BOARD_DEV_ADMIN_ENABLED === 'true'
    || env.NEXT_PUBLIC_JOB_BOARD_DEV_ADMIN_ENABLED === 'true'
  );
}
