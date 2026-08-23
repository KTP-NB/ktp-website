'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Loader2 } from 'lucide-react';
import AuthGate from '@/components/authgate';
import AccountShell from '@/components/AccountShell';
import { useAuth } from '@/components/authprovider';
import { supabase } from '@/lib/supabase';
import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_STYLES,
  FINE_STATUS_LABELS,
  FINE_STATUS_STYLES,
  fineStatus,
  formatCurrency,
  formatDate,
  summarizeFines,
  todayIso,
} from '@/lib/fines';

const VIEWS = [
  ['outstanding', 'Outstanding'],
  ['paid', 'Paid'],
  ['all', 'All fines'],
];

function Stat({ label, value, accent = 'text-white' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="truncate text-xs font-bold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

export default function MemberFinesPage() {
  return (
    <AuthGate>
      <MemberFines />
    </AuthGate>
  );
}

function MemberFines() {
  const { user } = useAuth();
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('outstanding');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Row-level security scopes this to the signed-in member's own fines.
    const { data, error: loadError } = await supabase
      .from('member_fines')
      .select('id,date_issued,description,amount,due_date,paid,paid_on,notes')
      .order('date_issued', { ascending: false });
    if (loadError) setError(loadError.message);
    else setFines(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    load();
  }, [load, user?.id]);

  const today = todayIso();
  const summary = useMemo(() => summarizeFines(fines, today), [fines, today]);

  const visible = useMemo(() => {
    if (view === 'all') return fines;
    if (view === 'paid') return fines.filter((fine) => fine.paid);
    return fines.filter((fine) => !fine.paid);
  }, [fines, view]);

  return (
    <AccountShell>

        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="mt-1 text-3xl font-black">
              {summary.outstanding > 0
                ? `${formatCurrency(summary.outstanding)} due`
                : summary.fine_count === 0
                  ? 'No fines on your account.'
                  : 'All fines paid.'}
            </h2>
            <p className="mt-1 text-sm text-white/55">
              {summary.overdue_count > 0
                ? `${summary.overdue_count} fine${summary.overdue_count === 1 ? '' : 's'} past the due date. Settle up with the VP of Finance.`
                : summary.outstanding > 0
                  ? 'Pay the fine before the due date to avoid falling behind.'
                  : 'Nothing owed right now.'}
            </p>
          </div>
          <span
            className={`self-start rounded-full border px-4 py-2 text-sm font-bold ${
              ACCOUNT_STATUS_STYLES[summary.account_status]
            }`}
          >
            {summary.account_status === ACCOUNT_STATUSES.CLEAR ? 'Clear' : summary.account_status}
          </span>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Outstanding" value={formatCurrency(summary.outstanding)} accent={summary.outstanding > 0 ? 'text-rose-300' : 'text-white'} />
          <Stat label="Total assessed" value={formatCurrency(summary.total_assessed)} />
          <Stat label="Total paid" value={formatCurrency(summary.total_paid)} accent="text-emerald-300" />
          <Stat label="Fines received" value={summary.fine_count} />
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
          <div className="mb-5 flex rounded-xl bg-black/20 p-1 w-fit">
            {VIEWS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  view === key ? 'bg-blue-600' : 'text-white/55 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center text-white/45">
              <BadgeDollarSign className="mx-auto mb-3" size={38} />
              <p>
                {view === 'paid'
                  ? 'No paid fines yet.'
                  : view === 'outstanding'
                    ? 'Nothing outstanding. Nice.'
                    : 'No fines on your account.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
                  <tr>
                    <th className="p-3">Date issued</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Due date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((fine) => {
                    const status = fineStatus(fine, today);
                    return (
                      <tr key={fine.id} className="border-b border-white/5 hover:bg-white/[0.04]">
                        <td className="p-3 text-white/70">{formatDate(fine.date_issued)}</td>
                        <td className="p-3 font-bold">
                          {fine.description}
                          {fine.notes && <span className="block text-xs font-medium text-white/40">{fine.notes}</span>}
                        </td>
                        <td className="p-3 font-bold">{formatCurrency(fine.amount)}</td>
                        <td className="p-3 text-white/60">{formatDate(fine.due_date)}</td>
                        <td className="p-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${FINE_STATUS_STYLES[status]}`}>
                            {FINE_STATUS_LABELS[status]}
                          </span>
                          {fine.paid && fine.paid_on && (
                            <span className="block text-xs text-white/35">{formatDate(fine.paid_on)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
    </AccountShell>
  );
}
