-- Job Board / ATS Phase 2 ingestion and search support.

begin;
alter table public.job_board_jobs
  add column if not exists career_category text not null default 'other'
    check (career_category in ('software_engineering', 'data_analytics', 'product', 'cybersecurity', 'business', 'design', 'other')),
  add column if not exists normalized_keywords text[] not null default '{}'::text[],
  add column if not exists normalized_fingerprint text,
  add column if not exists source_payload jsonb not null default '{}'::jsonb,
  add column if not exists last_seen_at timestamptz,
  add column if not exists inactive_at timestamptz;
create index if not exists job_board_jobs_career_category_idx
  on public.job_board_jobs (career_category);
create index if not exists job_board_jobs_employment_type_idx
  on public.job_board_jobs (employment_type);
create index if not exists job_board_jobs_workplace_type_idx
  on public.job_board_jobs (workplace_type);
create index if not exists job_board_jobs_last_seen_at_idx
  on public.job_board_jobs (last_seen_at desc);
create index if not exists job_board_jobs_normalized_fingerprint_idx
  on public.job_board_jobs (source, normalized_fingerprint);
commit;
