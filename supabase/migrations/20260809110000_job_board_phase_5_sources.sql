-- Job Board / ATS Phase 5A source registry.

begin;
update public.job_board_jobs
set career_category = 'product_management',
    updated_at = now()
where career_category = 'product';
alter table public.job_board_jobs
  drop constraint if exists job_board_jobs_career_category_check,
  add constraint job_board_jobs_career_category_check
    check (career_category in (
      'software_engineering',
      'data_science',
      'data_analytics',
      'machine_learning',
      'cybersecurity',
      'information_technology',
      'product_management',
      'quantitative_finance',
      'finance',
      'accounting',
      'consulting',
      'business',
      'operations',
      'design',
      'hardware',
      'other'
    ));
alter table public.job_board_jobs
  drop constraint if exists job_board_jobs_employment_type_check,
  add constraint job_board_jobs_employment_type_check
    check (employment_type in (
      'internship',
      'co_op',
      'new_grad',
      'full_time',
      'part_time',
      'contract',
      'apprenticeship',
      'other'
    ));
create table if not exists public.job_board_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('jobright', 'simplify')),
  source_name text not null,
  repository_owner text not null,
  repository_name text not null,
  branch text not null default 'main',
  source_url text not null,
  source_type text not null default 'github_repo' check (source_type in ('github_repo')),
  career_category text not null check (career_category in (
    'software_engineering',
    'data_science',
    'data_analytics',
    'machine_learning',
    'cybersecurity',
    'information_technology',
    'product_management',
    'quantitative_finance',
    'finance',
    'accounting',
    'consulting',
    'business',
    'operations',
    'design',
    'hardware',
    'other'
  )),
  employment_type text not null check (employment_type in (
    'internship',
    'co_op',
    'new_grad',
    'full_time',
    'part_time',
    'contract',
    'apprenticeship',
    'other'
  )),
  enabled boolean not null default true,
  priority integer not null default 100 check (priority >= 0),
  parser_version text not null default 'github-readme-v1',
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  last_fetched_sha text,
  last_fetched_etag text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, repository_owner, repository_name, career_category, employment_type)
);
create index if not exists job_board_sources_enabled_idx
  on public.job_board_sources (enabled, priority);
create index if not exists job_board_sources_provider_idx
  on public.job_board_sources (provider);
create index if not exists job_board_sources_repository_idx
  on public.job_board_sources (repository_owner, repository_name);
create index if not exists job_board_sources_category_idx
  on public.job_board_sources (career_category);
create index if not exists job_board_sources_employment_type_idx
  on public.job_board_sources (employment_type);
alter table public.job_board_sources enable row level security;
insert into public.job_board_sources (
  provider,
  source_name,
  repository_owner,
  repository_name,
  branch,
  source_url,
  source_type,
  career_category,
  employment_type,
  enabled,
  priority,
  parser_version,
  metadata
) values
  (
    'simplify',
    'Simplify Summer 2026 Internships - SWE',
    'SimplifyJobs',
    'Summer2026-Internships',
    'dev',
    'https://github.com/SimplifyJobs/Summer2026-Internships',
    'github_repo',
    'software_engineering',
    'internship',
    true,
    10,
    'simplify-readme-v1',
    '{"notes":"Broad Simplify internship repository; parser should select SWE/software sections for this source."}'::jsonb
  ),
  (
    'simplify',
    'Simplify Summer 2026 Internships - Data Science',
    'SimplifyJobs',
    'Summer2026-Internships',
    'dev',
    'https://github.com/SimplifyJobs/Summer2026-Internships',
    'github_repo',
    'data_science',
    'internship',
    true,
    20,
    'simplify-readme-v1',
    '{"notes":"Broad Simplify internship repository; parser should select data science, AI, and ML sections for this source."}'::jsonb
  ),
  (
    'simplify',
    'Simplify New Grad Positions - Product Management',
    'SimplifyJobs',
    'New-Grad-Positions',
    'dev',
    'https://github.com/SimplifyJobs/New-Grad-Positions',
    'github_repo',
    'product_management',
    'new_grad',
    true,
    30,
    'simplify-readme-v1',
    '{"notes":"Broad Simplify new-grad repository; parser should select product management sections for this source."}'::jsonb
  ),
  (
    'simplify',
    'Simplify New Grad Positions - Quantitative Finance',
    'SimplifyJobs',
    'New-Grad-Positions',
    'dev',
    'https://github.com/SimplifyJobs/New-Grad-Positions',
    'github_repo',
    'quantitative_finance',
    'new_grad',
    true,
    40,
    'simplify-readme-v1',
    '{"notes":"Broad Simplify new-grad repository; parser should select quantitative finance sections for this source."}'::jsonb
  ),
  (
    'jobright',
    'Jobright 2026 Software Engineer New Grad',
    'jobright-ai',
    '2026-Software-Engineer-New-Grad',
    'master',
    'https://github.com/jobright-ai/2026-Software-Engineer-New-Grad',
    'github_repo',
    'software_engineering',
    'new_grad',
    true,
    50,
    'jobright-readme-v1',
    '{"notes":"Jobright category-specific repository for software engineering new-grad roles."}'::jsonb
  ),
  (
    'jobright',
    'Jobright 2026 Data Analysis New Grad',
    'jobright-ai',
    '2026-Data-Analysis-New-Grad',
    'master',
    'https://github.com/jobright-ai/2026-Data-Analysis-New-Grad',
    'github_repo',
    'data_analytics',
    'new_grad',
    true,
    60,
    'jobright-readme-v1',
    '{"notes":"Jobright category-specific repository for data analytics new-grad roles."}'::jsonb
  )
on conflict (provider, repository_owner, repository_name, career_category, employment_type)
do update set
  source_name = excluded.source_name,
  branch = excluded.branch,
  source_url = excluded.source_url,
  source_type = excluded.source_type,
  enabled = excluded.enabled,
  priority = excluded.priority,
  parser_version = excluded.parser_version,
  metadata = excluded.metadata,
  updated_at = now();
commit;
