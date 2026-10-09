import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchTrackedApplicationsToJobs, refreshRecommendationsForUser } from '../recommendations.js';

test('matches website tracker applications to a unique Job Board URL', () => {
  const jobs = [{ id: 'a', company: 'Acme', title: 'Engineer', apply_url: 'https://jobs.example.com/123' }];
  const apps = [{ company: 'Acme', position: 'Engineer', application_url: 'https://jobs.example.com/123?utm_source=ktp' }];
  assert.deepEqual(matchTrackedApplicationsToJobs(jobs, apps).map((job) => job.id), ['a']);
});

test('does not guess between two jobs with the same title and company', () => {
  const jobs = [
    { id: 'a', company: 'Acme', title: 'Engineer', apply_url: 'https://jobs.example.com/123' },
    { id: 'b', company: 'Acme', title: 'Engineer', apply_url: 'https://jobs.example.com/456' },
  ];
  const apps = [{ company: 'Acme', position: 'Engineer', application_url: null }];
  assert.deepEqual(matchTrackedApplicationsToJobs(jobs, apps), []);
});

test('recommendations do not depend on unfinished ATS analyses', async () => {
  const tables = [];
  const service = {
    from(table) {
      tables.push(table);
      return {
        select() { return this; },
        eq() { return Promise.resolve({ data: [], error: null }); },
      };
    },
  };

  assert.deepEqual(await refreshRecommendationsForUser(service, 'member-1'), { refreshed: 0 });
  assert.deepEqual(tables, ['job_board_jobs', 'job_board_saved_jobs', 'internship_applications']);
});
