import { validateNormalizedJob } from '../validation.js';

export function validateJobs(jobs) {
  const validJobs = [];
  const invalidJobs = [];

  for (const job of jobs) {
    const result = validateNormalizedJob(job);
    if (result.valid) {
      validJobs.push(job);
    } else {
      invalidJobs.push({ job, errors: result.errors });
    }
  }

  return { validJobs, invalidJobs };
}
