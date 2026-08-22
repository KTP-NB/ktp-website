'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeDollarSign, ClipboardCheck, Loader2, Lock, ShieldAlert } from 'lucide-react';
import FadeIn from '@/components/FadeIn';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/fines';

/**
 * Eligibility gate for the LC Company Tagged pages. The rule itself lives in
 * the database (company_questions_access) and is enforced by RLS on the
 * question tables — this only explains to the member why the door is shut.
 */
export default function CompanyQuestionsAccessGate({ children }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    supabase
      .rpc('company_questions_access')
      .then(({ data, error: rpcError }) => {
        if (!isMounted) return;
        if (rpcError) setError(rpcError.message);
        else setState(data);
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </main>
    );
  }

  // A lookup failure should not hand out access; the RLS policy would return an
  // empty page anyway, so explain it instead.
  if (error || !state) {
    return (
      <LockedShell title="Access check failed">
        <p className="text-white/60">{error || 'Could not confirm your access. Try reloading.'}</p>
      </LockedShell>
    );
  }

  if (state.allowed) return children;

  const owed = Number(state.outstanding_fines || 0);
  const monthLabel = state.oa_window_start
    ? new Date(`${String(state.oa_window_start).slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <LockedShell title="LC Company Tagged is locked">
      <p className="mb-6 text-white/60">
        Company-tagged questions stay open to members in good standing. Clear the items below to get back in.
      </p>

      <div className="space-y-3 text-left">
        {state.blocked_by_admin && (
          <Reason
            icon={ShieldAlert}
            tone="rose"
            title="Access removed by a Super Admin"
            detail="Reach out to the exec board if you think this is a mistake."
          />
        )}

        {owed > 0 && (
          <Reason
            icon={BadgeDollarSign}
            tone="rose"
            title={`${formatCurrency(owed)} in unpaid fines`}
            detail={`${state.unpaid_fine_count} unpaid ${
              Number(state.unpaid_fine_count) === 1 ? 'fine' : 'fines'
            } on your account. Settle up with the VP of Finance and access returns automatically.`}
            action={{ href: '/fines', label: 'View my fines' }}
          />
        )}

        {!state.blocked_by_admin && owed <= 0 && !(state.oa_required && !state.oa_completed) && (
          <Reason
            icon={ShieldAlert}
            tone="rose"
            title="Your account is not eligible"
            detail={
              state.reason === 'no_profile'
                ? 'This login is not linked to a member profile yet. Ask an admin to link it.'
                : 'Contact the exec board to sort out your standing.'
            }
          />
        )}

        {state.oa_required && !state.oa_completed && (
          <Reason
            icon={ClipboardCheck}
            tone="amber"
            title="You have not met the OA requirement this month"
            detail={`Members complete one coding assessment each month${
              monthLabel ? ` — ${monthLabel} is still outstanding` : ''
            }. Finish one and this unlocks right away.`}
            action={{ href: '/coderank', label: 'Go to CodeRank' }}
          />
        )}
      </div>
    </LockedShell>
  );
}

function LockedShell({ title, children }) {
  return (
    <main className="min-h-screen px-6 pb-20 pt-24 text-white lg:px-8">
      <FadeIn className="mx-auto w-full max-w-2xl">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Lock size={26} className="text-white/60" />
          </div>
          <h1 className="mb-2 text-3xl font-black tracking-tight">{title}</h1>
          {children}
        </section>
      </FadeIn>
    </main>
  );
}

function Reason({ icon: Icon, tone, title, detail, action }) {
  const tones = {
    rose: 'border-rose-300/25 bg-rose-400/10 text-rose-200',
    amber: 'border-amber-300/25 bg-amber-400/10 text-amber-200',
  };
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm text-white/55">{detail}</p>
        {action && (
          <Link
            href={action.href}
            className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
