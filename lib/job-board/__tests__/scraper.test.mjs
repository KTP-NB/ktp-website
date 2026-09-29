import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeJobs } from '../scraper/dedupe.js';
import { normalizeJob } from '../scraper/normalize.js';
import { validateJobs } from '../scraper/validate.js';

const rawJob = {
  id: 'northstar-software-engineer-intern-2027',
  company: 'Northstar Labs',
  title: 'Software Engineer Intern',
  department: 'Engineering',
  location: 'New York, NY',
  workplaceType: 'hybrid',
  employmentType: 'internship',
  summary: 'Build full-stack product features.',
  responsibilities: ['Ship React features.'],
  qualifications: ['Experience with JavaScript.'],
  postedAt: '2026-07-17T12:00:00.000Z',
};

test('normalizes raw jobs into database-ready shape', () => {
  const job = normalizeJob(rawJob, 'fixture-source');
  assert.equal(job.externalId, rawJob.id);
  assert.equal(job.source, 'fixture-source');
  assert.equal(job.workplaceType, 'hybrid');
  assert.equal(job.employmentType, 'internship');
  assert.equal(job.careerCategory, 'software_engineering');
  assert.ok(job.normalizedFingerprint.includes('northstar-labs'));
  assert.ok(job.normalizedKeywords.includes('software'));
});

test('validates normalized jobs and reports invalid rows', () => {
  const valid = normalizeJob(rawJob, 'fixture-source');
  const invalid = normalizeJob({ ...rawJob, id: '', title: '' }, 'fixture-source');
  const result = validateJobs([valid, invalid]);
  assert.equal(result.validJobs.length, 1);
  assert.equal(result.invalidJobs.length, 1);
  assert.equal(result.invalidJobs[0].errors.title, 'Job title is required.');
});

test('deduplicates jobs by source and external id', () => {
  const job = normalizeJob(rawJob, 'fixture-source');
  const result = dedupeJobs([job, { ...job }]);
  assert.equal(result.dedupedJobs.length, 1);
  assert.equal(result.duplicates.length, 1);
});
