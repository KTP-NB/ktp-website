import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobBoardDevAdminEnabled, profileCanManageJobBoard, profileCanUseJobBoard } from '../adminAccess.js';
import { analyticsSummary } from '../events.js';
import { JOB_BOARD_NAV_LINKS } from '../navigation.js';

test('job board access follows website roles and scoped admin permission', () => {
  assert.equal(profileCanUseJobBoard({ access_role: 'pledge', permissions: ['applications.use'] }), true);
  assert.equal(profileCanUseJobBoard({ access_role: 'member', permissions: [] }), false);
  assert.equal(profileCanUseJobBoard(null), false);
  assert.equal(profileCanManageJobBoard({ access_role: 'super_admin' }), true);
  assert.equal(profileCanManageJobBoard({ access_role: 'manager', manager_permissions: ['applications.manage'] }), true);
  assert.equal(profileCanManageJobBoard({ access_role: 'manager', manager_permissions: [] }), false);
  assert.equal(profileCanManageJobBoard({ access_role: 'pledge' }), false);
});

test('job board dev admin access is opt-in and disabled in production', () => {
  assert.equal(jobBoardDevAdminEnabled({ NODE_ENV: 'development', JOB_BOARD_DEV_ADMIN_ENABLED: 'true' }), true);
  assert.equal(jobBoardDevAdminEnabled({ NODE_ENV: 'development', NEXT_PUBLIC_JOB_BOARD_DEV_ADMIN_ENABLED: 'true' }), true);
  assert.equal(jobBoardDevAdminEnabled({ NODE_ENV: 'production', JOB_BOARD_DEV_ADMIN_ENABLED: 'true' }), false);
  assert.equal(jobBoardDevAdminEnabled({ NODE_ENV: 'development' }), false);
});

test('analytics summary counts event types', async () => {
  const service = {
    from() {
      return {
        select() {
          return this;
        },
        gte() {
          return {
            data: [
              { event_type: 'job_saved' },
              { event_type: 'job_saved' },
              { event_type: 'ats_analysis_run' },
            ],
            error: null,
          };
        },
      };
    },
  };

  const summary = await analyticsSummary(service);
  assert.equal(summary.total, 3);
  assert.equal(summary.counts.job_saved, 2);
  assert.equal(summary.counts.ats_analysis_run, 1);
});

test('job board navigation exposes notifications as a top-level page', () => {
  assert.ok(JOB_BOARD_NAV_LINKS.some((link) => link.href === '/job-board/notifications' && link.label === 'Notifications'));
  assert.ok(JOB_BOARD_NAV_LINKS.some((link) => link.href === '/job-board/settings' && link.label === 'Settings'));
  assert.ok(!JOB_BOARD_NAV_LINKS.some((link) => link.href === '/job-board/ats'));
  assert.ok(!JOB_BOARD_NAV_LINKS.some((link) => link.href === '/job-board/recommendations'));
});
