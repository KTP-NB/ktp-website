import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { profileHasPermission } from '../../adminAccess.js';
import * as validation from '../validation.mjs';

// Execute the real handlers and authentication with only framework/network boundaries replaced.
async function load(path, dependencies, names) {
  const source = (await readFile(new URL(`../../../${path}`, import.meta.url), 'utf8'))
    .replace(/^import\s[\s\S]*?;\n/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/\bexport (?=(?:async )?function|const)/g, '');
  return new Function(...Object.keys(dependencies), `${source}\nreturn { ${names.join(', ')} };`)(...Object.values(dependencies));
}

const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const source = { provider: 'gmail', mailbox_id: 'sender@example.com', message_id: 'message-1' };
const outreach = { recipients: [{ email: 'alex@example.com' }], company: 'Acme', subject: 'Opportunity', sent_at: '2026-10-20T12:00:00Z' };

function like(value, pattern) {
  const escaped = pattern.replace(/\\([\\%_])|([%_])|([.*+?^${}()|[\]\\])/g,
    (_, literal, wildcard, special) => literal ? `\\${literal}` : wildcard ? (wildcard === '%' ? '.*' : '.') : `\\${special}`);
  return new RegExp(`^${escaped}$`, 'is').test(value);
}

class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.orders = []; }
  select(fields, options) { this.fields = fields; this.options = options; return this; }
  eq(key, value) { this.filters.push(row => row[key] === value); return this; }
  is(key, value) { this.filters.push(row => (row[key] ?? null) === value); return this; }
  gte(key, value) { this.filters.push(row => row[key] >= value); return this; }
  lt(key, value) { this.filters.push(row => row[key] < value); return this; }
  ilike(key, value) { this.filters.push(row => like(row[key], value)); return this; }
  order(key, options) { this.orders.push([key, options.ascending]); return this; }
  range(start, end) { this.bounds = [start, end]; return this; }
  insert(value) { this.action = 'insert'; this.value = value; return this; }
  update(value) { this.action = 'update'; this.value = value; return this; }
  delete() { this.action = 'delete'; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
  execute() {
    const rows = this.db.tables[this.table];
    assert.ok(rows, `Unexpected table: ${this.table}`);
    let selected = rows.filter(row => this.filters.every(filter => filter(row)));
    if (this.action === 'insert') {
      if (this.table === 'recruiter_emails' && this.value.subject === 'Simulate upload failure') return { error: { code: '08006' }, data: null };
      if (this.table === 'recruiter_emails' && this.value.message_id && rows.some(row => ['user_id', 'provider', 'mailbox_id', 'message_id'].every(key => row[key] === this.value[key]))) {
        return { error: { code: '23505' }, data: null };
      }
      const row = { id: crypto.randomUUID(), deleted_at: null, created_at: new Date().toISOString(), ...this.value };
      rows.push(row);
      selected = [row];
    }
    if (this.action === 'update') for (const row of selected) Object.assign(row, this.value);
    if (this.action === 'delete') this.db.tables[this.table] = rows.filter(row => !selected.includes(row));
    if (this.action && this.table === 'recruiter_emails') for (const row of selected) {
      row.search_text = `${row.company || ''} ${row.position || ''} ${row.subject || ''} ${JSON.stringify(row.recipients)}`;
    }
    selected.sort((a, b) => {
      for (const [key, ascending] of this.orders) if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * (ascending ? 1 : -1);
      return 0;
    });
    const count = selected.length;
    if (this.bounds) selected = selected.slice(this.bounds[0], this.bounds[1] + 1);
    const fields = this.fields?.split(',');
    const data = selected.map(row => fields && this.fields !== '*' ? Object.fromEntries(fields.map(field => [field, row[field]])) : { ...row });
    return { data: this.one ? data[0] || null : data, error: null, count };
  }
}

async function setup({ permission = true, status = 'active', scopes = ['applications:read', 'applications:write'], revoked = false } = {}) {
  const secret = 'ktp_live_testkey';
  const db = {
    tables: {
      recruiter_emails: [], application_api_audit_logs: [],
      member_api_keys: [{ id: 'key-1', user_id: owner, key_hash: crypto.createHash('sha256').update(secret).digest('hex'), scopes, revoked_at: revoked ? new Date().toISOString() : null }],
      member_profiles: [{ id: 'profile-1', user_id: owner, access_role: 'member', member_status: status }],
      role_permissions: permission ? [{ role_key: 'member', permission_key: 'recruiter_emails.use' }] : [],
    },
    from(table) { return new Query(db, table); },
    async rpc(name, args) {
      assert.equal(name, 'recruiter_email_summary');
      const rows = db.tables.recruiter_emails.filter(row => row.user_id === args.owner_id && !row.deleted_at
        && (!args.from_date || row.sent_at >= args.from_date) && (!args.before_date || row.sent_at < args.before_date)
        && (!args.search_pattern || like(row.search_text, args.search_pattern)));
      return { data: { emails: rows.length, recruiters: new Set(rows.flatMap(row => row.recipients.map(recipient => recipient.email.toLowerCase()))).size }, error: null };
    },
  };
  const dependencies = {
    NextResponse: Response, crypto, profileHasPermission, MEMBER_PERMISSIONS: {},
    getServiceClient: () => db,
    extractAccessToken: request => request.headers.get('authorization')?.replace(/^Bearer /, ''),
    getUserClient: token => ({ auth: { getUser: async () => token === 'session' ? { data: { user: { id: owner } } } : { error: 'invalid' } } }),
  };
  const apiAuth = await load('lib/applications/apiAuth.js', dependencies,
    ['apiError', 'authenticateApiKey', 'apiKeyRoleLimit', 'apiKeyScopeForMethod', 'auditApiRequest', 'isApiKeyRequest']);
  const auth = await load('lib/coderank/auth.js', { ...dependencies, ...apiAuth }, ['requirePermission']);
  const server = await load('lib/recruiter-emails/server.js', { ...dependencies, ...apiAuth, ...auth }, ['requireRecruiterEmailUser', 'emailResponse']);
  const routeDependencies = { ...apiAuth, ...server, ...validation };
  const collection = await load('app/api/v1/recruiter-emails/route.js', routeDependencies, ['GET', 'POST']);
  const detail = await load('app/api/v1/recruiter-emails/[id]/route.js', routeDependencies, ['GET', 'PATCH', 'DELETE']);
  const request = (method = 'GET', body, { key = true, query = '' } = {}) => new Request(`http://localhost/api/v1/recruiter-emails${query}`, {
    method, headers: { authorization: `Bearer ${key ? secret : 'session'}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const add = async (value = {}, options) => {
    const response = await collection.POST(request('POST', { ...outreach, ...source, ...value }, options));
    return { response, body: await response.json() };
  };
  return { db, collection, detail, request, add };
}

test('API keys need the feature permission and an active owner', async () => {
  for (const options of [{ permission: false }, { status: 'inactive' }, { status: 'alumni' }]) {
    const { collection, request, db } = await setup(options);
    assert.equal((await collection.GET(request())).status, 403);
    assert.equal((await collection.POST(request('POST', { ...outreach, ...source }))).status, 403);
    assert.equal(db.tables.recruiter_emails.length, 0);
  }
});

test('revoked and read-only keys cannot write, and read-only keys can list', async () => {
  const readOnly = await setup({ scopes: ['applications:read'] });
  assert.equal((await readOnly.collection.GET(readOnly.request())).status, 200);
  assert.equal((await readOnly.add()).response.status, 403);
  for (const method of ['PATCH', 'DELETE']) assert.equal((await readOnly.detail[method](readOnly.request(method, method === 'PATCH' ? { notes: 'edit' } : undefined), { params: { id: owner } })).status, 403);
  const revoked = await setup({ revoked: true });
  assert.equal((await revoked.collection.GET(revoked.request())).status, 401);
  assert.equal((await revoked.add()).response.status, 401);
});

test('website sessions require the permission and active membership too', async () => {
  for (const options of [{ permission: false }, { status: 'inactive' }]) {
    const { collection, request } = await setup(options);
    assert.equal((await collection.GET(request('GET', undefined, { key: false }))).status, 403);
  }
});

test('role-limited keys cannot inherit their super-admin owner access', async () => {
  const { collection, request, db } = await setup();
  db.tables.member_profiles[0].access_role = 'super_admin';
  db.tables.member_api_keys[0].acts_as_role = 'pledge';
  assert.equal((await collection.GET(request())).status, 403);
  db.tables.role_permissions.push({ role_key: 'pledge', permission_key: 'recruiter_emails.use' });
  assert.equal((await collection.GET(request())).status, 200);
  db.tables.member_profiles[0].access_role = 'member';
  assert.equal((await collection.GET(request())).status, 403);
});

test('imports require source identity, but website manual entries do not', async () => {
  const { collection, request, db } = await setup();
  const rejected = await (await collection.POST(request('POST', outreach))).json();
  assert.equal(rejected.results[0].status, 'invalid');
  const accepted = await (await collection.POST(request('POST', outreach, { key: false }))).json();
  assert.equal(accepted.results[0].status, 'created');
  assert.equal(db.tables.recruiter_emails[0].entry_source, 'manual');
  assert.equal(db.tables.recruiter_emails[0].user_id, owner);
});

test('cross-account rows cannot be listed, read, updated, or deleted', async () => {
  const { add, collection, detail, request, db } = await setup();
  const { body } = await add();
  const id = body.results[0].email.id;
  db.tables.recruiter_emails[0].user_id = other;
  const list = await (await collection.GET(request())).json();
  assert.deepEqual(list.data, []);
  assert.deepEqual(list.summary, { emails: 0, recruiters: 0 });
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const response = await detail[method](request(method, method === 'PATCH' ? { notes: 'attack' } : undefined, { key: false }), { params: { id } });
    assert.equal(response.status, 404, method);
  }
  assert.equal(db.tables.recruiter_emails[0].notes, undefined);
  assert.equal(db.tables.recruiter_emails[0].deleted_at, null);
});

test('ownership cannot be supplied in create or update bodies', async () => {
  const { add, detail, request, db } = await setup();
  assert.equal((await add({ user_id: other })).body.results[0].status, 'invalid');
  const { body } = await add();
  const id = body.results[0].email.id;
  assert.equal((await detail.PATCH(request('PATCH', { user_id: other }), { params: { id } })).status, 400);
  assert.equal(db.tables.recruiter_emails[0].user_id, owner);
});

test('reimports preserve edits and immutable source identifiers', async () => {
  const { add, detail, request, db } = await setup();
  const { body } = await add({ notes: 'original', thread_id: 'thread-1' });
  const id = body.results[0].email.id;
  assert.equal((await detail.PATCH(request('PATCH', { company: 'User correction', notes: 'edited' }), { params: { id } })).status, 200);
  for (const field of ['provider', 'mailbox_id', 'message_id', 'thread_id']) {
    assert.equal((await detail.PATCH(request('PATCH', { [field]: 'changed' }), { params: { id } })).status, 400, field);
  }
  const retry = await add({ notes: 'stale import' });
  assert.equal(retry.body.results[0].status, 'duplicate');
  assert.equal(retry.body.results[0].email.company, 'User correction');
  assert.equal(retry.body.results[0].email.notes, 'edited');
  assert.equal(db.tables.recruiter_emails.length, 1);
});

test('multiple mailboxes and follow-ups remain distinct while recipients are unique', async () => {
  const { add, collection, request } = await setup();
  await add({ thread_id: 'thread-1', recipients: [{ email: 'alex@example.com' }, { email: 'sam@example.com' }] });
  await add({ thread_id: 'thread-1', message_id: 'follow-up' });
  await add({ mailbox_id: 'second@example.com' });
  const list = await (await collection.GET(request())).json();
  assert.deepEqual(list.summary, { emails: 3, recruiters: 2 });
});

test('website-only deletion erases imported content and suppresses retries', async () => {
  const { add, detail, collection, request, db } = await setup();
  const { body } = await add({ notes: 'private', thread_id: 'thread-1', source_url: 'https://example.com/message' });
  const id = body.results[0].email.id;
  assert.equal((await detail.DELETE(request('DELETE'), { params: { id } })).status, 403);
  assert.equal((await detail.DELETE(request('DELETE', undefined, { key: false }), { params: { id } })).status, 200);
  const row = db.tables.recruiter_emails[0];
  for (const field of ['company', 'position', 'subject', 'notes', 'thread_id', 'source_url']) assert.equal(row[field], null, field);
  assert.ok(!JSON.stringify(row.recipients).includes('alex@example.com'));
  for (const field of ['provider', 'mailbox_id', 'message_id']) assert.equal(row[field], source[field]);
  assert.equal((await add()).body.results[0].status, 'ignored');
  assert.equal((await detail.GET(request(), { params: { id } })).status, 404);
  assert.equal((await detail.PATCH(request('PATCH', { notes: 'resurrect' }), { params: { id } })).status, 404);
  assert.deepEqual((await (await collection.GET(request())).json()).summary, { emails: 0, recruiters: 0 });
});

test('pagination and inclusive dates count the filtered set independently of page size', async () => {
  const { add, collection, request } = await setup();
  for (let day = 19; day <= 23; day++) await add({ message_id: `message-${day}`, sent_at: `2026-10-${day}T23:59:59Z` });
  const first = await (await collection.GET(request('GET', undefined, { query: '?from=2026-10-20&to=2026-10-22&limit=2' }))).json();
  const second = await (await collection.GET(request('GET', undefined, { query: '?from=2026-10-20&to=2026-10-22&limit=2&page=2' }))).json();
  assert.equal(first.data.length, 2);
  assert.equal(second.data.length, 1);
  assert.deepEqual(first.pagination, { page: 1, limit: 2, total: 3 });
  assert.equal(new Set([...first.data, ...second.data].map(row => row.id)).size, 3);
  assert.match(first.data[0].sent_at, /^2026-10-22/);
});

test('search escapes SQL wildcard characters and matches recipients', async () => {
  const { add, collection, request } = await setup();
  await add({ company: '100% Labs' });
  await add({ company: '1000 Labs', message_id: 'second' });
  const filtered = await (await collection.GET(request('GET', undefined, { query: '?search=100%25' }))).json();
  assert.equal(filtered.summary.emails, 1);
  assert.equal(filtered.data[0].company, '100% Labs');
  assert.equal((await (await collection.GET(request('GET', undefined, { query: '?search=alex%40example.com' }))).json()).summary.emails, 2);
});

test('bulk responses isolate failures, preserve input indexes, and support safe retries', async () => {
  const { add, collection, request } = await setup();
  await add();
  const emails = [
    { ...outreach, ...source },
    { ...outreach, ...source, message_id: 'valid-2' },
    { ...outreach, ...source, message_id: 'invalid', sent_at: 'invalid' },
    { ...outreach, ...source, message_id: 'failed', subject: 'Simulate upload failure' },
  ];
  const result = await (await collection.POST(request('POST', { emails }))).json();
  assert.deepEqual(result.results.map(row => [row.index, row.status]), [[0, 'duplicate'], [1, 'created'], [2, 'invalid'], [3, 'failed']]);
  assert.equal(result.created, 1);
  assert.equal(result.failed, 2);
  const retry = await (await collection.POST(request('POST', { emails }))).json();
  assert.equal(retry.created, 0);
  assert.equal(retry.duplicates, 2);
});

test('each 50-row bulk request consumes one audit count, including near the rate limit', async () => {
  const { collection, request, db } = await setup();
  db.tables.application_api_audit_logs.push(...Array.from({ length: 118 }, () => ({ user_id: owner, created_at: new Date().toISOString() })));
  const emails = Array.from({ length: 50 }, (_, index) => ({ ...outreach, ...source, message_id: `bulk-${index}` }));
  assert.equal((await (await collection.POST(request('POST', { emails }))).json()).created, 50);
  assert.equal(db.tables.application_api_audit_logs.length, 119);
  assert.equal((await (await collection.POST(request('POST', { emails }))).json()).duplicates, 50);
  assert.equal(db.tables.application_api_audit_logs.length, 120);
  assert.equal((await collection.POST(request('POST', { emails }))).status, 429);
});

test('empty and oversized batches and malformed IDs fail without touching data', async () => {
  const { collection, detail, request, db } = await setup();
  for (const emails of [[], {}, Array.from({ length: 51 }, () => ({ ...outreach, ...source }))]) {
    assert.equal((await collection.POST(request('POST', { emails }))).status, 400);
  }
  for (const method of ['GET', 'PATCH', 'DELETE']) assert.equal((await detail[method](request(method, method === 'PATCH' ? { notes: 'edit' } : undefined, { key: false }), { params: { id: 'malformed' } })).status, 400);
  assert.equal(db.tables.recruiter_emails.length, 0);
});

test('database summary failures return an error instead of misleading empty totals', async () => {
  const { collection, request, db } = await setup();
  db.rpc = async () => ({ data: null, error: { message: 'unavailable' } });
  assert.equal((await collection.GET(request())).status, 500);
});
