import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applicationCreatePayload,
  applicationUpdatePayload,
} from '../applications/payloads.mjs';

const form = {
  company: 'Acme',
  position: 'Engineer',
  date_applied: '2026-09-06',
  status: 'interviewing',
  details: 'Phone screen',
  application_url: 'https://example.com/application',
  referral: true,
  referral_contact: 'KTP Alum',
  user_id: 'untrusted-owner',
  entry_source: 'api',
  api_key_id: 'untrusted-key',
  external_id: 'untrusted-external-id',
};

test('application updates contain only member-editable fields', () => {
  const payload = applicationUpdatePayload(form);

  assert.equal(payload.status, 'interviewing');
  assert.equal(payload.company, 'Acme');
  assert.equal('user_id' in payload, false);
  assert.equal('entry_source' in payload, false);
  assert.equal('api_key_id' in payload, false);
  assert.equal('external_id' in payload, false);
});

test('application creation adds the authenticated owner without provenance fields', () => {
  const payload = applicationCreatePayload(form, 'authenticated-user');

  assert.equal(payload.user_id, 'authenticated-user');
  assert.equal(payload.status, 'interviewing');
  assert.equal('entry_source' in payload, false);
  assert.equal('api_key_id' in payload, false);
  assert.equal('external_id' in payload, false);
});
