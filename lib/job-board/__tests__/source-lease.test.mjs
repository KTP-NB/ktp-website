import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acquireSourceLease, releaseSourceLease } from '../ingestion/sourceLease.js';

test('acquires and releases a source ingestion lease through atomic database functions', async () => {
  const calls = [];
  const service = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: true, error: null };
    },
  };

  const lease = await acquireSourceLease(service, 'source-1', {
    token: '11111111-1111-4111-8111-111111111111',
    now: '2026-09-14T15:00:00.000Z',
    leaseSeconds: 600,
  });
  const released = await releaseSourceLease(service, 'source-1', lease.token);

  assert.deepEqual(lease, {
    acquired: true,
    token: '11111111-1111-4111-8111-111111111111',
  });
  assert.equal(released, true);
  assert.equal(calls[0].name, 'job_board_acquire_ingestion_lock');
  assert.equal(calls[0].args.p_lease_seconds, 600);
  assert.equal(calls[1].name, 'job_board_release_ingestion_lock');
});

test('reports a busy source without treating it as an ingestion failure', async () => {
  const service = {
    async rpc() {
      return { data: false, error: null };
    },
  };

  const lease = await acquireSourceLease(service, 'source-1', {
    token: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(lease.acquired, false);
});
