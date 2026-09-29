-- Job Board / ATS Phase 5A GitHub ingestion run metrics.

begin;
create table if not exists public.job_board_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.job_board_sources(id) on delete set null,
  provider text check (provider in ('jobright', 'simplify')),
  source_name text,
  source_url text,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  cycle_started_at timestamptz not null,
  fetched_count integer not null default 0 check (fetched_count >= 0),
  eligible_count integer not null default 0 check (eligible_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  inserted_count integer not null default 0 check (inserted_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  error_message text,
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists job_board_ingestion_runs_source_id_idx
  on public.job_board_ingestion_runs (source_id);
create index if not exists job_board_ingestion_runs_status_idx
  on public.job_board_ingestion_runs (status);
create index if not exists job_board_ingestion_runs_created_at_idx
  on public.job_board_ingestion_runs (created_at desc);
alter table public.job_board_ingestion_runs enable row level security;
commit;
