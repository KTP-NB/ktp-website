export async function upsertJobs(service, jobs) {
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  const rows = [];

  for (const job of jobs) {
    const existing = await findExistingJob(service, job);
    const payload = toDatabaseJob(job, now);

    if (existing) {
      const { data, error } = await service
        .from('job_board_jobs')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      rows.push(data);
      updated += 1;
    } else {
      const { data, error } = await service
        .from('job_board_jobs')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      rows.push(data);
      created += 1;
    }
  }

  return { created, updated, rows };
}

async function findExistingJob(service, job) {
  if (job.externalId) {
    const { data, error } = await service
      .from('job_board_jobs')
      .select('id')
      .eq('source', job.source)
      .eq('external_id', job.externalId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  if (job.normalizedFingerprint) {
    const { data, error } = await service
      .from('job_board_jobs')
      .select('id')
      .eq('source', job.source)
      .eq('normalized_fingerprint', job.normalizedFingerprint)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  return null;
}

function toDatabaseJob(job, now) {
  return {
    external_id: job.externalId,
    source: job.source,
    source_url: job.sourceUrl,
    company: job.company,
    title: job.title,
    department: job.department,
    location: job.location,
    workplace_type: job.workplaceType,
    employment_type: job.employmentType,
    career_category: job.careerCategory,
    salary_range: job.salaryRange,
    description: job.description,
    responsibilities: job.responsibilities,
    qualifications: job.qualifications,
    benefits: job.benefits,
    apply_url: job.applyUrl,
    status: job.status || 'open',
    posted_at: job.postedAt,
    scraped_at: now,
    last_seen_at: now,
    inactive_at: null,
    normalized_keywords: job.normalizedKeywords || [],
    normalized_fingerprint: job.normalizedFingerprint,
    source_payload: job.sourcePayload || {},
    updated_at: now,
  };
}
