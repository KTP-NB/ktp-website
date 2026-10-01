import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDigestNotifications, notifyRecommendations } from '../notifications.js';

test('in-app digest generates once per weekly period without fake email logs', async () => {
  const service = memoryService({
    member_profiles: [{ user_id: 'member-1' }],
    job_board_notification_preferences: [{ user_id: 'member-1', in_app_enabled: true, digest_frequency: 'weekly' }],
    job_board_jobs: [{ id: 'job-1', company: 'Example', title: 'Intern', created_at: '2026-09-26T12:00:00+00:00', status: 'open', apply_url: 'https://example.com/apply' }],
  });

  const first = await generateDigestNotifications(service, { now: '2026-09-27T12:00:00.000Z' });
  const second = await generateDigestNotifications(service, { now: '2026-09-27T13:00:00.000Z' });

  assert.equal(first.generated, 1);
  assert.equal(second.generated, 0);
  assert.equal(service.tables.job_board_notifications.length, 1);
  assert.equal(service.tables.job_board_notifications[0].metadata.digest_period, 'weekly:2026-09-21');
  assert.deepEqual(service.tables.job_board_notifications[0].metadata.new_job_ids, ['job-1']);
  assert.equal(service.tables.job_board_notification_logs.length, 0);
});

test('refreshing recommendations twice does not duplicate an in-app notification', async () => {
  const service = memoryService({
    job_board_notification_preferences: [{ user_id: 'member-1', in_app_enabled: true }],
    job_board_recommendations: [{
      id: 'recommendation-1',
      user_id: 'member-1',
      job_id: 'job-1',
      status: 'active',
      score: 82,
      explanation: 'Matches your interests',
      job_board_jobs: { title: 'Software Intern', company: 'Example' },
    }],
  });

  assert.equal((await notifyRecommendations(service, 'member-1')).generated, 1);
  assert.equal((await notifyRecommendations(service, 'member-1')).generated, 0);
  assert.equal(service.tables.job_board_notifications.length, 1);
});

test('opted-in member gets one email queued even when in-app notices are off', async () => {
  const service = memoryService({
    member_profiles: [{ user_id: 'member-1' }],
    job_board_notification_preferences: [{ user_id: 'member-1', in_app_enabled: false, email_enabled: true, digest_frequency: 'daily' }],
    job_board_jobs: [{ id: 'job-1', company: 'Example', title: 'Intern', created_at: '2026-09-27T12:00:00.000Z', status: 'open' }],
    job_board_recommendations: [{ id: 'rec-1', user_id: 'member-1', job_id: 'job-1', status: 'active', score: 90 }],
  });

  await generateDigestNotifications(service, { now: '2026-09-27T13:00:00.000Z' });
  await generateDigestNotifications(service, { now: '2026-09-27T14:00:00.000Z' });

  assert.equal(service.tables.job_board_notifications.length, 0);
  assert.equal(service.tables.job_board_notification_queue.length, 1);
  assert.equal(service.tables.job_board_notification_queue[0].period_key, 'daily:2026-09-27');
  assert.ok(!('suggested' in service.tables.job_board_notification_queue[0].payload));
});

test('recommendations alone do not generate a digest', async () => {
  const service = memoryService({
    member_profiles: [{ user_id: 'member-1' }],
    job_board_notification_preferences: [{ user_id: 'member-1', in_app_enabled: true, digest_frequency: 'daily' }],
    job_board_recommendations: [{ id: 'rec-1', user_id: 'member-1', job_id: 'job-1', status: 'active', score: 90 }],
  });
  const result = await generateDigestNotifications(service, { now: '2026-09-27T13:00:00.000Z' });
  assert.equal(result.generated, 0);
});

function memoryService(initialTables) {
  const tables = {
    member_profiles: [],
    job_board_notification_preferences: [],
    job_board_jobs: [],
    job_board_saved_jobs: [],
    job_board_recommendations: [],
    internship_applications: [],
    job_board_applications: [],
    job_board_notifications: [],
    job_board_notification_logs: [],
    job_board_notification_queue: [],
    ...initialTables,
  };

  return {
    tables,
    from(table) {
      const filters = [];
      let operation = 'select';
      let payload;
      let order;
      let limit;
      const query = {
        select() { return query; },
        eq(column, value) { filters.push((row) => row[column] === value); return query; },
        in(column, values) { filters.push((row) => values.includes(row[column])); return query; },
        not(column, _operator, value) { filters.push((row) => row[column] !== value); return query; },
        gte(column, value) { filters.push((row) => row[column] >= value); return query; },
        contains(column, value) { filters.push((row) => Object.entries(value).every(([key, expected]) => row[column]?.[key] === expected)); return query; },
        order(column, options = {}) { order = { column, ascending: options.ascending !== false }; return query; },
        limit(value) { limit = value; return query; },
        insert(value) { operation = 'insert'; payload = value; return query; },
        upsert(value) { operation = 'upsert'; payload = value; return query; },
        maybeSingle() { return execute().then((result) => ({ ...result, data: result.data[0] || null })); },
        single() { return execute().then((result) => ({ ...result, data: result.data[0] || null })); },
        then(resolve) { return execute().then(resolve); },
      };
      async function execute() {
        if (operation === 'upsert' && tables[table].some((row) => row.user_id === payload.user_id && row.period_key === payload.period_key)) {
          return { data: null, error: null };
        }
        if (operation === 'insert' || operation === 'upsert') {
          const row = { id: `${table}-${tables[table].length + 1}`, ...payload };
          tables[table].push(row);
          return { data: [row], error: null };
        }
        let rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
        if (order) rows = rows.sort((a, b) => order.ascending
          ? String(a[order.column]).localeCompare(String(b[order.column]))
          : String(b[order.column]).localeCompare(String(a[order.column])));
        return { data: limit ? rows.slice(0, limit) : rows, error: null };
      }
      return query;
    },
  };
}
