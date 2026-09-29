import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archiveJobPostings, formatAdminJobBoardSummary } from '../adminJobs.js';

test('admin summary exposes the source failure reason', () => {
  assert.equal(formatAdminJobBoardSummary({
    inserted: 0,
    updated: 0,
    failed: 1,
    runs: [{ status: 'failed', error: 'unsupported Unicode escape sequence' }],
  }), '0 inserted, 0 updated, 1 failed. unsupported Unicode escape sequence');
});

test('admin summary reports a partial source inventory without marking the run failed', () => {
  assert.equal(formatAdminJobBoardSummary({
    inserted: 1,
    updated: 0,
    failed: 0,
    partialInventories: 1,
  }), '1 inserted, 0 updated, 0 failed. Incomplete source snapshot; older jobs were kept open.');
});

test('archives current job postings without deleting rows', async () => {
  const service = createMemoryService([
    { id: 'job-1', status: 'open' },
    { id: 'job-2', status: 'closed' },
    { id: 'job-3', status: 'archived', inactive_at: '2026-08-01T00:00:00.000Z' },
  ]);

  const result = await archiveJobPostings(service, {
    now: '2026-08-19T12:00:00.000Z',
  });

  assert.equal(result.archivedJobs, 2);
  assert.equal(service.rows.length, 3);
  assert.equal(service.rows[0].status, 'archived');
  assert.equal(service.rows[1].status, 'archived');
  assert.equal(service.rows[2].inactive_at, '2026-08-01T00:00:00.000Z');
});

function createMemoryService(rows) {
  return {
    rows,
    from(table) {
      assert.equal(table, 'job_board_jobs');
      const state = { operation: 'select', payload: null, filters: [] };
      const query = {
        select() {
          state.operation = 'select';
          return query;
        },
        update(payload) {
          state.operation = 'update';
          state.payload = payload;
          return query;
        },
        neq(column, value) {
          state.filters.push({ column, value });
          return query;
        },
        then(resolve) {
          const matches = rows.filter((row) => state.filters.every((filter) => row[filter.column] !== filter.value));
          if (state.operation === 'update') {
            matches.forEach((row) => Object.assign(row, state.payload));
            return Promise.resolve(resolve({ error: null }));
          }
          return Promise.resolve(resolve({ count: matches.length, error: null }));
        },
      };
      return query;
    },
  };
}
