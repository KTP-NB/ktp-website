-- Job Board / ATS Phase 5A canonical source links.

begin;
alter table public.job_board_jobs
  add column if not exists canonical_url text,
  add column if not exists content_fingerprint text;
create index if not exists job_board_jobs_canonical_url_idx
  on public.job_board_jobs (canonical_url);
create index if not exists job_board_jobs_content_fingerprint_idx
  on public.job_board_jobs (content_fingerprint);
create table if not exists public.job_board_source_links (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_board_jobs(id) on delete cascade,
  source_id uuid not null references public.job_board_sources(id) on delete cascade,
  provider text not null check (provider in ('jobright', 'simplify')),
  source_url text,
  source_external_id text not null,
  canonical_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  source_posted_date timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_external_id)
);
create index if not exists job_board_source_links_job_id_idx
  on public.job_board_source_links (job_id);
create index if not exists job_board_source_links_source_id_idx
  on public.job_board_source_links (source_id);
create index if not exists job_board_source_links_provider_idx
  on public.job_board_source_links (provider);
create index if not exists job_board_source_links_canonical_url_idx
  on public.job_board_source_links (canonical_url);
alter table public.job_board_source_links enable row level security;
commit;
