'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, ShieldAlert, Plus, Trash2, Check,
  Users, Layers, Shuffle, CalendarClock, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { useAuth } from '@/components/authprovider';
import { api } from '@/lib/coderank/clientFetch';

const ADMIN_POSITIONS = ['vp of tech development', 'vp of prof development'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const CATEGORY_FILTERS = [
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stack',
  'Binary Search',
  'Linked List',
  'Trees',
  'Heap / Priority Queue',
  'Backtracking',
  'Tries',
  'Graphs',
  'Advanced Graphs',
  '1-D Dynamic Programming',
  '2-D Dynamic Programming',
  'Greedy',
  'Intervals',
  'Math & Geometry',
  'Bit Manipulation',
];
const CATEGORY_ORDER = new Map(CATEGORY_FILTERS.map((category, index) => [category, index]));
const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 };
const UNLIMITED_SUBMISSIONS = 2147483647;

export default function NewAssessmentPage() {
  return (
    <AuthGate>
      <NewAssessment />
    </AuthGate>
  );
}

function NewAssessment() {
  const { user } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [noTimeLimit, setNoTimeLimit] = useState(false);
  const [maxSubs, setMaxSubs] = useState(3);
  const [unlimitedSubs, setUnlimitedSubs] = useState(false);
  const [publishMode, setPublishMode] = useState('draft'); // draft | now | scheduled
  const [publishAt, setPublishAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [questionMode, setQuestionMode] = useState('manual');
  const [randomQuestionCount, setRandomQuestionCount] = useState(3);
  const [randomDifficulties, setRandomDifficulties] = useState([]);
  const [randomCategories, setRandomCategories] = useState([]);

  // Question bank
  const [bank, setBank] = useState([]);
  const [bankFilter, setBankFilter] = useState('');
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [picked, setPicked] = useState([]); // array of question objects

  // Assignment
  const [assignAll, setAssignAll] = useState(true);
  const [pledgeClasses, setPledgeClasses] = useState([]); // list of strings
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [members, setMembers] = useState([]); // {user_id, name, pledge_class}
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [assignmentSearch, setAssignmentSearch] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Authorize
  useEffect(() => {
    if (!user?.id || !hasSupabaseConfig) return;
    (async () => {
      const { data } = await supabase
        .from('member_profiles')
        .select('position')
        .eq('user_id', user.id)
        .maybeSingle();
      const pos = (data?.position || '').toLowerCase();
      setAuthorized(ADMIN_POSITIONS.some((p) => pos.includes(p)));
    })();
  }, [user?.id]);

  // Load question bank + members
  useEffect(() => {
    if (!authorized) return;
    (async () => {
      try {
        const { questions } = await api('/api/coderank/admin/questions');
        setBank(questions || []);
      } catch (e) { setError(e.message); }

      const { data } = await supabase
        .from('member_profiles')
        .select('user_id, name, pledge_class, member_status')
        .order('name');
      const active = (data || []).filter((m) => {
        const status = (m.member_status || '').trim().toLowerCase();
        return m.user_id && status !== 'alumni' && status !== 'inactive';
      });
      setMembers(active);
      const classes = [...new Set(active.map((m) => m.pledge_class).filter(Boolean))].sort();
      setPledgeClasses(classes);
    })();
  }, [authorized]);

  const filteredBank = useMemo(() => {
    const q = bankFilter.toLowerCase();
    return bank.filter((b) => {
      const categoryText = `${b.category || ''} ${b.pattern || ''}`.toLowerCase();
      const matchesText = !q ||
        b.title.toLowerCase().includes(q) ||
        categoryText.includes(q) ||
        b.difficulty.toLowerCase().includes(q);
      const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(b.difficulty);
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.some((c) => (b.category || '').toLowerCase() === c.toLowerCase());
      return matchesText && matchesDifficulty && matchesCategory;
    }).sort(compareQuestions);
  }, [bank, bankFilter, selectedDifficulties, selectedCategories]);

  const pickedIds = new Set(picked.map((p) => p.id));

  const randomPool = useMemo(() => bank.filter((q) => {
    const matchesDifficulty = randomDifficulties.length === 0 || randomDifficulties.includes(q.difficulty);
    const matchesCategory = randomCategories.length === 0 ||
      randomCategories.some((c) => (q.category || '').toLowerCase() === c.toLowerCase());
    return matchesDifficulty && matchesCategory;
  }).sort(compareQuestions), [bank, randomDifficulties, randomCategories]);

  const effectiveQuestionCount = questionMode === 'random'
    ? Math.min(Number(randomQuestionCount) || 0, randomPool.length)
    : picked.length;
  const assignmentMembers = useMemo(() => {
    const q = assignmentSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => [m.name, m.pledge_class]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)));
  }, [assignmentSearch, members]);

  function togglePick(q) {
    if (pickedIds.has(q.id)) {
      setPicked(picked.filter((p) => p.id !== q.id));
    } else {
      setPicked([...picked, q]);
    }
  }
  function reorder(i, dir) {
    const ni = i + dir;
    if (ni < 0 || ni >= picked.length) return;
    const copy = [...picked];
    [copy[i], copy[ni]] = [copy[ni], copy[i]];
    setPicked(copy);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Title is required.');
    if (!noTimeLimit && (!Number(timeLimit) || Number(timeLimit) < 1)) return setError('Enter a positive time limit or choose no time limit.');
    if (!unlimitedSubs && (!Number.isInteger(Number(maxSubs)) || Number(maxSubs) < 1)) return setError('Enter a positive submission limit or choose unlimited submissions.');
    const randomCount = Number(randomQuestionCount);
    if (questionMode === 'manual' && picked.length === 0) return setError('Pick at least one question.');
    if (questionMode === 'random' && (!randomCount || randomCount < 1)) return setError('Choose how many random questions each member should receive.');
    if (questionMode === 'random' && randomPool.length < randomCount) return setError('The random pool has fewer questions than the requested count.');
    if (publishMode === 'scheduled' && !publishAt) return setError('Choose a publish date or switch to draft/immediate.');
    if (dueAt && new Date(dueAt) <= new Date()) return setError('The get done by date must be in the future.');

    const assignments = assignAll
      ? [{ type: 'all' }]
      : [
          ...selectedClasses.map((c) => ({ type: 'pledge_class', value: c })),
          ...selectedUserIds.map((u) => ({ type: 'user', value: u })),
        ];

    if (!assignAll && assignments.length === 0) {
      return setError('Pick at least one cohort or member to assign to.');
    }

    setSubmitting(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        time_limit_minutes: noTimeLimit ? 0 : Number(timeLimit),
        max_submissions_per_question: unlimitedSubs ? UNLIMITED_SUBMISSIONS : Number(maxSubs),
        published: publishMode !== 'draft',
        publish_at: publishMode === 'scheduled' ? new Date(publishAt).toISOString() : null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        randomize_question_order: randomizeOrder || questionMode === 'random',
        random_question_count: questionMode === 'random' ? randomCount : null,
        random_question_difficulties: questionMode === 'random' ? randomDifficulties : [],
        random_question_categories: questionMode === 'random' ? randomCategories : [],
        question_ids: questionMode === 'random' ? randomPool.map((p) => p.id) : picked.map((p) => p.id),
        assignments,
      };
      const { assessment } = await api('/api/coderank/admin/assessments', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      router.push(`/admin/coderank/${assessment.id}`);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  if (authorized === null) {
    return <main className="min-h-screen flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-white/50"/></main>;
  }
  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="text-center max-w-md">
          <ShieldAlert size={48} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold">Access Restricted</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      <FadeIn className="mx-auto max-w-5xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6">
          <ArrowLeft size={16}/>Back to Admin Portal
        </Link>
        <h1 className="text-3xl font-black mb-1">New Coding Assessment</h1>
        <p className="text-white/50 mb-8">Pick questions, set a time limit, assign to members.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basics */}
          <Section title="Basics">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Title">
                <input
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-blue-300"
                  placeholder="e.g. Week 1 Arrays Challenge"
                  maxLength={120}
                />
              </Field>
              <Field label="Time limit (minutes)">
                <div className="space-y-2">
                  <input
                    type="number" min={1} max={600} value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    disabled={noTimeLimit}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-blue-300 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-white/60">
                    <input
                      type="checkbox"
                      checked={noTimeLimit}
                      onChange={(e) => setNoTimeLimit(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/10 accent-blue-500"
                    />
                    No time limit
                  </label>
                </div>
              </Field>
            </div>
            <Field label="Description (optional)">
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-blue-300"
                placeholder="What this assessment is for…"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Max submissions per problem">
                <div className="space-y-2">
                  <input
                    type="number" min={1} max={20} value={maxSubs}
                    disabled={unlimitedSubs}
                    onChange={(e) => setMaxSubs(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-blue-300 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-white/60">
                    <input
                      type="checkbox"
                      checked={unlimitedSubs}
                      onChange={(e) => setUnlimitedSubs(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/10 accent-blue-500"
                    />
                    Unlimited submissions
                  </label>
                </div>
              </Field>
              <Field label="Get done by">
                <DateTimePicker
                  value={dueAt}
                  onChange={setDueAt}
                  placeholder="May 23, 2026 3:48 PM"
                />
              </Field>
            </div>
          </Section>

          <Section title="Availability">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['draft', 'Draft', 'Save privately until leadership publishes it.'],
                ['now', 'Publish now', 'Members can start as soon as it is assigned.'],
                ['scheduled', 'Schedule', 'Publish automatically at a later date.'],
              ].map(([value, label, copy]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPublishMode(value)}
                  className={`rounded-xl border p-4 text-left transition ${publishMode === value ? 'border-blue-300/60 bg-blue-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                >
                  <div className="font-bold">{label}</div>
                  <div className="mt-1 text-xs leading-5 text-white/50">{copy}</div>
                </button>
              ))}
            </div>
            {publishMode === 'scheduled' && (
              <Field label="Publish at">
                <DateTimePicker value={publishAt} onChange={setPublishAt} placeholder="May 23, 2026 3:48 PM" />
              </Field>
            )}
          </Section>

          {/* Questions */}
          <Section title={`Questions (${effectiveQuestionCount} ${questionMode === 'random' ? 'per member' : 'selected'})`}>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setQuestionMode('manual')}
                className={`rounded-xl border p-4 text-left transition ${questionMode === 'manual' ? 'border-blue-300/60 bg-blue-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
              >
                <div className="font-bold">Pick exact questions</div>
                <div className="mt-1 text-xs leading-5 text-white/50">Every member receives the same selected questions.</div>
              </button>
              <button
                type="button"
                onClick={() => setQuestionMode('random')}
                className={`rounded-xl border p-4 text-left transition ${questionMode === 'random' ? 'border-emerald-300/60 bg-emerald-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
              >
                <div className="font-bold">Random set per member</div>
                <div className="mt-1 text-xs leading-5 text-white/50">Each attempt samples a different subset from the filtered pool.</div>
              </button>
            </div>

            {questionMode === 'random' && (
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/5 p-4">
                <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                  <Field label="Questions per member">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, randomPool.length)}
                      value={randomQuestionCount}
                      onChange={(e) => setRandomQuestionCount(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-blue-300"
                    />
                  </Field>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">Difficulties</div>
                      <div className="flex flex-wrap gap-2">
                        <FilterChip active={randomDifficulties.length === 0} onClick={() => setRandomDifficulties([])}>Any</FilterChip>
                        {DIFFICULTIES.map((difficulty) => (
                          <FilterChip
                            key={difficulty}
                            active={randomDifficulties.includes(difficulty)}
                            onClick={() => setRandomDifficulties((cur) => (
                              cur.includes(difficulty) ? cur.filter((x) => x !== difficulty) : [...cur, difficulty]
                            ))}
                          >
                            {difficulty}
                          </FilterChip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">Categories</div>
                      <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <FilterChip active={randomCategories.length === 0} onClick={() => setRandomCategories([])}>Any</FilterChip>
                        {CATEGORY_FILTERS.map((category) => (
                          <FilterChip
                            key={category}
                            active={randomCategories.includes(category)}
                            onClick={() => setRandomCategories((cur) => (
                              cur.includes(category) ? cur.filter((x) => x !== category) : [...cur, category]
                            ))}
                          >
                            {category}
                          </FilterChip>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs font-bold text-white/50">Pool: {randomPool.length} matching questions. Each member gets {effectiveQuestionCount || 0}.</div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="relative mb-4">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    value={bankFilter}
                    onChange={(e) => setBankFilter(e.target.value)}
                    placeholder="Search by question, category, or difficulty..."
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-white/35 focus:border-blue-300 focus:bg-white/10"
                  />
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDifficulties([])}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selectedDifficulties.length === 0 ? 'border-blue-300/60 bg-blue-500/20 text-blue-100' : 'border-white/15 text-white/60 hover:bg-white/5'}`}
                  >
                    All
                  </button>
                  {DIFFICULTIES.map((difficulty) => (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() => setSelectedDifficulties((cur) => (
                        cur.includes(difficulty) ? cur.filter((x) => x !== difficulty) : [...cur, difficulty]
                      ))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selectedDifficulties.includes(difficulty) ? 'border-blue-300/60 bg-blue-500/20 text-blue-100' : 'border-white/15 text-white/60 hover:bg-white/5'}`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
                <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  {CATEGORY_FILTERS.map((c) => {
                    const on = selectedCategories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedCategories(on ? selectedCategories.filter((x) => x !== c) : [...selectedCategories, c])}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${on ? 'border-emerald-300/60 bg-emerald-500/15 text-emerald-100' : 'border-white/10 text-white/50 hover:bg-white/5'}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <div className="pretty-scrollbar space-y-1 max-h-80 overflow-y-auto pr-1">
                  {(questionMode === 'random' ? randomPool : filteredBank).map((q) => (
                    <button
                      key={q.id} type="button"
                      onClick={() => questionMode === 'manual' && togglePick(q)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${questionMode === 'manual' && pickedIds.has(q.id) ? 'bg-blue-500/15 border border-blue-400/40' : questionMode === 'random' ? 'cursor-default border border-transparent bg-white/[0.025]' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                      <div className={`w-4 h-4 rounded border ${questionMode === 'manual' && pickedIds.has(q.id) ? 'bg-blue-500 border-blue-400 flex items-center justify-center' : questionMode === 'random' ? 'border-emerald-300/40 bg-emerald-400/10' : 'border-white/30'}`}>
                        {questionMode === 'manual' && pickedIds.has(q.id) && <Check size={12}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{q.title}</div>
                        <div className="text-xs text-white/40 truncate">{q.category}{q.pattern ? ` · ${q.pattern}` : ''}</div>
                      </div>
                      <DifficultyPill difficulty={q.difficulty} />
                    </button>
                  ))}
                  {(questionMode === 'random' ? randomPool : filteredBank).length === 0 && <div className="text-sm text-white/40 text-center py-4">No matches</div>}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-wider text-white/50 font-bold px-1">{questionMode === 'random' ? 'Random pool preview' : `Selected ${randomizeOrder ? '(randomized per member)' : '(in order)'}`}</div>
                  <button
                    type="button"
                    onClick={() => setRandomizeOrder((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${randomizeOrder ? 'border-emerald-300/50 bg-emerald-500/15 text-emerald-100' : 'border-white/15 text-white/60 hover:bg-white/5'}`}
                  >
                    <Shuffle size={13}/>Randomize Order
                  </button>
                </div>
                {questionMode === 'random' ? (
                  <div className="space-y-1">
                    {randomPool.slice(0, 12).map((q, i) => (
                      <div key={q.id} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5">
                        <span className="text-xs font-bold text-white/40 w-5">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{q.title}</div>
                          <div className="text-xs text-white/40 truncate">{q.category}</div>
                        </div>
                        <DifficultyPill difficulty={q.difficulty} />
                      </div>
                    ))}
                    {randomPool.length > 12 && <div className="pt-2 text-center text-xs font-bold text-white/40">+ {randomPool.length - 12} more in pool</div>}
                  </div>
                ) : picked.length === 0 ? (
                  <div className="text-sm text-white/40 text-center py-8">Pick questions from the bank →</div>
                ) : (
                  <div className="space-y-1">
                    {picked.map((q, i) => (
                      <div key={q.id} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5">
                        <div className="flex flex-col">
                          <button type="button" onClick={() => reorder(i, -1)} className="text-white/40 hover:text-white text-xs">▲</button>
                          <button type="button" onClick={() => reorder(i, 1)} className="text-white/40 hover:text-white text-xs">▼</button>
                        </div>
                        <span className="text-xs font-bold text-white/40 w-5">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{q.title}</div>
                          <div className="text-xs text-white/40 truncate">{q.category}</div>
                        </div>
                        <button type="button" onClick={() => togglePick(q)} className="text-red-300 hover:text-red-200 p-1"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Assignment */}
          <Section title="Assign to">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={assignAll} onChange={() => setAssignAll(true)} />
                <Users size={14}/> All members
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!assignAll} onChange={() => setAssignAll(false)} />
                <Layers size={14}/> Specific cohorts or members
              </label>

              {!assignAll && (
                <div className="ml-6 mt-3 space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50 font-bold mb-2">Pledge classes</div>
                    <div className="flex flex-wrap gap-2">
                      {pledgeClasses.map((c) => {
                        const on = selectedClasses.includes(c);
                        return (
                          <button
                            key={c} type="button"
                            onClick={() => setSelectedClasses(on ? selectedClasses.filter((x) => x !== c) : [...selectedClasses, c])}
                            className={`text-xs px-3 py-1.5 rounded-full border ${on ? 'bg-blue-500/20 border-blue-400/50 text-blue-100' : 'border-white/15 hover:bg-white/5'}`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50 font-bold mb-2">Individual members ({selectedUserIds.length})</div>
                    <div className="relative mb-2">
                      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                      <input
                        value={assignmentSearch}
                        onChange={(e) => setAssignmentSearch(e.target.value)}
                        placeholder="Search people..."
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-300"
                      />
                    </div>
                    <div className="pretty-scrollbar max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2 space-y-1">
                      {assignmentMembers.map((m) => {
                        const on = selectedUserIds.includes(m.user_id);
                        return (
                          <label key={m.user_id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm ${on ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}>
                            <input type="checkbox" checked={on} onChange={() => setSelectedUserIds(on ? selectedUserIds.filter((x) => x !== m.user_id) : [...selectedUserIds, m.user_id])} />
                            <span className="flex-1 truncate">{m.name}</span>
                            {m.pledge_class && <span className="text-xs text-white/40">{m.pledge_class}</span>}
                          </label>
                        );
                      })}
                      {assignmentMembers.length === 0 && <div className="px-2 py-3 text-sm text-white/40">No members match that search.</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {error && (
            <div className="rounded-xl border border-red-300/25 bg-red-400/10 px-5 py-4 text-sm text-red-100">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <Link href="/admin" className="px-4 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 font-bold">Cancel</Link>
            <button
              type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-600/30 transition"
            >
              {submitting && <Loader2 className="animate-spin" size={16}/>}
              {publishMode === 'draft' ? 'Save as Draft' : publishMode === 'scheduled' ? 'Create Schedule' : 'Create & Publish'}
            </button>
          </div>
        </form>
      </FadeIn>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white/90 mb-3">{title}</h2>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">{children}</div>
    </section>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${active ? 'border-blue-300/60 bg-blue-500/20 text-blue-100' : 'border-white/15 text-white/60 hover:bg-white/5'}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-white/50 font-bold mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function DateTimePicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value) || new Date();
  const [viewDate, setViewDate] = useState(selected);
  const rootRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = calendarDays(year, month);
  const hours = selected.getHours();
  const minutes = selected.getMinutes();

  function commit(next) {
    onChange(formatDateTime(next));
    setViewDate(next);
  }

  function setDay(day) {
    const next = new Date(selected);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    commit(next);
  }

  function setHour(hour) {
    const next = new Date(selected);
    next.setHours(hour);
    commit(next);
  }

  function setMinute(minute) {
    const next = new Date(selected);
    next.setMinutes(minute);
    commit(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((cur) => !cur)}
        className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10"
      >
        <span className={value ? 'text-white' : 'text-white/35'}>{value || placeholder}</span>
        <CalendarClock size={16} className="text-white/45" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[80] mt-3 w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1426] p-4 shadow-2xl shadow-black/45 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="rounded-full p-2 text-white/65 hover:bg-white/10 hover:text-white">
              <ChevronLeft size={18} />
            </button>
            <div className="font-black">{viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="rounded-full p-2 text-white/65 hover:bg-white/10 hover:text-white">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_160px]">
            <div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-white/40">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const active = sameDay(day, selected);
                  const muted = day.getMonth() !== month;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setDay(day)}
                      className={`aspect-square rounded-xl text-sm font-bold transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : muted ? 'text-white/25 hover:bg-white/5' : 'text-white/75 hover:bg-white/10'}`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">Time</div>
              <div className="grid grid-cols-2 gap-2">
                <TimeColumn values={Array.from({ length: 24 }, (_, i) => i)} value={hours} onChange={setHour} format={(h) => String(h).padStart(2, '0')} />
                <TimeColumn values={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]} value={Math.round(minutes / 5) * 5 % 60} onChange={setMinute} format={(m) => String(m).padStart(2, '0')} />
              </div>
              <button type="button" onClick={() => { commit(new Date()); setOpen(false); }} className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10">
                Use now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeColumn({ values, value, onChange, format }) {
  return (
    <div className="pretty-scrollbar max-h-44 overflow-y-auto rounded-lg bg-black/15 p-1">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`block w-full rounded-lg px-2 py-1.5 text-sm font-bold transition ${v === value ? 'bg-blue-600 text-white' : 'text-white/65 hover:bg-white/10'}`}
        >
          {format(v)}
        </button>
      ))}
    </div>
  );
}

function compareQuestions(a, b) {
  const categoryA = CATEGORY_ORDER.get(a.category) ?? 999;
  const categoryB = CATEGORY_ORDER.get(b.category) ?? 999;
  if (categoryA !== categoryB) return categoryA - categoryB;
  const difficultyA = DIFFICULTY_ORDER[a.difficulty] ?? 99;
  const difficultyB = DIFFICULTY_ORDER[b.difficulty] ?? 99;
  if (difficultyA !== difficultyB) return difficultyA - difficultyB;
  return a.title.localeCompare(b.title);
}

function calendarDays(year, month) {
  const start = new Date(year, month, 1);
  const first = new Date(year, month, 1 - start.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DifficultyPill({ difficulty }) {
  const cls = difficulty === 'Easy'
    ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
    : difficulty === 'Medium'
      ? 'bg-amber-400/10 text-amber-200 border-amber-400/30'
      : 'bg-red-400/10 text-red-300 border-red-400/30';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${cls}`}>{difficulty}</span>;
}
