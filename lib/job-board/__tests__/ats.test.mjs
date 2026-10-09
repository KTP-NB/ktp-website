import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveResumePointer } from '../ats/resumeRetrieval.js';
import { parseJob, profileForRole } from '../ats/jobParser.js';
import { generateDeterministicSuggestions } from '../ats/recommendations.js';
import { parseResumeText } from '../ats/resumeParser.js';
import { scoreResumeAgainstJob } from '../ats/scoring.js';

const resumeText = `
KRISH PATEL

SKILLS
JavaScript, React, Node, SQL, Git, Testing, Python

EDUCATION
Rutgers University, Computer Science

EXPERIENCE
Software Engineer Intern
Built React dashboards and APIs for analytics workflows.

PROJECTS
Job board project using Next.js, Supabase, SQL, and testing.
`;

test('parses resume sections and skills from clean PDF text', () => {
  const resume = parseResumeText(resumeText);
  assert.ok(resume.plainText.includes('KRISH PATEL'));
  assert.ok(resume.skills.includes('javascript'));
  assert.ok(resume.skills.includes('react'));
  assert.ok(resume.education.some((line) => line.includes('Computer Science')));
  assert.ok(resume.experience.some((line) => line.includes('Software Engineer Intern')));
  assert.ok(resume.projects.some((line) => line.includes('Job board project')));
});

test('parses job requirements from stored job data', () => {
  const job = parseJob({
    title: 'Software Engineer Intern',
    company: 'Northstar Labs',
    career_category: 'software_engineering',
    description: 'Build React and API features with SQL-backed data.',
    responsibilities: ['Write tests for product workflows.'],
    qualifications: ['Experience with JavaScript, React, Git, and SQL.'],
  });

  assert.ok(job.requiredSkills.includes('javascript'));
  assert.ok(job.requiredSkills.includes('react'));
  assert.ok(job.keywords.includes('software'));
});

test('scores resume deterministically against a job', () => {
  const resume = parseResumeText(resumeText);
  const job = parseJob({
    title: 'Software Engineer Intern',
    career_category: 'software_engineering',
    description: 'Build React API features. JavaScript, Git, SQL, and testing preferred.',
    responsibilities: ['Ship full-stack product features.'],
    qualifications: ['Computer Science degree preferred.'],
  });

  const result = scoreResumeAgainstJob(resume, job);
  assert.ok(result.score >= 70);
  assert.ok(result.matchedSkills.includes('javascript'));
  assert.equal(typeof result.scoreBreakdown.skillOverlap, 'number');
});

test('supports general target role profiles', () => {
  const profile = profileForRole('data_analytics');
  assert.ok(profile.requiredSkills.includes('sql'));
  assert.ok(profile.keywords.includes('analytics'));
});

test('generates deterministic suggestions from missing terms', () => {
  const suggestions = generateDeterministicSuggestions({
    mode: 'job',
    result: {
      missingSkills: ['typescript'],
      missingKeywords: ['frontend'],
      projectRelevance: { score: 0.2 },
      experienceAlignment: { score: 0.7 },
    },
  });

  assert.ok(suggestions.some((item) => item.type === 'missing_skill'));
  assert.ok(suggestions.some((item) => item.type === 'project_relevance'));
});

test('uses the current member resume record rather than profile columns', () => {
  assert.deepEqual(resolveResumePointer({ storage_path: 'member/file.pdf', updated_at: '2026-09-26' }), {
    bucket: 'member-resumes',
    path: 'member/file.pdf',
    version: '2026-09-26',
  });
  assert.equal(resolveResumePointer({ storage_path: null }), null);
});
