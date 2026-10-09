export function toJobSummary(job) {
  return {
    id: job.id,
    externalId: job.external_id,
    title: cleanJobTitle(job.title),
    status: job.status || 'open',
    company: job.company,
    department: job.department,
    location: job.location,
    workplaceType: job.workplaceType || job.workplace_type || null,
    employmentType: inferDisplayEmploymentType(job),
    careerCategory: normalizeDisplayCareerCategory(job.careerCategory || job.career_category),
    salaryRange: job.salaryRange || job.salary_range || null,
    description: job.description || null,
    responsibilities: job.responsibilities || [],
    qualifications: job.qualifications || [],
    benefits: job.benefits || [],
    applyUrl: job.applyUrl || job.apply_url || null,
    postedAt: job.postedAt || job.posted_at || null,
    createdAt: job.createdAt || job.created_at || null,
    updatedAt: job.updatedAt || job.updated_at || null,
    source: job.source,
    sourceUrl: job.sourceUrl || job.source_url || null,
    visaSponsorshipStatus: job.visaSponsorshipStatus || job.visa_sponsorship_status || 'unknown',
    visaSponsorshipConfidence: job.visaSponsorshipConfidence || job.visa_sponsorship_confidence || 'unknown',
    visaSponsorshipNotes: job.visaSponsorshipNotes || job.visa_sponsorship_notes || null,
    saved: Boolean(job.saved),
    application: job.application || null,
  };
}

export function toApplicationSummary(application) {
  return {
    id: application.id,
    jobId: application.jobId || application.job_id,
    status: application.status,
    appliedAt: application.appliedAt || application.applied_at,
    updatedAt: application.updatedAt || application.updated_at,
  };
}

export function cleanJobTitle(value) {
  let text = String(value || '').trim();
  if (!text) return text;

  text = text
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
    .replace(/\*\*/g, '');

  let previous = '';
  while (previous !== text) {
    previous = text;
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  }

  return text
    .replace(/^\[+|\]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferDisplayEmploymentType(job) {
  const text = [
    job.title,
    job.source_url,
    job.sourceUrl,
    job.source_payload?.latest_github_record?.sourceName,
    job.source_payload?.latest_github_record?.repository,
  ].join(' ').toLowerCase();

  if (/\bco-?ops?\b/.test(text)) return 'co_op';
  if (/\b(apprentice|apprenticeship)\b/.test(text)) return 'apprenticeship';
  if (/\bintern(ship)?\b/.test(text)) return 'internship';

  const explicit = job.employmentType || job.employment_type;
  if (explicit) return explicit;

  if (/\bnew grad(uate)?\b/.test(text)) return 'new_grad';
  return null;
}

export function normalizeDisplayCareerCategory(value) {
  const category = String(value || '').trim();
  if (category === 'product') return 'product_management';
  if (category === 'business') return 'business_analytics';
  if (category === 'machine_learning') return 'machine_learning_ai';
  return category || 'other';
}
