import { CAREER_CATEGORIES } from './constants.js';
import { normalizeApplicationUrl } from './ingestion/canonicalize.js';
import { cleanJobTitle } from './models.js';

export async function refreshRecommendationsForUser(service, userId) {
  const [jobsResult, savedResult, appsResult] = await Promise.all([
    service.from('job_board_jobs').select('*').eq('status', 'open'),
    service.from('job_board_saved_jobs').select('job_id, job_board_jobs ( career_category, employment_type, workplace_type )').eq('user_id', userId),
    service.from('internship_applications').select('company, position, application_url, status').eq('user_id', userId),
  ]);

  for (const result of [jobsResult, savedResult, appsResult]) {
    if (result.error) throw result.error;
  }

  const matchedApplications = matchTrackedApplicationsToJobs(jobsResult.data || [], appsResult.data || []);
  const preference = buildPreferenceProfile(savedResult.data || [], matchedApplications.map((job) => ({ job_board_jobs: job })));
  const savedIds = new Set((savedResult.data || []).map((row) => row.job_id));
  const appliedIds = new Set(matchedApplications.map((job) => job.id));

  const rows = (jobsResult.data || [])
    .filter((job) => !appliedIds.has(job.id))
    .map((job) => scoreJob(job, preference, savedIds.has(job.id)))
    .filter((row) => row.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  if (!rows.length) return { refreshed: 0 };

  const payload = rows.map((row) => ({
    user_id: userId,
    job_id: row.job.id,
    score: row.score,
    reasons: row.reasons,
    explanation: row.explanation,
    status: 'active',
    refreshed_at: new Date().toISOString(),
    dismissed_at: null,
  }));

  const { error } = await service
    .from('job_board_recommendations')
    .upsert(payload, { onConflict: 'user_id,job_id' });
  if (error) throw error;

  return { refreshed: payload.length };
}

export function matchTrackedApplicationsToJobs(jobs, applications) {
  const byUrl = new Map();
  const byName = new Map();
  for (const job of jobs) {
    const url = normalizeApplicationUrl(job.apply_url);
    if (url) byUrl.set(url, [...(byUrl.get(url) || []), job]);
    const name = `${normalizeName(job.company)}:${normalizeName(cleanJobTitle(job.title))}`;
    byName.set(name, [...(byName.get(name) || []), job]);
  }

  const matched = new Map();
  for (const application of applications) {
    const url = normalizeApplicationUrl(application.application_url);
    const name = `${normalizeName(application.company)}:${normalizeName(application.position)}`;
    const candidates = url && byUrl.has(url) ? byUrl.get(url) : byName.get(name);
    if (candidates?.length === 1) matched.set(candidates[0].id, candidates[0]);
  }
  return [...matched.values()];
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function refreshRecommendationsForAllUsers(service) {
  const { data, error } = await service
    .from('member_profiles')
    .select('user_id')
    .not('user_id', 'is', null);
  if (error) throw error;

  let refreshed = 0;
  for (const row of data || []) {
    const result = await refreshRecommendationsForUser(service, row.user_id);
    refreshed += result.refreshed;
  }
  return { users: (data || []).length, refreshed };
}

function buildPreferenceProfile(savedRows, applicationRows) {
  const categoryWeights = {};
  const employmentWeights = {};
  const workplaceWeights = {};

  for (const row of [...savedRows, ...applicationRows]) {
    increment(categoryWeights, row.job_board_jobs?.career_category, 10);
    increment(employmentWeights, row.job_board_jobs?.employment_type, 4);
    increment(workplaceWeights, row.job_board_jobs?.workplace_type, 4);
  }

  return { categoryWeights, employmentWeights, workplaceWeights };
}

function scoreJob(job, preference, alreadySaved) {
  const reasons = [];
  let score = alreadySaved ? 15 : 0;

  const categoryScore = preference.categoryWeights[job.career_category] || (CAREER_CATEGORIES.includes(job.career_category) ? 8 : 0);
  if (categoryScore) {
    score += Math.min(45, categoryScore);
    reasons.push(`Matches ${formatLabel(job.career_category)} interests`);
  }

  const employmentScore = preference.employmentWeights[job.employment_type] || 5;
  score += Math.min(15, employmentScore);
  reasons.push(`${formatLabel(job.employment_type)} role`);

  const workplaceScore = preference.workplaceWeights[job.workplace_type] || 5;
  score += Math.min(10, workplaceScore);

  if (isPostedToday(job.posted_at)) {
    score += 20;
    reasons.push('Posted today');
  }

  if (alreadySaved) reasons.push('You already saved this job');

  return {
    job,
    score: Math.min(100, Math.round(score)),
    reasons,
    explanation: reasons.slice(0, 3).join('. '),
  };
}

function increment(target, key, amount) {
  if (!key) return;
  target[key] = (target[key] || 0) + amount;
}

function isPostedToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function formatLabel(value) {
  return String(value || '').replaceAll('_', ' ');
}
