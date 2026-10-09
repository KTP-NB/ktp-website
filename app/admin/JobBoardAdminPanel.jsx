'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { jobBoardApi } from '@/lib/job-board/clientFetch';
import { CAREER_CATEGORIES, JOB_EMPLOYMENT_TYPES } from '@/lib/job-board/constants';
import { formatAdminJobBoardSummary } from '@/lib/job-board/adminJobs';

const SOURCE_GROUPS = [
  { title: 'US internships', providers: ['intern_list'] },
  { title: 'US new grad jobs', providers: ['new_grad_jobs'] },
  { title: 'H1B software engineering', providers: ['jobright_h1b'] },
  { title: 'Backup GitHub sources', providers: ['jobright', 'simplify'] },
];
const EMPTY_SOURCE = { provider: 'jobright', sourceName: '', repositoryOwner: '', repositoryName: '', branch: 'main', careerCategory: 'software_engineering', employmentType: 'internship', sourceClassification: 'specialized' };

export default function JobBoardAdminPanel() {
  const [sources, setSources] = useState([]);
  const [overview, setOverview] = useState(null);
  const [showDisabled, setShowDisabled] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newSource, setNewSource] = useState(EMPTY_SOURCE);
  const [showAddSource, setShowAddSource] = useState(false);

  const refresh = useCallback(async () => {
    const [sourceResult, overviewResult] = await Promise.all([
      jobBoardApi('/api/job-board/admin/sources'),
      jobBoardApi('/api/job-board/admin/overview'),
    ]);
    setSources(sourceResult.sources || []);
    setOverview(overviewResult);
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(err.message || 'Unable to load Job Board operations.'));
  }, [refresh]);

  async function run(label, action) {
    setBusy(label);
    setError('');
    setMessage('');
    try {
      const result = await action();
      const summary = result?.summary || result;
      if (summary?.failed > 0) {
        setError(`${label}: ${formatAdminJobBoardSummary(summary)}`);
      } else {
        setMessage(`${label}: ${formatAdminJobBoardSummary(summary)}`);
      }
      await refresh();
      return true;
    } catch (err) {
      setError(err.message || `${label} failed.`);
      return false;
    } finally {
      setBusy('');
    }
  }

  function runSource(source) {
    const endpoint = ['intern_list', 'new_grad_jobs'].includes(source.provider)
      ? '/api/job-board/admin/intern-list-ingest'
      : '/api/job-board/admin/github-ingest';
    return run(source.source_name, () => jobBoardApi(endpoint, {
      method: 'POST',
      body: JSON.stringify({ sourceId: source.id, provider: source.provider }),
    }));
  }

  function toggleSource(source) {
    return run(source.source_name, () => jobBoardApi('/api/job-board/admin/sources', {
      method: 'PATCH',
      body: JSON.stringify({ sourceId: source.id, enabled: !source.enabled }),
    }));
  }

  async function addSource(event) {
    event.preventDefault();
    const added = await run('Add source', () => jobBoardApi('/api/job-board/admin/sources', {
      method: 'POST',
      body: JSON.stringify(newSource),
    }));
    if (!added) return;
    setNewSource(EMPTY_SOURCE);
    setShowAddSource(false);
    setShowDisabled(true);
  }

  function archivePostings() {
    if (!window.confirm('Archive all open Job Board postings? Saved jobs and application history will remain.')) return;
    run('Archive postings', () => jobBoardApi('/api/job-board/admin/jobs/clear', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'archive-job-postings' }),
    }));
  }

  return (
    <section className="space-y-7 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Job Board</h2>
          <p className="text-sm text-white/55">Source status and ingestion history</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => run('Refresh', () => Promise.resolve())} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"><RefreshCw size={16} /> Refresh</button>
          <button type="button" onClick={archivePostings} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50"><Trash2 size={16} /> Archive postings</button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p>}

      {overview && (
        <div className="grid grid-cols-2 gap-4 border-y border-white/10 py-4 text-sm sm:grid-cols-3">
          <Metric label="Open jobs" value={overview.counts?.openJobs} />
          <Metric label="Saved jobs" value={overview.counts?.savedJobs} />
          <Metric label="Applications" value={overview.counts?.applications} />
        </div>
      )}

      {SOURCE_GROUPS.map((group) => {
        const grouped = sources.filter((source) => group.providers.includes(source.provider));
        const visible = group.title === 'Backup GitHub sources' && !showDisabled
          ? grouped.filter((source) => source.enabled)
          : grouped;
        return (
          <section key={group.title} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold">{group.title} <span className="font-normal text-white/45">({grouped.filter((source) => source.enabled).length} enabled)</span></h3>
              {group.title === 'Backup GitHub sources' && <label className="flex items-center gap-2 text-sm text-white/65"><input type="checkbox" checked={showDisabled} onChange={(event) => setShowDisabled(event.target.checked)} /> Show disabled</label>}
            </div>
            <div className="divide-y divide-white/10 border-y border-white/10">
              {visible.map((source) => (
                <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{source.source_name}</p>
                    <p className="mt-1 text-xs text-white/50">{source.provider.replaceAll('_', ' ')} | Last success {formatDate(source.last_success_at)} | {source.consecutive_failures || 0} failures</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={source.source_url} target="_blank" rel="noreferrer" aria-label={`Open ${source.source_name}`} className="rounded-lg p-2 text-white/65 hover:bg-white/10"><ExternalLink size={16} /></a>
                    <button type="button" onClick={() => toggleSource(source)} disabled={Boolean(busy)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50">{source.enabled ? 'Disable' : 'Enable'}</button>
                    <button type="button" onClick={() => runSource(source)} disabled={Boolean(busy) || !source.enabled} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"><Play size={14} /> Run</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section className="border-t border-white/10 pt-5">
        <button type="button" onClick={() => setShowAddSource((value) => !value)} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-200 hover:text-white"><Plus size={16} /> Add GitHub source</button>
        {showAddSource && (
          <form onSubmit={addSource} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SourceSelect label="Provider" value={newSource.provider} values={['jobright', 'simplify']} onChange={(value) => setNewSource({ ...newSource, provider: value })} />
            <SourceInput label="Source name" value={newSource.sourceName} onChange={(value) => setNewSource({ ...newSource, sourceName: value })} />
            <SourceInput label="GitHub owner" value={newSource.repositoryOwner} onChange={(value) => setNewSource({ ...newSource, repositoryOwner: value })} />
            <SourceInput label="Repository" value={newSource.repositoryName} onChange={(value) => setNewSource({ ...newSource, repositoryName: value })} />
            <SourceInput label="Branch" value={newSource.branch} onChange={(value) => setNewSource({ ...newSource, branch: value })} />
            <SourceSelect label="Category" value={newSource.careerCategory} values={CAREER_CATEGORIES} onChange={(value) => setNewSource({ ...newSource, careerCategory: value })} />
            <SourceSelect label="Role type" value={newSource.employmentType} values={JOB_EMPLOYMENT_TYPES} onChange={(value) => setNewSource({ ...newSource, employmentType: value })} />
            <SourceSelect label="Coverage" value={newSource.sourceClassification} values={['specialized', 'aggregate']} onChange={(value) => setNewSource({ ...newSource, sourceClassification: value })} />
            <div className="sm:col-span-2 lg:col-span-4"><button type="submit" disabled={Boolean(busy)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">Add disabled source</button></div>
          </form>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-base font-bold">Recent ingestion runs</h3>
        <div className="divide-y divide-white/10 border-y border-white/10 text-sm">
          {(overview?.ingestionRuns || []).map((item) => (
            <div key={item.id} className="flex flex-wrap justify-between gap-2 py-3">
              <span>{item.source_name}</span>
              <span className="text-white/55">{item.status} | {item.inserted_count || 0} inserted | {formatDate(item.finished_at || item.started_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function SourceInput({ label, value, onChange }) {
  return <label className="space-y-1 text-xs text-white/65"><span>{label}</span><input required value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400" /></label>;
}

function SourceSelect({ label, value, values, onChange }) {
  return <label className="space-y-1 text-xs text-white/65"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400">{values.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label>;
}

function Metric({ label, value }) {
  return <div><p className="text-xs uppercase text-white/45">{label}</p><p className="mt-1 text-2xl font-bold">{value ?? '-'}</p></div>;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'never';
}
