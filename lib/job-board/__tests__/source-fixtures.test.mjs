import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ashbyAdapter } from '../scraper/sources/ashby.js';
import { customAdapter } from '../scraper/sources/custom.js';
import { greenhouseAdapter } from '../scraper/sources/greenhouse.js';
import { leverAdapter } from '../scraper/sources/lever.js';

test('future source adapters parse scraper fixtures', () => {
  const greenhouse = greenhouseAdapter.parseFixture(readFixture('greenhouse/software-engineer-intern.html'));
  assert.equal(greenhouse.title, 'Software Engineer Intern');
  assert.equal(greenhouse.company, 'Northstar Labs');

  const lever = leverAdapter.parseFixture(readFixture('lever/data-analyst-intern.html'));
  assert.equal(lever.title, 'Data Analyst Intern');
  assert.equal(lever.company, 'Summit Financial');

  const ashby = ashbyAdapter.parseFixture(readFixture('ashby/product-manager-intern.html'));
  assert.equal(ashby.title, 'Associate Product Manager Intern');
  assert.equal(ashby.company, 'Atlas Health');

  const custom = customAdapter.parseFixture(readFixture('custom/cybersecurity-coop.html'));
  assert.equal(custom.title, 'Cybersecurity Co-op');
  assert.equal(custom.company, 'Bridgewater Cloud');
});

function readFixture(path) {
  return readFileSync(new URL(`../../../tests/fixtures/scrapers/${path}`, import.meta.url), 'utf8');
}
