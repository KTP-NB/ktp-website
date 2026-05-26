'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, ShieldAlert, Eye, EyeOff, Trash2,
  CheckCircle2, XCircle, AlertTriangle, Users, Play,
  Clock, Pencil, Save, Layers, Search,
} from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';
import { useConfirmToast } from '@/components/ConfirmToast';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { useAuth } from '@/components/authprovider';
import { api } from '@/lib/coderank/clientFetch';

const ADMIN_POSITIONS = ['vp of tech development', 'vp of prof development'];
const UNLIMITED_SUBMISSIONS = 2147483647;

export default function AssessmentMonitorPage() {
  return (
    <AuthGate>
      <AssessmentMonitor />
    </AuthGate>
  );
}

function AssessmentMonitor() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [members, setMembers] = useState([]);
  const [pledgeClasses, setPledgeClasses] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const { confirm, confirmationToast } = useConfirmToast();

  useEffect(() => {
    if (!user?.id || !hasSupabaseConfig) return;
    (async () => {
      const { data: prof } = await supabase
        .from('member_profiles').select('position').eq('user_id', user.id).maybeSingle();
      const pos = (prof?.position || '').toLowerCase();
      setAuthorized(ADMIN_POSITIONS.some((p) => pos.includes(p)));
    })();
  }, [user?.id]);

  const refresh = useCallback(async () => {
    try {
      const r = await api(`/api/coderank/admin/assessments/${id}/results`);
      setData(r);
    } catch (e) { setError(e.message); }
  }, [id]);

  useEffect(() => {
    if (!authorized) return;
    refresh();
    const interval = setInterval(refresh, 15000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [authorized, refresh]);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      const { data: rows } = await supabase
        .from('member_profiles')
        .select('user_id, name, email, pledge_class, member_status')
        .order('name');
      const active = (rows || []).filter((m) => {
        const status = (m.member_status || '').trim().toLowerCase();
        return m.user_id && status !== 'alumni' && status !== 'inactive';
      });
      setMembers(active);
      setPledgeClasses([...new Set(active.map((m) => m.pledge_class).filter(Boolean))].sort());
    })();
  }, [authorized]);

  async function togglePublish() {
    if (!data) return;
    const next = !data.assessment.published;
    setBusy(true);
    setError(null);
    setData((d) => d ? { ...d, assessment: { ...d.assessment, published: next } } : d);
    try {
      const result = await api(`/api/coderank/admin/assessments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: next }),
      });
      const serverPublished = result?.assessment?.published ?? next;
      setData((d) => d ? { ...d, assessment: { ...d.assessment, ...(result?.assessment || {}), published: serverPublished } } : d);
      router.refresh();
    } catch (e) {
      setError(e.message);
      setData((d) => d ? { ...d, assessment: { ...d.assessment, published: !next } } : d);
    } finally { setBusy(false); }
  }

  async function makeUnlimited() {
    const ok = await confirm({
      title: 'Remove time limit?',
      message: 'In-progress and future attempts will stay open until the member submits or an admin deletes the assessment.',
      confirmLabel: 'Remove time limit',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api(`/api/coderank/admin/assessments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ time_limit_minutes: 0 }),
      });
      const r = await api(`/api/coderank/admin/assessments/${id}/results`);
      setData(r);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function startEditing() {
    if (!data?.assessment) return;
    const a = data.assessment;
    setEditDraft({
      title: a.title || '',
      description: a.description || '',
      time_limit_minutes: Number(a.time_limit_minutes) > 0 ? String(a.time_limit_minutes) : '60',
      no_time_limit: Number(a.time_limit_minutes) <= 0,
      max_submissions_per_question: Number(a.max_submissions_per_question) >= UNLIMITED_SUBMISSIONS ? '3' : String(a.max_submissions_per_question || 3),
      unlimited_submissions: Number(a.max_submissions_per_question) >= UNLIMITED_SUBMISSIONS,
      due_at: toDateTimeLocal(a.due_at),
      assign_all: (a.cr_assignments || []).some((assignment) => assignment.assigned_to_type === 'all') || (a.cr_assignments || []).length === 0,
      selected_classes: (a.cr_assignments || []).filter((assignment) => assignment.assigned_to_type === 'pledge_class').map((assignment) => assignment.assigned_to_value).filter(Boolean),
      selected_user_ids: (a.cr_assignments || []).filter((assignment) => assignment.assigned_to_type === 'user').map((assignment) => assignment.assigned_to_value).filter(Boolean),
    });
    setMemberSearch('');
    setEditing(true);
  }

  async function saveEdits(event) {
    event.preventDefault();
    if (!editDraft) return;
    const timeLimit = editDraft.no_time_limit ? 0 : Number(editDraft.time_limit_minutes);
    const maxSubs = editDraft.unlimited_submissions ? UNLIMITED_SUBMISSIONS : Number(editDraft.max_submissions_per_question);
    const assignments = editDraft.assign_all
      ? [{ type: 'all' }]
      : [
          ...editDraft.selected_classes.map((value) => ({ type: 'pledge_class', value })),
          ...editDraft.selected_user_ids.map((value) => ({ type: 'user', value })),
        ];
    if (!editDraft.title.trim()) return setError('Title is required.');
    if (!Number.isFinite(timeLimit) || timeLimit < 0 || (!editDraft.no_time_limit && timeLimit < 1)) return setError('Enter a positive time limit or choose no time limit.');
    if (!Number.isInteger(maxSubs) || maxSubs < 1) return setError('Max submissions must be a positive integer.');
    if (!editDraft.assign_all && assignments.length === 0) return setError('Pick at least one cohort or member to assign to.');

    setBusy(true);
    try {
      await api(`/api/coderank/admin/assessments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editDraft.title.trim(),
          description: editDraft.description.trim() || null,
          time_limit_minutes: timeLimit,
          max_submissions_per_question: maxSubs,
          due_at: editDraft.due_at ? new Date(editDraft.due_at).toISOString() : null,
        }),
      });
      await api(`/api/coderank/admin/assessments/${id}/assignments`, {
        method: 'PUT',
        body: JSON.stringify({ assignments }),
      });
      const normalizedAssignments = assignments.map((assignment) => ({
        assigned_to_type: assignment.type,
        assigned_to_value: assignment.type === 'all' ? null : assignment.value,
      }));
      const r = await api(`/api/coderank/admin/assessments/${id}/results`);
      setData({
        ...r,
        assessment: {
          ...r.assessment,
          cr_assignments: normalizedAssignments,
        },
      });
      setEditing(false);
      setEditDraft(null);
      router.refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete assessment?',
      message: 'All attempts and submissions will also be deleted. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api(`/api/coderank/admin/assessments/${id}`, { method: 'DELETE' });
      router.push('/admin');
    } catch (e) { setError(e.message); setBusy(false); }
  }

  if (authorized === null) return <Center><Loader2 className="w-8 h-8 animate-spin text-white/50"/></Center>;
  if (!authorized) return <Center><div className="text-center"><ShieldAlert size={48} className="mx-auto mb-4 text-red-400" /><h1 className="text-2xl font-bold">Access Restricted</h1></div></Center>;
  if (error) return <Center><div className="text-center text-white/70">{error}</div></Center>;
  if (!data) return <Center><Loader2 className="w-8 h-8 animate-spin text-white/50"/></Center>;

  const a = data.assessment;
  const rows = data.results || [];
  const questions = (a.cr_assessment_questions || []).sort((x, y) => x.ordinal - y.ordinal);
  const assessmentExpired = a.due_at && new Date(a.due_at) <= new Date();
  const filteredMembers = members.filter((member) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return [member.name, member.email, member.pledge_class]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      {confirmationToast}
      <FadeIn className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6">
          <ArrowLeft size={16}/>Back to Admin Portal
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-blue-300 mb-2">CodeRank Assessment</div>
            <h1 className="text-3xl font-black">{a.title}</h1>
            <div className="text-sm text-white/50 mt-2 flex flex-wrap gap-3">
              <span>{questions.length} problems</span>
              <span>·</span>
              <span>{formatTimeLimit(a.time_limit_minutes)}</span>
              <span>·</span>
              <span>{formatSubmissionLimit(a.max_submissions_per_question)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!assessmentExpired && (
              <button
                onClick={startEditing}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 disabled:opacity-60"
              >
                <Pencil size={14}/>Edit
              </button>
            )}
            {!assessmentExpired && Number(data.assessment.time_limit_minutes) > 0 && (
              <button
                onClick={makeUnlimited}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-blue-500/10 border border-blue-300/25 text-blue-100 hover:bg-blue-500/20 disabled:opacity-60"
              >
                <Clock size={14}/>No time limit
              </button>
            )}
            <button
              onClick={togglePublish}
              disabled={busy}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${data.assessment.published ? 'bg-white/10 hover:bg-white/15' : 'bg-emerald-600 hover:bg-emerald-500'} disabled:opacity-60`}
            >
              {data.assessment.published ? <><EyeOff size={14}/>Unpublish</> : <><Eye size={14}/>Publish</>}
            </button>
            <button
              onClick={handleDelete} disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-red-500/10 border border-red-400/30 text-red-200 hover:bg-red-500/20 disabled:opacity-60"
            >
              <Trash2 size={14}/>Delete
            </button>
          </div>
        </div>

        {assessmentExpired && (
          <div className="mb-6 rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
            This assessment is past its due date, so editing is locked.
          </div>
        )}

        {editing && editDraft && !assessmentExpired && (
          <form onSubmit={saveEdits} className="mb-6 rounded-2xl border border-blue-300/20 bg-blue-400/[0.06] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-100/70">Edit assessment</div>
                <div className="mt-1 text-sm text-white/45">Changes apply immediately, including published exams.</div>
              </div>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditDraft(null); }}
                className="rounded-lg px-3 py-1.5 text-sm font-bold text-white/55 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <EditField label="Title">
                <input
                  value={editDraft.title}
                  onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 outline-none focus:border-blue-300"
                  maxLength={120}
                />
              </EditField>
              <EditField label="Max submissions per problem">
                <div className="space-y-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editDraft.max_submissions_per_question}
                    disabled={editDraft.unlimited_submissions}
                    onChange={(e) => setEditDraft((d) => ({ ...d, max_submissions_per_question: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 outline-none focus:border-blue-300 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-white/60">
                    <input
                      type="checkbox"
                      checked={editDraft.unlimited_submissions}
                      onChange={(e) => setEditDraft((d) => ({ ...d, unlimited_submissions: e.target.checked }))}
                      className="h-4 w-4 rounded border-white/20 bg-white/10 accent-blue-500"
                    />
                    Unlimited submissions
                  </label>
                </div>
              </EditField>
              <EditField label="Time limit">
                <div className="space-y-2">
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={editDraft.time_limit_minutes}
                    disabled={editDraft.no_time_limit}
                    onChange={(e) => setEditDraft((d) => ({ ...d, time_limit_minutes: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 outline-none focus:border-blue-300 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-white/60">
                    <input
                      type="checkbox"
                      checked={editDraft.no_time_limit}
                      onChange={(e) => setEditDraft((d) => ({ ...d, no_time_limit: e.target.checked }))}
                      className="h-4 w-4 rounded border-white/20 bg-white/10 accent-blue-500"
                    />
                    No time limit
                  </label>
                </div>
              </EditField>
              <EditField label="Get done by">
                <input
                  type="datetime-local"
                  value={editDraft.due_at}
                  onChange={(e) => setEditDraft((d) => ({ ...d, due_at: e.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 outline-none focus:border-blue-300"
                />
              </EditField>
              <EditField label="Description" className="md:col-span-2">
                <textarea
                  value={editDraft.description}
                  onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 outline-none focus:border-blue-300"
                />
              </EditField>
              <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/15 p-4">
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">Assignments</div>
                <div className="mb-4 flex flex-wrap gap-4 text-sm font-bold text-white/75">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={editDraft.assign_all}
                      onChange={() => setEditDraft((d) => ({ ...d, assign_all: true }))}
                    />
                    <Users size={14}/> All members
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={!editDraft.assign_all}
                      onChange={() => setEditDraft((d) => ({ ...d, assign_all: false }))}
                    />
                    <Layers size={14}/> Specific cohorts or members
                  </label>
                </div>
                {!editDraft.assign_all && (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">Pledge classes</div>
                      <div className="flex flex-wrap gap-2">
                        {pledgeClasses.map((pledgeClass) => {
                          const selected = editDraft.selected_classes.includes(pledgeClass);
                          return (
                            <button
                              key={pledgeClass}
                              type="button"
                              onClick={() => setEditDraft((d) => ({
                                ...d,
                                selected_classes: selected
                                  ? d.selected_classes.filter((value) => value !== pledgeClass)
                                  : [...d.selected_classes, pledgeClass],
                              }))}
                              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? 'border-blue-400/50 bg-blue-500/20 text-blue-100' : 'border-white/15 text-white/65 hover:bg-white/5'}`}
                            >
                              {pledgeClass}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-white/45">Individual members ({editDraft.selected_user_ids.length})</div>
                        <div className="relative w-full max-w-xs">
                          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                          <input
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Search people..."
                            className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-300"
                          />
                        </div>
                      </div>
                      <div className="pretty-scrollbar max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-2">
                        {filteredMembers.map((member) => {
                          const selected = editDraft.selected_user_ids.includes(member.user_id);
                          return (
                            <label key={member.user_id} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${selected ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => setEditDraft((d) => ({
                                  ...d,
                                  selected_user_ids: selected
                                    ? d.selected_user_ids.filter((value) => value !== member.user_id)
                                    : [...d.selected_user_ids, member.user_id],
                                }))}
                              />
                              <span className="min-w-0 flex-1 truncate">{member.name || member.email || member.user_id}</span>
                              {member.pledge_class && <span className="text-xs text-white/40">{member.pledge_class}</span>}
                            </label>
                          );
                        })}
                        {filteredMembers.length === 0 && <div className="px-2 py-3 text-sm text-white/40">No members match that search.</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-60"
              >
                {busy ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                Save changes
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Stat label="Not started" value={rows.filter((r) => r.status === 'not_started').length} />
          <Stat label="In progress" value={rows.filter((r) => r.status === 'in_progress').length} />
          <Stat label="Submitted" value={rows.filter((r) => r.status === 'submitted' || r.status === 'expired').length} />
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-white/10 bg-white/[0.02]">
            <Users size={40} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/60">No member has started this assessment yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <Th>Member</Th>
                  <Th>Status</Th>
                  <Th>Score</Th>
                  <Th>Solved</Th>
                  <Th>Time</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.attempt_id || r.user_id}
                    onClick={() => { if (r.attempt_id) setViewing(r); }}
                    className={`border-t border-white/5 transition ${r.attempt_id ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-default opacity-80'}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-bold">{r.profile?.name || r.user_id.slice(0, 8)}</div>
                      <div className="text-xs text-white/40">
                        {r.profile?.pledge_class || 'Member'}
                        {r.monitoring?.left_count > 0 && <span className="ml-2 text-amber-300">{r.monitoring.left_count} focus flags</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><AttemptStatusPill status={r.status}/></td>
                    <td className="px-3 py-2.5 font-bold">{r.total_score}/{r.possible_score}</td>
                    <td className="px-3 py-2.5">{r.questions_completed}/{r.questions_total}</td>
                    <td className="px-3 py-2.5 text-xs">{formatDuration(r.time_taken_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FadeIn>

      {viewing && (
        <SubmissionViewer
          row={viewing}
          assessment={a}
          questions={questions}
          onClose={() => setViewing(null)}
        />
      )}
    </main>
  );
}

function formatTimeLimit(minutes) {
  return Number(minutes) > 0 ? `${minutes} min` : 'No time limit';
}

function formatSubmissionLimit(maxSubmissions) {
  return Number(maxSubmissions) >= UNLIMITED_SUBMISSIONS ? 'Unlimited submissions' : `${maxSubmissions} submissions / problem`;
}

function formatAttemptCount(used, maxSubmissions) {
  return Number(maxSubmissions) >= UNLIMITED_SUBMISSIONS ? `${used}/unlimited attempts` : `${used}/${maxSubmissions} attempts`;
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function EditField({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-white/50">{label}</div>
      {children}
    </label>
  );
}

function SubmissionViewer({ row, assessment, questions, onClose }) {
  const [selectedQid, setSelectedQid] = useState(null);
  const [rerun, setRerun] = useState(null);
  const [rerunning, setRerunning] = useState(false);

  const visibleQuestions = Array.isArray(row.question_order) && row.question_order.length
    ? row.question_order.map((qid) => questions.find((q) => q.question_id === qid)).filter(Boolean)
    : questions;
  const selectedQuestion = visibleQuestions.find((q) => q.question_id === selectedQid);
  const selectedCell = selectedQid ? row.per_question[selectedQid] : null;
  const submission = selectedCell?.best_submission;

  async function handleRerun() {
    if (!submission) return;
    setRerunning(true);
    setRerun(null);
    try {
      const result = await api(`/api/coderank/admin/submissions/${submission.id}/rerun`, { method: 'POST' });
      setRerun(result.report);
    } catch (e) {
      setRerun({ error: e.message });
    } finally {
      setRerunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="pretty-scrollbar w-full max-w-6xl overflow-hidden rounded-2xl border border-white/15 bg-[#0b1426] shadow-2xl shadow-black/45 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b1426]/95 px-5 py-4 backdrop-blur">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-blue-200/70">Assessment review</div>
            <div className="mt-1 text-lg font-black">{row.profile?.name || row.user_id.slice(0, 8)}</div>
            <div className="text-sm text-white/50">{assessment.title}</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl leading-none text-white/60 transition hover:bg-white/10 hover:text-white">×</button>
        </div>
        <div className="pretty-scrollbar max-h-[calc(90vh-86px)] overflow-y-auto p-5">
          {!selectedQid ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Status" value={statusLabel(row.status)} />
                <Stat label="Score" value={`${row.total_score}/${row.possible_score}`} />
                <Stat label="Solved" value={`${row.questions_completed}/${row.questions_total}`} />
                <Stat label="Time" value={formatDuration(row.time_taken_seconds)} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white/50">Assigned questions</div>
                    <div className="mt-1 text-sm text-white/45">Open a problem to review code, attempts, runtime, and hidden case details.</div>
                  </div>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  {visibleQuestions.map((q, idx) => {
                    const cell = row.per_question[q.question_id];
                    const best = cell?.best_submission;
                    return (
                      <button
                        key={q.question_id}
                        type="button"
                        onClick={() => { setSelectedQid(q.question_id); setRerun(null); }}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#111d31] p-3 text-left transition hover:border-blue-300/30 hover:bg-[#162641]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-400/15 text-sm font-black text-blue-100">{idx + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{q.cr_questions?.title}</span>
                          <span className="text-xs text-white/45">{formatAttemptCount(cell?.attempts_used || 0, assessment.max_submissions_per_question)}</span>
                        </span>
                        {best ? <SubmissionDot status={best.status}/> : <span className="text-xs text-white/30">No submission</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {row.monitoring?.events?.length > 0 && (
                <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-100/70">Monitoring flags</div>
                  <div className="pretty-scrollbar max-h-40 space-y-1 overflow-y-auto text-xs text-white/65">
                    {row.monitoring.events.map((e) => (
                      <div key={e.id} className="flex justify-between gap-3 rounded-md bg-black/10 px-2 py-1.5">
                        <span>{eventLabel(e.event_type)}</span>
                        <span>{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => { setSelectedQid(null); setRerun(null); }} className="rounded-lg px-2 py-1 text-sm font-bold text-blue-300 transition hover:bg-white/5 hover:text-blue-200">← Back to member summary</button>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black">{selectedQuestion?.cr_questions?.title}</h3>
                    {submission ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ReviewPill label="Language" value={submission.language} />
                        <ReviewPill label="Attempt" value={selectedCell.attempts_used} />
                        <ReviewPill label="Tests" value={`${submission.total_passed}/${submission.total_tests}`} />
                        <ReviewPill label="Runtime" value={`${submission.runtime_ms?.toFixed?.(0) ?? '—'} ms`} />
                        <StatusPill status={submission.status} />
                      </div>
                    ) : <div className="mt-1 text-sm text-white/45">No official submission for this question.</div>}
                  </div>
                  {submission && (
                    <button onClick={handleRerun} disabled={rerunning} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-60">
                      {rerunning ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>}
                      Rerun Code
                    </button>
                  )}
                </div>
              </div>
              {submission?.error_output && <CodeBlock title="Error output" tone="danger" value={submission.error_output} />}
              {submission && (
                <>
                  <CodeBlock title="Submitted code" value={submission.code} />
                  <ResultList results={rerun?.results || submission.test_results || []} title={rerun ? 'Rerun results' : 'Stored test results'} mode={rerun ? 'rerun' : 'stored'} error={rerun?.error} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Center({ children }) {
  return <main className="min-h-screen flex items-center justify-center text-white px-6">{children}</main>;
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}

function Th({ children, className = '' }) {
  return <th className={`text-left px-3 py-2.5 text-xs uppercase tracking-wider font-bold text-white/60 ${className}`}>{children}</th>;
}

function AttemptStatusPill({ status }) {
  const map = {
    not_started: { cls: 'bg-white/5 text-white/50 border-white/15', label: 'Not started' },
    in_progress: { cls: 'bg-amber-400/15 text-amber-200 border-amber-400/30', label: 'In progress' },
    submitted:   { cls: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30', label: 'Submitted' },
    expired:     { cls: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30', label: 'Submitted' },
  }[status] || { cls: 'bg-white/10 text-white/60 border-white/15', label: status };
  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${map.cls}`}>{map.label}</span>;
}

function StatusPill({ status }) {
  const map = {
    passed: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
    partial: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
    failed: 'border-red-300/30 bg-red-400/10 text-red-100',
    error: 'border-purple-300/30 bg-purple-400/10 text-purple-100',
  }[status] || 'border-white/15 bg-white/5 text-white/70';
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${map}`}>{status}</span>;
}

function ReviewPill({ label, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0a1324] px-3 py-1 text-xs">
      <span className="font-bold uppercase tracking-wide text-white/40">{label}</span>
      <span className="font-black text-white">{value}</span>
    </span>
  );
}

function CodeBlock({ title, value, tone = 'default' }) {
  const cls = tone === 'danger'
    ? 'border-red-300/25 bg-red-400/10 text-red-100'
    : 'border-white/10 bg-[#071120] text-white/90';
  return (
    <div className={`overflow-hidden rounded-2xl border ${cls}`}>
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.035] px-4 py-2">
        <div className="text-xs font-black uppercase tracking-wider text-white/55">{title}</div>
      </div>
      <pre className="pretty-scrollbar max-h-[420px] overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{value}</pre>
    </div>
  );
}

function SubmissionDot({ status }) {
  if (status === 'passed') return <CheckCircle2 size={18} className="text-emerald-300"/>;
  if (status === 'partial') return <AlertTriangle size={18} className="text-amber-300"/>;
  if (status === 'error') return <XCircle size={18} className="text-purple-300"/>;
  return <XCircle size={18} className="text-red-300"/>;
}

function ResultList({ title, results, error, mode = 'stored' }) {
  if (error) return <div className="rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</div>;
  if (!results?.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-white/55">{title}</div>
          <div className="mt-1 text-xs text-white/40">{mode === 'rerun' ? 'Rerun results include actual outputs for visible and hidden cases.' : 'Admins can see visible and hidden case inputs, expected outputs, and actual outputs.'}</div>
        </div>
        <div className="text-xs font-bold text-white/50">
          {results.filter((r) => r.passed).length}/{results.length} passed
        </div>
      </div>
      <div className="space-y-2 p-3">
        {results.map((r, idx) => (
          <div key={r.id || idx} className={`rounded-xl border p-3 text-xs ${r.passed ? 'border-emerald-300/25 bg-emerald-400/5' : 'border-red-300/25 bg-red-400/5'}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-bold">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${r.is_hidden ? 'border-purple-300/30 bg-purple-400/10 text-purple-100' : 'border-blue-300/30 bg-blue-400/10 text-blue-100'}`}>
                  {r.is_hidden ? 'Hidden' : 'Visible'}
                </span>
                <span className="text-white">Case {idx + 1}</span>
              </div>
              <span className={r.passed ? 'text-emerald-200' : 'text-red-100'}>
                {r.passed ? 'Passed' : 'Failed'} · {r.runtime_ms?.toFixed?.(0) ?? '—'} ms
              </span>
            </div>
            <div className="grid gap-2 lg:grid-cols-3">
              <ResultSnippet label="stdin" value={r.stdin} />
              <ResultSnippet label="expected" value={r.expected} />
              <ResultSnippet label="stdout" value={r.stdout || '(empty)'} strong />
            </div>
            {r.stderr && <ResultSnippet label="stderr" value={r.stderr} danger className="mt-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultSnippet({ label, value, strong = false, danger = false, className = '' }) {
  if (value == null) return null;
  return (
    <div className={`rounded-lg border border-white/10 bg-black/15 p-2 ${className}`}>
      <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-white/35">{label}</div>
      <pre className={`pretty-scrollbar max-h-28 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed ${danger ? 'text-red-100' : strong ? 'text-white/85' : 'text-white/60'}`}>{value}</pre>
    </div>
  );
}

function statusLabel(status) {
  return { in_progress: 'In Progress', submitted: 'Submitted', expired: 'Expired' }[status] || status;
}

function eventLabel(eventType) {
  return {
    left_tab: 'Left tab',
    returned_to_tab: 'Returned to tab',
    window_blur: 'Window lost focus',
    window_focus: 'Window focused',
  }[eventType] || eventType;
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
