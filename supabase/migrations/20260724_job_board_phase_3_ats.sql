-- Job Board / ATS Phase 3 resume parsing and deterministic analysis.

begin;
create table if not exists public.job_board_resume_parses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_bucket text not null default 'member-resumes',
  resume_storage_path text not null,
  resume_version text,
  content_hash text not null,
  plain_text text not null,
  skills jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  parser_version text not null default 'deterministic-v1',
  created_at timestamptz not null default now(),
  unique (user_id, resume_storage_path, content_hash, parser_version)
);
alter table public.job_board_ats_analyses
  add column if not exists resume_parse_id uuid references public.job_board_resume_parses(id) on delete set null,
  add column if not exists analysis_mode text not null default 'job' check (analysis_mode in ('job', 'general')),
  add column if not exists target_role text,
  add column if not exists score_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists matched_skills jsonb not null default '[]'::jsonb,
  add column if not exists missing_skills jsonb not null default '[]'::jsonb,
  add column if not exists experience_alignment jsonb not null default '{}'::jsonb,
  add column if not exists education_alignment jsonb not null default '{}'::jsonb,
  add column if not exists project_relevance jsonb not null default '{}'::jsonb,
  add column if not exists parsed_resume_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists parsed_job_snapshot jsonb not null default '{}'::jsonb;
create index if not exists job_board_resume_parses_user_id_idx
  on public.job_board_resume_parses (user_id);
create index if not exists job_board_resume_parses_content_hash_idx
  on public.job_board_resume_parses (content_hash);
create index if not exists job_board_ats_analyses_mode_idx
  on public.job_board_ats_analyses (analysis_mode);
create index if not exists job_board_ats_analyses_target_role_idx
  on public.job_board_ats_analyses (target_role);
alter table public.job_board_resume_parses enable row level security;
drop policy if exists "users read own resume parses" on public.job_board_resume_parses;
create policy "users read own resume parses"
  on public.job_board_resume_parses for select
  using (auth.uid() = user_id);
commit;
