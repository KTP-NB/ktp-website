import assert from 'node:assert/strict';
import test from 'node:test';
import { emailDraft, emailFormPayload } from '../form.mjs';
import { cleanRecruiterEmail } from '../validation.mjs';

const imported = {
  recipients: [{ email: 'alex@example.com', name: 'Alex' }, { email: 'sam@example.com', name: 'Sam' }],
  sent_at: '2026-10-20T18:30:00.123-04:00',
  company: 'Acme', notes: 'Original',
  provider: 'gmail', mailbox_id: 'sender@example.com', message_id: 'message-1', thread_id: 'thread-1',
  id: 'record-id', user_id: 'owner', entry_source: 'email', deleted_at: null,
};

function inTimezone(timezone, run) {
  const previous = process.env.TZ;
  process.env.TZ = timezone;
  try { run(); } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

test('the form displays local wall-clock time in UTC and New York', () => {
  inTimezone('UTC', () => assert.equal(emailDraft(imported).sent_at, '2026-10-20T22:30:00'));
  inTimezone('America/New_York', () => assert.equal(emailDraft(imported).sent_at, '2026-10-20T18:30:00'));
});

test('editing notes preserves imported timestamp precision and recipient names', () => {
  inTimezone('America/New_York', () => {
    const draft = { ...emailDraft(imported), notes: 'Changed notes', recipients: ' ALEX@example.com; new@example.com\nsam@example.com ' };
    const payload = emailFormPayload(draft, imported);
    assert.equal(payload.sent_at, imported.sent_at);
    assert.equal(payload.notes, 'Changed notes');
    assert.deepEqual(payload.recipients, [{ email: 'ALEX@example.com', name: 'Alex' }, { email: 'new@example.com', name: null }, { email: 'sam@example.com', name: 'Sam' }]);
    assert.deepEqual(cleanRecruiterEmail(payload, { partial: true }).errors, []);
  });
});

test('unchanged edits preserve both occurrences of a repeated DST hour', () => {
  inTimezone('America/New_York', () => {
    for (const sent_at of ['2026-11-01T01:30:00.123-04:00', '2026-11-01T01:30:00.456-05:00']) {
      const original = { ...imported, sent_at };
      const draft = emailDraft(original);
      assert.equal(draft.sent_at, '2026-11-01T01:30:00');
      assert.equal(emailFormPayload({ ...draft, notes: 'Edit' }, original).sent_at, sent_at);
    }
  });
});

test('changed dates and manual entries convert local time to the original instant', () => {
  inTimezone('America/New_York', () => {
    const draft = { ...emailDraft(imported), sent_at: '2026-10-21T10:15:30' };
    assert.equal(emailFormPayload(draft, imported).sent_at, '2026-10-21T14:15:30.000Z');
    assert.equal(emailFormPayload(draft).sent_at, '2026-10-21T14:15:30.000Z');
    assert.throws(() => emailFormPayload({ ...draft, sent_at: '' }), RangeError);
  });
});

test('form payloads contain editable metadata without ownership or immutable source IDs', () => {
  const payload = emailFormPayload(emailDraft(imported), imported);
  assert.deepEqual(Object.keys(payload).sort(), ['recipients', 'company', 'position', 'subject', 'sent_at', 'notes', 'source_url'].sort());
  for (const field of ['provider', 'mailbox_id', 'message_id', 'thread_id', 'id', 'user_id', 'entry_source', 'deleted_at']) assert.equal(field in payload, false, field);
});
