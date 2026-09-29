import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanJobTitle, inferDisplayEmploymentType, normalizeDisplayCareerCategory, toJobSummary } from '../models.js';

test('cleans linked markdown titles for display', () => {
  const title = String.raw`[**[Software Engineer\]\(https://jobright.ai/jobs/info/abc?utm\_source=1103)**](https://jobright.ai/jobs/info/abc?utm_source=1103)`;
  assert.equal(cleanJobTitle(title), 'Software Engineer');
});

test('job summary cleans titles and infers internship display type from source payload', () => {
  const summary = toJobSummary({
    id: 'job-1',
    external_id: 'external-1',
    title: String.raw`[**[Software Engineer\]\(https://jobright.ai/jobs/info/abc)**](https://jobright.ai/jobs/info/abc)`,
    company: 'Example Co',
    visa_sponsorship_status: 'explicit_h1b_sponsor',
    visa_sponsorship_confidence: 'explicit',
    visa_sponsorship_notes: 'H1B sponsorship is explicitly mentioned.',
    source_payload: {
      latest_github_record: {
        sourceName: 'Jobright Software Engineer Internship',
        repository: 'jobright-ai/2026-Software-Engineer-Internship',
      },
    },
  });

  assert.equal(summary.title, 'Software Engineer');
  assert.equal(summary.employmentType, 'internship');
  assert.equal(summary.visaSponsorshipStatus, 'explicit_h1b_sponsor');
  assert.equal(summary.visaSponsorshipConfidence, 'explicit');
  assert.equal(summary.visaSponsorshipNotes, 'H1B sponsorship is explicitly mentioned.');
});

test('display employment type preserves explicit values when source text does not override them', () => {
  assert.equal(inferDisplayEmploymentType({ employment_type: 'new_grad', title: 'Software Engineer' }), 'new_grad');
});

test('saved job summaries retain archived status for the UI', () => {
  assert.equal(toJobSummary({ id: 'job-1', title: 'Intern', company: 'Example', status: 'archived', saved: true }).status, 'archived');
});

test('display employment type treats internship source metadata as authoritative', () => {
  assert.equal(inferDisplayEmploymentType({
    employment_type: 'new_grad',
    source_payload: {
      latest_github_record: {
        sourceName: 'Jobright Software Engineer Internship',
        repository: 'jobright-ai/2026-Software-Engineer-Internship',
      },
    },
  }), 'internship');
});

test('normalizes legacy category values for display', () => {
  assert.equal(normalizeDisplayCareerCategory('product'), 'product_management');
  assert.equal(normalizeDisplayCareerCategory('business'), 'business_analytics');
  assert.equal(normalizeDisplayCareerCategory('machine_learning'), 'machine_learning_ai');
});
