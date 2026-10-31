# Recruiter Outreach — October 23, 2026

Implemented on `recruiter-outreach`; all changes remain local. No deployment, push, hosted database modification, or production account testing was performed.

- Added an account-owned tracker at `/recruiter-outreach`, matching the existing application tracker styling: manual and bulk entry, search, inclusive UTC date filters, pagination, edit/delete, email totals and distinct recruiter counts. Account navigation and the `recruiter_emails.use` permission keep access independent of application tracking.
- Added the `recruiter_emails` migration with owner-only reads, API-controlled writes, date and source identity indexes, and filtered summary counts. Only metadata is stored. Outreach never changes application counts, requirements, or fines.
- Added list/read/single and bulk create/update routes plus website-session-only deletion. Existing authentication enforces active membership, current permissions, key scopes and ownership. Batches of 1–50 return per-row outcomes and consume one API audit count per request.
- Source uniqueness uses owner + provider + mailbox + message ID. Reimports preserve edits. Deletion scrubs email metadata while retaining the source identity needed to suppress reimports. Follow-ups use separate message IDs; multiple mailboxes and recipients are supported.
- Added five MCP tools, integration instructions, a downloadable outreach guide, and OpenAPI schemas. Imports require a separately authorized email connector, complete pagination, review of uncertain matches, original timestamps, metadata only, safe retries, and explicit reporting of incomplete scans and upload failures. Email content is treated as untrusted data. No mailbox OAuth or scheduling was added.
- Added the [database-owner release handoff](docs/recruiter-outreach-release.md), owner instructions on the existing migration, the complete MCP tool list and local connection setup, and recruiter tests in CI. The owner must apply the migration before the website/API and MCP releases; no migrations run automatically.

## Verification

- 36 recruiter tests passed: validation, real API/auth handlers with an in-memory database boundary, source retries and deletion, ownership, revoked/read-only/restricted keys, permissions, pagination, partial failures, 50-row audit counting, form timezone/precision preservation, and API/MCP contracts.
- Existing suites passed: 22 member tests, 6 application tests, 140 job-board tests.
- Lint passed with existing image warnings in unrelated files. The local optimized build passed; its existing Google Font dependency required network access.
- Isolated Chrome fixture checks passed for pagination, editing, timestamp/name preservation, multiple recipients, partial bulk failures/retry, search, date-filter wiring, deletion, mobile overflow, and keyboard dismissal. Desktop/mobile screenshots were visually inspected; no browser runtime errors were reported. These checks did not use a live account.
- Independent review completed, including a second PR-readiness review and another passing run of all 36 recruiter tests. MCP TypeScript transpilation and schema/handler compatibility checks passed using local tooling and simulated network responses.
- PR preparation passed lint again, the actual Deno 2 type check used by CI, documentation link checks, and independent review of the final docs/CI changes. Only documentation, migration comments, and CI wiring changed in this pass; the earlier build/browser results were not rerun.

## Local startup and account verification

After disk space was freed, Docker became available. The global CLI failed local initialization because its Realtime image lacked the expected container user. The project's pinned Supabase CLI 2.93.0 successfully started an isolated `ktp-outreach-local` stack, configured under `/private/tmp/ktp-outreach-local` with no hosted project link.

- Initialized local-only profile and permission dependencies, then applied the actual application/API-key and recruiter migrations through the Supabase CLI. This is a feature test environment, not a full production-schema clone; unrelated site features are not populated.
- Created two local test accounts and an ignored `.env.local` containing only loopback Supabase configuration. Credentials are kept in private local files, not committed or printed.
- Real local sign-in and HTTP API checks passed: CRUD, imports/follow-ups, multiple recipients, partial failures, pagination, cross-account isolation, immutable source IDs, preserved edits, deletion suppression, and read-only/revoked keys. Verification emails were removed and test API keys revoked.
- All 15 transactional database assertions passed. The first run lost its connection while wrapping a denied SQL-function call in `throws_ok`; the reason remains unconfirmed. The aggregate-access assertion now checks PostgreSQL's effective function privileges directly, with independent review confirming the coverage.
- The Next.js development server is available at `http://localhost:3000`. Local login details are in `/private/tmp/ktp-outreach-local/LOGIN.txt`.

- Started the MCP function in the isolated local stack with an explicit local API target. Actual Deno Edge Runtime initialization, discovery of all five recruiter tools, and authenticated listing through the local API passed. The temporary verification key was revoked.

No production service, database, account, or deployment was modified. Real-mailbox import and write calls through the exact Deno/MCP edge runtime remain unverified; API writes and MCP handler compatibility were checked separately. No additional migration was run during PR preparation.
