import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  internalSecretMatches,
  readBearerToken,
  summarizeIngestionForResponse,
} from '../ingestion/edgeRequest.js';

test('reads bearer tokens and compares configured internal secrets', () => {
  assert.equal(readBearerToken('Bearer member-token'), 'member-token');
  assert.equal(readBearerToken('Basic member-token'), '');
  assert.equal(internalSecretMatches('cron-secret', 'cron-secret'), true);
  assert.equal(internalSecretMatches('cron-secret', 'wrong-secret'), false);
  assert.equal(internalSecretMatches('', ''), false);
});

test('returns ingestion metrics without run errors or source payloads', () => {
  const result = summarizeIngestionForResponse({
    cycleStartedAt: '2026-09-16T12:00:00.000Z',
    sources: 2,
    inserted: 5,
    failed: 1,
    runs: [{ error: 'secret diagnostic', raw: { token: 'never-return' } }],
  });

  assert.equal(result.sources, 2);
  assert.equal(result.inserted, 5);
  assert.equal(result.failed, 1);
  assert.equal('runs' in result, false);
  assert.equal(JSON.stringify(result).includes('never-return'), false);
});
