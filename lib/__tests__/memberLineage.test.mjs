import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLineage, eligibleBigs, withFallbackLineage } from '../memberLineage.mjs';
import { directoryProfilesToMembers, greekLetters } from '../../app/members/memberProfileMapper.js';

const member = (id, big_member_id = null, extra = {}) => ({ id, name: id, big_member_id, status: 'Active', lineage_registered: true, ...extra });
const names = (node) => [node.name, ...node.children.flatMap(names)];

test('a saved Big places a member and their Littles in the selected family', () => {
  const tree = buildLineage([member('root'), member('big', 'root'), member('little', 'big'), member('grandlittle', 'little')]);
  assert.equal(tree.length, 1);
  assert.deepEqual(names(tree[0]), ['root', 'big', 'little', 'grandlittle']);
  assert.equal(tree[0].children[0].children[0].name, 'little');
});

test('inactive or hidden Bigs are skipped across multiple generations without losing branches', () => {
  const tree = buildLineage([
    member('root', null, { status: 'Alumni' }),
    member('big', 'root', { status: 'Inactive' }),
    member('middle', 'big', { public_directory_visible: false }),
    member('little', 'middle'), member('sibling', 'big'), member('grandlittle', 'little'),
  ]);
  assert.equal(tree.length, 1);
  assert.deepEqual(tree[0].children.map((node) => node.name), ['little', 'sibling']);
  assert.deepEqual(names(tree[0]), ['root', 'little', 'grandlittle', 'sibling']);
});

test('deactivating a root promotes Littles into separate families and reactivation restores the family', () => {
  const members = [member('root', null, { status: 'Inactive' }), member('little', 'root'), member('sibling', 'root'), member('grandlittle', 'little')];
  assert.deepEqual(buildLineage(members).map(names), [['little', 'grandlittle'], ['sibling']]);
  members[0].status = 'Active';
  assert.deepEqual(buildLineage(members).map(names), [['root', 'little', 'grandlittle', 'sibling']]);
});

test('changing and clearing a saved Big never reapplies the original family', () => {
  const members = [member('manan', null, { name: 'Manan Shah' }), member('other'), member('anant', 'other', { name: 'Anant Gupta' })];
  assert.equal(buildLineage(members)[1].children[0].name, 'Anant Gupta');
  members[2].big_member_id = null;
  assert.equal(buildLineage(members).length, 3);
});

test('Big choices exclude self, all descendants, inactive members, hidden members, and corrupt cycles', () => {
  const members = [member('root'), member('self', 'root'), member('little', 'self'), member('grandlittle', 'little'), member('other'), member('inactive', null, { status: 'Inactive' }), member('hidden', null, { public_directory_visible: false }), member('cycle-a', 'cycle-b'), member('cycle-b', 'cycle-a')];
  assert.deepEqual(eligibleBigs(members, 'self').map((m) => m.id), ['other', 'root']);
});

test('broken references and corrupt cycles render each visible member once without recursive loops', () => {
  const members = [member('a', 'b'), member('b', 'a'), member('self', 'self'), member('missing', 'deleted')];
  const rendered = buildLineage(members).flatMap(names);
  assert.equal(rendered.length, members.length);
  assert.equal(new Set(rendered).size, members.length);
});

test('offline fallback keeps existing families and promotes past missing ancestors', () => {
  const fallback = withFallbackLineage([
    { name: 'Manan Shah' }, { name: 'Anant Gupta' },
    { name: 'Aishwarya Velagapudi' }, { name: 'Gokulraj Kumarassamy' },
  ]);
  const families = buildLineage(fallback);
  assert.equal(families[0].children[0].name, 'Anant Gupta');
  assert.equal(families[1].children[0].name, 'Gokulraj Kumarassamy');
});

test('namesakes stay separate because live lineage uses profile IDs', () => {
  const tree = buildLineage([member('root'), member('one', 'root', { name: 'Same Name' }), member('two', null, { name: 'Same Name' })]);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].children[0].id, 'one');
  assert.equal(tree[1].id, 'two');
});

test('transfer students start their own family and retain their Littles even with a stale Big', () => {
  const members = [member('root'), member('transfer', 'root', { class: 'Transfer' }), member('little', 'transfer')];
  assert.deepEqual(buildLineage(members).map(names), [['root'], ['transfer', 'little']]);
  assert.ok(eligibleBigs(members, 'little').some((m) => m.id === 'transfer'), 'transfer students can be selected as Bigs');
});

test('offline transfer students do not inherit a seeded Big', () => {
  const members = withFallbackLineage([{ name: 'Manan Shah' }, { name: 'Anant Gupta', class: 'Transfer' }]);
  assert.equal(members[1].big_member_id, null);
  assert.equal(buildLineage(members).length, 2);
});

test('older directory schemas keep live-only members visible and preserve database IDs', () => {
  const members = directoryProfilesToMembers([
    { id: 'manan', name: 'Manan Shah', member_status: 'Alumni' },
    { id: 'anant', name: 'Anant Gupta', member_status: 'Active' },
    { id: 'anish', name: 'Anish Kothapalli', member_status: 'Active', pledge_class: 'Transfer' },
  ]);
  assert.equal(members.length, 3);
  assert.equal(members[1].id, 'anant');
  assert.equal(members[1].big_member_id, 'manan');
  assert.equal(members[2].status, 'Active');
  assert.equal(members[2].is_transfer_student, true);
  assert.ok(buildLineage(members).some((root) => root.id === 'anish'));
});

test('migrated directory rows keep an explicitly cleared Big', () => {
  const members = directoryProfilesToMembers([
    { id: 'manan', name: 'Manan Shah', big_member_id: null },
    { id: 'anant', name: 'Anant Gupta', big_member_id: null },
  ]);
  assert.equal(members[1].big_member_id, null);
});

test('Transfer pledge class starts a new lineage even before the transfer flag is backfilled', () => {
  const members = [member('root'), member('transfer', 'root', { class: 'Transfer', is_transfer_student: false }), member('little', 'transfer')];
  assert.deepEqual(buildLineage(members).map(names), [['root'], ['transfer', 'little']]);
});

test('a stale transfer flag cannot override a Greek pledge class', () => {
  const members = directoryProfilesToMembers([
    { id: 'root', name: 'Root', pledge_class: 'Alpha', big_member_id: null, lineage_registered: true },
    { id: 'little', name: 'Little', pledge_class: 'Beta', big_member_id: 'root', is_transfer_student: true },
  ]);
  assert.equal(members[1].is_transfer_student, false);
  assert.equal(buildLineage(members)[0].children[0].id, 'little');
});

test('Transfer class has a right-arrow badge while Greek classes keep their symbols', () => {
  assert.equal(greekLetters.Transfer, '→');
  assert.equal(greekLetters.Alpha, 'Α');
  assert.equal(greekLetters.Beta, 'Β');
  assert.equal(greekLetters.Gamma, 'Γ');
});

test('unlinked non-Transfer profiles neither start a lineage nor become eligible Bigs', () => {
  const members = [member('root'), member('pending', null, { lineage_registered: false, class: 'Beta' })];
  assert.deepEqual(buildLineage(members).map(names), [['root']]);
  assert.deepEqual(eligibleBigs(members, 'root'), []);
});

