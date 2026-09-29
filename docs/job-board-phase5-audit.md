# Job Board Phase 5 Audit

Phase 5 A1 audit of the current Job Board, ATS, notifications, admin, database, and resume infrastructure.

## Existing Architecture

The Job Board is implemented in the Next.js App Router under `app/job-board` with API routes under `app/api/job-board`. Shared server and domain code lives under `lib/job-board`.

The current stack matches the repository conventions:

- Next.js 14 App Router
- React 18 client components where needed
- JavaScript only for the Next application
- Tailwind CSS styling
- Supabase through `@supabase/supabase-js`
- Supabase migrations under `supabase/migrations`
- Node runtime for Job Board API routes
- Node built-in test runner for unit and integration-style tests

Job Board routes are wrapped by `app/job-board/layout.js` and the shared shell/nav components in `app/job-board/components`. The member-facing navigation currently exposes Dashboard, Saved, Applications, ATS, Recommendations, Notifications, and Settings.

The existing admin entry point is the general `/admin` portal. Job Board admin operations are a tab inside `app/admin/AdminPortalClient.jsx`, not a separate `/job-board/admin` route. This should remain the Phase 5 admin location to avoid duplicating admin navigation and authorization.

## Current Auth Protection

Member Job Board APIs use `requireJobBoardUser` from `lib/job-board/auth.js`.

That helper:

- extracts `Authorization: Bearer <token>` using `extractAccessToken`
- verifies the token through an anon Supabase client
- uses service-role clients only after authentication
- does not check active member status, so inactive/alumni users can access the Job Board as intended

Admin Job Board APIs use `requireJobBoardAdmin`.

Production admin access is based on `member_profiles.position` containing one of:

- `vp of tech development`
- `vp of prof development`

Local development can opt into Job Board-only admin access with:

- `JOB_BOARD_DEV_ADMIN_ENABLED=true`
- `NEXT_PUBLIC_JOB_BOARD_DEV_ADMIN_ENABLED=true`

That dev path is disabled when `NODE_ENV === 'production'` and only exposes the Job Board tab in the client portal.

## Supabase Client Patterns

Client-side Supabase setup is in `lib/supabase.js` and uses:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`

Job Board server helpers live in `lib/job-board/supabaseServer.js` and mirror the CodeRank server pattern in `lib/coderank/supabaseServer.js`.

Job Board server helpers expose:

- `getJobBoardServiceClient()`
- `getJobBoardUserClient(accessToken)`
- `extractAccessToken(request)`

Phase 5 should reuse these helpers for Next API routes. Supabase Edge Functions will need their own Deno-compatible client setup because they cannot import Next/Node modules directly.

## Current Database Schema

Current Job Board tables are created by:

- `20260715_job_board_phase_1.sql`
- `20260717_job_board_phase_2.sql`
- `20260724_job_board_phase_3_ats.sql`
- `20260806_job_board_phase_4_notifications_admin.sql`

Important existing tables:

- `job_board_jobs`
- `job_board_saved_jobs`
- `job_board_applications`
- `job_board_ats_analyses`
- `job_board_recommendations`
- `job_board_notification_preferences`
- `job_board_scraper_runs`
- `job_board_notification_logs`
- `job_board_resume_parses`
- `job_board_events`
- `job_board_notifications`

### Current Jobs Schema

`job_board_jobs` stores canonical display jobs today, but it is still source-local rather than cross-source canonical.

Key fields include:

- `id`
- `external_id`
- `source`
- `source_url`
- `company`
- `title`
- `department`
- `location`
- `workplace_type`
- `employment_type`
- `salary_range`
- `description`
- `responsibilities`
- `qualifications`
- `benefits`
- `apply_url`
- `status`
- `posted_at`
- `scraped_at`
- `created_at`
- `updated_at`
- `career_category`
- `normalized_keywords`
- `normalized_fingerprint`
- `source_payload`
- `last_seen_at`
- `inactive_at`

The current uniqueness rule is `unique (source, external_id)`.

Current status values:

- `draft`
- `open`
- `closed`
- `archived`

Current workplace values:

- `remote`
- `hybrid`
- `onsite`

Current employment values:

- `internship`
- `part_time`
- `full_time`
- `contract`
- `co_op`

Current career category values:

- `software_engineering`
- `data_analytics`
- `product`
- `cybersecurity`
- `business`
- `design`
- `other`

## Current Filtering Schema

`app/api/job-board/jobs/route.js` supports:

- full-text-ish search using `title`, `company`, and `description` `ilike`
- `career_category`
- `employment_type`
- `workplace_type`
- exact `company`
- `postedToday`
- saved-only mode
- pagination with `page` and `perPage`

The API returns available filter options from currently open jobs.

Current pagination options come from `lib/job-board/constants.js`:

- 5
- 10
- 20
- 50

Phase 5 can render live GitHub jobs through this same API once schema/category constraints are expanded.

## Current Saved Job Behavior

`app/api/job-board/saved-jobs/route.js` supports:

- `GET` saved job ids/notes for the user
- `POST` upsert by `(user_id, job_id)`
- `DELETE` by `(user_id, job_id)`

The database has `unique (user_id, job_id)`.

Saves and unsaves log `job_saved` and `job_unsaved` events through `job_board_events`.

## Current Application Tracking Behavior

`app/api/job-board/applications/route.js` supports:

- `GET` user applications joined to job summaries
- `POST` upsert by `(user_id, job_id)`

Current application statuses:

- `tracking`
- `applied`
- `interviewing`
- `offer`
- `rejected`
- `withdrawn`

Application changes log `application_status_updated` events.

The API currently accepts `body.result` in analytics metadata but the table does not have a dedicated `result` column. If Phase 5 analytics require result tracking, add a migration rather than relying only on event metadata.

## Current Ingestion and Deduplication

The previous ingestion stack was sample-source oriented:

- `lib/job-board/scraper/orchestrator.js`
- `lib/job-board/scraper/normalize.js`
- `lib/job-board/scraper/validate.js`
- `lib/job-board/scraper/dedupe.js`
- `lib/job-board/scraper/upsert.js`
- future fixture adapters for Greenhouse, Lever, Ashby, and custom pages

The retired sample adapter fetched jobs through HTTP and returned `body.jobs`.

The orchestrator flow is:

1. create `job_board_scraper_runs` row
2. fetch raw jobs through adapter
3. normalize
4. validate
5. dedupe within the fetched batch
6. upsert into `job_board_jobs`
7. finish run row

Current dedupe is source-local:

- in-memory batch key: `source:externalId || normalizedFingerprint`
- database lookup by `(source, external_id)`
- fallback database lookup by `(source, normalized_fingerprint)`

This is not sufficient for Phase 5 cross-source GitHub ingestion. Jobright and Simplify duplicates will need canonical URL/title logic plus a source link table.

## Current Logging Patterns

Operational logging exists in two forms:

- console helpers in `lib/job-board/logger.js`
- persisted events in `job_board_events`

Scraper run metrics are stored in `job_board_scraper_runs`.

Notification email/in-app delivery attempts are partially represented by:

- `job_board_notifications`
- `job_board_notification_logs`

Admin overview reads:

- open job count
- saved job count
- application count
- ATS analysis count
- notification count
- recent scraper runs
- recent notification logs
- 30-day event counts

Phase 5 ingestion should either extend `job_board_scraper_runs` or add `job_board_ingestion_runs`. Given the confirmed naming convention and more detailed GitHub metrics, `job_board_ingestion_runs` is recommended.

## Source Registry Status

There is no source registry yet.

Missing:

- `job_board_sources`
- source enable/disable API
- source registry helper
- GitHub provider metadata
- parser version tracking
- source state such as `last_attempt_at`, `last_success_at`, `consecutive_failures`, `etag`, or content SHA

Phase 5 A2 should create `job_board_sources` and seed a small approved starter set with `enabled = true`, while keeping every source independently disableable through the `/admin` Job Board tab.

## GitHub Ingestion API Status

There is no live GitHub ingestion API yet.

The retired local sample ingestion endpoints have been removed.

Phase 5 adds GitHub ingestion through the source registry and admin controls.

Confirmed future direction:

- use `GITHUB_INGEST_TOKEN` server-side
- allow unauthenticated GitHub fetch only as a local-development fallback
- deployed environments should fail clearly if `GITHUB_INGEST_TOKEN` is missing
- use Supabase Edge Functions and Supabase Cron for scheduled ingestion
- keep manual admin controls in the existing `/admin` Job Board section

## Notifications Status

In-app notifications exist and are active.

Existing user-facing routes:

- `/job-board/notifications`
- `/job-board/settings`

Existing APIs:

- `GET /api/job-board/notifications`
- `PATCH /api/job-board/notifications`
- `GET /api/job-board/notification-preferences`
- `PUT /api/job-board/notification-preferences`

Email is not sent. The current notification helper writes email log rows as `email_skipped` while Phase 4 email delivery is deferred.

Confirmed future direction:

- use Resend for email
- production sending remains disabled until explicitly enabled
- development/beta must use a strict recipient allowlist
- email failure must never fail ingestion
- use `job_board_alert_preferences`, `job_board_notification_queue`, and `job_board_notification_deliveries` naming for Phase 5 email pipeline work

## Recommendations Status

Recommendations currently use deterministic scoring in `lib/job-board/recommendations.js`.

Inputs:

- open jobs
- saved jobs
- applications
- recent ATS analyses

Outputs:

- rows in `job_board_recommendations`
- in-app recommendation notifications

This can be reused after live ingestion because it reads from `job_board_jobs`.

Known limitation: scoring references current `CAREER_CATEGORIES`; Phase 5 category expansion must update constants and recommendation heuristics.

## ATS and Resume Storage

Resume upload and storage are handled by the existing profile page.

Profile upload uses:

- Supabase Storage bucket: `member-resumes`
- storage path pattern: `resumes/${user.id}/...`
- `member_profiles.resume_url`
- `member_profiles.resume_storage_path`
- `member_profiles.resume_bucket`

Job Board ATS retrieval uses `lib/job-board/ats/resumeRetrieval.js`.

That helper:

- reads the caller's `member_profiles` row by `user_id`
- selects `id`, `user_id`, `resume_bucket`, `resume_storage_path`, and `updated_at`
- requires `resume_storage_path`
- defaults bucket to `member-resumes`
- downloads the PDF server-side using service-role Supabase Storage
- computes a SHA-256 content hash

Resume parsing cache is stored in `job_board_resume_parses` with unique key:

- `user_id`
- `resume_storage_path`
- `content_hash`
- `parser_version`

Current ATS analyses are deterministic and persisted to `job_board_ats_analyses`.

## Reusable Code for Phase 5A

Recommended reusable files and patterns:

- `lib/job-board/supabaseServer.js` for Next server-side Supabase helpers
- `lib/job-board/auth.js` for protected member/admin Next API routes
- `lib/job-board/adminAccess.js` for admin predicate and dev-only Job Board admin gate
- `lib/job-board/apiResponses.js` for JSON error/request helpers
- `lib/job-board/constants.js` for shared enum lists
- `lib/job-board/models.js` for API output mapping
- `lib/job-board/logger.js` for console logging
- `lib/job-board/events.js` for analytics events
- `lib/job-board/scraper/normalize.js` and `validate.js` as references, not as final GitHub parser design
- `lib/job-board/scraper/orchestrator.js` as a legacy ingestion reference
- `/admin` Job Board tab for manual operations
- Node test structure under `lib/job-board/__tests__`
- scraper fixtures under `tests/fixtures/scrapers`

## Recommended Phase 5 File Locations

Use a new ingestion namespace rather than mixing live GitHub logic directly into the legacy scraper folder:

- `lib/job-board/ingestion/github/sourceRegistry.js`
- `lib/job-board/ingestion/github/fetchRepository.js`
- `lib/job-board/ingestion/github/errors.js`
- `lib/job-board/ingestion/github/parsers/jobright.js`
- `lib/job-board/ingestion/github/parsers/simplify.js`
- `lib/job-board/ingestion/dateNormalization.js`
- `lib/job-board/ingestion/canonicalize.js`
- `lib/job-board/ingestion/dedupe.js`
- `lib/job-board/ingestion/upsertCanonicalJobs.js`
- `lib/job-board/ingestion/runGithubIngestion.js`
- `lib/job-board/__tests__/github-ingestion-*.test.mjs`

Admin routes should remain under:

- `app/api/job-board/admin/...`

Supabase Edge Functions should live under:

- `supabase/functions/job-github-ingest/`

## Schema Conflicts Before Phase 5A

The current database checks are narrower than Phase 5 needs.

### Career categories

Current allowed categories:

- `software_engineering`
- `data_analytics`
- `product`
- `cybersecurity`
- `business`
- `design`
- `other`

Phase 5 target categories:

- `software_engineering`
- `data_science`
- `data_analytics`
- `machine_learning`
- `cybersecurity`
- `information_technology`
- `product_management`
- `quantitative_finance`
- `finance`
- `accounting`
- `consulting`
- `business`
- `operations`
- `design`
- `hardware`
- `other`

Migration required: relax/update `job_board_jobs.career_category` check and update `CAREER_CATEGORIES`.

### Employment types

Current allowed employment types:

- `internship`
- `part_time`
- `full_time`
- `contract`
- `co_op`

Phase 5 target employment types:

- `internship`
- `co_op`
- `new_grad`
- `full_time`
- `part_time`
- `contract`
- `apprenticeship`
- `other`

Migration required: relax/update `job_board_jobs.employment_type` check and update `JOB_EMPLOYMENT_TYPES`.

### Source tracking

Current `job_board_jobs` can store only one source identity cleanly through `source`, `external_id`, and `source_payload`.

Phase 5 requires one canonical job to have many source references.

Migration required:

- `job_board_sources`
- `job_board_source_links`
- likely `job_board_ingestion_runs`

### Notification preferences

Current `job_board_notification_preferences` is broad and keyword/location based. Phase 5 email prompt calls for alert preferences with category/employment/company/location arrays.

Recommended migration:

- create `job_board_alert_preferences`
- keep current `job_board_notification_preferences` for in-app/digest delivery settings

### Notification queue

Current notifications/logs are not a true email queue.

Recommended migration:

- `job_board_notification_queue`
- `job_board_notification_deliveries`

## Migration Needs

Immediate Phase 5A migrations should include:

1. Expand `job_board_jobs` category and employment constraints.
2. Create `job_board_sources`.
3. Seed a small approved Jobright/Simplify starter set with `enabled = true`.
4. Add `job_board_source_links`.
5. Add `job_board_ingestion_runs` with source-level metrics and errors.
6. Add indexes for provider, enabled sources, priority, source/job link uniqueness, canonical URL/fingerprint lookup.

Later Phase 5 migrations should include:

1. `job_board_alert_preferences`.
2. `job_board_notification_queue`.
3. `job_board_notification_deliveries`.
4. `job_board_ats_scans` for HackerRank baseline persistence.

## Test Infrastructure Available

Package scripts:

- `npm test`
- `npm run test:job-board`
- `npm run lint`
- `npm run build`

Current Job Board tests cover:

- auth token extraction
- validation helpers
- sample-source normalization/validation/dedupe
- future source fixture adapters
- deterministic ATS parsing/scoring
- Phase 4 admin access, analytics summary, and navigation
- retired sample-source jobs

Existing fixtures:

- `tests/fixtures/scrapers/greenhouse`
- `tests/fixtures/scrapers/lever`
- `tests/fixtures/scrapers/ashby`
- `tests/fixtures/scrapers/custom`

Phase 5 should add GitHub markdown/table fixtures for Jobright and Simplify before live fetching.

## Risks Before Phase 5A

- Current source-local dedupe will create duplicates across Jobright and Simplify unless replaced with canonical URL/source-link logic.
- Existing enum checks will reject Phase 5 categories such as `data_science`, `machine_learning`, `finance`, `consulting`, and `new_grad`.
- Current `normalized_fingerprint` includes location, but Phase 5 dedupe says location must not be mandatory.
- `job_board_jobs.source_payload` stores one source payload on the canonical job; multi-source traceability needs `job_board_source_links`.
- Existing legacy scraper updates entire job payload and may overwrite useful fields with less precise data; Phase 5 update rules should fill missing data conservatively.
- GitHub ingestion must not rely on exact daily timing; use the confirmed 3-day lookback and idempotent source links.
- GitHub unauthenticated fallback must be local-only to avoid production rate-limit surprises.
- Supabase Edge Functions cannot directly reuse Node/Next modules; shared logic may need Deno-compatible copies or a carefully isolated implementation.
- Email tables/logs are not yet a true Resend queue and should not send production emails until explicitly enabled.
- Admin UI currently has Job Board operations but no source registry management yet.
- The existing dev admin gate is intentionally local-only; production source controls still require VP position access unless a production-safe admin role model is added later.

## Phase 5A Recommendations

Proceed in the planned order:

1. A2: create `job_board_sources`, expand enum constraints, seed enabled starter sources, and add source registry helpers/tests.
2. A3: add GitHub repository fetcher with server-only `GITHUB_INGEST_TOKEN`, local-only unauthenticated fallback, fixture-backed tests, and no parsing yet.
3. A4/A5: add deterministic Jobright and Simplify parsers from fixtures.
4. A6: add canonical URL/fingerprint dedupe and `job_board_source_links`.
5. A7: build the full ingestion service.
6. A8/A10: expose Supabase Edge Function and existing `/admin` controls.
7. A11/A12: verify live jobs flow through the existing Job Board UI and document the runbook.

Do not start HackerRank ATS integration or Resend email sending until the GitHub ingestion path is stable.
