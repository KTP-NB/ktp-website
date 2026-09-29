const DAY_MS = 24 * 60 * 60 * 1000;

export function selectDigestContent({ jobs = [], savedJobs = [], recommendations = [], appliedJobIds = [], now = new Date(), lookbackDays = 1 } = {}) {
  const since = new Date(now).getTime() - Math.max(1, Math.min(7, lookbackDays)) * DAY_MS;
  const applied = new Set(appliedJobIds);
  const openJobs = jobs.filter((job) => job.status === 'open');
  const openById = new Map(openJobs.map((job) => [job.id, job]));
  const savedIds = new Set(savedJobs.map((saved) => saved.job_id).filter((id) => !applied.has(id)));

  const newJobs = openJobs
    .filter((job) => Date.parse(job.created_at) >= since && !savedIds.has(job.id) && !applied.has(job.id))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 5);
  const savedToApply = [...savedIds]
    .map((id) => openById.get(id))
    .filter(Boolean)
    .slice(0, 3);
  const excluded = new Set([...newJobs, ...savedToApply].map((job) => job.id));
  const suggested = recommendations
    .filter((recommendation) => recommendation.status === 'active')
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .map((recommendation) => openById.get(recommendation.job_id))
    .filter((job) => job && !excluded.has(job.id) && !applied.has(job.id))
    .slice(0, 3);

  return { newJobs, savedToApply, suggested };
}

export function hasDigestContent(content) {
  return content.newJobs.length > 0 || content.savedToApply.length > 0 || content.suggested.length > 0;
}

export function digestPeriod(now, frequency) {
  const date = new Date(now);
  if (frequency === 'none') return null;
  if (frequency === 'weekly') {
    if (date.getUTCDay() !== 0) return null;
    date.setUTCDate(date.getUTCDate() - 6);
  }
  return date.toISOString().slice(0, 10);
}

export function digestSummary(content) {
  const parts = [];
  if (content.newJobs.length) parts.push(`${content.newJobs.length} new job${content.newJobs.length === 1 ? '' : 's'} posted`);
  if (content.savedToApply.length) parts.push(`${content.savedToApply.length} saved job${content.savedToApply.length === 1 ? '' : 's'} to apply to`);
  if (content.suggested.length) parts.push(`${content.suggested.length} recommendation${content.suggested.length === 1 ? '' : 's'}`);
  return parts.join('. ') + '.';
}
