import { NextResponse } from "next/server";

const recruiterEmailProperties = {
  recipients: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'object', required: ['email'], additionalProperties: false, properties: { email: { type: 'string', format: 'email', maxLength: 320 }, name: { type: ['string', 'null'], maxLength: 200 } } } },
  company: { type: ['string', 'null'], maxLength: 160 },
  position: { type: ['string', 'null'], maxLength: 200 },
  subject: { type: ['string', 'null'], maxLength: 500 },
  sent_at: { type: 'string', format: 'date-time', description: 'Original sent instant with timezone, up to millisecond precision. Required; no default.' },
  notes: { type: ['string', 'null'], maxLength: 5000, description: 'Brief metadata, never full email bodies.' },
  source_url: { type: ['string', 'null'], format: 'uri', maxLength: 2000, description: 'HTTP(S) link without embedded credentials.' },
};
const recruiterSourceProperties = {
  provider: { type: ['string', 'null'], maxLength: 40, description: 'Lowercase provider identifier. Immutable.' },
  mailbox_id: { type: ['string', 'null'], maxLength: 320, description: 'Stable mailbox identifier, case-sensitive. Immutable.' },
  message_id: { type: ['string', 'null'], maxLength: 500, description: 'Provider message ID, case-sensitive. Immutable.' },
  thread_id: { type: ['string', 'null'], maxLength: 500, description: 'Optional provider thread ID. Immutable.' },
};
const jsonResponse = (description, schema) => ({ description, content: { 'application/json': { schema } } });
const recruiterRecord = { type: 'object', properties: { ...recruiterEmailProperties, ...recruiterSourceProperties, id: { type: 'string', format: 'uuid' }, entry_source: { enum: ['manual', 'email'] }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } } };
const recruiterBatchResponse = { type: 'object', properties: {
  ...Object.fromEntries(['created', 'duplicates', 'ignored', 'failed'].map((name) => [name, { type: 'integer', minimum: 0 }])),
  results: { type: 'array', items: { type: 'object', required: ['index', 'status'], properties: { index: { type: 'integer', minimum: 0 }, status: { enum: ['created', 'duplicate', 'ignored', 'invalid', 'failed'] }, email: { $ref: '#/components/schemas/RecruiterEmail' }, errors: { type: 'array', items: { type: 'string' } } } } },
} };
const recruiterErrors = { 400: { description: 'Invalid input or batch envelope' }, 401: { description: 'Missing, expired, or revoked authentication' }, 403: { description: 'Missing permission, inactive membership, insufficient scope, or API-key deletion' }, 429: { description: 'Hourly rate limit reached; respect Retry-After' }, 500: { description: 'Database operation failed' } };

export async function GET(request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    openapi: "3.1.0",
    info: { title: "KTP Member Tracker API", version: "1.0.0" },
    servers: [{ url: `${origin}/api/v1` }],
    components: {
      securitySchemes: { websiteSession: { type: "http", scheme: "bearer", bearerFormat: "Supabase session JWT" }, bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "KTP API key" } },
      schemas: {
        RecruiterEmailInput: {
          type: 'object', additionalProperties: false, required: ['recipients', 'sent_at', 'provider', 'mailbox_id', 'message_id'],
          properties: { ...recruiterEmailProperties, ...recruiterSourceProperties, ...Object.fromEntries(['provider', 'mailbox_id', 'message_id'].map((name) => [name, { ...recruiterSourceProperties[name], type: 'string', minLength: 1 }])) },
          description: 'API-key imports also require provider, mailbox_id, and message_id together. Session-only manual entry may omit all source identifiers. thread_id requires source identity.',
        },
        RecruiterEmailUpdate: { type: 'object', additionalProperties: false, minProperties: 1, properties: recruiterEmailProperties },
        RecruiterEmail: recruiterRecord,
        RecruiterEmailBatchResult: recruiterBatchResponse,
        ApplicationInput: {
          type: "object",
          required: ["company", "position"],
          properties: {
            company: { type: "string", maxLength: 160 },
            position: { type: "string", maxLength: 200 },
            date_applied: { type: "string", format: "date" },
            status: { enum: ["applied", "assessment", "interviewing", "rejected", "offer", "withdrawn"] },
            details: { type: ["string", "null"], maxLength: 5000 },
            application_url: { type: ["string", "null"], format: "uri" },
            referral: { type: "boolean" },
            referral_contact: { type: ["string", "null"], maxLength: 200 },
            external_id: { type: ["string", "null"], maxLength: 300, description: "Stable source identifier used for duplicate-safe retries." },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/recruiter-emails': {
        get: {
          summary: 'List owned recruiter emails and matching totals',
          description: 'Requires active membership, recruiter_emails.use and Read scope. Sort: sent_at descending, id descending. Deleted records are excluded. Counts are independent of applications.',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1000000, default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
            ...['from', 'to'].map((name) => ({ name, in: 'query', description: 'Inclusive UTC calendar date', schema: { type: 'string', format: 'date' } })),
            { name: 'search', in: 'query', description: 'Literal substring in recipients, company, position or subject', schema: { type: 'string', maxLength: 200 } },
          ],
          responses: { ...recruiterErrors, 200: jsonResponse('Page and totals across all matching pages', { type: 'object', properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/RecruiterEmail' } },
            summary: { type: 'object', properties: { emails: { type: 'integer' }, recruiters: { type: 'integer', description: 'Distinct case-insensitive recipient addresses' } } },
            pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } },
          } }) },
        },
        post: {
          summary: 'Create one email or up to 50; return every row outcome',
          description: 'Requires Write scope and recruiter_emails.use. Counts once toward the hourly API limit per request. Source uniqueness is owner + provider + mailbox_id + message_id. Reimports never overwrite edits; deleted imports return ignored. Follow-ups use distinct message IDs. Inspect results even on HTTP 200/201; batches may partially fail. Retry imports with unchanged source identity.',
          requestBody: { required: true, content: { 'application/json': { schema: { oneOf: [{ $ref: '#/components/schemas/RecruiterEmailInput' }, { type: 'object', additionalProperties: false, required: ['emails'], properties: { emails: { type: 'array', minItems: 1, maxItems: 50, items: { $ref: '#/components/schemas/RecruiterEmailInput' } } } }] } } } },
          responses: { ...recruiterErrors, 200: jsonResponse('No new rows; inspect per-row results', recruiterBatchResponse), 201: jsonResponse('At least one row created; inspect per-row results', recruiterBatchResponse) },
        },
      },
      '/recruiter-emails/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        get: { summary: 'Read an owned recruiter email', responses: { ...recruiterErrors, 404: { description: 'Missing, deleted or another account’s record' }, 200: jsonResponse('Email metadata', { type: 'object', properties: { data: recruiterRecord } }) } },
        patch: { summary: 'Update owned email metadata; source IDs are immutable', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RecruiterEmailUpdate' } } } }, responses: { ...recruiterErrors, 404: { description: 'Email not found' }, 200: jsonResponse('Updated metadata', { type: 'object', properties: { data: recruiterRecord } }) } },
        delete: { summary: 'Website-session-only deletion', description: 'API keys and MCP cannot delete. Scrubs content and retains minimal identity to suppress reimports. Requires active membership and recruiter_emails.use.', security: [{ websiteSession: [] }], responses: { ...recruiterErrors, 404: { description: 'Email not found' }, 200: jsonResponse('Deleted', { type: 'object', properties: { deleted: { const: true } } }) } },
      },
      "/me": { get: { summary: "Inspect the current key and member", responses: { 200: { description: "Identity" } } } },
      "/applications": {
        get: {
          summary: "List owned applications",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
            { name: "month", in: "query", schema: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}$" } },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Paginated applications" } },
        },
        post: {
          summary: "Create one application or a batch of up to 50",
          requestBody: { required: true, content: { "application/json": { schema: { oneOf: [{ $ref: "#/components/schemas/ApplicationInput" }, { type: "object", properties: { applications: { type: "array", maxItems: 50, items: { $ref: "#/components/schemas/ApplicationInput" } } } }] } } } },
          responses: { 201: { description: "Created with per-row results" } },
        },
      },
      "/applications/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        get: { summary: "Read one owned application", responses: { 200: { description: "Application" } } },
        patch: { summary: "Update one owned application", responses: { 200: { description: "Updated application" } } },
      },
    },
  });
}
