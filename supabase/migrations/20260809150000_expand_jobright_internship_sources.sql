-- Expand Jobright internship source coverage and category taxonomy.

begin;
update public.job_board_jobs
set career_category = 'machine_learning_ai',
    updated_at = now()
where career_category = 'machine_learning';
update public.job_board_jobs
set career_category = 'business_analytics',
    updated_at = now()
where career_category = 'business';
alter table public.job_board_jobs
  drop constraint if exists job_board_jobs_career_category_check,
  add constraint job_board_jobs_career_category_check
    check (career_category in (
      'software_engineering',
      'data_science',
      'data_analytics',
      'machine_learning_ai',
      'cybersecurity',
      'information_technology',
      'engineering',
      'product_management',
      'quantitative_finance',
      'finance',
      'accounting',
      'business_analytics',
      'consulting',
      'operations',
      'management',
      'marketing',
      'sales',
      'design',
      'arts_entertainment',
      'human_resources',
      'legal_compliance',
      'public_sector',
      'education',
      'healthcare',
      'supply_chain',
      'customer_support',
      'hardware',
      'other'
    ));
alter table public.job_board_sources
  drop constraint if exists job_board_sources_career_category_check,
  add constraint job_board_sources_career_category_check
    check (career_category in (
      'software_engineering',
      'data_science',
      'data_analytics',
      'machine_learning_ai',
      'cybersecurity',
      'information_technology',
      'engineering',
      'product_management',
      'quantitative_finance',
      'finance',
      'accounting',
      'business_analytics',
      'consulting',
      'operations',
      'management',
      'marketing',
      'sales',
      'design',
      'arts_entertainment',
      'human_resources',
      'legal_compliance',
      'public_sector',
      'education',
      'healthcare',
      'supply_chain',
      'customer_support',
      'hardware',
      'other'
    ));
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
) values
  ('jobright', 'Jobright Software Engineer Internship', 'jobright-ai', '2026-Software-Engineer-Internship', 'master', 'https://github.com/jobright-ai/2026-Software-Engineer-Internship', 'github_repo', 'specialized', 'software_engineering', 'internship', true, 100, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Data Analysis Internship', 'jobright-ai', '2026-Data-Analysis-Internship', 'master', 'https://github.com/jobright-ai/2026-Data-Analysis-Internship', 'github_repo', 'specialized', 'data_analytics', 'internship', true, 110, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Product Management Internship', 'jobright-ai', '2026-Product-Management-Internship', 'master', 'https://github.com/jobright-ai/2026-Product-Management-Internship', 'github_repo', 'specialized', 'product_management', 'internship', true, 120, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Engineer Internship', 'jobright-ai', '2026-Engineer-Internship', 'master', 'https://github.com/jobright-ai/2026-Engineer-Internship', 'github_repo', 'specialized', 'engineering', 'internship', true, 130, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Consultant Internship', 'jobright-ai', '2026-Consultant-Internship', 'master', 'https://github.com/jobright-ai/2026-Consultant-Internship', 'github_repo', 'specialized', 'consulting', 'internship', true, 140, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Business Analyst Internship', 'jobright-ai', '2026-Business-Analyst-Internship', 'master', 'https://github.com/jobright-ai/2026-Business-Analyst-Internship', 'github_repo', 'specialized', 'business_analytics', 'internship', true, 150, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Account Internship', 'jobright-ai', '2026-Account-Internship', 'master', 'https://github.com/jobright-ai/2026-Account-Internship', 'github_repo', 'specialized', 'accounting', 'internship', true, 160, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Public Sector Internship', 'jobright-ai', '2026-Public-Sector-Internship', 'master', 'https://github.com/jobright-ai/2026-Public-Sector-Internship', 'github_repo', 'specialized', 'public_sector', 'internship', true, 170, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Marketing Internship', 'jobright-ai', '2026-Marketing-Internship', 'master', 'https://github.com/jobright-ai/2026-Marketing-Internship', 'github_repo', 'specialized', 'marketing', 'internship', true, 180, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Sales Internship', 'jobright-ai', '2026-Sales-Internship', 'master', 'https://github.com/jobright-ai/2026-Sales-Internship', 'github_repo', 'specialized', 'sales', 'internship', true, 190, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Design Internship', 'jobright-ai', '2026-Design-Internship', 'master', 'https://github.com/jobright-ai/2026-Design-Internship', 'github_repo', 'specialized', 'design', 'internship', true, 200, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright HR Internship', 'jobright-ai', '2026-HR-Internship', 'master', 'https://github.com/jobright-ai/2026-HR-Internship', 'github_repo', 'specialized', 'human_resources', 'internship', true, 210, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Legal Internship', 'jobright-ai', '2026-Legal-Internship', 'master', 'https://github.com/jobright-ai/2026-Legal-Internship', 'github_repo', 'specialized', 'legal_compliance', 'internship', true, 220, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Art Internship', 'jobright-ai', '2026-Art-Internship', 'master', 'https://github.com/jobright-ai/2026-Art-Internship', 'github_repo', 'specialized', 'arts_entertainment', 'internship', true, 230, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Education Internship', 'jobright-ai', '2026-Education-Internship', 'master', 'https://github.com/jobright-ai/2026-Education-Internship', 'github_repo', 'specialized', 'education', 'internship', true, 240, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Management Internship', 'jobright-ai', '2026-Management-Internship', 'master', 'https://github.com/jobright-ai/2026-Management-Internship', 'github_repo', 'specialized', 'management', 'internship', true, 250, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright Support Internship', 'jobright-ai', '2026-Support-Internship', 'master', 'https://github.com/jobright-ai/2026-Support-Internship', 'github_repo', 'specialized', 'customer_support', 'internship', true, 260, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship"}'::jsonb),
  ('jobright', 'Jobright 2026 Internship Aggregate', 'jobright-ai', '2026-Internship', 'master', 'https://github.com/jobright-ai/2026-Internship', 'github_repo', 'aggregate', 'other', 'internship', false, 900, 'jobright-readme-v1', '{"discovered_at":"2026-08-09","source_family":"jobright_internship","disabled_reason":"Prefer specialized repositories to avoid overlap."}'::jsonb)
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
