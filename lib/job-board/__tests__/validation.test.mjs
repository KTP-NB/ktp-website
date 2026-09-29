import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidApplicationStatus,
  isValidJobStatus,
  normalizeSearchTerm,
  normalizeJobSearch,
  validateJobDraft,
} from '../validation.js';

test('normalizes search terms', () => {
  assert.equal(normalizeSearchTerm('  software   engineer  '), 'software engineer');
});

test('normalizes job search without PostgREST filter syntax', () => {
  assert.equal(normalizeJobSearch('  C++ (intern), title.eq.foo  '), 'C++ intern title eq foo');
  assert.ok(normalizeJobSearch('x'.repeat(150)).length <= 100);
});

test('validates known job and application statuses', () => {
  assert.equal(isValidJobStatus('open'), true);
  assert.equal(isValidJobStatus('published'), false);
  assert.equal(isValidApplicationStatus('interviewing'), true);
  assert.equal(isValidApplicationStatus('ghosted'), false);
});

test('validates minimum job draft fields', () => {
  assert.deepEqual(validateJobDraft({ title: '', company: '', location: '' }), {
    valid: false,
    errors: {
      title: 'Job title is required.',
      company: 'Company is required.',
      location: 'Location is required.',
    },
  });

  assert.equal(
    validateJobDraft({
      title: 'Software Engineer Intern',
      company: 'Northstar Labs',
      location: 'New York, NY',
      workplaceType: 'hybrid',
      employmentType: 'internship',
    }).valid,
    true
  );
});
