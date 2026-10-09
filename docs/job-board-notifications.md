# Job Board notifications and retention

The Job Board notifications page receives a daily or weekly digest of new jobs and saved jobs awaiting application. Recommendations are deferred. Email is opt-in and disabled by default. SMS is not configured.

## Deployment order

1. Reconcile local and remote Supabase migration histories before any `supabase db push`; do not mark migrations reverted merely to silence a mismatch. Apply `20260927120000_job_board_email_queue.sql` before deploying app code. It resets previously enabled email preferences because the old toggle did not send email.
2. Review the count of jobs older than seven days on the remote project. Apply `20260927130000_job_board_posting_retention.sql` after confirming the intended deletion. The hourly Cron removes up to 200 expired jobs each run, including still-open jobs. It retains any job saved by a member or tied to either application tracker.
3. Deploy this project to a published Netlify site. The scheduled function does not execute automatically in local development or deploy previews.
4. Set Netlify Function environment variables `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JOB_BOARD_NOTIFICATIONS_ENABLED=true`. The function runs every 15 minutes and processes one twenty-fourth of members each hour. It generates one in-app digest per configured period.
5. For beta email, set `GMAIL_SMTP_USER` to the full Gmail address, `GMAIL_SMTP_APP_PASSWORD` to a Google app password, `JOB_BOARD_SITE_URL` to the public HTTPS origin, and `JOB_BOARD_EMAIL_ALLOWLIST` to a comma-separated list of approved recipient addresses. Keep `JOB_BOARD_EMAIL_SEND_ENABLED=false` until a Netlify Function smoke test confirms port 587 is reachable and STARTTLS authentication works. Never place the app password in `.env.example`, source, logs, or chat.
6. Enable `JOB_BOARD_EMAIL_SEND_ENABLED=true` only after the smoke test. Members must separately opt in under Job Board settings. SMTP failures are recorded in `job_board_notification_deliveries`; the queue retries up to three times without affecting ingestion.

## Verification

- `npm run test:job-board`, `npm run lint`, and `npm run build` should pass before deploy.
- Invoke `process-job-board-notifications` with Netlify's **Run now** control, then check `job_board_notifications`, `job_board_notification_queue`, and `job_board_notification_deliveries` in Supabase.
- Confirm an opted-out member and an address outside the allowlist receive no email.
- Compare expired-job counts before and after the first hourly retention run. Saved and tracked applications should still reference their jobs.

An email can be accepted by Gmail just before a database update fails; a retry could then send a duplicate. Keep the beta allowlist small and monitor delivery logs.
