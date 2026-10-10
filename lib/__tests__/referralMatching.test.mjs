import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { findBestMatch, normalizeCompany } from '../referrals/matching.mjs';

test('company names are normalized the way the extension does', () => {
  assert.equal(normalizeCompany('Capital One Financial Corp.'), 'capital one financial');
  assert.equal(normalizeCompany('Stripe, Inc.'), 'stripe');
  assert.equal(normalizeCompany('AT&T Careers'), 'at and t');
  assert.equal(normalizeCompany(''), '');
});

test('fuzzy matching accepts close names and rejects unrelated ones', () => {
  const companies = [{ id: 1, name: 'Goldman Sachs', normalized: 'goldman sachs' }, { id: 2, name: 'Stripe', normalized: 'stripe' }];
  assert.equal(findBestMatch(normalizeCompany('Goldman Sachs Group'), companies).company?.id, 1);
  assert.equal(findBestMatch(normalizeCompany('Datadog'), companies).company, null);
});

test('referral lookups need the permission and are locked by unpaid fines', async () => {
  const route = await readFile(new URL('../../app/api/v1/referrals/route.js', import.meta.url), 'utf8');
  assert.match(route, /requireMemberApiKey\(request, "applications:read", "referral_finder\.use"\)/);
  const finesCheck = route.indexOf('if (outstanding > 0)');
  assert.ok(finesCheck > 0 && finesCheck < route.indexOf('matchCompany(auth.service'), 'fines are checked before any lookup');
  assert.match(route, /\.eq\("is_open_to_refer", true\)/);
});

test('company questions keep their standing rules for API keys', async () => {
  const access = await readFile(new URL('../../app/api/v1/company-questions/access.js', import.meta.url), 'utf8');
  assert.match(access, /"company_questions\.use"/);
  assert.match(access, /rpc\("company_questions_access_at"/);
  assert.match(access, /if \(!state\.allowed\)/);
});

test('alumni LinkedIn links are stored as canonical personal profile URLs', async () => {
  const { cleanLinkedinUrl, parseAlumniContactUpdate } = await import('../alumniContacts.mjs');
  assert.equal(cleanLinkedinUrl('linkedin.com/in/jane-doe-123/?utm_source=share').value, 'https://www.linkedin.com/in/jane-doe-123');
  assert.equal(cleanLinkedinUrl('https://www.linkedin.com/in/jane-doe').value, 'https://www.linkedin.com/in/jane-doe');
  assert.equal(cleanLinkedinUrl('').value, null);
  assert.ok(cleanLinkedinUrl('https://www.linkedin.com/company/stripe').error);
  assert.ok(cleanLinkedinUrl('https://evil.example/in/jane-doe').error);
  assert.ok(cleanLinkedinUrl('https://notlinkedin.com/in/jane-doe').error);
  const id = '11111111-1111-1111-1111-111111111111';
  assert.deepEqual(parseAlumniContactUpdate({ alumni_id: id, email: ' Jane@Example.com ' }), { id, values: { email: 'jane@example.com' } });
  assert.ok(parseAlumniContactUpdate({ alumni_id: id }).error);
  assert.ok(parseAlumniContactUpdate({ alumni_id: 'nope', linkedin_url: 'linkedin.com/in/x' }).error);
});

test('alumni contact management is Super Admin only', async () => {
  const route = await readFile(new URL('../../app/api/admin/alumni/route.js', import.meta.url), 'utf8');
  assert.equal((route.match(/const denied = superAdminOnly\(auth\);\s+if \(denied\) return denied;/g) || []).length, 2);
  assert.match(route, /access_role === "super_admin"/);
});
