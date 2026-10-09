import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { z } from "zod";

const FUNCTION_NAME = "ktp-new-brunswick-mcp";
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

const noInput = z.object({});
const uuid = z.string().uuid();
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).describe("Month in YYYY-MM format.");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date in YYYY-MM-DD format.");
const accessRole = z.enum(["pledge", "member", "manager", "admin", "super_admin"]);
const adminPermission = z.enum([
  "members.manage",
  "resumes.manage",
  "coderank.manage",
  "applications.manage",
  "fines.manage",
]);
const assignment = z.object({
  type: z.enum(["all", "pledge_class", "user"]),
  value: z.string().optional().describe(
    "Pledge class name for pledge_class, or the member's user_id (not member id) for user. Omit for all.",
  ),
});

const fineFields = {
  description: z.string().trim().min(1).max(200),
  amount: z.number().min(0).max(100000),
  date_issued: date.optional(),
  due_date: date.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paid: z.boolean().optional(),
  paid_on: date.optional(),
};

const assessmentFields = {
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  time_limit_minutes: z.number().min(0).describe("Use 0 for no time limit."),
  max_submissions_per_question: z.number().int().min(1).optional(),
  published: z.boolean().optional(),
  publish_at: z.string().nullable().optional().describe("ISO timestamp, or null to release immediately."),
  due_at: z.string().nullable().optional().describe("ISO timestamp, or null for no deadline."),
  randomize_question_order: z.boolean().optional(),
};

type Json = Record<string, unknown>;
type Access = { role: string; permissions: Set<string> };

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

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
    const details = body?.error?.details ? `\n${JSON.stringify(body.error.details, null, 2)}` : "";
    throw new ApiError(`${String(apiMessage)}${details}`, response.status);
  }
  return body;
}

function withQuery(path: string, values: Record<string, unknown>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

/**
 * Builds the tool list for one caller. A tool is only registered when the
 * caller's role or personal grants include its permission, so members never
 * see admin tools. This is presentation only: the KTP API re-checks the same
 * permission on every request.
 */
function createMcp(apiKey: string, access: Access) {
  const mcp = new McpServer({
    name: "ktp-new-brunswick",
    version: "2.0.0",
    schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
  });

  const isSuperAdmin = access.role === "super_admin";
  const can = (permission: string) => isSuperAdmin || access.permissions.has(permission);
  const get = (path: string) => apiRequest(apiKey, path);
  const send = (method: string, path: string, body?: unknown) =>
    apiRequest(apiKey, path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

  function tool<Schema extends z.ZodType>(
    allowed: boolean,
    name: string,
    description: string,
    inputSchema: Schema,
    run: (args: z.infer<Schema>) => Promise<unknown>,
    message?: string,
  ) {
    if (!allowed) return;
    mcp.tool(name, {
      description,
      inputSchema,
      handler: async (args: z.infer<Schema>) => {
        try {
          return toolResult(await run(args), message);
        } catch (error) {
          return toolError(error);
        }
      },
    });
  }

  // PUT /api/admin/members/{id} expects the whole form, so resend the member's
  // current status and application target alongside the requested changes.
  async function updateMember(memberId: string, changes: Json) {
    const list = await get("/api/admin/members") as { members: Json[]; chapterDefault: number };
    const current = list.members.find((member) => member.id === memberId);
    if (!current) throw new Error("Member not found.");
    return {
      current,
      chapterDefault: list.chapterDefault,
      save: (extra: Json = {}) =>
        send("PUT", `/api/admin/members/${memberId}`, {
          member_status: current.member_status,
          current_application_target: current.current_application_target,
          uses_default_application_target: current.uses_default_application_target,
          ...changes,
          ...extra,
        }),
    };
  }

  // ---- Member account ------------------------------------------------------

  tool(
    true,
    "get_my_profile",
    "Return the KTP member, access role, permissions, and API-key scopes associated with this connection.",
    noInput,
    () => get("/api/v1/me"),
  );

  tool(
    can("account.profile"),
    "get_my_profile_details",
    "Return the authenticated member's own profile (name, position, pledge class, major, LinkedIn, status).",
    noInput,
    () => get("/api/v1/profile"),
  );

  tool(
    can("account.profile"),
    "update_my_profile_details",
    "Update the authenticated member's own profile. Only name, graduation year, major, minors, and LinkedIn URL can be changed.",
    z.object({
      name: z.string().trim().min(1).max(120).optional(),
      graduation_year: z.string().max(20).nullable().optional(),
      major: z.string().max(200).nullable().optional(),
      minors: z.string().max(200).nullable().optional(),
      linkedin_url: z.string().url().nullable().optional(),
    }).refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." }),
    (args) => send("PATCH", "/api/v1/profile", args),
    "Profile updated.",
  );

  // ---- Applications --------------------------------------------------------

  tool(
    can("applications.use"),
    "list_applications",
    "List the authenticated member's applications, optionally filtered by month or status.",
    z.object({
      month: month.optional(),
      status: applicationStatus.optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(50),
    }),
    (args) => get(withQuery("/api/v1/applications", args)),
  );

  tool(
    can("applications.use"),
    "get_application",
    "Get one application owned by the authenticated member.",
    z.object({ application_id: uuid }),
    ({ application_id }) => get(`/api/v1/applications/${application_id}`),
  );

  tool(
    can("applications.use"),
    "add_application",
    "Add one internship or job application. Company and position are required.",
    createApplicationSchema,
    (args) => send("POST", "/api/v1/applications", args),
    "Application submission processed.",
  );

  tool(
    can("applications.use"),
    "add_applications_bulk",
    "Add between 1 and 50 internship or job applications in one request.",
    z.object({ applications: z.array(createApplicationSchema).min(1).max(50) }),
    (args) => send("POST", "/api/v1/applications", args),
    "Bulk application submission processed.",
  );

  tool(
    can("applications.use"),
    "update_application",
    "Update supported fields on one application owned by the authenticated member.",
    updateApplicationSchema,
    ({ application_id, ...updates }) => send("PATCH", `/api/v1/applications/${application_id}`, updates),
    "Application updated.",
  );

  tool(
    can("applications.use"),
    "get_application_progress",
    "Show how many applications the authenticated member has submitted against their monthly requirement. Defaults to the current month.",
    z.object({ month: month.optional() }),
    (args) => get(withQuery("/api/v1/applications/progress", args)),
  );

  // ---- Other member tools --------------------------------------------------

  tool(
    can("fines.view"),
    "get_my_fines",
    "List the authenticated member's own fines with paid/overdue status and an account summary.",
    noInput,
    () => get("/api/v1/fines"),
  );

  tool(
    can("resumes.use"),
    "get_my_resume",
    "Return the authenticated member's uploaded resume link and any feedback left by reviewers.",
    noInput,
    () => get("/api/v1/resume"),
  );

  tool(
    can("coderank.take"),
    "list_my_assessments",
    "List the CodeRank assessments currently assigned to the authenticated member and their attempt status. Assessments must be taken on the website.",
    noInput,
    () => get("/api/coderank/assigned"),
  );

  tool(
    can("company_questions.use"),
    "list_company_question_companies",
    "List companies that have LeetCode company-tagged questions, most questions first.",
    z.object({
      search: z.string().max(80).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(200).default(50),
    }),
    (args) => get(withQuery("/api/v1/company-questions", args)),
  );

  tool(
    can("company_questions.use"),
    "list_company_questions",
    "List LeetCode questions tagged for one company. Use the company slug from list_company_question_companies.",
    z.object({
      company: z.string().trim().min(1).max(80).describe("Company slug, for example capital-one."),
      timeframe: z.string().optional().describe("Interview window slug; defaults to the most recent available."),
      difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
      topic: z.string().optional().describe("Topic slug, for example dynamic-programming."),
      search: z.string().max(120).optional(),
      sort: z.enum(["frequency", "ac_rate_asc", "ac_rate_desc", "title", "difficulty"]).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(50),
    }),
    ({ company, ...filters }) =>
      get(withQuery(`/api/v1/company-questions/${encodeURIComponent(company.toLowerCase())}`, filters)),
  );

  tool(
    can("study_tools.use"),
    "list_study_files",
    "Browse the chapter study-tools library. Returns sub-folders and files with download links that expire after one hour.",
    z.object({ path: z.string().max(500).optional().describe("Folder path; omit for the top level.") }),
    (args) => get(withQuery("/api/v1/study-tools", args)),
  );

  // ---- Admin: members ------------------------------------------------------

  tool(
    can("members.manage"),
    "admin_list_members",
    "List every member profile with status, pledge class, access role, and monthly application target.",
    z.object({
      search: z.string().max(80).optional().describe("Filter by name or email."),
      member_status: z.string().optional(),
      pledge_class: z.string().optional(),
    }),
    async ({ search, member_status, pledge_class }) => {
      const result = await get("/api/admin/members") as { members: Json[] } & Json;
      const term = (search || "").toLowerCase();
      const same = (a: unknown, b: string) => String(a || "").toLowerCase() === b.toLowerCase();
      const members = result.members.filter((member) =>
        (!term || `${member.name} ${member.email}`.toLowerCase().includes(term)) &&
        (!member_status || same(member.member_status, member_status)) &&
        (!pledge_class || same(member.pledge_class, pledge_class))
      );
      return { ...result, members };
    },
  );

  tool(
    can("members.manage"),
    "admin_invite_member",
    "Create a member profile and email that person an invitation to set their password.",
    z.object({
      name: z.string().trim().min(1),
      email: z.string().email(),
      position: z.string().trim().min(1),
      pledge_class: z.string().trim().min(1),
      graduation_year: z.string().trim().min(1),
      major: z.string().trim().min(1),
      minors: z.string().optional(),
      linkedin_url: z.string().url().optional(),
      public_directory_visible: z.boolean().optional(),
      current_application_target: z.number().int().min(0).max(1000).optional(),
    }),
    (args) => send("POST", "/api/admin/members", args),
    "Invitation sent.",
  );

  tool(
    can("members.manage"),
    "admin_update_member",
    "Update a member's profile fields, status, or monthly application target. Access roles are changed with admin_set_member_access.",
    z.object({
      member_id: uuid,
      name: z.string().trim().min(1).optional(),
      email: z.string().email().optional(),
      position: z.string().optional(),
      pledge_class: z.string().optional(),
      member_status: z.string().optional().describe("For example Active, Inactive, or Alumni."),
      graduation_year: z.string().optional(),
      major: z.string().optional(),
      minors: z.string().nullable().optional(),
      linkedin_url: z.string().nullable().optional(),
      executive_board: z.boolean().optional(),
      committees: z.array(z.string()).optional(),
      sort_order: z.number().int().optional(),
      public_directory_visible: z.boolean().optional(),
      monthly_application_target: z.number().int().min(0).max(1000).optional(),
    }),
    async ({ member_id, monthly_application_target, ...changes }) => {
      const member = await updateMember(member_id, changes);
      if (monthly_application_target === undefined) return member.save();
      return member.save({
        current_application_target: monthly_application_target,
        uses_default_application_target: monthly_application_target === member.chapterDefault,
      });
    },
    "Member updated.",
  );

  tool(
    can("members.manage"),
    "admin_list_invite_links",
    "List the shareable join links created for new members and pledges.",
    noInput,
    () => get("/api/admin/invites"),
  );

  tool(
    can("members.manage"),
    "admin_create_invite_link",
    "Create a shareable join link. The link is returned once and lets people create a member or pledge account.",
    z.object({
      label: z.string().trim().min(1),
      expires_at: z.string().describe("ISO timestamp when the link stops working."),
      access_role: z.enum(["member", "pledge"]).optional(),
      pledge_class: z.string().optional(),
      default_application_target: z.number().int().min(0).max(1000).optional(),
      public_directory_visible: z.boolean().optional(),
      allowed_emails: z.string().optional().describe("Comma- or space-separated emails; omit to allow anyone."),
      max_uses: z.number().int().min(1).optional(),
    }),
    (args) => send("POST", "/api/admin/invites", args),
    "Invite link created.",
  );

  tool(
    isSuperAdmin && can("members.manage"),
    "admin_set_member_access",
    "Super Admin only. Change a member's access role, their personal admin permissions (only kept for admin and manager roles), or block them from LC Company Tagged.",
    z.object({
      member_id: uuid,
      access_role: accessRole.optional(),
      manager_permissions: z.array(adminPermission).optional(),
      company_questions_blocked: z.boolean().optional(),
    }).refine(
      (value) => Object.keys(value).some((key) => key !== "member_id"),
      { message: "Provide at least one access setting to change." },
    ),
    async ({ member_id, access_role, manager_permissions, company_questions_blocked }) => {
      const member = await updateMember(member_id, {});
      const extra: Json = {};
      if (access_role !== undefined || manager_permissions !== undefined) {
        extra.access_role = access_role ?? member.current.access_role;
        extra.manager_permissions = manager_permissions ?? member.current.manager_permissions ?? [];
      }
      if (company_questions_blocked !== undefined) extra.company_questions_blocked = company_questions_blocked;
      return member.save(extra);
    },
    "Member access updated.",
  );

  tool(
    isSuperAdmin && can("members.manage"),
    "admin_remove_member",
    "Super Admin only. Permanently delete a member's profile and login. This cannot be undone.",
    z.object({
      member_id: uuid,
      confirm_member_name: z.string().describe("The member's exact name, to confirm the right account is removed."),
    }),
    async ({ member_id, confirm_member_name }) => {
      const member = await updateMember(member_id, {});
      if (String(member.current.name || "").trim().toLowerCase() !== confirm_member_name.trim().toLowerCase()) {
        throw new Error(`Name does not match. That member id belongs to "${member.current.name}".`);
      }
      return send("DELETE", `/api/admin/members/${member_id}`);
    },
    "Member removed.",
  );

  // ---- Admin: access roles -------------------------------------------------

  tool(
    can("roles.manage"),
    "admin_get_role_permissions",
    "Show every access role, every permission, and which permissions each role currently has.",
    noInput,
    () => get("/api/admin/access-roles"),
  );

  tool(
    isSuperAdmin,
    "admin_set_role_permissions",
    "Super Admin only. Replace the full permission list for one access role. Any permission left out is removed from that role.",
    z.object({
      role_key: z.enum(["pledge", "member", "manager", "admin"]),
      permissions: z.array(z.string()).describe("Complete list of permission keys the role should have."),
    }),
    (args) => send("PUT", "/api/admin/access-roles", args),
    "Role permissions replaced.",
  );

  // ---- Admin: fines --------------------------------------------------------

  tool(
    can("fines.manage"),
    "admin_fines_overview",
    "Fine tracker: chapter totals, a per-member balance summary, and the fine log.",
    z.object({
      member_id: uuid.optional().describe("Limit the result to one member."),
      unpaid_only: z.boolean().optional(),
      include_fines: z.boolean().default(true).describe("Set false to return only totals and member balances."),
    }),
    async ({ member_id, unpaid_only, include_fines }) => {
      const result = await get("/api/fines/admin/overview") as { members: Json[]; fines: Json[]; totals: Json };
      const members = result.members
        .filter((member) => !member_id || member.id === member_id)
        .filter((member) => !unpaid_only || Number(member.outstanding) > 0)
        .map(({ photo_url: _photo, ...member }) => member);
      const fines = result.fines
        .filter((fine) => !member_id || fine.member_id === member_id)
        .filter((fine) => !unpaid_only || !fine.paid);
      return { totals: result.totals, members, ...(include_fines ? { fines } : {}) };
    },
  );

  tool(
    can("fines.manage"),
    "admin_create_fine",
    "Issue the same fine to one or more members (up to 500).",
    z.object({ member_ids: z.array(uuid).min(1).max(500), ...fineFields }),
    (args) => send("POST", "/api/fines/admin/entries", args),
    "Fine created.",
  );

  tool(
    can("fines.manage"),
    "admin_update_fine",
    "Edit one fine, for example to mark it paid or change its amount or due date.",
    z.object({
      fine_id: uuid,
      ...Object.fromEntries(Object.entries(fineFields).map(([key, schema]) => [key, schema.optional()])),
    }).refine(
      (value) => Object.keys(value).some((key) => key !== "fine_id"),
      { message: "Provide at least one fine field to update." },
    ),
    ({ fine_id, ...updates }) => send("PATCH", `/api/fines/admin/entries/${fine_id}`, updates),
    "Fine updated.",
  );

  tool(
    can("fines.manage"),
    "admin_delete_fine",
    "Permanently delete one fine from the tracker.",
    z.object({ fine_id: uuid }),
    ({ fine_id }) => send("DELETE", `/api/fines/admin/entries/${fine_id}`),
    "Fine deleted.",
  );

  // ---- Admin: application tracker ------------------------------------------

  tool(
    can("applications.manage"),
    "admin_applications_overview",
    "Application tracker: every member's application count, target, and whether they met the requirement for a month. Defaults to the current month.",
    z.object({ month: month.optional() }),
    (args) => get(withQuery("/api/applications/admin/overview", args)),
  );

  tool(
    can("applications.manage"),
    "admin_get_member_applications",
    "List one member's applications and their monthly requirement history.",
    z.object({ member_id: uuid }),
    ({ member_id }) => get(`/api/applications/admin/members/${member_id}`),
  );

  tool(
    can("applications.manage"),
    "admin_set_member_application_target",
    "Override one member's application requirement for a single month, or clear the override with use_baseline.",
    z.object({
      member_id: uuid,
      month,
      target_count: z.number().int().min(0).max(1000).optional(),
      use_baseline: z.boolean().optional().describe("Remove the monthly override and return to the member's normal target."),
      exemption_reason: z.string().optional(),
    }).refine(
      (value) => value.use_baseline || value.target_count !== undefined,
      { message: "Provide target_count or set use_baseline." },
    ),
    ({ member_id, target_count, ...rest }) =>
      send("PUT", `/api/applications/admin/members/${member_id}`, { ...rest, target_count: target_count ?? 0 }),
    "Monthly requirement updated.",
  );

  tool(
    can("applications.manage"),
    "admin_get_application_settings",
    "Return the chapter-wide default application target and missed-requirement fine amount for a month.",
    z.object({ month }),
    (args) => get(withQuery("/api/applications/admin/settings", args)),
  );

  tool(
    can("applications.manage"),
    "admin_set_application_settings",
    "Set the chapter-wide default application target and missed-requirement fine amount for a month.",
    z.object({
      month,
      default_target: z.number().int().min(0).max(1000),
      fine_amount: z.number().min(0).max(10000),
    }),
    (args) => send("PUT", "/api/applications/admin/settings", args),
    "Application settings saved.",
  );

  tool(
    can("applications.manage"),
    "admin_process_application_fines",
    "Issue fines to every member who missed the application requirement for a month that has already ended. Members already fined for that month are skipped.",
    z.object({ month }),
    (args) => send("POST", "/api/applications/admin/fines/process", args),
    "Application fines processed.",
  );

  // ---- Admin: CodeRank -----------------------------------------------------

  tool(
    can("coderank.manage"),
    "admin_list_assessments",
    "List every CodeRank assessment with its questions and assignments.",
    noInput,
    () => get("/api/coderank/admin/assessments"),
  );

  tool(
    can("coderank.manage"),
    "admin_get_assessment",
    "Get one CodeRank assessment with question details and assignments.",
    z.object({ assessment_id: uuid }),
    ({ assessment_id }) => get(`/api/coderank/admin/assessments/${assessment_id}`),
  );

  tool(
    can("coderank.manage"),
    "admin_list_coderank_questions",
    "List the CodeRank question bank (id, title, difficulty, category) for building assessments.",
    noInput,
    () => get("/api/coderank/admin/questions"),
  );

  tool(
    can("coderank.manage"),
    "admin_create_assessment",
    "Create a CodeRank assessment, optionally with its questions and assignments.",
    z.object({
      ...assessmentFields,
      random_question_count: z.number().int().min(1).nullable().optional(),
      random_question_difficulties: z.array(z.string()).optional(),
      random_question_categories: z.array(z.string()).optional(),
      question_ids: z.array(uuid).optional().describe("Question ids in display order."),
      assignments: z.array(assignment).optional(),
    }),
    (args) => send("POST", "/api/coderank/admin/assessments", args),
    "Assessment created.",
  );

  tool(
    can("coderank.manage"),
    "admin_update_assessment",
    "Update a CodeRank assessment's settings. Expired assessments only accept published and due_at changes.",
    z.object({
      assessment_id: uuid,
      ...Object.fromEntries(Object.entries(assessmentFields).map(([key, schema]) => [key, schema.optional()])),
    }).refine(
      (value) => Object.keys(value).some((key) => key !== "assessment_id"),
      { message: "Provide at least one assessment field to update." },
    ),
    ({ assessment_id, ...updates }) => send("PATCH", `/api/coderank/admin/assessments/${assessment_id}`, updates),
    "Assessment updated.",
  );

  tool(
    can("coderank.manage"),
    "admin_set_assessment_questions",
    "Replace the full question list of a CodeRank assessment. Order of ids is the display order.",
    z.object({ assessment_id: uuid, question_ids: z.array(uuid) }),
    ({ assessment_id, question_ids }) =>
      send("PUT", `/api/coderank/admin/assessments/${assessment_id}/questions`, { question_ids }),
    "Assessment questions replaced.",
  );

  tool(
    can("coderank.manage"),
    "admin_set_assessment_assignments",
    "Replace who a CodeRank assessment is assigned to: everyone, pledge classes, or individual members.",
    z.object({ assessment_id: uuid, assignments: z.array(assignment) }),
    ({ assessment_id, assignments }) =>
      send("PUT", `/api/coderank/admin/assessments/${assessment_id}/assignments`, { assignments }),
    "Assessment assignments replaced.",
  );

  tool(
    can("coderank.manage"),
    "admin_delete_assessment",
    "Permanently delete a CodeRank assessment together with every attempt and submission made for it.",
    z.object({
      assessment_id: uuid,
      confirm_title: z.string().describe("The assessment's exact title, to confirm the right one is deleted."),
    }),
    async ({ assessment_id, confirm_title }) => {
      const current = await get(`/api/coderank/admin/assessments/${assessment_id}`) as { assessment: Json };
      if (String(current.assessment.title || "").trim().toLowerCase() !== confirm_title.trim().toLowerCase()) {
        throw new Error(`Title does not match. That assessment id belongs to "${current.assessment.title}".`);
      }
      return send("DELETE", `/api/coderank/admin/assessments/${assessment_id}`);
    },
    "Assessment deleted.",
  );

  tool(
    can("coderank.manage"),
    "admin_get_assessment_results",
    "Per-member results for one CodeRank assessment: status, score, time taken, and tab-switch count. Submitted code is left out unless include_code is true.",
    z.object({ assessment_id: uuid, include_code: z.boolean().default(false) }),
    async ({ assessment_id, include_code }) => {
      const result = await get(`/api/coderank/admin/assessments/${assessment_id}/results`) as { results: Json[] } & Json;
      if (include_code) return result;
      const results = result.results.map((row) => {
        const monitoring = row.monitoring as { left_count: number };
        const perQuestion = Object.fromEntries(
          Object.entries((row.per_question || {}) as Record<string, { attempts_used: number; best_submission: Json }>)
            .map(([questionId, entry]) => {
              const { code: _code, test_results: _tests, error_output: _errors, ...best } = entry.best_submission;
              return [questionId, { attempts_used: entry.attempts_used, best_submission: best }];
            }),
        );
        return { ...row, monitoring: { left_count: monitoring?.left_count ?? 0 }, per_question: perQuestion };
      });
      return { ...result, results };
    },
  );

  tool(
    can("coderank.manage"),
    "admin_rerun_submission",
    "Re-grade one CodeRank submission against every test case and return the report. The stored score is not changed.",
    z.object({ submission_id: uuid }),
    ({ submission_id }) => send("POST", `/api/coderank/admin/submissions/${submission_id}/rerun`),
  );

  tool(
    can("coderank.manage"),
    "admin_oa_compliance",
    "Show which members met the monthly online-assessment requirement. Defaults to the current month.",
    z.object({ month: month.optional() }),
    (args) => get(withQuery("/api/coderank/admin/oa-compliance", args)),
  );

  tool(
    isSuperAdmin,
    "admin_set_oa_credit",
    "Super Admin only. Override one member's online-assessment credit for a month. Pass completed: null to clear the override.",
    z.object({
      member_id: uuid,
      month,
      completed: z.boolean().nullable(),
      note: z.string().optional(),
    }),
    (args) => send("PUT", "/api/coderank/admin/oa-compliance", args),
    "OA credit updated.",
  );

  tool(
    can("coderank.manage"),
    "admin_get_member_review",
    "Get one member's details and resume feedback notes. The resume link is included only for callers who can manage resumes.",
    z.object({ member_id: uuid }),
    ({ member_id }) => get(`/api/coderank/admin/members/${member_id}`),
  );

  tool(
    can("coderank.manage"),
    "admin_set_resume_notes",
    "Save resume feedback notes for one member. The member can read these on their resume page.",
    z.object({ member_id: uuid, notes: z.string() }),
    ({ member_id, notes }) => send("PUT", `/api/coderank/admin/members/${member_id}`, { notes }),
    "Resume notes saved.",
  );

  // ---- Admin: resumes ------------------------------------------------------

  tool(
    can("resumes.manage"),
    "admin_list_resumes",
    "List every member with their uploaded resume link, if any.",
    z.object({ only_with_resume: z.boolean().optional() }),
    async ({ only_with_resume }) => {
      const result = await get("/api/admin/resumes") as { members: Json[] };
      return { members: result.members.filter((member) => !only_with_resume || member.resume_url) };
    },
  );

  return mcp;
}

async function loadAccess(apiKey: string): Promise<Access> {
  const me = await apiRequest(apiKey, "/api/v1/me") as {
    data: { member: { access_role?: string }; permissions?: string[] };
  };
  return {
    role: me.data.member.access_role || "member",
    // A site that predates the permission list only ever exposed applications.
    permissions: new Set(me.data.permissions ?? ["applications.use"]),
  };
}

const app = new Hono();
const mcpApp = new Hono();

mcpApp.get("/", (ctx) => ctx.json({
  name: "KTP New Brunswick MCP",
  version: "2.0.0",
  endpoints: { mcp: "/mcp", health: "/health" },
}));
mcpApp.get("/health", (ctx) => ctx.json({ status: "ok" }));
mcpApp.all("/mcp", async (ctx) => {
  const origin = ctx.req.header("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return ctx.json({ error: "Origin not allowed." }, 403);
  const authorization = ctx.req.header("Authorization") || "";
  const match = authorization.match(API_KEY_PATTERN);
  if (!match) return ctx.json({ error: "A valid KTP API key is required." }, 401);
  let access: Access;
  try {
    access = await loadAccess(match[1]);
  } catch (error) {
    const status = error instanceof ApiError && [401, 403, 429].includes(error.status) ? error.status : 502;
    const message = error instanceof Error ? error.message : "Unable to verify the KTP API key.";
    return ctx.json({ error: message }, status as 401 | 403 | 429 | 502);
  }
  const httpHandler = new StreamableHttpTransport().bind(createMcp(match[1], access));
  return httpHandler(ctx.req.raw);
});
app.route(`/${FUNCTION_NAME}`, mcpApp);

Deno.serve(app.fetch);
