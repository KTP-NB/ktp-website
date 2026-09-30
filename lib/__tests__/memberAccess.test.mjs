import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { MEMBER_PERMISSIONS, roleHasMemberPermission } from '../memberAccess.js';

test('Pledges receive account, CodeRank, and integrations access only', () => {
  for (const permission of [
    MEMBER_PERMISSIONS.PROFILE,
    MEMBER_PERMISSIONS.APPLICATIONS,
    MEMBER_PERMISSIONS.FINES,
    MEMBER_PERMISSIONS.RESUME,
    MEMBER_PERMISSIONS.CODERANK,
    MEMBER_PERMISSIONS.INTEGRATIONS,
  ]) assert.equal(roleHasMemberPermission('pledge', permission), true);

  for (const permission of [
    MEMBER_PERMISSIONS.STUDY_TOOLS,
    MEMBER_PERMISSIONS.COMPANY_QUESTIONS,
    MEMBER_PERMISSIONS.REFERRAL_FINDER,
  ]) assert.equal(roleHasMemberPermission('pledge', permission), false);
});

test('standard member and administrative roles retain member-tool access', () => {
  for (const role of ['member', 'manager', 'admin', 'super_admin']) {
    for (const permission of Object.values(MEMBER_PERMISSIONS)) {
      assert.equal(roleHasMemberPermission(role, permission), true);
    }
  }
});

test('Pledge migration preserves the active Epsilon invite and hides the class', async () => {
  const sql = await readFile(
    new URL('../../supabase/migrations/20260925090000_pledge_access_role.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /update public\.member_invites[\s\S]*access_role = 'pledge'[\s\S]*pledge_class[\s\S]*epsilon/i);
  assert.match(sql, /update public\.member_profiles[\s\S]*public_directory_visible = false[\s\S]*pledge_class[\s\S]*epsilon/i);
});
