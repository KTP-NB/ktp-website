import { categorizeJob, extractKeywords } from './categorize.js';

export function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function normalizeSlug(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeEmploymentType(value) {
  const normalized = normalizeSlug(value).replace(/-/g, '_');
  if (['intern', 'internship'].includes(normalized)) return 'internship';
  if (['co_op', 'coop', 'co_opportunity'].includes(normalized)) return 'co_op';
  if (['new_grad', 'new_graduate', 'entry_level', 'early_career'].includes(normalized)) return 'new_grad';
  if (['full_time', 'fulltime'].includes(normalized)) return 'full_time';
  if (['part_time', 'parttime'].includes(normalized)) return 'part_time';
  if (['contract', 'contractor'].includes(normalized)) return 'contract';
  if (['apprentice', 'apprenticeship'].includes(normalized)) return 'apprenticeship';
  if (normalized === 'other') return 'other';
  return 'full_time';
}

export function normalizeWorkplaceType(value) {
  const normalized = normalizeSlug(value);
  if (normalized.includes('remote')) return 'remote';
  if (normalized.includes('hybrid')) return 'hybrid';
  if (normalized.includes('onsite') || normalized.includes('on-site')) return 'onsite';
  return 'onsite';
}

export function createJobFingerprint(job) {
  return [
    normalizeSlug(job.company),
    normalizeSlug(job.title),
    normalizeSlug(job.location),
    normalizeEmploymentType(job.employmentType),
  ].join(':');
}

export function normalizeJob(rawJob, source) {
  const normalized = {
    externalId: normalizeText(rawJob.id || rawJob.externalId || rawJob.external_id),
    source,
    sourceUrl: normalizeText(rawJob.sourceUrl || rawJob.source_url || rawJob.applyUrl || rawJob.apply_url),
    company: normalizeText(rawJob.company),
    title: normalizeText(rawJob.title),
    department: normalizeText(rawJob.department),
    location: normalizeText(rawJob.location || 'Remote'),
    workplaceType: normalizeWorkplaceType(rawJob.workplaceType || rawJob.workplace_type),
    employmentType: normalizeEmploymentType(rawJob.employmentType || rawJob.employment_type),
    salaryRange: normalizeText(rawJob.salaryRange || rawJob.salary_range),
    description: normalizeText(rawJob.description || rawJob.summary),
    responsibilities: normalizeList(rawJob.responsibilities),
    qualifications: normalizeList(rawJob.qualifications),
    benefits: normalizeList(rawJob.benefits),
    applyUrl: normalizeText(rawJob.applyUrl || rawJob.apply_url),
    postedAt: normalizeDate(rawJob.postedAt || rawJob.posted_at),
    status: 'open',
    sourcePayload: rawJob,
  };

  normalized.careerCategory = rawJob.careerCategory || rawJob.career_category || categorizeJob(normalized);
  normalized.normalizedKeywords = extractKeywords(normalized);
  normalized.normalizedFingerprint = createJobFingerprint(normalized);

  return normalized;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeText).filter(Boolean);
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
