'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Check,
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { api } from '@/lib/coderank/clientFetch';
import SelectMenu from '@/components/SelectMenu';
import DatePicker from '@/components/DatePicker';
import { useConfirmToast } from '@/components/ConfirmToast';
import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_STYLES,
  FINE_STATUS_LABELS,
  FINE_STATUS_STYLES,
  fineStatus,
  formatCurrency,
  formatDate,
  todayIso,
} from '@/lib/fines';

const VIEWS = [
  ['log', 'Fine Log'],
  ['members', 'Member Summary'],
];

const LOG_FILTERS = [
  ['all', 'All fines'],
  ['unpaid', 'Unpaid'],
  ['overdue', 'Overdue'],
  ['paid', 'Paid'],
];

const MEMBER_FILTERS = [
  ['all', 'All members'],
  [ACCOUNT_STATUSES.BALANCE_DUE, 'Balance due'],
  [ACCOUNT_STATUSES.PAID, 'Settled'],
  [ACCOUNT_STATUSES.CLEAR, 'No fines'],
];

function emptyForm() {
  return {
    member_id: '',
    date_issued: todayIso(),
    description: '',
    amount: '',
    due_date: '',
    paid: false,
    paid_on: '',
    notes: '',
  };
}

function Stat({ label, value, accent = 'text-white' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="truncate text-xs font-bold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function FineTrackerPanel() {
  const [view, setView] = useState('log');
  const [members, setMembers] = useState([]);
  const [fines, setFines] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [editing, setEditing] = useState(null); // 'new' | fine row
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const { confirm, confirmationToast } = useConfirmToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api('/api/fines/admin/overview');
      setMembers(result.members || []);
      setFines(result.fines || []);
      setTotals(result.totals || null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayIso();

  const visibleFines = useMemo(() => {
    const term = search.trim().toLowerCase();
    return fines.filter((fine) => {
      if (logFilter !== 'all' && fineStatus(fine, today) !== logFilter) return false;
      if (!term) return true;
      return (
        fine.member_name.toLowerCase().includes(term) ||
        (fine.description || '').toLowerCase().includes(term)
      );
    });
  }, [fines, logFilter, search, today]);

  const visibleMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((member) => {
      if (memberFilter !== 'all' && member.account_status !== memberFilter) return false;
      if (!term) return true;
      return (
        (member.name || '').toLowerCase().includes(term) ||
        (member.position || '').toLowerCase().includes(term) ||
        (member.pledge_class || '').toLowerCase().includes(term)
      );
    });
  }, [members, memberFilter, search]);

  const overdueCount = useMemo(
    () => fines.filter((fine) => fineStatus(fine, today) === 'overdue').length,
    [fines, today]
  );
  const membersOwing = useMemo(
    () => members.filter((member) => member.outstanding > 0).length,
    [members]
  );

  function openNew() {
    setForm(emptyForm());
    setEditing('new');
  }

  function openEdit(fine) {
    setForm({
      member_id: fine.member_id,
      date_issued: String(fine.date_issued || '').slice(0, 10),
      description: fine.description || '',
      amount: String(fine.amount ?? ''),
      due_date: fine.due_date ? String(fine.due_date).slice(0, 10) : '',
      paid: Boolean(fine.paid),
      paid_on: fine.paid_on ? String(fine.paid_on).slice(0, 10) : '',
      notes: fine.notes || '',
    });
    setEditing(fine);
  }

  function closeModal() {
    setEditing(null);
    setSaving(false);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      member_id: form.member_id,
      date_issued: form.date_issued,
      description: form.description,
      amount: form.amount,
      due_date: form.due_date,
      paid: form.paid,
      // Keep the original payment date when editing a fine that was already paid.
      paid_on: form.paid_on || undefined,
      notes: form.notes,
    };
    try {
      if (editing === 'new') {
        await api('/api/fines/admin/entries', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        await api(`/api/fines/admin/entries/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      closeModal();
      await load();
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  }

  async function togglePaid(fine) {
    setBusyId(fine.id);
    setError(null);
    try {
      await api(`/api/fines/admin/entries/${fine.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ paid: !fine.paid }),
      });
      await load();
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(fine) {
    const confirmed = await confirm({
      title: 'Delete this fine?',
      message: `${fine.member_name} — ${fine.description} (${formatCurrency(fine.amount)})`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    setBusyId(fine.id);
    setError(null);
    try {
      await api(`/api/fines/admin/entries/${fine.id}`, { method: 'DELETE' });
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    const isLog = view === 'log';
    const header = isLog
      ? ['Date Issued', 'Member', 'Description', 'Amount', 'Due Date', 'Paid (Y/N)']
      : ['Name', 'Class', 'Role', '# of Fines', 'Total Assessed', 'Total Paid', 'Outstanding Balance', 'Last Fine Date', 'Account Status'];
    const rows = isLog
      ? visibleFines.map((fine) => [
          fine.date_issued,
          fine.member_name,
          fine.description,
          fine.amount,
          fine.due_date || '',
          fine.paid ? 'Y' : 'N',
        ])
      : visibleMembers.map((member) => [
          member.name,
          member.pledge_class || '',
          member.position || '',
          member.fine_count,
          member.total_assessed,
          member.total_paid,
          member.outstanding,
          member.last_fine_date || '',
          member.account_status,
        ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = isLog ? 'ktp-fine-log.csv' : 'ktp-member-fine-summary.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {confirmationToast}

      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-1 text-xl font-bold">Fine Tracker</h2>
          <p className="text-sm text-white/50">
            Log fines, mark them paid, and watch every member balance update automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
          >
            <Plus size={16} /> Add Fine
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total assessed" value={totals ? formatCurrency(totals.total_assessed) : '—'} />
        <Stat
          label="Collected"
          value={totals ? formatCurrency(totals.total_paid) : '—'}
          accent="text-emerald-300"
        />
        <Stat
          label="Outstanding"
          value={totals ? formatCurrency(totals.outstanding) : '—'}
          accent={totals?.outstanding ? 'text-rose-300' : 'text-white'}
        />
        <Stat
          label="Overdue fines"
          value={totals ? `${overdueCount} · ${membersOwing} owing` : '—'}
          accent={overdueCount ? 'text-rose-300' : 'text-white'}
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex rounded-xl bg-black/20 p-1">
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

        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={view === 'log' ? 'Search member or description' : 'Search members'}
            className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3 outline-none focus:border-blue-300"
          />
        </div>

        {view === 'log' ? (
          <SelectMenu
            label="Filter fines"
            value={logFilter}
            onChange={setLogFilter}
            options={LOG_FILTERS.map(([value, optionLabel]) => ({ value, label: optionLabel }))}
            className="lg:w-48"
          />
        ) : (
          <SelectMenu
            label="Filter members"
            value={memberFilter}
            onChange={setMemberFilter}
            options={MEMBER_FILTERS.map(([value, optionLabel]) => ({ value, label: optionLabel }))}
            className="lg:w-48"
          />
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" />
        </div>
      ) : view === 'log' ? (
        <FineLogTable
          fines={visibleFines}
          today={today}
          busyId={busyId}
          onToggle={togglePaid}
          onEdit={openEdit}
          onDelete={remove}
        />
      ) : (
        <MemberSummaryTable members={visibleMembers} />
      )}

      {editing && (
        <FineModal
          editing={editing}
          form={form}
          setForm={setForm}
          members={members}
          saving={saving}
          onClose={closeModal}
          onSubmit={save}
        />
      )}
    </div>
  );
}

function FineLogTable({ fines, today, busyId, onToggle, onEdit, onDelete }) {
  if (fines.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center text-white/45">
        <BadgeDollarSign className="mx-auto mb-3" size={38} />
        <p>No fines match this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/45">
          <tr>
            <th className="p-4">Date Issued</th>
            <th className="p-4">Member</th>
            <th className="p-4">Description</th>
            <th className="p-4">Amount</th>
            <th className="p-4">Due Date</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {fines.map((fine) => {
            const status = fineStatus(fine, today);
            const busy = busyId === fine.id;
            return (
              <tr key={fine.id} className="border-t border-white/5 hover:bg-white/[0.04]">
                <td className="p-4 text-white/70">{formatDate(fine.date_issued)}</td>
                <td className="p-4 font-bold">{fine.member_name}</td>
                <td className="p-4 text-white/75">
                  {fine.description}
                  {fine.notes && <span className="block text-xs text-white/40">{fine.notes}</span>}
                </td>
                <td className="p-4 font-bold">{formatCurrency(fine.amount)}</td>
                <td className="p-4 text-white/60">{formatDate(fine.due_date)}</td>
                <td className="p-4">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${FINE_STATUS_STYLES[status]}`}>
                    {FINE_STATUS_LABELS[status]}
                  </span>
                  {fine.paid && fine.paid_on && (
                    <span className="block text-xs text-white/35">{formatDate(fine.paid_on)}</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onToggle(fine)}
                      disabled={busy}
                      title={fine.paid ? 'Mark unpaid' : 'Mark paid'}
                      className={`rounded-lg p-2 transition disabled:opacity-40 ${
                        fine.paid ? 'text-white/50 hover:bg-white/10' : 'text-emerald-300 hover:bg-emerald-500/10'
                      }`}
                    >
                      {busy ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : fine.paid ? (
                        <Undo2 size={16} />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => onEdit(fine)}
                      className="rounded-lg p-2 hover:bg-white/10"
                      aria-label="Edit fine"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(fine)}
                      disabled={busy}
                      className="rounded-lg p-2 text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                      aria-label="Delete fine"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MemberSummaryTable({ members }) {
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center text-white/45">
        <BadgeDollarSign className="mx-auto mb-3" size={38} />
        <p>No members match this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/45">
          <tr>
            <th className="p-4">Name</th>
            <th className="p-4">Class</th>
            <th className="p-4">Role</th>
            <th className="p-4"># of Fines</th>
            <th className="p-4">Total Assessed</th>
            <th className="p-4">Total Paid</th>
            <th className="p-4">Outstanding</th>
            <th className="p-4">Last Fine</th>
            <th className="p-4">Account Status</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-t border-white/5 hover:bg-white/[0.04]">
              <td className="p-4 font-bold">{member.name}</td>
              <td className="p-4 text-white/60">{member.pledge_class || '—'}</td>
              <td className="p-4 text-white/60">{member.position || '—'}</td>
              <td className="p-4 text-white/70">{member.fine_count}</td>
              <td className="p-4 text-white/70">{formatCurrency(member.total_assessed)}</td>
              <td className="p-4 text-emerald-200/80">{formatCurrency(member.total_paid)}</td>
              <td className={`p-4 font-bold ${member.outstanding > 0 ? 'text-rose-300' : 'text-white/50'}`}>
                {formatCurrency(member.outstanding)}
              </td>
              <td className="p-4 text-white/60">{member.last_fine_date ? formatDate(member.last_fine_date) : '—'}</td>
              <td className="p-4">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                    ACCOUNT_STATUS_STYLES[member.account_status]
                  }`}
                >
                  {member.account_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FineModal({ editing, form, setForm, members, saving, onClose, onSubmit }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">{editing === 'new' ? 'Add fine' : 'Edit fine'}</h2>
            <p className="text-sm text-white/50">Member totals recalculate as soon as you save.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10">
            <X />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-white/75 sm:col-span-2">
            Member
            <SelectMenu
              label="Member"
              placeholder="Select a member"
              searchable
              searchPlaceholder="Search members"
              value={form.member_id}
              onChange={(memberId) => setForm({ ...form, member_id: memberId })}
              options={members.map((member) => ({
                value: member.id,
                label: member.pledge_class ? `${member.name} · ${member.pledge_class}` : member.name,
              }))}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-white/75 sm:col-span-2">
            Description
            <input
              required
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Missed chapter, transcript submission, late dues..."
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-white/75">
            Amount (USD)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-white/75">
            Date issued
            <DatePicker
              label="Date issued"
              value={form.date_issued}
              onChange={(date) => setForm({ ...form, date_issued: date })}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-white/75">
            Due date
            <DatePicker
              label="Due date"
              placeholder="No due date"
              clearable
              value={form.due_date}
              onChange={(date) => setForm({ ...form, due_date: date })}
            />
          </label>

          <label className="flex items-center gap-3 text-sm font-semibold text-white/75">
            <input
              type="checkbox"
              checked={form.paid}
              onChange={(event) => setForm({ ...form, paid: event.target.checked })}
              className="h-4 w-4"
            />
            Marked paid
          </label>

          <label className="grid gap-2 text-sm font-semibold text-white/75 sm:col-span-2">
            Notes (optional)
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Payment method, waiver reason, follow-up..."
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500 disabled:opacity-50"
          >
            {saving && <Loader2 size={17} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save fine'}
          </button>
        </div>
      </form>
    </div>
  );
}
