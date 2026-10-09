import { NextResponse } from 'next/server';
import { requireJobBoardUser } from '@/lib/job-board/auth';
import { CAREER_CATEGORIES, DEFAULT_JOBS_PER_PAGE, JOB_EMPLOYMENT_TYPES, JOBS_PER_PAGE_OPTIONS, JOB_WORKPLACE_TYPES } from '@/lib/job-board/constants';
import { loadJobFilterOptions } from '@/lib/job-board/filterOptions';
import { newYorkDayBounds } from '@/lib/job-board/postingDates';
import { applyEmploymentTypeFilter, NEW_GRAD_FULL_TIME_FILTER } from '@/lib/job-board/employmentFilter';
import { getJobBoardServiceClient } from '@/lib/job-board/supabaseServer';
import { toJobSummary } from '@/lib/job-board/models';
import { normalizeJobSearch } from '@/lib/job-board/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const FILTER_CACHE_MS = 60_000;
let filterCache = null;
let filterCachedAt = 0;
let pendingFilters = null;

export async function GET(request) {
  const auth = await requireJobBoardUser(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const params = url.searchParams;
  const page = Number(params.get('page') || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) {
    return NextResponse.json({ error: 'Invalid page.' }, { status: 400 });
  }
  const requestedPerPage = Number(params.get('perPage') || DEFAULT_JOBS_PER_PAGE);
  const perPage = JOBS_PER_PAGE_OPTIONS.includes(requestedPerPage)
    ? requestedPerPage
    : DEFAULT_JOBS_PER_PAGE;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const service = getJobBoardServiceClient();
  const savedOnly = params.get('saved') === 'true';
  const savedJobIds = await getSavedJobIds(service, auth.user.id);

  if (savedOnly && savedJobIds.length === 0) {
    return NextResponse.json({
      jobs: [],
      pagination: { page, perPage, total: 0, totalPages: 0 },
      filters: await getFilterOptions(service),
    });
  }

  let query = service
    .from('job_board_jobs')
    .select('*', { count: 'exact' })
    .order('posted_at', { ascending: false, nullsFirst: false })
    .range(from, to);
  if (!savedOnly) query = query.eq('status', 'open');

  const search = normalizeJobSearch(params.get('search'));
  if (search) {
    query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const category = params.get('category');
  if (category && !CAREER_CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
  if (category) query = query.in('career_category', categoryDbValues(category));

  const employmentType = params.get('employmentType');
  if (employmentType && !JOB_EMPLOYMENT_TYPES.includes(employmentType) && employmentType !== NEW_GRAD_FULL_TIME_FILTER) return NextResponse.json({ error: 'Invalid role type.' }, { status: 400 });
  if (employmentType) query = applyEmploymentTypeFilter(query, employmentType);

  const h1bStatus = params.get('h1bStatus');
  if (h1bStatus) query = applyH1bFilter(query, h1bStatus);

  const workplaceType = params.get('workplaceType');
  if (workplaceType && !JOB_WORKPLACE_TYPES.includes(workplaceType)) return NextResponse.json({ error: 'Invalid workplace type.' }, { status: 400 });
  if (workplaceType) query = query.eq('workplace_type', workplaceType);

  const company = params.get('company');
  if (company) query = query.eq('company', company);

  if (params.get('postedToday') === 'true') {
    const { start, end } = newYorkDayBounds();
    query = query.gte('posted_at', start).lt('posted_at', end);
  }

  if (savedOnly) {
    query = query.in('id', savedJobIds);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    jobs: (data || []).map((job) => toJobSummary({
      ...job,
      saved: savedJobIds.includes(job.id),
    })),
    pagination: {
      page,
      perPage,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / perPage),
    },
    filters: await getFilterOptions(service),
  });
}

async function getSavedJobIds(service, userId) {
  const { data, error } = await service
    .from('job_board_saved_jobs')
    .select('job_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((row) => row.job_id);
}

async function getFilterOptions(service) {
  if (filterCache && Date.now() - filterCachedAt < FILTER_CACHE_MS) return filterCache;
  if (!pendingFilters) {
    pendingFilters = loadJobFilterOptions(service).then((filters) => {
      filterCache = filters;
      filterCachedAt = Date.now();
      return filters;
    }).finally(() => { pendingFilters = null; });
  }
  return pendingFilters;
}

function categoryDbValues(category) {
  const values = {
    product_management: ['product_management', 'product'],
    business_analytics: ['business_analytics', 'business'],
    machine_learning_ai: ['machine_learning_ai', 'machine_learning'],
  };
  return values[category] || [category];
}

function applyH1bFilter(query, h1bStatus) {
  if (h1bStatus === 'h1b_friendly') {
    return query.in('visa_sponsorship_status', ['explicit_h1b_sponsor', 'likely_h1b_sponsor']);
  }
  if (['explicit_h1b_sponsor', 'likely_h1b_sponsor', 'unknown'].includes(h1bStatus)) {
    return query.eq('visa_sponsorship_status', h1bStatus);
  }
  return query;
}
