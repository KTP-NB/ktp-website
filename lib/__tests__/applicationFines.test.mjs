import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applicationFineAmount,
  applicationFineCandidates,
  applicationViolationLabel,
  effectiveApplicationTarget,
  isApplicationFineEligible,
  potentialApplicationFineAmount,
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

test('fine eligibility matches the monthly processor rules', () => {
  assert.equal(isApplicationFineEligible({ member: activeDefault, target: 40, submitted: 39 }), true);
  assert.equal(isApplicationFineEligible({ member: activeDefault, target: 40, submitted: 40 }), false);
  assert.equal(isApplicationFineEligible({ member: activeDefault, target: 0, submitted: 0 }), false);
  assert.equal(isApplicationFineEligible({
    member: { ...activeDefault, uses_default_application_target: false },
    target: 150,
    submitted: 0,
  }), false);
  assert.equal(isApplicationFineEligible({
    member: { ...activeDefault, member_status: 'Inactive' },
    target: 40,
    submitted: 0,
  }), false);
});

test('scheduler selects the prior month only on the first New York calendar day', () => {
  assert.equal(previousMonthInTimeZone(new Date('2026-09-01T06:00:00Z')), '2026-08');
  assert.equal(previousMonthInTimeZone(new Date('2026-09-02T06:00:00Z')), null);
});

test('application fines escalate by $5 and cap at $20', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 20].map(applicationFineAmount), [5, 10, 15, 20, 20, 20]);
});

test('potential fine is zero unless the member would actually be fined', () => {
  assert.equal(potentialApplicationFineAmount({
    member: activeDefault,
    target: 40,
    submitted: 12,
    previousViolations: 2,
  }), 15);
  assert.equal(potentialApplicationFineAmount({
    member: activeDefault,
    target: 40,
    submitted: 40,
    previousViolations: 2,
  }), 0);
  assert.equal(potentialApplicationFineAmount({
    member: { ...activeDefault, uses_default_application_target: false },
    target: 150,
    submitted: 12,
    previousViolations: 2,
  }), 0);
});

test('application violation labels remain readable beyond the cap', () => {
  assert.equal(applicationViolationLabel(1), '1st violation');
  assert.equal(applicationViolationLabel(2), '2nd violation');
  assert.equal(applicationViolationLabel(3), '3rd violation');
  assert.equal(applicationViolationLabel(4), '4th violation');
  assert.equal(applicationViolationLabel(11), '11th violation');
  assert.equal(applicationViolationLabel(22), '22nd violation');
});
