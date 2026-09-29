import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildJobFilterOptions, loadJobFilterOptions } from '../filterOptions.js';

test('filter options include companies beyond the first database page', async () => {
  const rows = Array.from({ length: 1001 }, (_, index) => ({
    id: String(index),
    company: index === 1000 ? 'Zeta' : 'Acme',
    title: 'Intern',
    career_category: 'software_engineering',
    employment_type: 'internship',
    workplace_type: 'remote',
  }));
  const requested = [];
  const service = {
    from(table) {
      assert.equal(table, 'job_board_jobs');
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        range(from, to) {
          requested.push(from);
          return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
        },
      };
    },
  };
  const options = await loadJobFilterOptions(service);
  assert.deepEqual(requested, [0, 1000]);
  assert.deepEqual(options.companies, ['Acme', 'Zeta']);
});

test('member role options hide Part Time and combine New Grad with Full-Time', () => {
  const options = buildJobFilterOptions([
    { employment_type: 'internship', title: 'Intern' },
    { employment_type: 'new_grad', title: 'Analyst' },
    { employment_type: 'full_time', title: 'Engineer' },
    { employment_type: 'part_time', title: 'Assistant' },
  ]);
  assert.deepEqual(options.employmentTypes, ['internship', 'new_grad_full_time']);
});
