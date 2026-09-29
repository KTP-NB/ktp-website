'use client';

import Link from 'next/link';
import { applicationLinkLabel } from '@/lib/job-board/applicationLink';

export default function JobCard({ job, onToggleSaved }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-white shadow-lg backdrop-blur">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-200">{job.company}</p>
          <Link href={`/job-board/jobs/${job.id}`} className="mt-1 block text-2xl font-black tracking-tight hover:text-blue-100">
            {job.title}
          </Link>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-blue-50/75">{job.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-blue-50">
            {job.status !== 'open' ? <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-50">No longer listed</span> : null}
            <span className="rounded-full bg-blue-500/25 px-3 py-1">{job.location}</span>
            <span className="rounded-full bg-blue-500/25 px-3 py-1">{formatOption(job.workplaceType)}</span>
            <span className="rounded-full bg-blue-500/25 px-3 py-1">{formatOption(job.employmentType)}</span>
            <span className="rounded-full bg-blue-500/25 px-3 py-1">{formatOption(job.careerCategory)}</span>
            {h1bLabel(job.visaSponsorshipStatus) ? (
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-50">{h1bLabel(job.visaSponsorshipStatus)}</span>
            ) : null}
            {isPostedToday(job.postedAt) ? <span className="rounded-full bg-emerald-500/25 px-3 py-1">Posted today</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:w-64 lg:flex-col">
          {job.applyUrl && job.status === 'open' ? (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-4 py-2 text-center text-sm font-bold text-slate-950 transition hover:bg-blue-100"
            >
              {applicationLinkLabel(job.applyUrl)}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/45"
            >
              Apply
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleSaved(job)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              job.saved ? 'bg-white text-slate-950 hover:bg-blue-100' : 'bg-blue-500 text-white hover:bg-blue-400'
            }`}
          >
            {job.saved ? 'Saved' : 'Save job'}
          </button>
          <Link
            href={`/job-board/applications?jobBoardJob=${encodeURIComponent(job.id)}`}
            className="rounded-full border border-white/15 px-4 py-2 text-center text-sm font-bold text-white hover:bg-white/10"
          >
            Track application
          </Link>
        </div>
      </div>
    </article>
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

function isPostedToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}
