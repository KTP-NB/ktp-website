'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCheck, Loader2, RotateCcw, Search, X } from 'lucide-react';
import { api } from '@/lib/coderank/clientFetch';
import SelectMenu from '@/components/SelectMenu';

const FILTERS = [
  ['all', 'Everyone'],
  ['missing', 'Missing OA'],
  ['done', 'Completed'],
  ['exempt', 'Exempt'],
];

const STATE_LABELS = {
  done: 'Completed',
  missing: 'Missing',
  exempt: 'Exempt',
};

const STATE_STYLES = {
  done: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
  missing: 'border-rose-300/30 bg-rose-400/10 text-rose-200',
  exempt: 'border-white/15 bg-white/5 text-white/55',
};

const EXEMPT_LABELS = {
  not_active: 'Not an active member',
  super_admin: 'Super Admin',
  major: 'Non-CS/DS major',
  no_profile: 'No profile',
};

function monthOptions(current) {
  // Fourteen months ending one month ahead, so past months stay reviewable and
  // next month can be set up in advance.
  const options = [];
  const [year, month] = current.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, 1));
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  for (let i = 0; i < 14; i += 1) {
    const value = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    options.push(value);
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return options;
}

function monthLabel(month) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function rowState(member) {
  const status = member.status || {};
  if (!status.required) return 'exempt';
  return status.completed ? 'done' : 'missing';
}

function Stat({ label, value, accent = 'text-white' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="truncate text-xs font-bold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

export default function OaComplianceView() {
  const [month, setMonth] = useState(null);
  const [members, setMembers] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (requestedMonth) => {
    setLoading(true);
    setError(null);
    try {
      const query = requestedMonth ? `?month=${requestedMonth}` : '';
      const result = await api(`/api/coderank/admin/oa-compliance${query}`);
      setMonth(result.month);
      setMembers(result.members || []);
      setCanEdit(Boolean(result.canEdit));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setOverride(member, completed) {
    setBusyId(member.member_id);
    setError(null);
    try {
      await api('/api/coderank/admin/oa-compliance', {
        method: 'PUT',
        body: JSON.stringify({ member_id: member.member_id, month, completed }),
      });
      await load(month);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusyId(null);
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((member) => {
      if (filter !== 'all' && rowState(member) !== filter) return false;
      if (!term) return true;
      return (
        (member.member_name || '').toLowerCase().includes(term) ||
        (member.major || '').toLowerCase().includes(term) ||
        (member.pledge_class || '').toLowerCase().includes(term)
      );
    });
  }, [members, filter, search]);

  const counts = useMemo(() => {
    const tally = { required: 0, done: 0, missing: 0, exempt: 0, overridden: 0 };
    members.forEach((member) => {
      const state = rowState(member);
      tally[state] += 1;
      if (state !== 'exempt') tally.required += 1;
      if (member.status?.override !== null && member.status?.override !== undefined) tally.overridden += 1;
    });
    return tally;
  }, [members]);

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="mb-1 text-lg font-bold">Monthly OA compliance</h3>
          <p className="text-sm text-white/50">
            Who has completed an assessment this month. Active CS and Data Science members who miss it lose
            LC Company Tagged access. Months before September 2026 count as completed unless you mark otherwise.
          </p>
        </div>
        {month && (
          <SelectMenu
            label="Month"
            value={month}
            onChange={(next) => load(next)}
            options={monthOptions(month).map((value) => ({ value, label: monthLabel(value) }))}
            align="right"
            className="w-56"
          />
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Required" value={counts.required} />
        <Stat label="Completed" value={counts.done} accent="text-emerald-300" />
        <Stat label="Missing" value={counts.missing} accent={counts.missing ? 'text-rose-300' : 'text-white'} />
        <Stat label="Exempt" value={counts.exempt} />
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex rounded-xl bg-black/20 p-1">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                filter === key ? 'bg-blue-600' : 'text-white/55 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members"
            className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3 outline-none focus:border-blue-300"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center text-white/45">
          <ClipboardCheck className="mx-auto mb-3" size={38} />
          <p>No members match this view.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="p-4">Member</th>
                <th className="p-4">Class</th>
                <th className="p-4">Major</th>
                <th className="p-4">OA this month</th>
                <th className="p-4">Source</th>
                {canEdit && <th className="p-4 text-right">Set credit</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((member) => {
                const status = member.status || {};
                const state = rowState(member);
                const busy = busyId === member.member_id;
                const overridden = status.override !== null && status.override !== undefined;
                return (
                  <tr key={member.member_id} className="border-t border-white/5 hover:bg-white/[0.04]">
                    <td className="p-4">
                      <span className="font-bold">{member.member_name}</span>
                      {!member.has_account && (
                        <span className="block text-xs text-white/35">No account linked</span>
                      )}
                    </td>
                    <td className="p-4 text-white/60">{member.pledge_class || '—'}</td>
                    <td className="p-4 text-white/60">{member.major || '—'}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${STATE_STYLES[state]}`}
                      >
                        {STATE_LABELS[state]}
                      </span>
                      {state === 'exempt' && (
                        <span className="mt-1 block text-xs text-white/40">
                          {EXEMPT_LABELS[status.exempt_reason] || status.exempt_reason}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-white/55">
                      {overridden ? (
                        <span className="text-blue-200">
                          Set by Super Admin ({status.override ? 'credited' : 'revoked'})
                        </span>
                      ) : status.auto_credited ? (
                        <span className="text-white/40">Auto-credited (before September)</span>
                      ) : status.submitted_at ? (
                        new Date(status.submitted_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      ) : (
                        '—'
                      )}
                    </td>
                    {canEdit && (
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setOverride(member, true)}
                            disabled={busy}
                            title="Mark as completed"
                            className={`rounded-lg p-2 transition disabled:opacity-40 ${
                              status.override === true
                                ? 'bg-emerald-500/20 text-emerald-200'
                                : 'text-emerald-300 hover:bg-emerald-500/10'
                            }`}
                          >
                            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button
                            onClick={() => setOverride(member, false)}
                            disabled={busy}
                            title="Mark as not completed"
                            className={`rounded-lg p-2 transition disabled:opacity-40 ${
                              status.override === false
                                ? 'bg-rose-500/20 text-rose-200'
                                : 'text-rose-300 hover:bg-rose-500/10'
                            }`}
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => setOverride(member, null)}
                            disabled={busy || !overridden}
                            title="Clear override and use CodeRank records"
                            className="rounded-lg p-2 text-white/50 transition hover:bg-white/10 disabled:opacity-25"
                          >
                            <RotateCcw size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
