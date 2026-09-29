import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deliverQueuedDigests, emailConfiguration, formatDigestEmail } from '../emailDelivery.mjs';

const env = {
  JOB_BOARD_EMAIL_SEND_ENABLED: 'true',
  GMAIL_SMTP_USER: 'sender@gmail.com',
  GMAIL_SMTP_APP_PASSWORD: 'test-only',
  JOB_BOARD_SITE_URL: 'https://example.org',
  JOB_BOARD_EMAIL_ALLOWLIST: 'member@example.org',
};

test('email stays off without the explicit send flag', () => {
  assert.equal(emailConfiguration({}), null);
  assert.throws(() => emailConfiguration({ JOB_BOARD_EMAIL_SEND_ENABLED: 'true' }), /without sender/);
});

test('daily email includes new jobs and saved reminders, but not deferred recommendations', () => {
  const body = formatDigestEmail({
    summary: 'New jobs are here.',
    newJobs: [{ id: 'one', title: 'Engineer Intern', company: 'A' }],
    savedToApply: [{ id: 'two', title: 'Analyst Intern', company: 'B' }],
    suggested: [{ id: 'three', title: 'Product Intern', company: 'C' }],
  }, env.JOB_BOARD_SITE_URL);
  assert.match(body, /New jobs:[\s\S]*Engineer Intern/);
  assert.match(body, /Saved jobs to apply to:[\s\S]*Analyst Intern/);
  assert.doesNotMatch(body, /Recommended jobs|Product Intern/);
  assert.doesNotMatch(formatDigestEmail({ summary: '1 recommendation.', suggested: [{ id: 'three', title: 'Product Intern', company: 'C' }] }, env.JOB_BOARD_SITE_URL), /recommendation|Product Intern/i);
  assert.match(body, /https:\/\/example.org\/job-board\/settings/);
});

test('mailer sends to opted-in allowlisted auth email only', async () => {
  const service = memoryService({ emailEnabled: true });
  const messages = [];
  const result = await deliverQueuedDigests(service, {
    env,
    send: async (_config, message) => messages.push(message),
  });
  assert.equal(result.sent, 1);
  assert.equal(messages[0].to, 'member@example.org');
  assert.equal(service.deliveries[0].status, 'sent');
  assert.equal(service.queue.status, 'sent');
});

test('mailer skips a member who opted out before sending', async () => {
  const service = memoryService({ emailEnabled: false });
  const result = await deliverQueuedDigests(service, { env, send: async () => assert.fail('Must not send') });
  assert.equal(result.sent, 0);
  assert.equal(service.queue.status, 'skipped');
});

test('mailer does not send outside the beta allowlist', async () => {
  const service = memoryService({ emailEnabled: true, email: 'other@example.org' });
  await deliverQueuedDigests(service, { env, send: async () => assert.fail('Must not send') });
  assert.equal(service.queue.status, 'skipped');
});

test('mailer records failures and keeps the queue retryable', async () => {
  const service = memoryService({ emailEnabled: true });
  await deliverQueuedDigests(service, { env, send: async () => { throw new Error('SMTP unavailable'); } });
  assert.equal(service.queue.status, 'failed');
  assert.equal(service.deliveries[0].status, 'failed');
  assert.match(service.queue.last_error, /SMTP unavailable/);
});

function memoryService({ emailEnabled, email = 'member@example.org' }) {
  const queue = { id: 'queue-1', user_id: 'member-1', subject: 'Daily update', payload: { summary: 'New job' }, attempts: 1, scheduled_at: '2026-09-27T00:00:00.000Z' };
  const deliveries = [];
  return {
    queue,
    deliveries,
    auth: { admin: { getUserById: async () => ({ data: { user: { email } }, error: null }) } },
    rpc: async () => ({ data: [queue], error: null }),
    from(table) {
      if (table === 'job_board_notification_preferences') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email_enabled: emailEnabled }, error: null }) }) }) };
      }
      if (table === 'job_board_notification_queue') {
        return { update: (payload) => ({ eq: async () => { Object.assign(queue, payload); return { error: null }; } }) };
      }
      if (table === 'job_board_notification_deliveries') {
        return { insert: async (payload) => { deliveries.push(payload); return { error: null }; } };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}
