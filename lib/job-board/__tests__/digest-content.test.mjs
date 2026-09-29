import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digestPeriod, digestSummary, hasDigestContent, selectDigestContent } from '../digestContent.js';

const now = '2026-09-27T12:00:00.000Z';

function job(id, createdAt = now, status = 'open') {
  return { id, company: `Company ${id}`, title: `Role ${id}`, created_at: createdAt, status };
}

test('digest selects recent open jobs and excludes saved or applied jobs from new postings', () => {
  const content = selectDigestContent({
    now,
    jobs: [job('new'), job('saved'), job('applied'), job('old', '2026-09-20T00:00:00.000Z'), job('closed', now, 'archived')],
    savedJobs: [{ job_id: 'saved' }],
    appliedJobIds: ['applied'],
  });

  assert.deepEqual(content.newJobs.map((item) => item.id), ['new']);
  assert.deepEqual(content.savedToApply.map((item) => item.id), ['saved']);
  assert.equal(hasDigestContent(content), true);
});

test('digest recommendations exclude applied and already included jobs', () => {
  const content = selectDigestContent({
    now,
    jobs: [job('recent'), job('saved', '2026-09-20T00:00:00.000Z'), job('suggested', '2026-09-20T00:00:00.000Z'), job('applied', '2026-09-20T00:00:00.000Z')],
    savedJobs: [{ job_id: 'saved' }],
    recommendations: [
      { job_id: 'recent', status: 'active', score: 95 },
      { job_id: 'saved', status: 'active', score: 90 },
      { job_id: 'applied', status: 'active', score: 85 },
      { job_id: 'suggested', status: 'active', score: 80 },
    ],
    appliedJobIds: ['applied'],
  });

  assert.deepEqual(content.suggested.map((item) => item.id), ['suggested']);
});

test('digest stays empty when there are no eligible jobs', () => {
  assert.equal(hasDigestContent(selectDigestContent({ now, jobs: [job('closed', now, 'archived')] })), false);
});

test('weekly lookback includes older jobs and timestamp offsets compare by instant', () => {
  const jobs = [job('offset', '2026-09-26T08:01:00-04:00'), job('weekly', '2026-09-22T12:00:00.000Z')];
  assert.deepEqual(selectDigestContent({ now, jobs }).newJobs.map((item) => item.id), ['offset']);
  assert.deepEqual(selectDigestContent({ now, jobs, lookbackDays: 7 }).newJobs.map((item) => item.id), ['offset', 'weekly']);
});

test('digest periods and summaries are stable for daily and weekly sends', () => {
  assert.equal(digestPeriod(now, 'daily'), '2026-09-27');
  assert.equal(digestPeriod(now, 'weekly'), '2026-09-21');
  assert.equal(digestPeriod('2026-09-28T12:00:00.000Z', 'weekly'), null);
  assert.equal(digestPeriod(now, 'none'), null);
  assert.equal(digestSummary({ newJobs: [job('a')], savedToApply: [job('b')], suggested: [] }), '1 new job posted. 1 saved job to apply to.');
});
