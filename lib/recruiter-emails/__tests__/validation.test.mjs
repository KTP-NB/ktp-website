import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanRecruiterEmail, isEmailId, parseEmailFilters } from '../validation.mjs';

const outreach = {
  recipients: [{ email: ' Recruiter@Example.com ', name: ' Alex ' }],
  subject: ' Engineering opportunity ',
  sent_at: '2026-10-20T18:30:00-04:00',
};
const source = { provider: 'gmail', mailbox_id: 'sender@example.com', message_id: 'message-1' };

test('manual outreach normalizes recipients and preserves the original sending instant', () => {
  const parsed = cleanRecruiterEmail(outreach);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.value.recipients, [{ email: 'recruiter@example.com', name: 'Alex' }]);
  assert.equal(parsed.value.sent_at, '2026-10-20T22:30:00.000Z');
  assert.equal(parsed.value.subject, 'Engineering opportunity');
  assert.equal(parsed.value.company, undefined);
});

test('import identity is complete and message IDs retain their case', () => {
  const parsed = cleanRecruiterEmail({ ...outreach, ...source, provider: 'GMAIL', message_id: 'CaseSensitive-ID' }, { requireSource: true });
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.value.provider, 'gmail');
  assert.equal(parsed.value.message_id, 'CaseSensitive-ID');
  for (const omitted of Object.keys(source)) {
    const input = { ...outreach, ...source };
    delete input[omitted];
    assert.ok(cleanRecruiterEmail(input, { requireSource: true }).errors.length, omitted);
  }
  assert.ok(cleanRecruiterEmail(outreach, { requireSource: true }).errors.length);
  assert.ok(cleanRecruiterEmail({ ...outreach, thread_id: 'thread-1' }).errors.length);
});

test('recipient deduplication retains multiple recruiters on a single email', () => {
  const parsed = cleanRecruiterEmail({ ...outreach, recipients: [
    { email: 'Alex@example.com' }, { email: 'alex@EXAMPLE.com' }, { email: 'sam@example.com', name: 'Sam' },
  ] });
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.value.recipients.length, 2);
  for (const recipients of [[], Array.from({ length: 21 }, () => ({ email: 'a@example.com' })), [null], [{ email: 'invalid' }], [{ email: 'a@example.com', name: 42 }]]) {
    assert.ok(cleanRecruiterEmail({ ...outreach, recipients }).errors.length);
  }
});

test('untrusted ownership and provenance fields are rejected', () => {
  for (const key of ['user_id', 'entry_source', 'deleted_at', 'created_at', 'id']) {
    assert.ok(cleanRecruiterEmail({ ...outreach, [key]: 'forged' }).errors.some(error => error.includes('Unknown field')));
  }
  for (const input of [null, [], true, 'email', 12]) assert.ok(cleanRecruiterEmail(input).errors.length);
});

test('partial edits allow clearing optional content but cannot change source identity', () => {
  const parsed = cleanRecruiterEmail({ notes: null, company: '' }, { partial: true });
  assert.deepEqual(parsed, { value: { company: null, notes: null }, errors: [] });
  assert.ok(cleanRecruiterEmail({}, { partial: true }).errors.length);
  for (const key of ['provider', 'mailbox_id', 'message_id', 'thread_id']) {
    assert.ok(cleanRecruiterEmail({ [key]: null }, { partial: true }).errors.some(error => error.includes('cannot be changed')));
  }
});

test('timestamps reject invalid calendar dates and missing timezones', () => {
  for (const sent_at of ['2026-02-30T10:00:00Z', '2026-10-20', '2026-10-20T10:00:00', '2026-13-20T10:00:00Z', '2026-10-20T10:99:00Z', '2026-10-20T24:00:00Z', null]) {
    assert.ok(cleanRecruiterEmail({ ...outreach, sent_at }).errors.length, String(sent_at));
  }
  assert.deepEqual(cleanRecruiterEmail({ ...outreach, sent_at: '2024-02-29T10:00:00.123Z' }).errors, []);
});

test('source links reject executable schemes and embedded credentials', () => {
  for (const source_url of ['javascript:alert(1)', 'data:text/html,test', 'https://name:password@example.com/', '/relative', 'https://']) {
    assert.ok(cleanRecruiterEmail({ ...outreach, source_url }).errors.length, source_url);
  }
  assert.deepEqual(cleanRecruiterEmail({ ...outreach, source_url: 'https://mail.google.com/mail/u/0/#sent/message-1' }).errors, []);
});

test('text boundaries reject oversized, non-text and unsafe content', () => {
  for (const fields of [{ subject: 'a'.repeat(501) }, { notes: 'a'.repeat(5001) }, { company: {} }, { notes: 'hello\u0000world' }, { provider: 'invalid provider', ...source, message_id: '' }]) {
    assert.ok(cleanRecruiterEmail({ ...outreach, ...fields }).errors.length);
  }
  assert.deepEqual(cleanRecruiterEmail({ ...outreach, notes: 'First line\nSecond line' }).errors, []);
});

test('filters validate pagination and real inclusive date boundaries', () => {
  assert.deepEqual(parseEmailFilters(new URLSearchParams()).value, { page: 1, limit: 50 });
  const parsed = parseEmailFilters(new URLSearchParams({ page: '2', limit: '100', from: '2026-10-01', to: '2026-10-31', search: ' Alex ' }));
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.value, { page: 2, limit: 100, from: '2026-10-01', to: '2026-10-31', search: 'Alex' });
  for (const filters of [{ page: '0' }, { limit: '101' }, { page: '1.2' }, { from: '2026-02-30' }, { from: '2026-10-20', to: '2026-10-19' }, { search: 'a'.repeat(201) }]) {
    assert.ok(parseEmailFilters(new URLSearchParams(filters)).errors.length);
  }
});

test('record identifiers reject filters and malformed UUIDs', () => {
  assert.equal(isEmailId('223e4567-e89b-42d3-a456-426614174000'), true);
  for (const id of ['', null, 'not-a-uuid', '223e4567-e89b-42d3-a456-426614174000,other']) assert.equal(isEmailId(id), false);
});
