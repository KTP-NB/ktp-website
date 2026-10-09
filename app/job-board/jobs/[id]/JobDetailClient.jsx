'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { jobBoardApi } from '@/lib/job-board/clientFetch';
import { applicationLinkLabel } from '@/lib/job-board/applicationLink';
import JobBoardLoading from '../../components/JobBoardLoading';

export default function JobDetailClient({ jobId }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadJob() {
      try {
        const data = await jobBoardApi(`/api/job-board/jobs/${jobId}`);
        if (isMounted) setJob(data.job);
      } catch (err) {
        if (isMounted) setError(err.message || 'Unable to load job.');
      }
    }
    loadJob();
    return () => {
      isMounted = false;
    };
  }, [jobId]);

  if (error) return <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">{error}</p>;
  if (!job) return <JobBoardLoading />;

  return (
    <div className="space-y-6">
      <article className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-xl backdrop-blur md:p-8">
        <Link href="/job-board" className="text-sm font-bold text-blue-200 hover:text-white">
          Back to Job Board
        </Link>
        <header className="mt-6 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">{job.company}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">{job.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50/75">
                {job.description || profileDescription(job)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              {job.applyUrl && job.status === 'open' ? (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-blue-100"
                >
                  {applicationLinkLabel(job.applyUrl)}
                </a>
              ) : null}
              <Link
                href={`/job-board/applications?jobBoardJob=${encodeURIComponent(job.id)}`}
                className="rounded-full border border-white/20 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white/10"
              >
                Track application
              </Link>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-blue-50">
            {job.status !== 'open' ? <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-50">No longer listed</span> : null}
            <span className="rounded-full bg-blue-500/25 px-3 py-1">{job.location}</span>
            <span className="rounded-full bg-blue-500/25 px-3 py-1">{formatOption(job.workplaceType)}</span>
            <span className="rounded-full bg-blue-500/25 px-3 py-1">{formatOption(job.employmentType)}</span>
            <span className="rounded-full bg-blue-500/25 px-3 py-1">{formatOption(job.careerCategory)}</span>
            {h1bLabel(job.visaSponsorshipStatus) ? (
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-50">{h1bLabel(job.visaSponsorshipStatus)}</span>
            ) : null}
            {job.salaryRange ? <span className="rounded-full bg-blue-500/25 px-3 py-1">{job.salaryRange}</span> : null}
          </div>
          {job.visaSponsorshipNotes ? (
            <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
              {job.visaSponsorshipNotes}
            </p>
          ) : null}
        </header>

        <JobSection title="Responsibilities" items={job.responsibilities} />
        <JobSection title="Qualifications" items={job.qualifications} />
        <JobSection title="Benefits" items={job.benefits} />
      </article>

    </div>
  );
}

function JobSection({ title, items }) {
  if (!items?.length) return null;
  return (
    <section className="border-b border-white/10 py-6 last:border-b-0">
      <h2 className="text-xl font-black">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-blue-50/80">
        {items.map((item) => (
          <li key={item} className="rounded-xl bg-slate-950/25 px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatOption(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function h1bLabel(value) {
  if (value === 'explicit_h1b_sponsor') return 'Explicit H1B';
  if (value === 'likely_h1b_sponsor') return 'Likely H1B';
  return '';
}

function profileDescription(job) {
  const type = job.employmentType ? formatOption(job.employmentType) : 'Open';
  const category = job.careerCategory ? formatOption(job.careerCategory) : 'professional';
  const location = job.location || 'the listed location';
  return `${type} ${category} role based in ${location}. Review the company posting for the latest responsibilities, requirements, and application instructions.`;
}
