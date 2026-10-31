# Recruiter outreach release handoff

Recruiter outreach adds an account-owned sent-email tracker, separate from job applications, their requirements, and fines. The website, API, MCP tools, and documentation are included in this branch. This handoff does not authorize or perform a deployment.

## Required database-owner action

The migration is [`supabase/migrations/20261021120000_recruiter_emails.sql`](../supabase/migrations/20261021120000_recruiter_emails.sql). Use this single file; do not create or run a second copy of the same migration.

**The database/account owner must apply this migration once before the application release. No hosted migration has been run as part of this work.** The migration was previously verified only against an isolated local test database. Application startup, builds, and CI do not apply it.

Before applying it, the owner must confirm the intended database, normal backup/recovery arrangements, and migration history. The target must already have the existing KTP schema, including:

- Supabase Auth and the `anon`, `authenticated`, and `service_role` roles.
- `public.permission_definitions`, `public.role_permissions`, and `public.has_role_permission(uuid, text)` from the existing role-permission setup (`20260927090000_role_permission_management.sql`).
- `public.set_updated_at()`, the trigger function already used by the application tables. Its original definition is not in the checked-in migration history; this release is an upgrade to an existing database, not a standalone empty-database bootstrap.

The owner can check prerequisites without modifying data:

```sql
select
  to_regclass('public.permission_definitions') as permission_definitions,
  to_regclass('public.role_permissions') as role_permissions,
  to_regprocedure('public.has_role_permission(uuid,text)') as permission_helper,
  to_regprocedure('public.set_updated_at()') as timestamp_helper;
```

All four results must be non-null. Apply the complete migration through the owner's established migration process, retaining its `begin`/`commit` transaction. It creates new objects and is deliberately not rerunnable. If applied manually as SQL, reconcile that application with the team's migration history before a later migration runner encounters it. Do not apply it manually and then run it a second time through the migration runner. A failure rolls back this transaction; resolve the cause before retrying.

The migration adds:

- `public.recruiter_emails` with metadata fields, source identity uniqueness, and an index for each owner's visible messages ordered by sent time.
- Owner/permission RLS for visible reads; no direct client writes. API/MCP additionally require active membership and validate every operation.
- A service-role-only `recruiter_email_summary` function for filtered email and distinct-recipient totals.
- `recruiter_emails.use`, initially granted to roles that currently have `applications.use`. This is a one-time initial grant; the permissions remain independently configurable afterward. Review custom roles or personal application permissions separately.

It does not read mailboxes, import data, change existing application rows, or alter application requirements/fines. Imported deletions retain the minimal source identity needed to suppress reimports; preserve these records during future maintenance.

## Release order and verification

1. The database owner applies and records the migration, then verifies the table, indexes, RLS, permission grants, and summary function.
2. The application owner releases the Next.js website/API. Confirm `/recruiter-outreach`, `/integrations`, the downloadable import guide, and `/api/v1/openapi` are available.
3. The function owner releases `ktp-new-brunswick-mcp` with the intended `KTP_API_BASE_URL`. See the [MCP README](../supabase/functions/ktp-new-brunswick-mcp/README.md). The MCP must target the updated API; deploying the website alone does not update the function.
4. With an approved test account, verify the tracker and the five MCP tools: `list_recruiter_emails`, `get_recruiter_email`, `add_recruiter_email`, `add_recruiter_emails_bulk`, and `update_recruiter_email`. Check that a duplicate import preserves edits, a follow-up with a new message ID is distinct, and website deletion suppresses reimport. Use disposable test metadata for deletion checks.
5. Confirm a Read-only key cannot write, a revoked key cannot read, and another account cannot read or update the test record. Confirm application totals are unchanged. These are release-owner checks, not claims that hosted account testing has already passed.

If the release needs to be rolled back, revert the application/function release while retaining the additive database objects and imported data. There is no destructive down migration. The database owner should decide any later removal after preserving records and deletion-suppression identities.

## Validation evidence and limits

- Recruiter suite: 36 tests for validation, permissions, revoked/read-only keys, cross-account access, immutable source IDs, multiple recipients/mailboxes, follow-ups, duplicates, deletion suppression, pagination, partial failures, and per-request bulk audit counting. CI now runs this suite.
- Existing member, application, and job-board suites passed. Lint and the optimized build passed, with existing unrelated image warnings during lint.
- PR preparation repeated lint and passed the Deno 2 type check used by CI. Documentation links and the final diff were checked independently. No runtime code changed in this preparation pass, so the previously passing build and browser checks were not repeated.
- Fixture browser checks passed for desktop/mobile entry, editing, filtering, pagination, deletion, and partial-batch retries. These checks simulate API/auth responses.
- Earlier local account checks passed against an isolated Supabase stack, and all 15 transactional database assertions passed. The local database contains only the schema dependencies needed for this feature; it is not a full production clone.
- The actual local Deno Edge Runtime passed MCP initialization, discovery of all five recruiter tools, and an authenticated recruiter listing through the local API. Import/update calls through that runtime and a real mailbox scan have not been verified here; API writes and MCP handler compatibility were tested separately.

The [API and import guide](../public/docs/recruiter-outreach.md) documents the separately authorized email connector, complete sent-mail pagination, uncertain-match review, metadata-only uploads, and safe retries. KTP MCP itself grants no mailbox access. No direct mailbox OAuth or scheduling is included.

## Note for the eventual PR

> **Database-owner action required before release:** Apply `supabase/migrations/20261021120000_recruiter_emails.sql` once using the normal migration process. This PR does not run migrations; no hosted database migration or deployment has been performed. Release the migration first, the Next.js website/API second, and the updated MCP Edge Function last. See `docs/recruiter-outreach-release.md` for prerequisites, verification, and rollback considerations.
