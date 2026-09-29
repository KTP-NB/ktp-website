-- Allow Intern List ingestion to write run and source-link records.

begin;

alter table public.job_board_ingestion_runs
  drop constraint if exists job_board_ingestion_runs_provider_check,
  add constraint job_board_ingestion_runs_provider_check
    check (provider in ('jobright', 'simplify', 'intern_list'));

alter table public.job_board_source_links
  drop constraint if exists job_board_source_links_provider_check,
  add constraint job_board_source_links_provider_check
    check (provider in ('jobright', 'simplify', 'intern_list'));

commit;
