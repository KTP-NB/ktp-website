import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { cleanRecruiterEmail, MAX_BATCH } from '../validation.mjs';

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');
const valid = { recipients: [{ email: 'alex@example.com' }], sent_at: '2026-10-20T12:00:00Z', provider: 'gmail', mailbox_id: 'sender@example.com', message_id: 'message-1' };

async function openapi() {
  const source = (await read('app/api/v1/openapi/route.js')).replace(/^import .*;\n/m, '').replace('export async function GET', 'async function GET');
  const get = new Function('NextResponse', `${source}\nreturn GET;`)(Response);
  return (await get(new Request('http://localhost:3000/api/v1/openapi'))).json();
}

test('OpenAPI exposes all recruiter routes and website-only deletion', async () => {
  const spec = await openapi();
  assert.deepEqual(Object.keys(spec.paths['/recruiter-emails']).sort(), ['get', 'post']);
  const record = spec.paths['/recruiter-emails/{id}'];
  assert.deepEqual(Object.keys(record).sort(), ['delete', 'get', 'parameters', 'patch']);
  assert.deepEqual(record.delete.security, [{ websiteSession: [] }]);
  assert.ok(record.get.responses[404]);
  assert.ok(record.patch.responses[404]);
  assert.equal(spec.servers[0].url, 'http://localhost:3000/api/v1');
});

test('OpenAPI metadata fields match API validation and exclude immutable fields from updates', async () => {
  const { components } = await openapi();
  const input = components.schemas.RecruiterEmailInput;
  for (const field of ['provider', 'mailbox_id', 'message_id']) {
    assert.ok(input.required.includes(field), field);
    assert.equal(input.properties[field].type, 'string', field);
  }
  for (const key of Object.keys(input.properties)) {
    const parsed = cleanRecruiterEmail({ ...valid, [key]: valid[key] ?? null }, { requireSource: true });
    assert.ok(!parsed.errors.some(error => error.includes('Unknown field')), key);
  }
  const update = components.schemas.RecruiterEmailUpdate;
  assert.equal(update.additionalProperties, false);
  assert.equal(update.minProperties, 1);
  for (const key of ['provider', 'mailbox_id', 'message_id', 'thread_id', 'user_id', 'entry_source', 'deleted_at']) assert.equal(key in update.properties, false, key);
  assert.equal(input.properties.recipients.maxItems, 20);
  assert.equal(input.properties.notes.maxLength, 5000);
});

test('OpenAPI defines partial batch results and the same batch/pagination limits as the API', async () => {
  const spec = await openapi();
  const route = spec.paths['/recruiter-emails'];
  const batch = route.post.requestBody.content['application/json'].schema.oneOf.find(schema => schema.properties?.emails);
  assert.equal(batch.properties.emails.maxItems, MAX_BATCH);
  assert.equal(batch.properties.emails.minItems, 1);
  assert.equal(batch.additionalProperties, false);
  const results = spec.components.schemas.RecruiterEmailBatchResult.properties.results.items;
  assert.deepEqual(results.properties.status.enum, ['created', 'duplicate', 'ignored', 'invalid', 'failed']);
  assert.ok(route.post.responses[200]);
  assert.ok(route.post.responses[201]);
  assert.equal(route.get.parameters.find(parameter => parameter.name === 'limit').schema.maximum, 100);
});

test('MCP offers exactly the five permission-gated recruiter tools and routes writes through the API', async () => {
  const code = await read('supabase/functions/ktp-new-brunswick-mcp/index.ts');
  const blocks = code.split(/\n  tool\(/).slice(1).filter(block => /^\s*can\("recruiter_emails\.use"\)/.test(block));
  assert.equal(blocks.length, 5);
  const expected = new Map([
    ['list_recruiter_emails', /get\(withQuery\("\/api\/v1\/recruiter-emails", args\)\)/],
    ['get_recruiter_email', /get\(`\/api\/v1\/recruiter-emails\/\$\{email_id\}`\)/],
    ['add_recruiter_email', /send\("POST", "\/api\/v1\/recruiter-emails", args\)/],
    ['add_recruiter_emails_bulk', /send\("POST", "\/api\/v1\/recruiter-emails", args\)/],
    ['update_recruiter_email', /\(\{ email_id, \.\.\.updates \}\) => send\("PATCH", `\/api\/v1\/recruiter-emails\/\$\{email_id\}`, updates\)/],
  ]);
  for (const block of blocks) {
    const name = block.match(/^\s*can\([^)]*\),\s*"([^"]+)"/)[1];
    assert.ok(expected.has(name), name);
    assert.match(block, expected.get(name));
    expected.delete(name);
  }
  assert.equal(expected.size, 0);
  assert.doesNotMatch(code, /"delete_recruiter_email/);
  const bulk = blocks.find(block => block.includes('"add_recruiter_emails_bulk"'));
  assert.match(bulk, /z\.array\(createRecruiterEmailSchema\)\.min\(1\)\.max\(50\)/);
  const update = blocks.find(block => block.includes('"update_recruiter_email"'));
  assert.match(update, /Object\.entries\(recruiterEmailFields\)/);
  assert.match(update, /\.strict\(\)\.refine\(/);
  assert.match(code, /Use at most three fractional second digits/);
});

test('import guidance requires separate mailbox authorization, complete scans and untrusted-content handling', async () => {
  const mcp = await read('supabase/functions/ktp-new-brunswick-mcp/index.ts');
  const instructions = mcp.match(/const recruiterImportInstructions = "([^"]+)";/)[1];
  for (const pattern of [/separately authorized email connector/, /every page/, /uncertain matches/, /original sent timestamps/, /unknown details empty/, /untrusted data/, /no bodies/, /reimports preserve edits/, /deleted imports stay ignored/, /incomplete scans/]) assert.match(instructions, pattern);
  const docs = await read('public/docs/recruiter-outreach.md');
  assert.match(docs, /no direct mailbox OAuth or background scheduling/);
  assert.match(docs, /never count toward job applications/);
  assert.match(docs, /same canonical sending address/);
  assert.match(docs, /not delete any email from the connected mailbox/);
});
