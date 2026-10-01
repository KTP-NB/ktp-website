import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applicationLinkLabel } from '../applicationLink.js';

test('identifies Jobright intermediary links without trusting lookalike domains', () => {
  assert.equal(applicationLinkLabel('https://jobright.ai/jobs/info/123'), 'View on Jobright');
  assert.equal(applicationLinkLabel('https://www.jobright.ai/jobs/info/123'), 'View on Jobright');
  assert.equal(applicationLinkLabel('https://fakejobright.ai/jobs/info/123'), 'Open application');
});

test('labels direct and malformed application URLs conservatively', () => {
  assert.equal(applicationLinkLabel('https://boards.greenhouse.io/acme/jobs/123'), 'Open application');
  assert.equal(applicationLinkLabel('not a url'), 'Open application');
});
