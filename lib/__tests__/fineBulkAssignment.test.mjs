import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFineMemberIds } from '../fines.js';

const MEMBER_ONE = '11111111-1111-4111-8111-111111111111';
const MEMBER_TWO = '22222222-2222-4222-8222-222222222222';

test('accepts the legacy single-member fine payload', () => {
  assert.deepEqual(parseFineMemberIds({ member_id: MEMBER_ONE }), { memberIds: [MEMBER_ONE] });
});

test('accepts and deduplicates a bulk member selection', () => {
  assert.deepEqual(
    parseFineMemberIds({ member_ids: [MEMBER_ONE, MEMBER_TWO, MEMBER_ONE] }),
    { memberIds: [MEMBER_ONE, MEMBER_TWO] },
  );
});

test('rejects empty and invalid member selections', () => {
  assert.match(parseFineMemberIds({ member_ids: [] }).error, /at least one member/i);
  assert.match(parseFineMemberIds({ member_ids: ['not-a-uuid'] }).error, /valid members/i);
});
