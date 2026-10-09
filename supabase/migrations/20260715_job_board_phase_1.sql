-- Job Board / ATS Phase 1 foundation.
--
-- Access model:
-- - Any authenticated Supabase user can access the Job Board.
-- - Inactive/alumni member status is not checked here.
-- - User-owned records are protected with auth.uid().
-- - Scraper/system writes are expected to use service-role clients.

begin;
create table if not exists public.job_board_jobs (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  source text not null default 'manual',
  source_url text,
  company text not null,
  title text not null,
  department text,
  location text,
  workplace_type text check (workplace_type in ('remote', 'hybrid', 'onsite')),
  employment_type text check (employment_type in ('internship', 'part_time', 'full_time', 'contract', 'co_op')),
  salary_range text,
  description text,
  responsibilities jsonb not null default '[]'::jsonb,
  qualifications jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  apply_url text,
  status text not null default 'open' check (status in ('draft', 'open', 'closed', 'archived')),
  posted_at timestamptz,
  scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);
create table if not exists public.job_board_saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_board_jobs(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create table if not exists public.job_board_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_board_jobs(id) on delete cascade,
  status text not null default 'tracking' check (status in ('tracking', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),
  application_url text,
  resume_storage_path text,
  cover_letter_storage_path text,
  notes text,
  applied_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create table if not exists public.job_board_ats_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.job_board_jobs(id) on delete set null,
  application_id uuid references public.job_board_applications(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  resume_storage_path text,
  job_description_snapshot text,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  matched_keywords jsonb not null default '[]'::jsonb,
  missing_keywords jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.job_board_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_board_jobs(id) on delete cascade,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  reasons jsonb not null default '[]'::jsonb,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create table if not exists public.job_board_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  digest_frequency text not null default 'weekly' check (digest_frequency in ('none', 'daily', 'weekly')),
  keywords text[] not null default '{}'::text[],
  locations text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.job_board_scraper_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_url text,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  jobs_seen integer not null default 0 check (jobs_seen >= 0),
  jobs_created integer not null default 0 check (jobs_created >= 0),
  jobs_updated integer not null default 0 check (jobs_updated >= 0),
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.job_board_notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.job_board_jobs(id) on delete set null,
  channel text not null default 'email' check (channel in ('email')),
  subject text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists job_board_jobs_status_idx on public.job_board_jobs (status);
create index if not exists job_board_jobs_company_idx on public.job_board_jobs (company);
create index if not exists job_board_jobs_location_idx on public.job_board_jobs (location);
create index if not exists job_board_jobs_source_idx on public.job_board_jobs (source);
create index if not exists job_board_jobs_posted_at_idx on public.job_board_jobs (posted_at desc);
create index if not exists job_board_saved_jobs_user_id_idx on public.job_board_saved_jobs (user_id);
create index if not exists job_board_saved_jobs_job_id_idx on public.job_board_saved_jobs (job_id);
create index if not exists job_board_applications_user_id_idx on public.job_board_applications (user_id);
create index if not exists job_board_applications_job_id_idx on public.job_board_applications (job_id);
create index if not exists job_board_applications_status_idx on public.job_board_applications (status);
create index if not exists job_board_ats_analyses_user_id_idx on public.job_board_ats_analyses (user_id);
create index if not exists job_board_ats_analyses_job_id_idx on public.job_board_ats_analyses (job_id);
create index if not exists job_board_recommendations_user_id_idx on public.job_board_recommendations (user_id);
create index if not exists job_board_recommendations_job_id_idx on public.job_board_recommendations (job_id);
create index if not exists job_board_scraper_runs_source_idx on public.job_board_scraper_runs (source);
create index if not exists job_board_scraper_runs_status_idx on public.job_board_scraper_runs (status);
create index if not exists job_board_notification_logs_user_id_idx on public.job_board_notification_logs (user_id);
create index if not exists job_board_notification_logs_job_id_idx on public.job_board_notification_logs (job_id);
alter table public.job_board_jobs enable row level security;
alter table public.job_board_saved_jobs enable row level security;
alter table public.job_board_applications enable row level security;
alter table public.job_board_ats_analyses enable row level security;
alter table public.job_board_recommendations enable row level security;
alter table public.job_board_notification_preferences enable row level security;
alter table public.job_board_scraper_runs enable row level security;
alter table public.job_board_notification_logs enable row level security;
drop policy if exists "authenticated users read open jobs" on public.job_board_jobs;
create policy "authenticated users read open jobs"
  on public.job_board_jobs for select
  using (auth.role() = 'authenticated' and status = 'open');
drop policy if exists "users manage own saved jobs" on public.job_board_saved_jobs;
create policy "users manage own saved jobs"
  on public.job_board_saved_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "users manage own applications" on public.job_board_applications;
create policy "users manage own applications"
  on public.job_board_applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "users manage own ats analyses" on public.job_board_ats_analyses;
create policy "users manage own ats analyses"
  on public.job_board_ats_analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "users read own recommendations" on public.job_board_recommendations;
create policy "users read own recommendations"
  on public.job_board_recommendations for select
  using (auth.uid() = user_id);
drop policy if exists "users update own notification preferences" on public.job_board_notification_preferences;
create policy "users update own notification preferences"
  on public.job_board_notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "users read own notification logs" on public.job_board_notification_logs;
create policy "users read own notification logs"
  on public.job_board_notification_logs for select
  using (auth.uid() = user_id);
commit;
