import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildJobsQueryString } from '../browserQuery.js';
import { applyEmploymentTypeFilter, NEW_GRAD_FULL_TIME_FILTER } from '../employmentFilter.js';
import { inferDisplayEmploymentType } from '../models.js';

test('all job controls are serialized into the search request', () => {
  const params = new URLSearchParams(buildJobsQueryString({
    page: 2,
    perPage: 20,
    savedOnly: true,
    category: 'software_engineering',
    employmentType: 'internship',
    h1bStatus: 'h1b_friendly',
    workplaceType: 'remote',
    company: 'Acme & Co',
    postedToday: true,
  }));
  assert.deepEqual(Object.fromEntries(params), {
    page: '2',
    perPage: '20',
    saved: 'true',
    category: 'software_engineering',
    employmentType: 'internship',
    h1bStatus: 'h1b_friendly',
    workplaceType: 'remote',
    company: 'Acme & Co',
    postedToday: 'true',
  });
});

test('cleared controls are omitted from the search request', () => {
  const params = new URLSearchParams(buildJobsQueryString({ page: 1, perPage: 10 }));
  assert.deepEqual(Object.fromEntries(params), { page: '1', perPage: '10' });
});

test('role filters include title-derived co-ops and exclude them from internships', () => {
  const calls = [];
  const query = {
    or(value) { calls.push(['or', value]); return this; },
    eq(...args) { calls.push(['eq', ...args]); return this; },
    not(...args) { calls.push(['not', ...args]); return this; },
  };
  applyEmploymentTypeFilter(query, 'co_op');
  assert.deepEqual(calls, [['or', 'employment_type.eq.co_op,title.ilike.%co-op%,title.ilike.%coop%']]);

  calls.length = 0;
  applyEmploymentTypeFilter(query, 'internship');
  assert.deepEqual(calls, [
    ['eq', 'employment_type', 'internship'],
    ['not', 'title', 'ilike', '%co-op%'],
    ['not', 'title', 'ilike', '%coop%'],
    ['not', 'title', 'ilike', '%apprentice%'],
    ['not', 'title', 'ilike', '%apprenticeship%'],
  ]);
});

test('plural co-op titles use the same role type as the filter', () => {
  assert.equal(inferDisplayEmploymentType({ title: 'Engineering Co-ops', employment_type: 'internship' }), 'co_op');
  assert.equal(inferDisplayEmploymentType({ title: 'Engineering Coops', employment_type: 'internship' }), 'co_op');
});

test('combined New Grad and Full-Time filter searches both stored types', () => {
  const calls = [];
  const query = { in(...args) { calls.push(args); return this; } };
  applyEmploymentTypeFilter(query, NEW_GRAD_FULL_TIME_FILTER);
  assert.deepEqual(calls, [['employment_type', ['new_grad', 'full_time']]]);
});
