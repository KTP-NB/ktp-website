-- Hide mock-careers jobs before live GitHub ingestion testing.
--
-- Keep rows for historical references, saved jobs, applications, and analytics,
-- but remove them from the member-facing Job Board by archiving them.

begin;
update public.job_board_jobs
set status = 'archived',
    inactive_at = coalesce(inactive_at, now()),
    updated_at = now()
where source = 'mock-careers'
  and status <> 'archived';
commit;
