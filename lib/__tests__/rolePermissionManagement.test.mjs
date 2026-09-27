import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { profileHasPermission } from '../adminAccess.js';

test('effective role permissions drive client-side authorization', () => {
  const profile = { access_role: 'member', permissions: ['applications.use', 'admin.portal'] };
  assert.equal(profileHasPermission(profile, 'applications.use'), true);
  assert.equal(profileHasPermission(profile, 'fines.manage'), false);
});

test('Super Admin remains an immutable authorization fallback', () => {
  assert.equal(profileHasPermission({ access_role: 'super_admin', permissions: [] }, 'roles.manage'), true);
});

test('role-permission migration includes safeguards and database enforcement', async () => {
  const sql = await readFile(
    new URL('../../supabase/migrations/20260927090000_role_permission_management.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /create table if not exists public\.role_permissions/i);
  assert.match(sql, /target_role = 'super_admin'[\s\S]*immutable/i);
  assert.match(sql, /create or replace function public\.has_role_permission/i);
  assert.match(sql, /internship_applications[\s\S]*'applications\.use'/i);
  assert.match(sql, /member_fines[\s\S]*'fines\.view'/i);
  assert.match(sql, /member_resumes[\s\S]*'resumes\.use'/i);
});

test('direct storage writes are protected by the matching role permissions', async () => {
  const sql = await readFile(
    new URL('../../supabase/migrations/20260927093000_role_permission_storage_policies.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /bucket_id = 'study-tools'[\s\S]*'study_tools\.use'/i);
  assert.match(sql, /bucket_id = 'member-resumes'[\s\S]*'resumes\.use'/i);
  assert.match(sql, /bucket_id = 'member-photos'[\s\S]*'account\.profile'/i);
});
