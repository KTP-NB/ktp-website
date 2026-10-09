-- Add H1B-specific source support and first-class visa sponsorship filtering.

begin;

alter table public.job_board_jobs
  add column if not exists visa_sponsorship_status text not null default 'unknown',
  add column if not exists visa_sponsorship_confidence text not null default 'unknown',
  add column if not exists visa_sponsorship_notes text;

alter table public.job_board_jobs
  drop constraint if exists job_board_jobs_visa_sponsorship_status_check,
  add constraint job_board_jobs_visa_sponsorship_status_check
    check (visa_sponsorship_status in (
      'explicit_h1b_sponsor',
      'likely_h1b_sponsor',
      'unknown',
      'does_not_sponsor'
    ));

alter table public.job_board_jobs
  drop constraint if exists job_board_jobs_visa_sponsorship_confidence_check,
  add constraint job_board_jobs_visa_sponsorship_confidence_check
    check (visa_sponsorship_confidence in (
      'explicit',
      'historical',
      'unknown'
    ));

create index if not exists job_board_jobs_visa_sponsorship_status_idx
  on public.job_board_jobs (visa_sponsorship_status);

alter table public.job_board_sources
  drop constraint if exists job_board_sources_provider_check,
  add constraint job_board_sources_provider_check
    check (provider in ('jobright', 'simplify', 'intern_list', 'jobright_h1b'));

alter table public.job_board_ingestion_runs
  drop constraint if exists job_board_ingestion_runs_provider_check,
  add constraint job_board_ingestion_runs_provider_check
    check (provider in ('jobright', 'simplify', 'intern_list', 'jobright_h1b'));

alter table public.job_board_source_links
  drop constraint if exists job_board_source_links_provider_check,
  add constraint job_board_source_links_provider_check
    check (provider in ('jobright', 'simplify', 'intern_list', 'jobright_h1b'));

insert into public.job_board_sources (
  provider,
  source_name,
  repository_owner,
  repository_name,
  branch,
  source_url,
  source_type,
  source_classification,
  career_category,
  employment_type,
  enabled,
  priority,
  parser_version,
  metadata
) values (
  'jobright_h1b',
  'Jobright Daily H1B Software Engineer Jobs',
  'jobright-ai',
  'Daily-H1B-Jobs-In-Tech',
  'master',
  'https://github.com/jobright-ai/Daily-H1B-Jobs-In-Tech',
  'github_repo',
  'specialized',
  'software_engineering',
  'full_time',
  true,
  300,
  'jobright-h1b-readme-v1',
  '{
    "githubDetailsSection":"Software Engineer",
    "sourceFamily":"jobright_h1b_software_engineering",
    "visaSponsorship":"h1b"
  }'::jsonb
)
on conflict (provider, repository_owner, repository_name, career_category, employment_type)
do update set
  source_name = excluded.source_name,
  branch = excluded.branch,
  source_url = excluded.source_url,
  source_type = excluded.source_type,
  source_classification = excluded.source_classification,
  enabled = excluded.enabled,
  priority = excluded.priority,
  parser_version = excluded.parser_version,
  metadata = excluded.metadata,
  updated_at = now();

commit;
