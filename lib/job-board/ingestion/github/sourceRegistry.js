import { CAREER_CATEGORIES, JOB_EMPLOYMENT_TYPES } from '../../constants.js';

export const JOB_SOURCE_PROVIDERS = ['jobright', 'simplify', 'intern_list', 'new_grad_jobs', 'jobright_h1b'];
export const JOB_SOURCE_TYPES = ['github_repo', 'airtable_shared_view'];
export const JOB_SOURCE_CLASSIFICATIONS = ['aggregate', 'specialized'];

export const INTERN_LIST_US_INTERNSHIP_SOURCE_DEFINITIONS = [
  internListUsInternshipSource('swe', 'Software Engineering', 'software_engineering', 'https://airtable.com/embed/app17F0kkWQZhC6HB/shrOTtndhc6HSgnYb?viewControls=on', 10),
  internListUsInternshipSource('data_analysis', 'Data Analysis', 'data_analytics', 'https://airtable.com/embed/appbsiP1flCoaXCSm/shreRS1cFLbduwBaU?viewControls=on', 20),
  internListUsInternshipSource('ml_ai', 'Machine Learning and AI', 'machine_learning_ai', 'https://airtable.com/embed/appjSXAWiVF4d1HoZ/shrf04yGbrK3IebAl?viewControls=on', 30),
  internListUsInternshipSource('product_management', 'Product Management', 'product_management', 'https://airtable.com/embed/apprzZO4NFGouLji9/shrApQMVthWyRpdyu?viewControls=on', 40),
  internListUsInternshipSource('accounting_finance', 'Accounting and Finance', 'accounting', 'https://airtable.com/embed/appLzkCIXi5t8aYf4/shrIEKOHYPMwmpheG?viewControls=on', 50),
  internListUsInternshipSource('engineering_development', 'Engineering and Development', 'engineering', 'https://airtable.com/embed/appmXHK6JoqQcSKf6/shruwVkAKPjHFdVJu?viewControls=on', 60),
  internListUsInternshipSource('business_analyst', 'Business Analyst', 'business_analytics', 'https://airtable.com/embed/appFuMULJB6cXtL6L/shrabXspvMx1kfuQw?viewControls=on', 70),
  internListUsInternshipSource('cyber_security', 'Cybersecurity', 'cybersecurity', 'https://airtable.com/embed/appVWWidEOaCW7Biy/shrC0SNKnwMV3Fem9?viewControls=on', 80),
  internListUsInternshipSource('consulting', 'Consulting', 'consulting', 'https://airtable.com/embed/appvVpV9JOUFrdDyu/shrPvpTT69P8fVy6H?viewControls=on', 90),
  internListUsInternshipSource('management_executive', 'Management and Executive', 'management', 'https://airtable.com/embed/appujVcsLuXB2JFop/shrhyPUWuX0p9pWYs?viewControls=on', 100),
];

export const NEW_GRAD_US_SOURCE_DEFINITIONS = [
  newGradUsSource('swe', 'Software Engineering', 'software_engineering', 'https://airtable.com/embed/appjDG7vmPOm1pO7S/shr763VHjlzPBDCgN?viewControls=on', 10),
  newGradUsSource('data_analysis', 'Data Analysis', 'data_analytics', 'https://airtable.com/embed/appZ5SmkwkcW7Xd8C/shr51y9s2uIRlkvI8?viewControls=on', 20),
  newGradUsSource('ml_ai', 'Machine Learning and AI', 'machine_learning_ai', 'https://airtable.com/embed/appoxNzAIRReFCzZV/shrmDBF1vNPtzNjzl?viewControls=on', 30),
  newGradUsSource('product_management', 'Product Management', 'product_management', 'https://airtable.com/embed/appYvVTjJYHpq712D/shrpI5GFPocw2qcre?viewControls=on', 40),
  newGradUsSource('accounting_finance', 'Accounting and Finance', 'accounting', 'https://airtable.com/embed/app3hKGPjx4m3n8uy/shrxflLkiF1ljjPgZ?viewControls=on', 50),
  newGradUsSource('engineering_development', 'Engineering and Development', 'engineering', 'https://airtable.com/embed/appTmAS0zZwcwxhoo/shrZzO1d5s5qGPRgr?viewControls=on', 60),
  newGradUsSource('business_analyst', 'Business Analyst', 'business_analytics', 'https://airtable.com/embed/appK8wuhdzqC2KtWr/shrlXw5IPUECgZH9Q?viewControls=on', 70),
  newGradUsSource('cyber_security', 'Cybersecurity', 'cybersecurity', 'https://airtable.com/embed/app5K4hbJeNczKe80/shrmicWx3O72527KW?viewControls=on', 80),
  newGradUsSource('consulting', 'Consulting', 'consulting', 'https://airtable.com/embed/appk3hzdIFG7MVEqq/shr7BAtGeCN125QYK?viewControls=on', 90),
  newGradUsSource('management_executive', 'Management and Executive', 'management', 'https://airtable.com/embed/appFa3PBhYWICqdV9/shrkuNa5I9zuPNlA1?viewControls=on', 100),
];

export const JOBRIGHT_INTERNSHIP_SOURCE_DEFINITIONS = [
  jobrightInternshipSource('2026-Software-Engineer-Internship', 'software_engineering', 100),
  jobrightInternshipSource('2026-Data-Analysis-Internship', 'data_analytics', 110),
  jobrightInternshipSource('2026-Product-Management-Internship', 'product_management', 120),
  jobrightInternshipSource('2026-Engineer-Internship', 'engineering', 130),
  jobrightInternshipSource('2026-Consultant-Internship', 'consulting', 140),
  jobrightInternshipSource('2026-Business-Analyst-Internship', 'business_analytics', 150),
  jobrightInternshipSource('2026-Account-Internship', 'accounting', 160),
  jobrightInternshipSource('2026-Public-Sector-Internship', 'public_sector', 170),
  jobrightInternshipSource('2026-Marketing-Internship', 'marketing', 180),
  jobrightInternshipSource('2026-Sales-Internship', 'sales', 190),
  jobrightInternshipSource('2026-Design-Internship', 'design', 200),
  jobrightInternshipSource('2026-HR-Internship', 'human_resources', 210),
  jobrightInternshipSource('2026-Legal-Internship', 'legal_compliance', 220),
  jobrightInternshipSource('2026-Art-Internship', 'arts_entertainment', 230),
  jobrightInternshipSource('2026-Education-Internship', 'education', 240),
  jobrightInternshipSource('2026-Management-Internship', 'management', 250),
  jobrightInternshipSource('2026-Support-Internship', 'customer_support', 260),
  jobrightAggregateInternshipSource(),
];

export const JOBRIGHT_H1B_SOURCE_DEFINITIONS = [
  {
    provider: 'jobright_h1b',
    sourceName: 'Jobright Daily H1B Software Engineer Jobs',
    repositoryOwner: 'jobright-ai',
    repositoryName: 'Daily-H1B-Jobs-In-Tech',
    branch: 'master',
    sourceUrl: 'https://github.com/jobright-ai/Daily-H1B-Jobs-In-Tech',
    sourceType: 'github_repo',
    sourceClassification: 'specialized',
    careerCategory: 'software_engineering',
    employmentType: 'full_time',
    enabled: true,
    priority: 300,
    parserVersion: 'jobright-h1b-readme-v1',
    metadata: {
      githubDetailsSection: 'Software Engineer',
      sourceFamily: 'jobright_h1b_software_engineering',
      visaSponsorship: 'h1b',
    },
  },
];

export function validateJobSourceDraft(source) {
  const errors = {};

  if (!JOB_SOURCE_PROVIDERS.includes(source?.provider)) {
    errors.provider = 'Provider is invalid.';
  }
  if (!source?.sourceName && !source?.source_name) {
    errors.sourceName = 'Source name is required.';
  }
  const sourceType = source?.sourceType || source?.source_type || 'github_repo';

  if (sourceType === 'github_repo' && !source?.repositoryOwner && !source?.repository_owner) {
    errors.repositoryOwner = 'Repository owner is required.';
  }
  if (sourceType === 'github_repo' && !source?.repositoryName && !source?.repository_name) {
    errors.repositoryName = 'Repository name is required.';
  }
  if (!JOB_SOURCE_TYPES.includes(sourceType)) {
    errors.sourceType = 'Source type is invalid.';
  }
  if (!JOB_SOURCE_CLASSIFICATIONS.includes(source?.sourceClassification || source?.source_classification || 'aggregate')) {
    errors.sourceClassification = 'Source classification is invalid.';
  }
  if (!CAREER_CATEGORIES.includes(source?.careerCategory || source?.career_category)) {
    errors.careerCategory = 'Career category is invalid.';
  }
  if (!JOB_EMPLOYMENT_TYPES.includes(source?.employmentType || source?.employment_type)) {
    errors.employmentType = 'Employment type is invalid.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function createGithubSourceRow(draft) {
  const provider = String(draft?.provider || '').trim();
  const sourceName = String(draft?.sourceName || '').trim();
  const repositoryOwner = String(draft?.repositoryOwner || '').trim();
  const repositoryName = String(draft?.repositoryName || '').trim();
  const branch = String(draft?.branch || 'main').trim();
  const careerCategory = String(draft?.careerCategory || '').trim();
  const employmentType = String(draft?.employmentType || '').trim();
  const sourceClassification = String(draft?.sourceClassification || 'specialized').trim();
  const validation = validateJobSourceDraft({
    provider, sourceName, repositoryOwner, repositoryName, sourceType: 'github_repo',
    sourceClassification, careerCategory, employmentType,
  });
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
  if (!['jobright', 'simplify'].includes(provider)) throw new Error('Only Jobright and Simplify GitHub sources can be added here.');
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(repositoryOwner)) throw new Error('Repository owner is invalid.');
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(repositoryName) || repositoryName === '.' || repositoryName === '..') throw new Error('Repository name is invalid.');
  if (!/^[A-Za-z0-9._/-]{1,100}$/.test(branch) || branch.includes('..') || branch.startsWith('/') || branch.endsWith('/')) throw new Error('Branch is invalid.');
  if (sourceName.length > 120) throw new Error('Source name is too long.');

  return {
    provider,
    source_name: sourceName,
    repository_owner: repositoryOwner,
    repository_name: repositoryName,
    branch,
    source_url: `https://github.com/${repositoryOwner}/${repositoryName}`,
    source_type: 'github_repo',
    source_classification: sourceClassification,
    career_category: careerCategory,
    employment_type: employmentType,
    enabled: false,
    priority: 500,
    parser_version: provider === 'jobright' ? 'jobright-readme-v1' : 'simplify-readme-v1',
    metadata: {},
  };
}

export async function listEnabledGithubSources(service) {
  const { data, error } = await service
    .from('job_board_sources')
    .select('*')
    .eq('enabled', true)
    .eq('source_type', 'github_repo')
    .order('priority', { ascending: true })
    .order('source_name', { ascending: true });

  if (error) throw error;
  return (data || []).map(toJobSourceModel);
}

export async function getGithubSourceById(service, sourceId) {
  const { data, error } = await service
    .from('job_board_sources')
    .select('*')
    .eq('id', sourceId)
    .eq('source_type', 'github_repo')
    .eq('enabled', true)
    .maybeSingle();

  if (error) throw error;
  return data ? toJobSourceModel(data) : null;
}

export async function listEnabledInternListSources(service) {
  return listEnabledAirtableSources(service, 'intern_list');
}

export async function getInternListSourceById(service, sourceId) {
  return getAirtableSourceById(service, sourceId, 'intern_list');
}

export async function listEnabledAirtableSources(service, provider) {
  if (!['intern_list', 'new_grad_jobs'].includes(provider)) throw new Error('Invalid Airtable source provider.');
  const { data, error } = await service
    .from('job_board_sources')
    .select('*')
    .eq('enabled', true)
    .eq('provider', provider)
    .eq('source_type', 'airtable_shared_view')
    .order('priority', { ascending: true })
    .order('source_name', { ascending: true });

  if (error) throw error;
  return (data || []).map(toJobSourceModel);
}

export async function getAirtableSourceById(service, sourceId, provider) {
  if (!['intern_list', 'new_grad_jobs'].includes(provider)) throw new Error('Invalid Airtable source provider.');
  const { data, error } = await service
    .from('job_board_sources')
    .select('*')
    .eq('id', sourceId)
    .eq('provider', provider)
    .eq('source_type', 'airtable_shared_view')
    .eq('enabled', true)
    .maybeSingle();

  if (error) throw error;
  return data ? toJobSourceModel(data) : null;
}

export function toJobSourceModel(row) {
  return {
    id: row.id,
    provider: row.provider,
    sourceName: row.source_name,
    repositoryOwner: row.repository_owner,
    repositoryName: row.repository_name,
    branch: row.branch,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    sourceClassification: row.source_classification || 'aggregate',
    careerCategory: row.career_category,
    employmentType: row.employment_type,
    enabled: Boolean(row.enabled),
    priority: row.priority,
    parserVersion: row.parser_version,
    lastAttemptAt: row.last_attempt_at,
    lastSuccessAt: row.last_success_at,
    consecutiveFailures: row.consecutive_failures,
    lastFetchedSha: row.last_fetched_sha,
    lastFetchedEtag: row.last_fetched_etag,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function jobrightInternshipSource(repositoryName, careerCategory, priority) {
  return {
    provider: 'jobright',
    sourceName: `Jobright ${repositoryName.replace(/^2026-/, '').replace(/-/g, ' ')}`,
    repositoryOwner: 'jobright-ai',
    repositoryName,
    branch: 'master',
    sourceUrl: `https://github.com/jobright-ai/${repositoryName}`,
    sourceType: 'github_repo',
    sourceClassification: 'specialized',
    careerCategory,
    employmentType: 'internship',
    enabled: true,
    priority,
    parserVersion: 'jobright-readme-v1',
  };
}

function jobrightAggregateInternshipSource() {
  return {
    provider: 'jobright',
    sourceName: 'Jobright 2026 Internship Aggregate',
    repositoryOwner: 'jobright-ai',
    repositoryName: '2026-Internship',
    branch: 'master',
    sourceUrl: 'https://github.com/jobright-ai/2026-Internship',
    sourceType: 'github_repo',
    sourceClassification: 'aggregate',
    careerCategory: 'other',
    employmentType: 'internship',
    enabled: false,
    priority: 900,
    parserVersion: 'jobright-readme-v1',
  };
}

function internListUsInternshipSource(slug, label, careerCategory, airtableEmbedUrl, priority) {
  const selectedKey = encodeURIComponent(label);
  return {
    provider: 'intern_list',
    sourceName: `Intern List US ${label} Internships`,
    repositoryOwner: 'intern-list',
    repositoryName: `us-${slug}`,
    branch: 'main',
    sourceUrl: `https://www.intern-list.com/?selectedKey=${selectedKey}&utm_source=ktp&utm_campaign=${selectedKey}`,
    sourceType: 'airtable_shared_view',
    sourceClassification: 'specialized',
    careerCategory,
    employmentType: 'internship',
    enabled: true,
    priority,
    parserVersion: 'intern-list-airtable-v1',
    metadata: {
      country: 'US',
      internListCategory: label,
      airtableEmbedUrl,
      sourceFamily: 'intern_list_us_internships',
    },
  };
}

function newGradUsSource(slug, label, careerCategory, airtableEmbedUrl, priority) {
  return {
    provider: 'new_grad_jobs',
    sourceName: `NewGrad Jobs US ${label}`,
    repositoryOwner: 'newgrad-jobs',
    repositoryName: `us-${slug}`,
    branch: 'main',
    sourceUrl: 'https://www.newgrad-jobs.com/',
    sourceType: 'airtable_shared_view',
    sourceClassification: 'specialized',
    careerCategory,
    employmentType: 'new_grad',
    enabled: true,
    priority,
    parserVersion: 'newgrad-jobs-airtable-v1',
    metadata: {
      country: 'US',
      newGradCategory: label,
      airtableEmbedUrl,
      sourceFamily: 'new_grad_jobs_us',
    },
  };
}
