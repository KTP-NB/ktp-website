'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { jobBoardApi } from '@/lib/job-board/clientFetch';
import JobBoardEmptyState from '../components/JobBoardEmptyState';

export default function RecommendationsClient() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadRecommendations() {
    const data = await jobBoardApi('/api/job-board/recommendations');
    setRecommendations(data.recommendations || []);
  }

  useEffect(() => {
    let isMounted = true;
    loadRecommendations()
      .catch((err) => { if (isMounted) setError(err.message || 'Unable to load recommendations.'); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  async function refresh() {
    setRefreshing(true);
    setError('');
    setMessage('');
    try {
      const result = await jobBoardApi('/api/job-board/recommendations', { method: 'POST' });
      await loadRecommendations();
      setMessage(`Refreshed ${result.refreshed || 0} recommendations and generated ${result.notifications || 0} notifications.`);
    } catch (err) {
      setError(err.message || 'Unable to refresh recommendations.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">Deterministic matches</p>
            <h2 className="mt-2 text-3xl font-black">Recommended Jobs</h2>
            <p className="mt-2 text-sm text-blue-50/75">Recommendations use saved jobs, application activity, and recently posted roles.</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-400 disabled:opacity-60"
          >
            {refreshing ? 'Refreshing...' : 'Refresh recommendations'}
          </button>
        </div>
      </section>

      {message ? <p className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-bold text-emerald-100">{message}</p> : null}
      {error ? <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
      ) : recommendations.length ? (
        <div className="grid gap-4">
          {recommendations.map((rec) => (
            <article key={rec.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-white shadow-lg backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-200">{rec.job_board_jobs?.company}</p>
                  <Link
                    href={`/job-board/jobs/${rec.job_id}`}
                    className="mt-1 block text-2xl font-black hover:text-blue-100"
                    onClick={() => jobBoardApi('/api/job-board/events', {
                      method: 'POST',
                      body: JSON.stringify({ eventType: 'recommendation_clicked', entityType: 'job', entityId: rec.job_id, metadata: { recommendationId: rec.id } }),
                    }).catch(() => {})}
                  >
                    {rec.job_board_jobs?.title}
                  </Link>
                  <p className="mt-2 text-sm leading-6 text-blue-50/75">{rec.explanation || rec.reasons?.join('. ')}</p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-blue-200">Score {Math.round(Number(rec.score || 0))}%</p>
                </div>
                <span className="rounded-full bg-blue-500/25 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-50">
                  {formatOption(rec.job_board_jobs?.career_category)}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <JobBoardEmptyState
          title="No recommendations yet"
          message="Refresh recommendations after saving jobs or tracking applications."
        />
      )}
    </div>
  );
}

function formatOption(value) {
  return String(value || 'job').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
