export function buildJobsQueryString({ page, perPage, savedOnly = false, search = '', category = '', employmentType = '', h1bStatus = '', workplaceType = '', company = '', postedToday = false }) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (savedOnly) params.set('saved', 'true');
  for (const [key, value] of Object.entries({ search, category, employmentType, h1bStatus, workplaceType, company, postedToday })) {
    if (value) params.set(key, String(value));
  }
  return params.toString();
}
