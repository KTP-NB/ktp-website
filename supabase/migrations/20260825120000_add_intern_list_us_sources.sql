-- Add Intern List US internship sources and move internship ingestion away from Jobright repos.

begin;
alter table public.job_board_sources
  drop constraint if exists job_board_sources_provider_check,
  add constraint job_board_sources_provider_check
    check (provider in ('jobright', 'simplify', 'intern_list'));
alter table public.job_board_sources
  drop constraint if exists job_board_sources_source_type_check,
  add constraint job_board_sources_source_type_check
    check (source_type in ('github_repo', 'airtable_shared_view'));
update public.job_board_sources
set enabled = false,
    metadata = metadata || '{"disabled_reason":"Internship ingestion moved to Intern List Airtable shared views."}'::jsonb,
    updated_at = now()
where provider = 'jobright'
  and employment_type = 'internship';
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
  ('intern_list', 'Intern List US Software Engineering Internships', 'intern-list', 'us-swe', 'main', 'https://www.intern-list.com/?selectedKey=Software%20Engineering&utm_source=ktp&utm_campaign=Software%20Engineering', 'airtable_shared_view', 'specialized', 'software_engineering', 'internship', true, 10, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Software Engineering","airtableEmbedUrl":"https://airtable.com/embed/app17F0kkWQZhC6HB/shrOTtndhc6HSgnYb?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb),
  ('intern_list', 'Intern List US Data Analysis Internships', 'intern-list', 'us-data_analysis', 'main', 'https://www.intern-list.com/?selectedKey=Data%20Analysis&utm_source=ktp&utm_campaign=Data%20Analysis', 'airtable_shared_view', 'specialized', 'data_analytics', 'internship', true, 20, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Data Analysis","airtableEmbedUrl":"https://airtable.com/embed/appbsiP1flCoaXCSm/shreRS1cFLbduwBaU?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb),
  ('intern_list', 'Intern List US Machine Learning and AI Internships', 'intern-list', 'us-ml_ai', 'main', 'https://www.intern-list.com/?selectedKey=Machine%20Learning%20and%20AI&utm_source=ktp&utm_campaign=Machine%20Learning%20and%20AI', 'airtable_shared_view', 'specialized', 'machine_learning_ai', 'internship', true, 30, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Machine Learning and AI","airtableEmbedUrl":"https://airtable.com/embed/appjSXAWiVF4d1HoZ/shrf04yGbrK3IebAl?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb),
  ('intern_list', 'Intern List US Product Management Internships', 'intern-list', 'us-product_management', 'main', 'https://www.intern-list.com/?selectedKey=Product%20Management&utm_source=ktp&utm_campaign=Product%20Management', 'airtable_shared_view', 'specialized', 'product_management', 'internship', true, 40, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Product Management","airtableEmbedUrl":"https://airtable.com/embed/apprzZO4NFGouLji9/shrApQMVthWyRpdyu?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb),
  ('intern_list', 'Intern List US Accounting and Finance Internships', 'intern-list', 'us-accounting_finance', 'main', 'https://www.intern-list.com/?selectedKey=Accounting%20and%20Finance&utm_source=ktp&utm_campaign=Accounting%20and%20Finance', 'airtable_shared_view', 'specialized', 'accounting', 'internship', true, 50, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Accounting and Finance","airtableEmbedUrl":"https://airtable.com/embed/appLzkCIXi5t8aYf4/shrIEKOHYPMwmpheG?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb),
  ('intern_list', 'Intern List US Engineering and Development Internships', 'intern-list', 'us-engineering_development', 'main', 'https://www.intern-list.com/?selectedKey=Engineering%20and%20Development&utm_source=ktp&utm_campaign=Engineering%20and%20Development', 'airtable_shared_view', 'specialized', 'engineering', 'internship', true, 60, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Engineering and Development","airtableEmbedUrl":"https://airtable.com/embed/appmXHK6JoqQcSKf6/shruwVkAKPjHFdVJu?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb),
  ('intern_list', 'Intern List US Business Analyst Internships', 'intern-list', 'us-business_analyst', 'main', 'https://www.intern-list.com/?selectedKey=Business%20Analyst&utm_source=ktp&utm_campaign=Business%20Analyst', 'airtable_shared_view', 'specialized', 'business_analytics', 'internship', true, 70, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Business Analyst","airtableEmbedUrl":"https://airtable.com/embed/appFuMULJB6cXtL6L/shrabXspvMx1kfuQw?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb),
  ('intern_list', 'Intern List US Cybersecurity Internships', 'intern-list', 'us-cyber_security', 'main', 'https://www.intern-list.com/?selectedKey=Cybersecurity&utm_source=ktp&utm_campaign=Cybersecurity', 'airtable_shared_view', 'specialized', 'cybersecurity', 'internship', true, 80, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Cybersecurity","airtableEmbedUrl":"https://airtable.com/embed/appVWWidEOaCW7Biy/shrC0SNKnwMV3Fem9?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb),
  ('intern_list', 'Intern List US Consulting Internships', 'intern-list', 'us-consulting', 'main', 'https://www.intern-list.com/?selectedKey=Consulting&utm_source=ktp&utm_campaign=Consulting', 'airtable_shared_view', 'specialized', 'consulting', 'internship', true, 90, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Consulting","airtableEmbedUrl":"https://airtable.com/embed/appvVpV9JOUFrdDyu/shrPvpTT69P8fVy6H?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb),
  ('intern_list', 'Intern List US Management and Executive Internships', 'intern-list', 'us-management_executive', 'main', 'https://www.intern-list.com/?selectedKey=Management%20and%20Executive&utm_source=ktp&utm_campaign=Management%20and%20Executive', 'airtable_shared_view', 'specialized', 'management', 'internship', true, 100, 'intern-list-airtable-v1', '{"country":"US","internListCategory":"Management and Executive","airtableEmbedUrl":"https://airtable.com/embed/appujVcsLuXB2JFop/shrhyPUWuX0p9pWYs?viewControls=on","sourceFamily":"intern_list_us_internships"}'::jsonb)
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
