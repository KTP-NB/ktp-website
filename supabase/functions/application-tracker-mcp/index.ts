import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { z } from "zod";

const FUNCTION_NAME = "application-tracker-mcp";
const DEFAULT_API_BASE_URL = "https://www.ktpnewbrunswick.org";
const API_BASE_URL = (Deno.env.get("KTP_API_BASE_URL") || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
const API_KEY_PATTERN = /^Bearer\s+(ktp_live_[A-Za-z0-9_-]+)$/;
const ALLOWED_ORIGINS = new Set([
  "https://www.ktpnewbrunswick.org",
  "https://ktpnewbrunswick.org",
  "http://localhost:3000",
  "http://localhost:3001",
]);

const applicationStatus = z.enum([
  "applied",
  "assessment",
  "interviewing",
  "rejected",
  "offer",
  "withdrawn",
]);

const applicationFields = {
  company: z.string().trim().min(1).max(160),
  position: z.string().trim().min(1).max(200),
  date_applied: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: applicationStatus.optional(),
  details: z.string().max(5000).nullable().optional(),
  application_url: z.string().url().nullable().optional(),
  referral: z.boolean().optional(),
  referral_contact: z.string().max(200).nullable().optional(),
};

const createApplicationSchema = z.object({
  ...applicationFields,
  external_id: z.string().trim().min(1).max(300).optional(),
});

const updateApplicationSchema = z.object({
  application_id: z.string().uuid(),
  ...Object.fromEntries(
    Object.entries(applicationFields).map(([key, schema]) => [key, schema.optional()]),
  ),
}).refine(
  (value) => Object.keys(value).some((key) => key !== "application_id"),
  { message: "Provide at least one application field to update." },
);

function toolResult(data: unknown, message?: string) {
  return {
    content: [{
      type: "text" as const,
      text: message ? `${message}\n\n${JSON.stringify(data, null, 2)}` : JSON.stringify(data, null, 2),
    }],
  };
}

function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected MCP tool error.";
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

async function apiRequest(
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const apiMessage = body?.error?.message || body?.error || `KTP API request failed (${response.status}).`;
    throw new Error(String(apiMessage));
  }
  return body;
}

function createMcp(apiKey: string) {
  const mcp = new McpServer({
    name: "ktp-application-tracker",
    version: "1.0.0",
    schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
  });

mcp.tool("get_my_profile", {
  description: "Return the KTP member and API-key scopes associated with this connection.",
  handler: async () => {
    try {
      return toolResult(await apiRequest(apiKey, "/api/v1/me"));
    } catch (error) {
      return toolError(error);
    }
  },
});

mcp.tool("list_applications", {
  description: "List the authenticated member's applications, optionally filtered by month or status.",
  inputSchema: z.object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
    status: applicationStatus.optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  handler: async (args) => {
    try {
      const query = new URLSearchParams({ page: String(args.page), limit: String(args.limit) });
      if (args.month) query.set("month", args.month);
      if (args.status) query.set("status", args.status);
      return toolResult(await apiRequest(apiKey, `/api/v1/applications?${query}`));
    } catch (error) {
      return toolError(error);
    }
  },
});

mcp.tool("get_application", {
  description: "Get one application owned by the authenticated member.",
  inputSchema: z.object({ application_id: z.string().uuid() }),
  handler: async ({ application_id }) => {
    try {
      return toolResult(await apiRequest(apiKey, `/api/v1/applications/${application_id}`));
    } catch (error) {
      return toolError(error);
    }
  },
});

mcp.tool("add_application", {
  description: "Add one internship or job application. Company and position are required.",
  inputSchema: createApplicationSchema,
  handler: async (args) => {
    try {
      const result = await apiRequest(apiKey, "/api/v1/applications", {
        method: "POST",
        body: JSON.stringify(args),
      });
      return toolResult(result, "Application submission processed.");
    } catch (error) {
      return toolError(error);
    }
  },
});

mcp.tool("add_applications_bulk", {
  description: "Add between 1 and 50 internship or job applications in one request.",
  inputSchema: z.object({ applications: z.array(createApplicationSchema).min(1).max(50) }),
  handler: async (args) => {
    try {
      const result = await apiRequest(apiKey, "/api/v1/applications", {
        method: "POST",
        body: JSON.stringify(args),
      });
      return toolResult(result, "Bulk application submission processed.");
    } catch (error) {
      return toolError(error);
    }
  },
});

mcp.tool("update_application", {
  description: "Update supported fields on one application owned by the authenticated member.",
  inputSchema: updateApplicationSchema,
  handler: async (args) => {
    try {
      const { application_id, ...updates } = args;
      return toolResult(await apiRequest(apiKey, `/api/v1/applications/${application_id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }), "Application updated.");
    } catch (error) {
      return toolError(error);
    }
  },
});

  return mcp;
}

const app = new Hono();
const mcpApp = new Hono();

mcpApp.get("/", (ctx) => ctx.json({
  name: "KTP Application Tracker MCP",
  version: "1.0.0",
  endpoints: { mcp: "/mcp", health: "/health" },
}));
mcpApp.get("/health", (ctx) => ctx.json({ status: "ok" }));
mcpApp.all("/mcp", async (ctx) => {
  const origin = ctx.req.header("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return ctx.json({ error: "Origin not allowed." }, 403);
  const authorization = ctx.req.header("Authorization") || "";
  const match = authorization.match(API_KEY_PATTERN);
  if (!match) return ctx.json({ error: "A valid KTP API key is required." }, 401);
  const httpHandler = new StreamableHttpTransport().bind(createMcp(match[1]));
  return httpHandler(ctx.req.raw);
});
app.route(`/${FUNCTION_NAME}`, mcpApp);

Deno.serve(app.fetch);
