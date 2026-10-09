export function isJobBoardJobId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export function jobBoardApplicationDraft(job, dateApplied) {
  return {
    company: job.company || '',
    position: job.title || '',
    date_applied: dateApplied,
    status: 'applied',
    details: '',
    application_url: job.applyUrl || '',
    referral: false,
    referral_contact: '',
  };
}

export function legacyApplicationDraft(application) {
  const job = application.job_board_jobs;
  if (!job || !['applied', 'interviewing', 'offer', 'rejected', 'withdrawn'].includes(application.status)) return null;
  if (String(job.source || '').toLowerCase().includes('mock-careers')) return null;
  const dateApplied = String(application.applied_at || application.created_at || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateApplied)) return null;
  const applicationUrl = application.application_url || job.apply_url || null;
  return {
    user_id: application.user_id,
    company: job.company,
    position: job.title,
    date_applied: dateApplied,
    status: application.status,
    details: String(application.notes || '').slice(0, 5000) || null,
    application_url: /^https?:\/\//i.test(applicationUrl || '') ? applicationUrl : null,
    external_id: `job-board:${application.id}`,
  };
}
