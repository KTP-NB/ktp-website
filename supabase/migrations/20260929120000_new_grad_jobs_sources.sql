begin;

alter table public.job_board_sources
  drop constraint if exists job_board_sources_provider_check,
  add constraint job_board_sources_provider_check
    check (provider in ('jobright', 'simplify', 'intern_list', 'new_grad_jobs', 'jobright_h1b'));

alter table public.job_board_ingestion_runs
  drop constraint if exists job_board_ingestion_runs_provider_check,
  add constraint job_board_ingestion_runs_provider_check
    check (provider in ('jobright', 'simplify', 'intern_list', 'new_grad_jobs', 'jobright_h1b'));

alter table public.job_board_source_links
  drop constraint if exists job_board_source_links_provider_check,
  add constraint job_board_source_links_provider_check
    check (provider in ('jobright', 'simplify', 'intern_list', 'new_grad_jobs', 'jobright_h1b'));

insert into public.job_board_sources (
  provider, source_name, repository_owner, repository_name, branch, source_url,
  source_type, source_classification, career_category, employment_type,
  enabled, priority, parser_version, metadata
)
select
  'new_grad_jobs', 'NewGrad Jobs US ' || seed.label, 'newgrad-jobs', 'us-' || seed.slug,
  'main', 'https://www.newgrad-jobs.com/', 'airtable_shared_view', 'specialized',
  seed.category, 'new_grad', true, seed.priority, 'newgrad-jobs-airtable-v1',
  jsonb_build_object(
    'country', 'US', 'newGradCategory', seed.label,
    'airtableEmbedUrl', seed.embed_url, 'sourceFamily', 'new_grad_jobs_us'
  )
from (values
  ('swe', 'Software Engineering', 'software_engineering', 'https://airtable.com/embed/appjDG7vmPOm1pO7S/shr763VHjlzPBDCgN?viewControls=on', 10),
  ('data_analysis', 'Data Analysis', 'data_analytics', 'https://airtable.com/embed/appZ5SmkwkcW7Xd8C/shr51y9s2uIRlkvI8?viewControls=on', 20),
  ('ml_ai', 'Machine Learning and AI', 'machine_learning_ai', 'https://airtable.com/embed/appoxNzAIRReFCzZV/shrmDBF1vNPtzNjzl?viewControls=on', 30),
  ('product_management', 'Product Management', 'product_management', 'https://airtable.com/embed/appYvVTjJYHpq712D/shrpI5GFPocw2qcre?viewControls=on', 40),
  ('accounting_finance', 'Accounting and Finance', 'accounting', 'https://airtable.com/embed/app3hKGPjx4m3n8uy/shrxflLkiF1ljjPgZ?viewControls=on', 50),
  ('engineering_development', 'Engineering and Development', 'engineering', 'https://airtable.com/embed/appTmAS0zZwcwxhoo/shrZzO1d5s5qGPRgr?viewControls=on', 60),
  ('business_analyst', 'Business Analyst', 'business_analytics', 'https://airtable.com/embed/appK8wuhdzqC2KtWr/shrlXw5IPUECgZH9Q?viewControls=on', 70),
  ('cyber_security', 'Cybersecurity', 'cybersecurity', 'https://airtable.com/embed/app5K4hbJeNczKe80/shrmicWx3O72527KW?viewControls=on', 80),
  ('consulting', 'Consulting', 'consulting', 'https://airtable.com/embed/appk3hzdIFG7MVEqq/shr7BAtGeCN125QYK?viewControls=on', 90),
  ('management_executive', 'Management and Executive', 'management', 'https://airtable.com/embed/appFa3PBhYWICqdV9/shrkuNa5I9zuPNlA1?viewControls=on', 100)
) as seed(slug, label, category, embed_url, priority)
on conflict (provider, repository_owner, repository_name, career_category, employment_type)
do update set
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  priority = excluded.priority,
  parser_version = excluded.parser_version,
  metadata = excluded.metadata,
  updated_at = now();

commit;
