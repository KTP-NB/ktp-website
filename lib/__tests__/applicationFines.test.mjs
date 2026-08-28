import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applicationFineCandidates,
  effectiveApplicationTarget,
  previousMonthInTimeZone,
} from '../applicationFines.mjs';

const activeDefault = { id: '1', user_id: 'u1', member_status: 'Active', uses_default_application_target: true, default_application_target: 40 };

test('active zero-target members are complete but still have an applicable requirement', () => {
  assert.equal(effectiveApplicationTarget(activeDefault, 0, 40), 0);
  assert.deepEqual(applicationFineCandidates({
    members: [activeDefault], countsByUser: new Map(), overridesByUser: new Map([['u1', 0]]), chapterDefault: 40,
  }), []);
});

test('persistent custom-baseline members are never fine candidates', () => {
  const member = { ...activeDefault, uses_default_application_target: false, default_application_target: 10 };
  assert.deepEqual(applicationFineCandidates({
    members: [member], countsByUser: new Map(), overridesByUser: new Map(), chapterDefault: 40,
  }), []);
});

test('monthly override changes the target without exempting a chapter-default member', () => {
  const candidates = applicationFineCandidates({
    members: [activeDefault], countsByUser: new Map([['u1', 9]]), overridesByUser: new Map([['u1', 10]]), chapterDefault: 40,
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].target, 10);
});

test('scheduler selects the prior month only on the first New York calendar day', () => {
  assert.equal(previousMonthInTimeZone(new Date('2026-09-01T06:00:00Z')), '2026-08');
  assert.equal(previousMonthInTimeZone(new Date('2026-09-02T06:00:00Z')), null);
});
