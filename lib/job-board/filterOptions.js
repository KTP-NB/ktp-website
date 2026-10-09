import { inferDisplayEmploymentType, normalizeDisplayCareerCategory } from './models.js';
import { NEW_GRAD_FULL_TIME_FILTER } from './employmentFilter.js';

const PAGE_SIZE = 1000;
const FIELDS = 'id,company,career_category,employment_type,workplace_type,title,source_url,visa_sponsorship_status';

export async function loadJobFilterOptions(service) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await service
      .from('job_board_jobs')
      .select(FIELDS)
      .eq('status', 'open')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return buildJobFilterOptions(rows);
}

export function buildJobFilterOptions(rows) {
  return {
    companies: uniqueSorted(rows.map((job) => job.company)),
    categories: uniqueSorted(rows.map((job) => normalizeDisplayCareerCategory(job.career_category))),
    employmentTypes: uniqueSorted(rows.map((job) => {
      const type = inferDisplayEmploymentType(job);
      if (type === 'part_time') return null;
      return ['new_grad', 'full_time'].includes(type) ? NEW_GRAD_FULL_TIME_FILTER : type;
    })),
    workplaceTypes: uniqueSorted(rows.map((job) => job.workplace_type)),
    h1bStatuses: uniqueSorted(rows.map((job) => job.visa_sponsorship_status).filter((value) => value && value !== 'unknown')),
  };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
