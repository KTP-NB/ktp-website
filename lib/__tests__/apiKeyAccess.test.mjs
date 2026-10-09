import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../../', import.meta.url);
const ADMIN_PERMISSIONS = new Set([
  'admin.portal',
  'members.manage',
  'resumes.manage',
  'coderank.manage',
  'applications.manage',
  'fines.manage',
  'roles.manage',
]);

async function routeFiles() {
  const entries = await readdir(new URL('app/api/', ROOT), { recursive: true });
  return entries.map((entry) => entry.replaceAll('\\', '/')).filter((entry) => entry.endsWith('route.js'));
}

async function source(path) {
  return readFile(new URL(path, ROOT), 'utf8');
}

function handlerCount(code) {
  return (code.match(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g) || []).length;
}

test('every admin route handler requires an admin permission', async () => {
  const files = (await routeFiles()).filter((file) => file.startsWith('admin/') || file.includes('/admin/'));
  assert.ok(files.length >= 15);
  for (const file of files) {
    const code = await source(`app/api/${file}`);
    const guards = code.match(/await require(Permission|Admin)\(request[^)]*\)/g) || [];
    assert.equal(guards.length, handlerCount(code), `${file}: every handler needs a permission guard`);
    assert.doesNotMatch(code, /requireUser\(|requireUserOrApiKey\(|requireMemberPermission\(/, file);
    for (const guard of guards) {
      const permission = guard.match(/["']([a-z_.]+)["']/)?.[1];
      if (guard.includes('requireAdmin')) continue;
      assert.ok(ADMIN_PERMISSIONS.has(permission), `${file}: ${permission} is not an admin permission`);
    }
  }
});

test('assessment taking and key management never accept API keys', async () => {
  const files = (await routeFiles()).filter((file) =>
    file.startsWith('applications/keys/') || /^coderank\/(run|submit|monitor|attempts)\//.test(file));
  assert.ok(files.length >= 6);
  for (const file of files) {
    const code = await source(`app/api/${file}`);
    assert.doesNotMatch(code, /requirePermission\(|requireAdmin\(|requireUserOrApiKey\(|authenticateApiKey\(|requireMemberApiKey\(/, file);
  }
  const auth = await source('lib/coderank/auth.js');
  assert.match(auth, /export async function requireMemberPermission[^}]*requireSessionPermission\(/);
});

test('member API routes are guarded and only ever act on the key owner', async () => {
  const files = (await routeFiles()).filter((file) => file.startsWith('v1/') && file !== 'v1/openapi/route.js');
  assert.ok(files.length >= 10);
  for (const file of files) {
    const code = await source(`app/api/${file}`);
    const guards = code.match(/await (requireMemberApiKey|requireApplicationApiKey|requireCompanyQuestionsAccess|authenticateApiKey)\(request/g) || [];
    assert.equal(guards.length, handlerCount(code), `${file}: every handler needs an API-key guard`);
    // Ownership always comes from the key, never from caller-supplied identifiers.
    assert.doesNotMatch(code, /(body|searchParams\.get\(["'])\.?(user_id|member_id|profile_id)/, file);
    assert.doesNotMatch(code, /\.eq\(["'](user_id|member_id|profile_id)["'],(?!\s*auth\.(key\.user_id|profile\.id)\))/, file);
  }
});

test('API-key requests need the owner to hold the permission', async () => {
  const auth = await source('lib/coderank/auth.js');
  const keyBranch = auth.slice(auth.indexOf('async function requireApiKeyPermission'), auth.indexOf('export async function requirePermission'));
  assert.match(keyBranch, /authenticateApiKey\(request, apiKeyScopeForMethod\(request\.method\)\)/);
  assert.match(keyBranch, /if \(!profileHasPermission\(profile, permission\)\)[\s\S]*status: 403/);

  const apiAuth = await source('lib/applications/apiAuth.js');
  assert.match(apiAuth, /key\.revoked_at/);
  assert.match(apiAuth, /!== "active"/);
  assert.match(apiAuth, /has_role_permission/);
});

test('role-limited keys can only be created by Super Admins and only narrow access', async () => {
  const keys = await source('app/api/applications/keys/route.js');
  assert.match(keys, /access_role !== "super_admin"\)\s*return NextResponse\.json\(\{ error: "Only Super Admins can create role-limited keys\." \}, \{ status: 403 \}\)/);
  assert.match(keys, /LIMITED_ROLES = \["pledge", "member", "manager", "admin"\]/);

  const apiAuth = await source('lib/applications/apiAuth.js');
  // The key stops working if its owner is no longer a Super Admin.
  assert.match(apiAuth, /key\.acts_as_role && profile\.access_role !== "super_admin"/);
  // Member routes need both the owner's permission and the limited role's.
  assert.match(apiAuth, /!allowed \|\| \(limit\.profile && !profileHasPermission\(limit\.profile, permission\)\)/);

  const auth = await source('lib/coderank/auth.js');
  assert.match(auth, /async function requireApiKeyPermission[\s\S]*?getApiKeyProfile\(keyAuth\)/);
});

test('MCP admin tools are registered only for callers with the matching permission', async () => {
  const code = await source('supabase/functions/ktp-new-brunswick-mcp/index.ts');
  const tools = [...code.matchAll(/\n  tool\(\s*\n\s*(.+),\s*\n\s*"([a-z_]+)",/g)].map((match) => ({ gate: match[1], name: match[2] }));
  assert.ok(tools.length >= 45);
  for (const { gate, name } of tools) {
    if (name === 'get_my_profile') continue;
    assert.notEqual(gate, 'true', `${name} must be gated`);
    if (name.startsWith('admin_')) {
      assert.match(gate, /^(isSuperAdmin|can\("[a-z]+\.manage"\))|^isSuperAdmin && /, `${name} needs an admin gate`);
    } else {
      assert.match(gate, /^can\("[a-z_]+\.(use|view|take|profile)"\)$/, `${name} needs a member permission gate`);
    }
  }
});
