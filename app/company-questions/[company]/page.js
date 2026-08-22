'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, ChevronLeft, ChevronRight, ExternalLink, Loader2, RotateCcw, Search, X } from 'lucide-react';
import AuthGate from '@/components/authgate';
import CompanyQuestionsAccessGate from '../AccessGate';
import FadeIn from '@/components/FadeIn';
import { supabase } from '@/lib/supabase';
import SelectMenu from '@/components/SelectMenu';
import {
  DIFFICULTIES,
  PAGE_SIZE,
  SORTS,
  companyName,
  defaultTimeframe,
  difficultyLabel,
  difficultyStyle,
  fetchAllRows,
  questionUrl,
  sortTimeframes,
  timeframeLabel,
} from '../shared';

function Stat({ label, value, accent = 'text-white' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="truncate text-xs font-bold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

export default function CompanyQuestionsDetailPage() {
  const params = useParams();
  const company = decodeURIComponent(String(params.company || ''));

  const [timeframeOptions, setTimeframeOptions] = useState([]);
  const [facetsLoading, setFacetsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('');
  const [topicOptions, setTopicOptions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [difficulties, setDifficulties] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('frequency');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [totalMatching, setTotalMatching] = useState(0);
  const [scopeCounts, setScopeCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce the search box so typing does not fire a query per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!company) return undefined;
    let isMounted = true;
    setFacetsLoading(true);
    supabase
      .from('leetcode_company_question_facets')
      .select('timeframe')
      .eq('company', company)
      .then(({ data, error: facetsError }) => {
        if (!isMounted) return;
        if (facetsError) {
          setError(facetsError.message);
        } else {
          const options = sortTimeframes([...new Set((data || []).map((row) => row.timeframe))]);
          setTimeframeOptions(options);
          setTimeframe((current) => (current && options.includes(current) ? current : defaultTimeframe(options)));
        }
        setFacetsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [company]);

  // Topics available for this company and interview window.
  useEffect(() => {
    if (!company || !timeframe) return undefined;
    let isMounted = true;
    fetchAllRows(() =>
      supabase
        .from('leetcode_company_question_topics')
        .select('topic_slug,topic_name,question_count')
        .eq('company', company)
        .eq('timeframe', timeframe)
        .order('question_count', { ascending: false })
    )
      .then((data) => {
        if (!isMounted) return;
        setTopicOptions(data);
        // Drop selections the new timeframe does not offer.
        const available = new Set(data.map((row) => row.topic_slug));
        setTopics((current) => current.filter((slug) => available.has(slug)));
      })
      .catch((topicsError) => {
        if (isMounted) setError(topicsError.message || 'Failed to load topics');
      });
    return () => {
      isMounted = false;
    };
  }, [company, timeframe]);

  const applyScope = useCallback(
    (query) => {
      let scoped = query.eq('company', company).eq('timeframe', timeframe);
      const term = search.trim();
      if (term) scoped = scoped.ilike('title', `%${term}%`);
      // Each contains() narrows further, so several topics means "tagged with all
      // of them". The value has to be a JSON string: postgrest-js only serializes
      // objects, and would turn an array of them into "[object Object]".
      topics.forEach((slug) => {
        scoped = scoped.contains('topic_tags', JSON.stringify([{ slug }]));
      });
      return scoped;
    },
    [company, timeframe, search, topics]
  );

  useEffect(() => {
    setPage(0);
  }, [timeframe, difficulties, search, sortKey, topics]);

  // Question list for the current page.
  useEffect(() => {
    if (!timeframe) return undefined;
    let isMounted = true;
    setLoading(true);
    setError(null);

    const sort = SORTS.find(([key]) => key === sortKey)?.[2] || SORTS[0][2];
    let query = applyScope(supabase.from('leetcode_company_questions').select('*', { count: 'exact' }));
    if (difficulties.length && difficulties.length < DIFFICULTIES.length) {
      query = query.in('difficulty', difficulties);
    }

    query
      .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
      .order('title', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      .then(({ data, count, error: rowsError }) => {
        if (!isMounted) return;
        if (rowsError) {
          setError(rowsError.message);
          setRows([]);
          setTotalMatching(0);
        } else {
          setRows(data || []);
          setTotalMatching(count || 0);
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [applyScope, difficulties, sortKey, page, timeframe]);

  // Difficulty breakdown for everything except the difficulty filter itself, so
  // the pills can show how many questions each one would surface.
  useEffect(() => {
    if (!timeframe) return undefined;
    let isMounted = true;
    setScopeCounts(null);

    Promise.all(
      DIFFICULTIES.map(([key]) =>
        applyScope(supabase.from('leetcode_company_questions').select('id', { count: 'exact', head: true })).eq(
          'difficulty',
          key
        )
      )
    ).then((results) => {
      if (!isMounted) return;
      const counts = {};
      DIFFICULTIES.forEach(([key], index) => {
        counts[key] = results[index]?.count || 0;
      });
      setScopeCounts(counts);
    });

    return () => {
      isMounted = false;
    };
  }, [applyScope, timeframe]);

  const scopeTotal = useMemo(
    () => (scopeCounts ? DIFFICULTIES.reduce((sum, [key]) => sum + (scopeCounts[key] || 0), 0) : null),
    [scopeCounts]
  );
  const pageCount = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));
  const firstRow = totalMatching === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRow = Math.min(totalMatching, (page + 1) * PAGE_SIZE);
  const filtersDirty =
    difficulties.length > 0 || topics.length > 0 || searchInput.trim() !== '' || sortKey !== 'frequency';

  const timeframeItems = useMemo(
    () => timeframeOptions.map((slug) => ({ value: slug, label: timeframeLabel(slug) })),
    [timeframeOptions]
  );
  const topicItems = useMemo(
    () =>
      topicOptions.map((row) => ({
        value: row.topic_slug,
        label: row.topic_name || row.topic_slug,
        hint: row.question_count,
      })),
    [topicOptions]
  );
  const sortItems = useMemo(() => SORTS.map(([key, label]) => ({ value: key, label })), []);
  const topicName = useCallback(
    (slug) => topicOptions.find((row) => row.topic_slug === slug)?.topic_name || slug,
    [topicOptions]
  );

  function toggleDifficulty(key) {
    setDifficulties((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key]
    );
  }

  function resetFilters() {
    setDifficulties([]);
    setTopics([]);
    setSearchInput('');
    setSearch('');
    setSortKey('frequency');
  }

  const unknownCompany = !facetsLoading && timeframeOptions.length === 0;

  return (
    <AuthGate>
      <CompanyQuestionsAccessGate>
      <main className="min-h-screen px-6 pb-20 pt-24 text-white lg:px-8">
        <FadeIn className="mx-auto w-full max-w-7xl">
          <Link
            href="/company-questions"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-white/55 transition hover:text-white"
          >
            <ArrowLeft size={16} /> All companies
          </Link>

          <section className="mb-8 text-center">
            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl text-center text-white">
              {companyName(company)}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-white/70">
              {timeframe
                ? `LeetCode questions reported at ${companyName(company)} in the selected interview window.`
                : 'LeetCode questions reported by candidates at this company.'}
            </p>
          </section>

          {unknownCompany ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center text-white/45">
              <Building2 className="mx-auto mb-3" size={38} />
              <p>No questions are tracked for &ldquo;{company}&rdquo;.</p>
              <Link href="/company-questions" className="mt-3 inline-block font-bold text-blue-200 hover:text-blue-100">
                Back to all companies
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label={timeframe ? timeframeLabel(timeframe) : 'Questions'} value={scopeTotal ?? '-'} />
                {DIFFICULTIES.map(([key, label, style]) => (
                  <Stat
                    key={key}
                    label={label}
                    value={scopeCounts ? scopeCounts[key] : '-'}
                    accent={style.split(' ')[0]}
                  />
                ))}
              </div>

              <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
                <div className="mb-5 flex flex-col gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SelectMenu
                      label="Filter by timeframe"
                      value={timeframe}
                      onChange={setTimeframe}
                      options={timeframeItems}
                      placeholder="Timeframe"
                      className="lg:w-52"
                      menuClassName="w-56"
                    />

                    <SelectMenu
                      label="Filter by topic"
                      value={topics}
                      onChange={setTopics}
                      options={topicItems}
                      multiple
                      searchable
                      searchPlaceholder="Search topics"
                      placeholder="All topics"
                      className="lg:w-52"
                      menuClassName="w-72"
                    />

                    <div className="relative flex-1">
                      <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search question title"
                        className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3 outline-none focus:border-blue-300"
                      />
                    </div>

                    <SelectMenu
                      label="Sort questions"
                      value={sortKey}
                      onChange={setSortKey}
                      options={sortItems}
                      align="right"
                      className="lg:w-56"
                      menuClassName="w-60"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {DIFFICULTIES.map(([key, label, style]) => {
                      const active = difficulties.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleDifficulty(key)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                            active ? style : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
                          }`}
                        >
                          {label}
                          {scopeCounts ? ` · ${scopeCounts[key]}` : ''}
                        </button>
                      );
                    })}
                    {filtersDirty && (
                      <button
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/45 transition hover:text-white"
                      >
                        <RotateCcw size={13} /> Reset
                      </button>
                    )}
                  </div>

                  {topics.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {topics.map((slug) => (
                        <button
                          key={slug}
                          onClick={() => setTopics((current) => current.filter((item) => item !== slug))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1.5 text-xs font-bold text-blue-100 transition hover:bg-blue-400/20"
                        >
                          {topicName(slug)}
                          <X size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <p className="mb-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">
                    {error}
                  </p>
                )}

                {loading || facetsLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : rows.length === 0 ? (
                  <div className="py-16 text-center text-white/45">
                    <Building2 className="mx-auto mb-3" size={38} />
                    <p>No questions match these filters.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
                          <tr>
                            <th className="w-14 p-3">#</th>
                            <th className="p-3">Question</th>
                            <th className="p-3">Difficulty</th>
                            <th className="w-40 p-3">Frequency</th>
                            <th className="p-3">Acceptance</th>
                            <th className="p-3">Topics</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const frequency = row.frequency === null ? null : Number(row.frequency);
                            const acRate = row.ac_rate === null ? null : Number(row.ac_rate);
                            const tags = Array.isArray(row.topic_tags) ? row.topic_tags : [];
                            return (
                              <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.04]">
                                <td className="p-3 font-mono text-xs text-white/40">
                                  {row.question_frontend_id || '-'}
                                </td>
                                <td className="p-3">
                                  <a
                                    href={questionUrl(row)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group inline-flex items-center gap-2 font-bold hover:text-blue-200"
                                  >
                                    {row.title}
                                    <ExternalLink
                                      size={14}
                                      className="text-white/25 transition group-hover:text-blue-200"
                                    />
                                  </a>
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${difficultyStyle(
                                      row.difficulty
                                    )}`}
                                  >
                                    {difficultyLabel(row.difficulty)}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {frequency === null ? (
                                    <span className="text-white/35">-</span>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                                          style={{ width: `${Math.min(100, Math.max(2, frequency))}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-white/60">{frequency.toFixed(1)}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-white/60">
                                  {acRate === null ? '-' : `${(acRate * 100).toFixed(1)}%`}
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {tags.slice(0, 3).map((tag) => {
                                      const active = topics.includes(tag.slug);
                                      return (
                                        <button
                                          key={tag.slug || tag.name}
                                          onClick={() =>
                                            setTopics((current) =>
                                              current.includes(tag.slug)
                                                ? current.filter((item) => item !== tag.slug)
                                                : [...current, tag.slug]
                                            )
                                          }
                                          className={`rounded-full px-2 py-0.5 text-xs transition ${
                                            active
                                              ? 'bg-blue-500/25 text-blue-100'
                                              : 'bg-white/10 text-white/65 hover:bg-white/20 hover:text-white'
                                          }`}
                                        >
                                          {tag.name}
                                        </button>
                                      );
                                    })}
                                    {tags.length > 3 && (
                                      <span className="px-1 py-0.5 text-xs text-white/35">+{tags.length - 3}</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
                      <p className="text-sm text-white/45">
                        Showing {firstRow}-{lastRow} of {totalMatching} questions
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((value) => Math.max(0, value - 1))}
                          disabled={page === 0}
                          className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold transition hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-transparent"
                        >
                          <ChevronLeft size={16} /> Prev
                        </button>
                        <span className="text-sm text-white/55">
                          Page {page + 1} of {pageCount}
                        </span>
                        <button
                          onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                          disabled={page + 1 >= pageCount}
                          className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold transition hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-transparent"
                        >
                          Next <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </FadeIn>
      </main>
      </CompanyQuestionsAccessGate>
    </AuthGate>
  );
}
