'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Clock, AlertCircle, PlayCircle, Lock, CheckCircle2, FileCode } from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';
import { useConfirmToast } from '@/components/ConfirmToast';
import { api } from '@/lib/coderank/clientFetch';
const UNLIMITED_SUBMISSIONS = 2147483647;

export default function AssessmentStartPage() {
  return (
    <AuthGate>
      <AssessmentStart />
    </AuthGate>
  );
}

function AssessmentStart() {
  const { assessmentId } = useParams();
  const router = useRouter();
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Try to fetch any existing attempt for this assessment. If none, fetch the
    // assigned-assessments list to get a preview the user can start from.
    let cancelled = false;
    (async () => {
      try {
        const list = await api('/api/coderank/assigned');
        if (cancelled) return;
        const match = (list.assessments || []).find((a) => a.id === assessmentId);
        if (!match) {
          setError('This assessment is not assigned to you.');
          return;
        }
        if (match.attempt) {
          // Already started — load full attempt details
          const full = await api(`/api/coderank/attempts/${match.attempt.id}`);
          if (!cancelled) setAttempt(full.attempt);
        } else {
          // Show start screen with assessment preview
          setAttempt({ _preview: match });
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [assessmentId]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const { attempt: created } = await api('/api/coderank/attempts', {
        method: 'POST',
        body: JSON.stringify({ assessment_id: assessmentId }),
      });
      const full = await api(`/api/coderank/attempts/${created.id}`);
      setAttempt(full.attempt);
    } catch (e) {
      setError(e.message);
      setStarting(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
        <div className="mx-auto max-w-2xl text-center">
          <AlertCircle size={48} className="mx-auto mb-3 text-red-400" />
          <p className="text-white/70 mb-4">{error}</p>
          <Link href="/coderank" className="text-blue-300 font-bold hover:underline">← Back to CodeRank</Link>
        </div>
      </main>
    );
  }

  if (!attempt) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </main>
    );
  }

  // Preview (not yet started)
  if (attempt._preview) {
    const p = attempt._preview;
    return (
      <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
        <FadeIn className="mx-auto max-w-3xl">
          <Link href="/coderank" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6">
            <ArrowLeft size={16}/> Back
          </Link>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="text-xs font-bold tracking-widest uppercase text-blue-300 mb-3">
              Coding Assessment
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-3">{p.title}</h1>
            {p.description && <p className="text-white/70 mb-6">{p.description}</p>}

            <div className="grid grid-cols-3 gap-3 mb-8">
              <Stat icon={<FileCode size={18}/>} label="Problems" value={p.question_count} />
              <Stat icon={<Clock size={18}/>} label="Time Limit" value={formatTimeLimit(p.time_limit_minutes)} />
              <Stat icon={<Lock size={18}/>} label="Submissions" value={formatSubmissionLimit(p.max_submissions_per_question)} />
            </div>
            {p.due_at && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 mb-4">
                Get done by <span className="font-bold text-white">{new Date(p.due_at).toLocaleString()}</span>
              </div>
            )}

            <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100 mb-6">
              <strong>Heads up:</strong> {Number(p.time_limit_minutes) > 0 ? 'The timer starts the moment you click Start. You cannot pause once started.' : 'There is no timer for this assessment.'} Each question allows {formatSubmissionLimit(p.max_submissions_per_question).toLowerCase()}; Run is free.
            </div>

            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-4 font-bold text-white shadow-lg shadow-blue-600/30 transition"
            >
              {starting ? <Loader2 className="animate-spin" size={20}/> : <PlayCircle size={20}/>}
              {starting ? 'Starting…' : 'Start Assessment'}
            </button>
          </div>
        </FadeIn>
      </main>
    );
  }

  // Already-in-flight attempt: show question list with status
  return <AssessmentOverview attempt={attempt} />;
}

function AssessmentOverview({ attempt }) {
  const router = useRouter();
  const { confirm, confirmationToast } = useConfirmToast();
  const asmt = attempt.cr_assessments;
  const questions = (asmt?.cr_assessment_questions || []).sort((a, b) => a.ordinal - b.ordinal);
  const submissionsByQ = {};
  for (const s of attempt.submissions || []) {
    const arr = submissionsByQ[s.question_id] ||= [];
    arr.push(s);
  }
  const maxSubs = asmt?.max_submissions_per_question || 3;
  const isExpired = attempt.status === 'expired';
  const isClosed = attempt.status !== 'in_progress';

  async function submitAssessment() {
    const completed = questions.filter((aq) => (submissionsByQ[aq.question_id] || []).length > 0).length;
    const incomplete = Math.max(0, questions.length - completed);
    const ok = await confirm({
      title: 'Submit assessment?',
      message: `Completed: ${completed}\nNot completed: ${incomplete}\n\nYou may not be able to edit after submitting.`,
      confirmLabel: 'Submit assessment',
      tone: 'danger',
    });
    if (!ok) return;
    await api(`/api/coderank/attempts/${attempt.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'submit_assessment' }),
    });
    router.refresh?.();
    window.location.reload();
  }

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      {confirmationToast}
      <FadeIn className="mx-auto max-w-4xl">
        <Link href="/coderank" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6">
          <ArrowLeft size={16}/> Back to assessments
        </Link>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black">{asmt?.title}</h1>
            <p className="text-white/60 text-sm mt-1">
              {questions.length} problems · {formatTimeLimit(asmt?.time_limit_minutes)} total
              {asmt?.due_at ? ` · due ${new Date(asmt.due_at).toLocaleString()}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CountdownBadge expiresAt={attempt.expires_at} status={attempt.status} unlimited={Number(asmt?.time_limit_minutes) <= 0} />
            <button
              onClick={submitAssessment}
              disabled={isClosed}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50"
            >
              Submit Assessment
            </button>
          </div>
        </div>

        {isExpired && (
          <div className="rounded-xl border border-red-300/25 bg-red-400/10 px-5 py-4 text-sm text-red-100 mb-6">
            Time has expired. Your existing submissions are final.
          </div>
        )}

        <div className="space-y-3">
          {questions.map((aq, idx) => {
            const q = aq.cr_questions;
            const subs = submissionsByQ[q.id] || [];
            const best = subs.reduce((acc, s) => (!acc || s.score > acc.score ? s : acc), null);
            const used = subs.length;
            return (
              <Link
                key={q.id}
                href={`/coderank/${attempt.assessment_id}/${q.id}?attempt=${attempt.id}`}
                className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold truncate">{q.title}</h3>
                      <DifficultyPill difficulty={q.difficulty} />
                    </div>
                    <p className="text-xs text-white/50">{q.category}</p>
                  </div>
                  <div className="text-right text-xs">
                    {best?.status === 'passed' ? (
                      <span className="text-emerald-300 font-bold flex items-center gap-1"><CheckCircle2 size={14}/>Solved</span>
                    ) : best ? (
                      <span className="text-amber-300 font-bold">{best.total_passed}/{best.total_tests} tests</span>
                    ) : (
                      <span className="text-white/40">Not attempted</span>
                    )}
                    <div className="text-white/40 mt-0.5">{formatSubmissionCount(used, maxSubs)}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </FadeIn>
    </main>
  );
}

function CountdownBadge({ expiresAt, status, unlimited = false }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt) - Date.now()));

  useEffect(() => {
    if (status !== 'in_progress' || unlimited) return undefined;
    const t = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt) - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, status, unlimited]);

  if (status === 'submitted') {
    return <span className="px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-200 text-sm font-bold">Submitted</span>;
  }
  if (unlimited && status === 'in_progress') {
    return <span className="px-3 py-1.5 rounded-full bg-blue-400/10 border border-blue-400/30 text-blue-200 text-sm font-bold">No time limit</span>;
  }
  if (status === 'expired' || remaining <= 0) {
    return <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-sm font-bold">Expired</span>;
  }

  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const display = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  const warn = remaining < 60_000;

  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-bold tabular-nums ${warn ? 'bg-red-500/15 border border-red-400/40 text-red-200 animate-pulse' : 'bg-amber-400/10 border border-amber-400/30 text-amber-200'}`}>
      <Clock size={14} className="inline -mt-0.5 mr-1.5"/>{display}
    </span>
  );
}

function formatTimeLimit(minutes) {
  return Number(minutes) > 0 ? `${minutes} min` : 'No time limit';
}

function formatSubmissionLimit(maxSubmissions) {
  return Number(maxSubmissions) >= UNLIMITED_SUBMISSIONS ? 'Unlimited submissions per problem' : `${maxSubmissions} per problem`;
}

function formatSubmissionCount(used, maxSubmissions) {
  return Number(maxSubmissions) >= UNLIMITED_SUBMISSIONS ? `${used}/unlimited submissions` : `${used}/${maxSubmissions} submissions`;
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <div className="flex justify-center text-blue-300 mb-2">{icon}</div>
      <div className="text-xs text-white/50 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}

function DifficultyPill({ difficulty }) {
  const cls = difficulty === 'Easy'
    ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
    : difficulty === 'Medium'
      ? 'bg-amber-400/10 text-amber-200 border-amber-400/30'
      : 'bg-red-400/10 text-red-300 border-red-400/30';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${cls}`}>{difficulty}</span>;
}
