import { NextResponse } from "next/server";

export async function GET(request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    openapi: "3.1.0",
    info: { title: "KTP Internship Tracker API", version: "1.0.0" },
    servers: [{ url: `${origin}/api/v1` }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "KTP API key" } },
      schemas: {
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
