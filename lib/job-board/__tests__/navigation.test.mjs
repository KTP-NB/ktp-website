import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isJobBoardNavActive, isJobBoardRoute, JOB_BOARD_NAV_LINKS } from '../navigation.js';

test('application tracker lives in Job Board navigation', () => {
  assert.ok(JOB_BOARD_NAV_LINKS.some((link) => link.href === '/job-board/applications' && link.label === 'Applications'));
  assert.equal(JOB_BOARD_NAV_LINKS.some((link) => link.href === '/applications'), false);
});

test('Applications receives the selected state on its route', () => {
  assert.equal(isJobBoardNavActive('/job-board/applications', '/job-board/applications'), true);
  assert.equal(isJobBoardNavActive('/job-board/applications/', '/job-board/applications'), true);
  assert.equal(isJobBoardNavActive('/job-board/applications', '/job-board'), false);
});

test('global Job Board navigation stays selected on nested Job Board pages', () => {
  assert.equal(isJobBoardRoute('/job-board'), true);
  assert.equal(isJobBoardRoute('/job-board/applications'), true);
  assert.equal(isJobBoardRoute('/job-boardish'), false);
  assert.equal(isJobBoardRoute('/profile'), false);
});
