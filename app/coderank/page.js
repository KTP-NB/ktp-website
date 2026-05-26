'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Clock, CheckCircle2, ListChecks, AlertCircle } from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';
import { api } from '@/lib/coderank/clientFetch';
const UNLIMITED_SUBMISSIONS = 2147483647;

export default function CodeRankPage() {
  return (
    <AuthGate>
      <CodeRankDashboard />
    </AuthGate>
  );
}

function CodeRankDashboard() {
  const [assessments, setAssessments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api('/api/coderank/assigned')
        .then((r) => { if (!cancelled) setAssessments(r.assessments || []); })
        .catch((e) => { if (!cancelled) setError(e.message); });
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { cancelled = true; window.removeEventListener('focus', onFocus); };
  }, []);

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      <FadeIn className="mx-auto w-full max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl text-white">
            Your Assessments
          </h1>
          <p className="mt-3 text-[1.05rem] text-white/60">
            Coding challenges assigned by the VP of Tech Development and VP of Prof Development
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-300/25 bg-red-400/10 px-5 py-4 text-sm text-red-100 mb-6 flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <span>{error}</span>
          </div>
        )}

        {assessments === null && !error && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
          </div>
        )}

        {assessments && assessments.length === 0 && (
          <div className="py-16 text-center rounded-2xl border border-white/10 bg-white/[0.02]">
            <ListChecks size={40} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/60">No assessments assigned to you yet.</p>
          </div>
        )}

        {assessments && assessments.length > 0 && (
          <div className="space-y-4">
            {assessments.map((a) => (
              <AssessmentCard key={a.id} assessment={a} />
            ))}
          </div>
        )}
      </FadeIn>
    </main>
  );
}

function AssessmentCard({ assessment: a }) {
  const att = a.attempt;
  const isDone = att?.status === 'submitted';
  const isInProgress = att?.status === 'in_progress';
  const isExpired = att?.status === 'expired';

  const statusBadge = isDone
    ? <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-200 text-xs font-bold"><CheckCircle2 size={12}/>Submitted</span>
    : isInProgress
      ? <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs font-bold"><Clock size={12}/>In progress</span>
      : isExpired
        ? <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-bold">Expired</span>
        : <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-200 text-xs font-bold">New</span>;

  return (
    <Link
      href={`/coderank/${a.id}`}
      className="block rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold truncate">{a.title}</h2>
            {statusBadge}
          </div>
          {a.description && (
            <p className="text-sm text-white/60 line-clamp-2 mb-3">{a.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><ListChecks size={14}/>{a.question_count} {a.question_count === 1 ? 'problem' : 'problems'}</span>
            <span className="flex items-center gap-1.5"><Clock size={14}/>{formatTimeLimit(a.time_limit_minutes)}</span>
            <span>{formatSubmissionLimit(a.max_submissions_per_question)}</span>
          </div>
        </div>
        <div className="text-blue-300 text-sm font-bold whitespace-nowrap">
          {isDone ? 'View →' : isInProgress ? 'Continue →' : 'Open →'}
        </div>
      </div>
    </Link>
  );
}

function formatTimeLimit(minutes) {
  return Number(minutes) > 0 ? `${minutes} min` : 'No time limit';
}

function formatSubmissionLimit(maxSubmissions) {
  return Number(maxSubmissions) >= UNLIMITED_SUBMISSIONS ? 'Unlimited submissions' : `${maxSubmissions} submissions / problem`;
}
