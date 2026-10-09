'use client';

import { useEffect, useMemo, useState } from 'react';
import { jobBoardApi } from '@/lib/job-board/clientFetch';
import { DEFAULT_JOBS_PER_PAGE, JOBS_PER_PAGE_OPTIONS } from '@/lib/job-board/constants';
import { buildJobsQueryString } from '@/lib/job-board/browserQuery';
import JobBoardEmptyState from './JobBoardEmptyState';
import JobCard from './JobCard';
import JobFilters from './JobFilters';
import JobPagination from './JobPagination';

export default function JobBoardBrowser({ savedOnly = false }) {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: DEFAULT_JOBS_PER_PAGE,
    total: 0,
    totalPages: 0,
  });
  const [query, setQuery] = useState({
    search: '',
    category: '',
    employmentType: '',
    h1bStatus: '',
    workplaceType: '',
    company: '',
    postedToday: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const hasActiveFilters = Object.values(query).some(Boolean);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(query.search), 300);
    return () => clearTimeout(timer);
  }, [query.search]);

  const queryString = useMemo(() => {
    return buildJobsQueryString({
      page: pagination.page,
      perPage: pagination.perPage,
      savedOnly,
      search: debouncedSearch,
      category: query.category,
      employmentType: query.employmentType,
      h1bStatus: query.h1bStatus,
      workplaceType: query.workplaceType,
      company: query.company,
      postedToday: query.postedToday,
    });
  }, [pagination.page, pagination.perPage, debouncedSearch, query.category, query.employmentType, query.h1bStatus, query.workplaceType, query.company, query.postedToday, savedOnly]);

  useEffect(() => {
    let isMounted = true;
    async function loadJobs() {
      setLoading(true);
      setError('');
      try {
        const data = await jobBoardApi(`/api/job-board/jobs?${queryString}`);
        if (!isMounted) return;
        setJobs(data.jobs || []);
        setFilters(data.filters || {});
        setPagination((current) => ({ ...current, ...data.pagination }));
      } catch (err) {
        if (isMounted) setError(err.message || 'Unable to load jobs.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadJobs();
    return () => {
      isMounted = false;
    };
  }, [queryString]);

  const reloadFirstPage = () => {
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const updateQuery = (updates) => {
    setQuery((current) => ({ ...current, ...updates }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const clearFilters = () => {
    setQuery({ search: '', category: '', employmentType: '', h1bStatus: '', workplaceType: '', company: '', postedToday: false });
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const toggleSaved = async (job) => {
    const nextSaved = !job.saved;
    setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, saved: nextSaved } : item)));
    try {
      await jobBoardApi('/api/job-board/saved-jobs', {
        method: nextSaved ? 'POST' : 'DELETE',
        body: JSON.stringify({ jobId: job.id }),
      });
      if (savedOnly && !nextSaved) reloadFirstPage();
    } catch (err) {
      setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, saved: job.saved } : item)));
      setError(err.message || 'Unable to update saved job.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative z-20 rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
              Live job pipeline
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {savedOnly ? 'Saved Jobs' : 'Search Jobs'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-50/75">
              Search live-source opportunities, save roles, and track applications from Supabase.
            </p>
          </div>
        </div>

        <JobFilters
          query={query}
          filters={filters}
          perPage={pagination.perPage}
          onQueryChange={updateQuery}
          onPerPageChange={(perPage) => setPagination((current) => ({ ...current, page: 1, perPage }))}
        />
        {hasActiveFilters ? (
          <button type="button" onClick={clearFilters} className="mt-3 text-sm font-semibold text-blue-200 hover:text-white">
            Clear filters
          </button>
        ) : null}
      </div>

      {error ? <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
          ))}
        </div>
      ) : jobs.length ? (
        <>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onToggleSaved={toggleSaved}
              />
            ))}
          </div>
          <JobPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            perPage={pagination.perPage}
            onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
          />
        </>
      ) : (
        <JobBoardEmptyState
          title={savedOnly ? 'No saved jobs yet' : 'No jobs found'}
          message={hasActiveFilters
            ? (query.h1bStatus ? 'No current H1B listings match these filters.' : 'No current jobs match these filters.')
            : (savedOnly ? 'Save jobs from the main Job Board search view.' : 'No current listings are available.')}
          action={hasActiveFilters ? <button type="button" onClick={clearFilters} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-400">Clear filters</button> : null}
        />
      )}
    </div>
  );
}
