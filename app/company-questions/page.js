'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, Loader2, Search } from 'lucide-react';
import AuthGate from '@/components/authgate';
import CompanyQuestionsAccessGate from './AccessGate';
import FadeIn from '@/components/FadeIn';
import { supabase } from '@/lib/supabase';
import { companyName, fetchAllRows, sortTimeframes, timeframeShortLabel } from './shared';

const INITIAL_VISIBLE = 60;

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="truncate text-xs font-bold uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

export default function CompanyQuestionsPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    let isMounted = true;
    fetchAllRows(() =>
      supabase
        .from('leetcode_companies')
        .select('company,question_count,timeframe_counts')
        .order('question_count', { ascending: false })
    )
      .then((rows) => {
        if (!isMounted) return;
        setCompanies(rows);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(loadError.message || 'Failed to load companies');
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter(
      (entry) => companyName(entry.company).toLowerCase().includes(term) || entry.company.includes(term)
    );
  }, [companies, search]);

  useEffect(() => {
    setLimit(INITIAL_VISIBLE);
  }, [search]);

  const visible = matches.slice(0, limit);
  const totalQuestions = useMemo(
    () => companies.reduce((sum, entry) => sum + (entry.question_count || 0), 0),
    [companies]
  );

  return (
    <AuthGate>
      <CompanyQuestionsAccessGate>
      <main className="min-h-screen px-6 pb-20 pt-24 text-white lg:px-8">
        <FadeIn className="mx-auto w-full max-w-7xl">
          <section className="mb-8 text-center">
            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl text-center text-white">
              Company Questions
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-white/70">
              LeetCode questions reported at each company. Pick a company to see what it has been asking,
              filtered by interview window, difficulty, and topic.
            </p>
          </section>

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Companies" value={companies.length || '-'} />
            <Stat label="Questions tracked" value={totalQuestions ? totalQuestions.toLocaleString() : '-'} />
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
            <div className="relative mb-5">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search companies"
                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3 outline-none focus:border-blue-300"
              />
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
                <Building2 className="mx-auto mb-3" size={38} />
                <p>No companies match that search.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((entry) => {
                    const counts = entry.timeframe_counts || {};
                    return (
                      <Link
                        key={entry.company}
                        href={`/company-questions/${entry.company}`}
                        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-blue-300/40 hover:bg-white/10"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-black">{companyName(entry.company)}</p>
                          <p className="text-sm text-white/50">{entry.question_count} questions</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {sortTimeframes(Object.keys(counts)).map((slug) => (
                              <span key={slug} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                                {timeframeShortLabel(slug)} · {counts[slug]}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight size={18} className="shrink-0 text-white/25 transition group-hover:text-blue-200" />
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-sm text-white/45">
                    Showing {visible.length} of {matches.length} companies
                  </p>
                  {visible.length < matches.length && (
                    <button
                      onClick={() => setLimit((current) => current + INITIAL_VISIBLE)}
                      className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10"
                    >
                      Show more
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </FadeIn>
      </main>
      </CompanyQuestionsAccessGate>
    </AuthGate>
  );
}
