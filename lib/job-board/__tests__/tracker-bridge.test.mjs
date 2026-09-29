import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isJobBoardJobId, jobBoardApplicationDraft, legacyApplicationDraft } from '../trackerBridge.js';

test('accepts only a job UUID in tracker links', () => {
  assert.equal(isJobBoardJobId('4aa1226f-fcfe-4304-9b0d-c98e05900734'), true);
  assert.equal(isJobBoardJobId('123/../admin'), false);
});

test('migrates applied legacy rows without counting merely tracked jobs', () => {
  const row = {
    id: 'row-1', user_id: 'user-1', status: 'applied', applied_at: '2026-09-01T12:00:00Z',
    job_board_jobs: { company: 'Acme', title: 'Engineer', apply_url: 'https://example.com/apply' },
  };
  assert.deepEqual(legacyApplicationDraft(row), {
    user_id: 'user-1', company: 'Acme', position: 'Engineer', date_applied: '2026-09-01',
    status: 'applied', details: null, application_url: 'https://example.com/apply', external_id: 'job-board:row-1',
  });
  assert.equal(legacyApplicationDraft({ ...row, status: 'tracking' }), null);
  assert.equal(legacyApplicationDraft({ ...row, job_board_jobs: { ...row.job_board_jobs, source: 'mock-careers' } }), null);
});

test('prefills the existing application tracker without recording an application', () => {
  assert.deepEqual(jobBoardApplicationDraft({ company: 'Acme', title: 'Engineer', applyUrl: 'https://example.com/apply' }, '2026-09-26'), {
    company: 'Acme',
    position: 'Engineer',
    date_applied: '2026-09-26',
    status: 'applied',
    details: '',
    application_url: 'https://example.com/apply',
    referral: false,
    referral_contact: '',
  });
});
