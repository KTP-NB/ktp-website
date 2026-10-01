export function dedupeJobs(jobs) {
  const seen = new Set();
  const dedupedJobs = [];
  const duplicates = [];

  for (const job of jobs) {
    const key = `${job.source}:${job.externalId || job.normalizedFingerprint}`;
    if (seen.has(key)) {
      duplicates.push(job);
      continue;
    }
    seen.add(key);
    dedupedJobs.push(job);
  }

  return { dedupedJobs, duplicates };
}
