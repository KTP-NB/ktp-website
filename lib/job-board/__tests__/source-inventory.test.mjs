import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finalizeSourceInventory, inventoryIds } from '../ingestion/sourceInventory.js';

test('inventory IDs include unique valid open source records only', () => {
  assert.deepEqual(inventoryIds([
    { sourceExternalId: 'job-1', status: 'open', rejected: false },
    { sourceExternalId: 'job-1', status: 'open', rejected: false },
    { sourceExternalId: 'job-2', status: 'closed', rejected: false },
    { sourceExternalId: 'job-3', status: 'open', rejected: true },
    { sourceExternalId: '', status: 'open', rejected: false },
  ]), ['job-1']);
});

test('finalizes a changed source inventory with a stale grace period', async () => {
  const calls = [];
  const service = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: { refreshed_count: 12, archived_count: 3 }, error: null };
    },
  };

  const result = await finalizeSourceInventory(service, 'source-1', [
    { sourceExternalId: 'job-1', status: 'open', rejected: false },
  ], {
    cycleStartedAt: '2026-09-16T12:00:00.000Z',
    staleAfterDays: 5,
  });

  assert.deepEqual(result, { refreshed: 12, archived: 3 });
  assert.equal(calls[0].name, 'job_board_finalize_source_inventory');
  assert.deepEqual(calls[0].args.p_seen_external_ids, ['job-1']);
  assert.equal(calls[0].args.p_stale_after_days, 5);
  assert.equal(calls[0].args.p_inventory_unchanged, false);
});

test('marks an unchanged inventory without sending individual IDs', async () => {
  let args;
  const service = {
    async rpc(_name, input) {
      args = input;
      return { data: { refreshed_count: 20, archived_count: 0 }, error: null };
    },
  };

  const result = await finalizeSourceInventory(service, 'source-1', [], {
    inventoryUnchanged: true,
  });

  assert.equal(result.refreshed, 20);
  assert.deepEqual(args.p_seen_external_ids, []);
  assert.equal(args.p_inventory_unchanged, true);
});
