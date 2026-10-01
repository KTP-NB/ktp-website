'use client';

import { useEffect, useState } from 'react';
import { jobBoardApi } from '@/lib/job-board/clientFetch';
import { ROLE_PROFILES } from '@/lib/job-board/ats/taxonomy';
import AtsResultPanel from '../components/AtsResultPanel';
import JobBoardEmptyState from '../components/JobBoardEmptyState';

export default function AtsDashboard() {
  const [targetRole, setTargetRole] = useState('software_engineering');
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    const data = await jobBoardApi('/api/job-board/ats-history');
    setHistory(data.analyses || []);
  };

  useEffect(() => {
    loadHistory().catch((err) => setError(err.message || 'Unable to load ATS history.'));
  }, []);

  const runAnalysis = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await jobBoardApi('/api/job-board/ats-analyze', {
        method: 'POST',
        body: JSON.stringify({ targetRole }),
      });
      setAnalysis(data.analysis);
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Unable to analyze resume.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-xl backdrop-blur">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
          Deterministic ATS
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Resume Strength Check</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50/75">
          Analyze your latest uploaded PDF resume against a target role profile. This uses deterministic rules only.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <select
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            className="rounded-xl border border-white/15 bg-slate-950/40 px-4 py-3 text-sm font-bold text-white outline-none"
          >
            {Object.entries(ROLE_PROFILES).map(([key, profile]) => (
              <option key={key} value={key}>{profile.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={busy}
            className="rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Analyzing...' : 'Analyze resume'}
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}
      {analysis ? <AtsResultPanel analysis={analysis} /> : null}

      <section className="space-y-4">
        <h2 className="text-2xl font-black text-white">Analysis History</h2>
        {history.length ? (
          <div className="grid gap-3">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAnalysis(item)}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-left text-white transition hover:bg-white/[0.1]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-blue-200">
                      {item.analysis_mode === 'job'
                        ? `${item.job_board_jobs?.company || 'Job'} - ${item.job_board_jobs?.title || 'Analysis'}`
                        : formatOption(item.target_role)}
                    </p>
                    <p className="mt-1 text-xs text-blue-50/60">{formatDate(item.created_at)}</p>
                  </div>
                  <span className="text-2xl font-black">{Math.round(Number(item.score || 0))}%</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <JobBoardEmptyState
            title="No ATS analyses yet"
            message="Run a general resume check or analyze your resume from a job detail page."
          />
        )}
      </section>
    </div>
  );
}

function formatOption(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
