# Job Board Integration

Project 2 `main` now contains the integrated website and Job Board. Its website base came from KTP-NB/ktp-website `master` at `91f11c3`; the main website repository has not been modified.

## Member workflow

- Members, pledges, inactive members, and alumni with an authenticated `access_role` may use the Job Board. The existing website login/session is authoritative. The Job Board does not impose active-status checks.
- Job Board cards link to the website's existing application tracker at `/job-board/applications` with a prefilled draft. Merely following the link does not create an application or count toward a monthly target.
- The old Job Board application endpoint is removed. The legacy `/applications` URL redirects to `/job-board/applications`, preserving a valid job-prefill query. The Member Account nav no longer links to Applications.
- The single legacy Job Board application row in the linked project is a demo `/mock-careers` row; the one-time transfer script excludes it. Run `node scripts/migrate-legacy-job-board-applications.mjs` for a dry run before considering `--apply` on another database.
- Resume retrieval reads the website's `member_resumes` pointer and uses the existing protected storage path.

## Administration and ingestion

- `/admin` contains the Job Board tab for users with the existing `applications.manage` permission. Local development can use `NEXT_PUBLIC_JOB_BOARD_DEV_ADMIN_ENABLED=true`; this bypass is disabled in production.
- Intern List US internship sources and the H1B software-engineering source are active. Jobright/Simplify GitHub sources are manual backup sources; a single source can be run or disabled independently.
- NewGrad Jobs has ten independently enabled US category feeds using the same Airtable HTTP ingestion path. Only rows explicitly marked New Grad, with a US location and a non-intern title, are eligible. Apply `20260929120000_new_grad_jobs_sources.sql`, deploy the updated `job-intern-list-ingest` Edge Function, then apply `20260929130000_schedule_new_grad_jobs.sql`. The new schedule runs at 08:15 UTC and uses the existing Airtable Cron secret.
- Posted-today filtering and date-only source postings use the `America/New_York` calendar day, including DST transitions. A job ingested today but dated earlier by its source is not considered posted today.
- Admins may add Jobright/Simplify GitHub README sources in the tab. New sources start disabled so their parser output can be reviewed before ingestion.
- Scheduled GitHub ingestion uses the Supabase `job-github-ingest` Edge Function and Cron; no OCI/Docker worker is needed for this path. Deployed GitHub ingestion requires `GITHUB_INGEST_TOKEN` and the internal Cron secret. Local unauthenticated fetching logs a warning.
- Daily Intern List ingestion is implemented by `job-intern-list-ingest` plus `job-board-intern-list-daily` Cron at 07:15 UTC. Cron submits one request per enabled source, so each category has its own lease and run log. It reuses the existing `JOB_INGEST_CRON_SECRET`; the migration copies the existing H1B Vault secret and derives the new Edge URL. The Edge Function and Cron migration are deployed; verify the first scheduled cycle by checking for one completed `job_board_ingestion_runs` row per enabled Intern List source after the next scheduled time.
- Jobright links without an extractable employer URL are labeled as Jobright links. They are not represented as direct employer applications.

## Deployment boundary

Do **not** run `supabase db push` from this branch as-is. On 2026-09-26, `supabase migration list` showed both remote-only website migration versions (starting `20260820201953`) and local-only website versions (for example `20260820202818`), plus other divergences. The live database already contains tables from both lines. First compare the SQL and resulting schema of each divergent version against the canonical website migration history, then create a reconciled migration directory or an explicitly reviewed repair plan. Avoid marking migrations applied solely to silence the CLI.

The 2026-09-26 ingestion check ran all ten enabled Intern List sources successfully. A Supabase lookup for a large source previously generated a URL above 15 KB and failed with `UND_ERR_HEADERS_OVERFLOW`; lookup batches are now capped at 50 values. A sudden source snapshot below 60% of the recent completed-run baseline is marked partial, and older listings remain open rather than being retired from an incomplete fetch. The `job-intern-list-ingest` Edge Function was redeployed with this safeguard on 2026-09-26 (active version 3). The daily Cron migration is applied, but the first scheduled cycle remains to be verified.

Both ingestion Edge Functions were redeployed on 2026-09-26. See `docs/job-board-migration-comparison.md` for the read-only schema comparison and cleanup sequence before any future migration push or website sync.

## Verification

Run `npm run test:job-board`, `npm run test:members`, `npm run test:applications`, `npm run lint`, and `npm run build`. The Job Board APIs require a logged-in session; authenticated user journeys, admin actions, and actual email delivery need a browser session and test account in the target environment before production promotion. Local development runs with `npm run dev -- --port 3000`; dev output is isolated in `.next-dev`, so `npm run build` does not invalidate its CSS/chunks.
