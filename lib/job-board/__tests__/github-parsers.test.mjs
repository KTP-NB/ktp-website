import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSourceDate } from '../ingestion/dateNormalization.js';
import { parseJobrightRepository } from '../ingestion/github/parsers/jobright.js';
import { parseJobrightH1bRepository } from '../ingestion/github/parsers/jobrightH1b.js';
import { parseSimplifyRepository } from '../ingestion/github/parsers/simplify.js';

test('normalizes exact, today, relative, and year-rollover source dates', () => {
  const cycleStartedAt = '2026-08-09T12:00:00.000Z';
  assert.equal(normalizeSourceDate('Aug 08', { cycleStartedAt }).sourcePostedDate, '2026-08-08T04:00:00.000Z');
  assert.equal(normalizeSourceDate('Today', { cycleStartedAt }).sourcePostedDate, '2026-08-09T04:00:00.000Z');
  assert.equal(normalizeSourceDate('1d', { cycleStartedAt }).sourcePostedDate, '2026-08-08T04:00:00.000Z');

  const rollover = parseJobrightRepository(readFixture('jobright-year-rollover.md'), jobrightSource(), {
    cycleStartedAt: '2026-01-01T12:00:00.000Z',
  })[0];
  assert.equal(rollover.sourcePostedDate, '2025-12-31T05:00:00.000Z');
});

test('parses Jobright rows with source metadata and rejection reasons', () => {
  const records = parseJobrightRepository(readFixture('jobright-data-analysis.md'), jobrightSource(), {
    cycleStartedAt: '2026-08-09T12:00:00.000Z',
  });

  assert.equal(records.length, 4);
  assert.equal(records[0].provider, 'jobright');
  assert.equal(records[0].sourceRepository, 'jobright-ai/2026-Data-Analysis-New-Grad');
  assert.equal(records[0].sourceUrl, 'https://github.com/jobright-ai/2026-Data-Analysis-New-Grad');
  assert.equal(records[0].careerCategory, 'data_analytics');
  assert.equal(records[0].employmentType, 'new_grad');
  assert.equal(records[0].company, 'Acme Analytics');
  assert.equal(records[0].title, 'Data Analyst I');
  assert.equal(records[0].applicationUrl, 'https://careers.example.com/acme/data-analyst');
  assert.deepEqual(records[0].locations, ['New York, NY']);
  assert.equal(records[0].firstSeenAt, '2026-08-09T12:00:00.000Z');
  assert.equal(records[0].isClosed, false);
  assert.equal(records[0].rawSourceRecord.company, '[Acme Analytics](https://careers.example.com/acme/data-analyst)');
  assert.equal(records[0].workplaceType, 'hybrid');
  assert.equal(records[1].workplaceType, 'remote');
  assert.equal(records[2].rejected, true);
  assert.ok(records[2].rejectionReasons.includes('application_url_missing'));
  assert.ok(records[3].rejectionReasons.includes('title_missing'));
});

test('parses Jobright relative, malformed date, multi-location, and closed rows', () => {
  const content = `
Company | Job Title | Location | Work Model | Date Posted
--- | --- | --- | --- | ---
**[Acme](https://jobs.example.com/acme?utm_source=x)** | Analyst | New York, NY; Remote | Hybrid | 2d
**[Datefree](https://jobs.example.com/datefree)** | Analyst | Austin, TX / Remote | Remote | soonish
ClosedCo | Analyst | Boston, MA | On Site | Today
`;
  const records = parseJobrightRepository(content, jobrightSource(), {
    cycleStartedAt: '2026-08-09T12:00:00.000Z',
  });

  assert.equal(records[0].sourcePostedDate, '2026-08-07T04:00:00.000Z');
  assert.deepEqual(records[0].locations, ['New York, NY', 'Remote']);
  assert.equal(records[1].sourcePostedDate, null);
  assert.equal(records[1].firstSeenAt, '2026-08-09T12:00:00.000Z');
  assert.equal(records[1].rejected, false);
  assert.equal(records[2].isClosed, true);
  assert.ok(records[2].rejectionReasons.includes('application_url_missing'));
});

test('Jobright source category remains authoritative with title-based refinement tags', () => {
  const records = parseJobrightRepository(`
Company | Job Title | Location | Work Model | Date Posted
--- | --- | --- | --- | ---
**[Acme AI](https://jobs.example.com/acme/ml)** | Machine Learning Engineer Intern | Remote | Remote | Today
**[Acme Co-op](https://jobs.example.com/acme/coop)** | Software Engineering Co-op | Austin, TX | Hybrid | Today
`, {
    ...jobrightSource(),
    careerCategory: 'software_engineering',
    employmentType: 'internship',
  }, {
    cycleStartedAt: '2026-08-09T12:00:00.000Z',
  });

  assert.equal(records[0].careerCategory, 'software_engineering');
  assert.equal(records[0].careerSubcategory, 'machine_learning_ai');
  assert.ok(records[0].tags.includes('machine_learning_ai'));
  assert.equal(records[1].employmentType, 'co_op');
});

test('Jobright parser cleans escaped markdown job title links', () => {
  const records = parseJobrightRepository(String.raw`
Company | Job Title | Location | Work Model | Date Posted
--- | --- | --- | --- | ---
Example Co | [**[Software Engineer\]\(https://jobright.ai/jobs/info/6a61227e11edf44d7915f233?utm\_campaign=Software%20Engineering&utm\_source=1103)**](https://jobright.ai/jobs/info/6a61227e11edf44d7915f233?utm_campaign=Software%20Engineering&utm_source=1103) | Remote | Remote | Today
`, {
    ...jobrightSource(),
    careerCategory: 'software_engineering',
    employmentType: 'internship',
  }, {
    cycleStartedAt: '2026-08-09T12:00:00.000Z',
  });

  assert.equal(records[0].title, 'Software Engineer');
  assert.equal(records[0].applicationUrl, 'https://jobright.ai/jobs/info/6a61227e11edf44d7915f233?utm_campaign=Software%20Engineering&utm_source=1103');
});

test('Jobright repository configuration supplies broad categories across internship sources', () => {
  for (const [repositoryName, category] of [
    ['2026-Software-Engineer-Internship', 'software_engineering'],
    ['2026-Data-Analysis-Internship', 'data_analytics'],
    ['2026-Engineer-Internship', 'engineering'],
    ['2026-Consultant-Internship', 'consulting'],
    ['2026-Business-Analyst-Internship', 'business_analytics'],
    ['2026-Account-Internship', 'accounting'],
    ['2026-Marketing-Internship', 'marketing'],
    ['2026-Design-Internship', 'design'],
    ['2026-HR-Internship', 'human_resources'],
    ['2026-Legal-Internship', 'legal_compliance'],
    ['2026-Management-Internship', 'management'],
    ['2026-Support-Internship', 'customer_support'],
  ]) {
    const records = parseJobrightRepository(`
Company | Job Title | Location | Work Model | Date Posted
--- | --- | --- | --- | ---
**[Example Co](https://jobs.example.com/${repositoryName})** | ${formatRepositoryRole(repositoryName)} | Remote | Remote | Today
`, {
      ...jobrightSource(),
      repositoryName,
      careerCategory: category,
      employmentType: 'internship',
    }, {
      cycleStartedAt: '2026-08-09T12:00:00.000Z',
    });

    assert.equal(records[0].sourceRepository, `jobright-ai/${repositoryName}`);
    assert.equal(records[0].careerCategory, category);
    assert.equal(records[0].employmentType, 'internship');
    assert.equal(records[0].rejected, false);
  }
});

test('parses Simplify rows into the same intermediate schema', () => {
  const records = parseSimplifyRepository(readFixture('simplify-new-grad.md'), simplifySource(), {
    cycleStartedAt: '2026-08-09T12:00:00.000Z',
  });

  assert.equal(records.length, 4);
  assert.equal(records[0].provider, 'simplify');
  assert.equal(records[0].sourceRepository, 'SimplifyJobs/New-Grad-Positions');
  assert.equal(records[0].sourceUrl, 'https://github.com/SimplifyJobs/New-Grad-Positions');
  assert.equal(records[0].careerCategory, 'product_management');
  assert.equal(records[0].employmentType, 'new_grad');
  assert.equal(records[0].company, 'Nimbus');
  assert.equal(records[0].title, 'Associate Product Manager');
  assert.equal(records[0].applicationUrl, 'https://jobs.example.com/nimbus/apm');
  assert.equal(records[0].sourceDateRaw, '0d');
  assert.deepEqual(records[0].locations, ['San Francisco, CA']);
  assert.equal(records[0].firstSeenAt, '2026-08-09T12:00:00.000Z');
  assert.equal(records[0].isClosed, false);
  assert.equal(records[0].rawSourceRecord.company, 'Nimbus');
  assert.equal(records[1].applicationUrl, 'https://jobs.example.com/tradeco/quant?utm_source=simplify');
  assert.ok(records[2].rejectionReasons.includes('application_url_missing'));
  assert.ok(records[3].rejectionReasons.includes('company_missing'));
});

test('parses Jobright H1B software engineering rows with visa metadata', () => {
  const records = parseJobrightH1bRepository(`
# Daily H1B Jobs in Tech

<details>
<summary>Software Engineer</summary>

| Company | Job Title | Level | Location | H1B status | Link | Date Posted |
|---|---|---|---|---|---|---|
| **[Acme](https://acme.example.com)** | Software Engineer | Mid-Level | San Francisco, CA | 🏅 | [apply](https://jobright.ai/jobs/info/h1b-explicit?utm_source=1103) | 2026-09-13 |
| ↳ | Software Engineer Intern | Intern | Remote | 🥈 | [apply](https://jobright.ai/jobs/info/h1b-intern) | 2026-09-14 |
| **[PipeCo](https://pipeco.example.com)** | Staff Engineer | Senior | San Francisco, CA | New York City, NY | 🥈 | [apply](https://jobright.ai/jobs/info/h1b-pipe) | 2026-09-14 |

</details>
`, h1bSource(), {
    cycleStartedAt: '2026-09-14T12:00:00.000Z',
  });

  assert.equal(records.length, 3);
  assert.equal(records[0].provider, 'jobright_h1b');
  assert.equal(records[0].sourceRepository, 'jobright-ai/Daily-H1B-Jobs-In-Tech');
  assert.equal(records[0].company, 'Acme');
  assert.equal(records[0].title, 'Software Engineer');
  assert.equal(records[0].employmentType, 'full_time');
  assert.equal(records[0].visaSponsorshipStatus, 'explicit_h1b_sponsor');
  assert.equal(records[0].visaSponsorshipConfidence, 'explicit');
  assert.equal(records[0].sourceExternalId, 'h1b-explicit');
  assert.equal(records[0].sourcePostedDate, '2026-09-13T04:00:00.000Z');
  assert.ok(records[0].tags.includes('h1b'));
  assert.equal(records[1].company, 'Acme');
  assert.equal(records[1].employmentType, 'internship');
  assert.equal(records[1].visaSponsorshipStatus, 'likely_h1b_sponsor');
  assert.equal(records[2].location, 'San Francisco, CA | New York City, NY');
});

test('parses Simplify internships, malformed dates, multiple categories, and closed listings', () => {
  const content = `
Company | Role | Location | Application | Age
--- | --- | --- | --- | ---
BuildCo | Software Engineer Intern | Boston, MA; Remote | [Apply](https://jobs.example.com/buildco/intern?utm_campaign=x) | 1d
DataCo | Data Science Intern | New York, NY / Remote | [Apply](https://jobs.example.com/dataco/ds) | sometime
ClosedCo | Product Intern | Remote | 🔒 | Today
`;
  const records = parseSimplifyRepository(content, {
    ...simplifySource(),
    careerCategory: 'software_engineering',
    employmentType: 'internship',
  }, {
    cycleStartedAt: '2026-08-09T12:00:00.000Z',
  });

  assert.equal(records[0].careerCategory, 'software_engineering');
  assert.equal(records[0].employmentType, 'internship');
  assert.equal(records[0].sourcePostedDate, '2026-08-08T04:00:00.000Z');
  assert.deepEqual(records[0].locations, ['Boston, MA', 'Remote']);
  assert.equal(records[1].sourcePostedDate, null);
  assert.equal(records[1].firstSeenAt, '2026-08-09T12:00:00.000Z');
  assert.equal(records[1].rejected, false);
  assert.equal(records[2].isClosed, true);
  assert.ok(records[2].rejectionReasons.includes('application_url_missing'));
});

function readFixture(name) {
  return readFileSync(new URL(`../../../tests/fixtures/github/${name}`, import.meta.url), 'utf8');
}

function jobrightSource() {
  return {
    id: 'jobright-data',
    sourceName: 'Jobright Data',
    repositoryOwner: 'jobright-ai',
    repositoryName: '2026-Data-Analysis-New-Grad',
    careerCategory: 'data_analytics',
    employmentType: 'new_grad',
  };
}

function simplifySource() {
  return {
    id: 'simplify-new-grad',
    sourceName: 'Simplify Product',
    repositoryOwner: 'SimplifyJobs',
    repositoryName: 'New-Grad-Positions',
    careerCategory: 'product_management',
    employmentType: 'new_grad',
  };
}

function h1bSource() {
  return {
    id: 'jobright-h1b-swe',
    sourceName: 'Jobright Daily H1B Software Engineer Jobs',
    repositoryOwner: 'jobright-ai',
    repositoryName: 'Daily-H1B-Jobs-In-Tech',
    sourceUrl: 'https://github.com/jobright-ai/Daily-H1B-Jobs-In-Tech',
    careerCategory: 'software_engineering',
    employmentType: 'full_time',
    metadata: {
      githubDetailsSection: 'Software Engineer',
    },
  };
}

function formatRepositoryRole(repositoryName) {
  return repositoryName
    .replace(/^2026-/, '')
    .replace(/-Internship$/, ' Intern')
    .replace(/-/g, ' ');
}
