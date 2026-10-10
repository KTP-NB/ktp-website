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
