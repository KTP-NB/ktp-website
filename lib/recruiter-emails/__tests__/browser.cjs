// Isolated UI fixtures only. Start localhost:3011 with the fixture settings in the outreach guide.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
let browser;

(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'America/New_York' });
  const user = { id: '10000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', user_metadata: {} };
  await context.addInitScript(({ user }) => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer', user }));
  }, { user });
  let records = Array.from({ length: 51 }, (_, i) => ({ id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, recipients: [{ email: `alex${i}@example.com`, name: `Alex ${i}` }], company: 'Example', position: 'Engineer', subject: `Outreach ${i}`, sent_at: '2026-10-20T18:30:00.123Z', notes: '', source_url: null, entry_source: 'email', provider: 'gmail', mailbox_id: 'fixture-mailbox', message_id: `msg-${i}` }));
  const requests = [];
  let failOnce = true;
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.origin === 'http://127.0.0.1:54321') {
      if (url.pathname.includes('/member_profiles')) return json({ name: 'Local Fixture', access_role: 'member', manager_permissions: [] });
      if (url.pathname.includes('/role_permissions')) return json(['account.profile', 'recruiter_emails.use', 'integrations.use'].map(permission_key => ({ permission_key })));
      if (url.pathname.includes('/auth/v1/user')) return json(user);
      return json([]);
    }
    if (url.origin !== 'http://127.0.0.1:3011') return route.abort();
    if (!url.pathname.startsWith('/api/v1/recruiter-emails')) return route.continue();
    const body = req.postDataJSON();
    requests.push({ method: req.method(), path: url.pathname, query: url.search, body });
    if (req.method() === 'GET') {
      const search = url.searchParams.get('search')?.toLowerCase();
      const filtered = records.filter(row => !search || JSON.stringify(row).toLowerCase().includes(search));
      const page = Number(url.searchParams.get('page') || 1);
      return json({ data: filtered.slice((page - 1) * 50, page * 50), summary: { emails: filtered.length, recruiters: new Set(filtered.flatMap(row => row.recipients.map(r => r.email))).size }, pagination: { page, limit: 50, total: filtered.length } });
    }
    if (req.method() === 'PATCH') {
      const row = records.find(row => url.pathname.endsWith(row.id));
      Object.assign(row, body);
      return json({ data: row });
    }
    if (req.method() === 'DELETE') {
      records = records.filter(row => !url.pathname.endsWith(row.id));
      return json({ deleted: true });
    }
    const results = body.emails.map((email, index) => {
      if (email.company === 'Retry company' && failOnce) { failOnce = false; return { index, status: 'failed', errors: ['Fixture upload failure'] }; }
      const row = { ...email, id: `20000000-0000-4000-8000-${String(records.length + 1).padStart(12, '0')}`, entry_source: 'manual' };
      records.unshift(row);
      return { index, status: 'created', email: row };
    });
    return json({ results, created: results.filter(r => r.status === 'created').length, duplicates: 0, ignored: 0, failed: results.filter(r => r.status === 'failed').length });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('http://127.0.0.1:3011/recruiter-outreach');
  await page.getByRole('heading', { name: 'Recruiter Outreach', exact: true }).waitFor();
  await page.getByText('Page 1 of 2').waitFor();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('cell', { name: /^Outreach 50/ }).waitFor();
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await page.getByText('Page 1 of 2').waitFor();
  await page.getByRole('button', { name: 'Edit email', exact: true }).first().click();
  await page.getByLabel('Notes (metadata only)').fill('Follow up next week');
  await page.getByRole('button', { name: 'Save emails', exact: true }).click();
  await page.getByText('Email updated.', { exact: true }).waitFor();
  assert.equal(requests.find(r => r.method === 'PATCH').body.sent_at, '2026-10-20T18:30:00.123Z');
  assert.equal(requests.find(r => r.method === 'PATCH').body.recipients[0].name, 'Alex 0');
  await page.getByRole('button', { name: 'Add emails', exact: true }).click();
  await page.getByLabel('Recruiter emails (comma separated)').fill('first@example.com, second@example.com');
  await page.getByLabel('Company', { exact: true }).fill('Saved company');
  await page.getByRole('button', { name: 'Add another row (1/50)', exact: true }).click();
  await page.getByLabel('Recruiter emails (comma separated)').nth(1).fill('retry@example.com');
  await page.getByLabel('Company', { exact: true }).nth(1).fill('Retry company');
  await page.getByRole('button', { name: 'Save emails', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Only failed rows remain.' }).waitFor();
  assert.equal(await page.locator('fieldset').count(), 1);
  assert.equal(await page.getByLabel('Company', { exact: true }).inputValue(), 'Retry company');
  await page.getByRole('button', { name: 'Save emails', exact: true }).click();
  await page.getByText('1 added, 0 already tracked, 0 previously deleted, 0 failed.', { exact: true }).waitFor();
  assert.equal(requests.filter(r => r.method === 'POST')[0].body.emails[0].recipients.length, 2);
  assert.equal(records.filter(r => r.company === 'Saved company').length, 1);
  await page.getByPlaceholder('Recruiter, company, position, subject').fill('Retry company');
  await page.getByText('Page 1 of 1').waitFor();
  await page.getByRole('cell', { name: 'Retry company' }).waitFor();
  assert.equal(await page.locator('tbody tr').count(), 1);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete email', exact: true }).click();
  await page.getByText('No recruiter emails found for this view.', { exact: true }).waitFor();
  await page.getByPlaceholder('Recruiter, company, position, subject').fill('');
  await page.getByText('Page 1 of 2').waitFor();
  await page.getByRole('button', { name: 'From date (UTC)', exact: true }).click();
  const dateRequest = page.waitForRequest(req => req.url().includes('/api/v1/recruiter-emails') && Boolean(new URL(req.url()).searchParams.get('from')));
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await dateRequest;
  await page.getByRole('button', { name: 'From date (UTC)', exact: true }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('cell', { name: /^Outreach 0/ }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(tmpdir(), 'ktp-outreach-desktop.png'), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(tmpdir(), 'ktp-outreach-mobile.png'), fullPage: false });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile page should not overflow horizontally');
  await page.getByRole('button', { name: 'Add emails', exact: true }).click();
  await page.getByRole('heading', { name: 'Add recruiter emails', exact: true }).waitFor();
  await page.screenshot({ path: join(tmpdir(), 'ktp-outreach-modal.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Add recruiter emails', exact: true }).waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log('PASS: fixture browser tests for list, pagination, edit timestamp/name preservation, multiple recipients, bulk partial failures/retry, search, date filter, deletion, mobile overflow, dialog keyboard dismissal; no browser runtime errors. No live account or database used.');
  await browser.close();
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
