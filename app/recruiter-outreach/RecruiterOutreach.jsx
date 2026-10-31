'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { ExternalLink, Loader2, Mail, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import AccountShell from '@/components/AccountShell';
import DatePicker from '@/components/DatePicker';
import { jobBoardApi } from '@/lib/job-board/clientFetch';
import { emailDraft, emailFormPayload } from '@/lib/recruiter-emails/form.mjs';
import { cleanRecruiterEmail } from '@/lib/recruiter-emails/validation.mjs';

const ENDPOINT = '/api/v1/recruiter-emails';
const inputClass = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-blue-300';

export default function RecruiterOutreach() {
  const [emails, setEmails] = useState([]);
  const [summary, setSummary] = useState({ emails: 0, recruiters: 0 });
  const [filters, setFilters] = useState({ search: '', from: '', to: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const requestNumber = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestNumber.current;
    setLoading(true); setError('');
    try {
      const result = await jobBoardApi(`${ENDPOINT}?${new URLSearchParams({ ...filters, limit: 50 })}`);
      if (current !== requestNumber.current) return;
      if (!result.data.length && filters.page > 1 && result.pagination.total <= (filters.page - 1) * 50) {
        setFilters((value) => ({ ...value, page: Math.max(1, Math.ceil(result.pagination.total / 50)) }));
        return;
      }
      setEmails(result.data); setSummary(result.summary);
    } catch (err) {
      if (current === requestNumber.current) { setError(err.message); setEmails([]); setSummary({ emails: 0, recruiters: 0 }); }
    } finally { if (current === requestNumber.current) setLoading(false); }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => { clearTimeout(timer); requestNumber.current += 1; };
  }, [load]);

  function filter(key, value) { setLoading(true); setFilters((current) => ({ ...current, page: 1, [key]: value })); }
  function open(email = null) {
    setRows([emailDraft(email || {})]); setModal({ email }); setFormError(''); setNotice('');
  }
  function update(index, key, value) {
    setRows((current) => current.map((row, i) => i === index ? { ...row, [key]: value } : row));
  }

  async function save(event) {
    event.preventDefault(); setFormError('');
    let payloads;
    try {
      payloads = rows.map((row) => emailFormPayload(row, modal.email));
      const invalid = payloads.flatMap((payload, index) => cleanRecruiterEmail(payload, { partial: Boolean(modal.email) }).errors.map((message) => `Row ${index + 1}: ${message}`));
      if (invalid.length) { setFormError(invalid.join(' ')); return; }
    } catch { setFormError('Every row needs a valid sent date and time.'); return; }
    setSaving(true);
    try {
      if (modal.email) {
        await jobBoardApi(`${ENDPOINT}/${modal.email.id}`, { method: 'PATCH', body: JSON.stringify(payloads[0]) });
        setModal(null); setNotice('Email updated.');
      } else {
        const result = await jobBoardApi(ENDPOINT, { method: 'POST', body: JSON.stringify({ emails: payloads }) });
        const failed = result.results.filter(({ status }) => ['invalid', 'failed'].includes(status));
        setNotice(`${result.created} added, ${result.duplicates} already tracked, ${result.ignored} previously deleted, ${result.failed} failed.`);
        if (failed.length) {
          setRows(failed.map(({ index }) => rows[index]));
          setFormError(`Only failed rows remain. ${failed.map(({ index, errors }) => `Original row ${index + 1}: ${errors.join(' ')}`).join(' ')}`);
        } else setModal(null);
      }
      await load();
    } catch (err) {
      setFormError(`${err.message} If the connection failed during saving, close this form and check the tracker before retrying manual entries.`);
    } finally { setSaving(false); }
  }

  async function remove(email) {
    if (!window.confirm('Delete this recruiter email? Imported emails will stay excluded from future imports.')) return;
    setDeleting(email.id); setError('');
    try {
      await jobBoardApi(`${ENDPOINT}/${email.id}`, { method: 'DELETE' });
      setNotice('Email deleted.'); await load();
    } catch (err) { setError(err.message); }
    finally { setDeleting(null); }
  }

  return <AccountShell subtitle="Track sent recruiter emails and follow-ups." after={
    <Dialog open={Boolean(modal)} onClose={() => !saving && setModal(null)} className="relative z-[100]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-4"><div className="flex min-h-full items-center justify-center">
        <Dialog.Panel className="w-full max-w-3xl rounded-2xl border border-white/15 bg-slate-950 p-6 text-white shadow-2xl">
          <form onSubmit={save}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><Dialog.Title className="text-2xl font-black">{modal?.email ? 'Edit recruiter email' : 'Add recruiter emails'}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-white/55">One row per sent message, including follow-ups. Dates and times use your local timezone. Optional details can stay empty.</Dialog.Description></div>
              <button type="button" disabled={saving} onClick={() => setModal(null)} aria-label="Close editor" className="rounded-lg p-2 hover:bg-white/10"><X /></button>
            </div>
            <div className="space-y-5">{rows.map((row, index) => <fieldset disabled={saving} key={index} className="rounded-xl border border-white/10 p-4">
              <legend className="px-2 text-sm font-bold">Email {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Recruiter emails (comma separated)" required value={row.recipients} onChange={(value) => update(index, 'recipients', value)} className="sm:col-span-2" />
                <Field label="Company" maxLength={160} value={row.company} onChange={(value) => update(index, 'company', value)} />
                <Field label="Position" maxLength={200} value={row.position} onChange={(value) => update(index, 'position', value)} />
                <Field label="Subject" maxLength={500} value={row.subject} onChange={(value) => update(index, 'subject', value)} />
                <Field label="Sent date and time" type="datetime-local" step="1" required value={row.sent_at} onChange={(value) => update(index, 'sent_at', value)} />
                <Field label="Source link" type="url" maxLength={2000} value={row.source_url} onChange={(value) => update(index, 'source_url', value)} className="sm:col-span-2" />
                <label className="grid gap-2 text-sm font-semibold text-white/75 sm:col-span-2">Notes (metadata only)<textarea rows={3} maxLength={5000} value={row.notes} onChange={(event) => update(index, 'notes', event.target.value)} className={inputClass} placeholder="Brief context or next steps. Do not paste email bodies." /></label>
              </div>
              {rows.length > 1 && <button type="button" onClick={() => setRows((current) => current.filter((_, i) => i !== index))} className="mt-3 text-sm text-red-300">Remove row {index + 1}</button>}
            </fieldset>)}</div>
            {formError && <p role="alert" className="mt-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{formError}</p>}
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              {!modal?.email && <button type="button" disabled={saving || rows.length >= 50} onClick={() => setRows((current) => [...current, emailDraft()])} className="rounded-xl border border-white/15 px-4 py-3 font-bold disabled:opacity-40">Add another row ({rows.length}/50)</button>}
              <button disabled={saving} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500 disabled:opacity-50">{saving && <Loader2 size={17} className="animate-spin" />}{saving ? 'Saving…' : 'Save emails'}</button>
            </div>
          </form>
        </Dialog.Panel>
      </div></div>
    </Dialog>
  }>
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
      <div><h2 className="text-3xl font-black">Recruiter Outreach</h2><p className="mt-2 text-sm text-white/55">Each sent message counts once. Outreach does not count toward job application requirements.</p><Link href="/integrations" className="mt-2 inline-block text-sm text-blue-300 underline">Import sent emails with your agent</Link></div>
      <button onClick={() => open()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold shadow-lg shadow-blue-600/25 hover:bg-blue-500"><Plus size={18} /> Add emails</button>
    </div>
    <div className="mb-6 grid grid-cols-2 gap-3">{[['Emails sent', summary.emails], ['Unique recruiters', summary.recruiters]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs font-bold uppercase tracking-wider text-white/45">{label}</p><p className="mt-2 text-3xl font-black">{loading ? '…' : value}</p><p className="mt-1 text-xs text-white/40">Matching current filters</p></div>)}</div>
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_200px_200px]">
        <label className="grid gap-2 text-sm text-white/65">Search<div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><input value={filters.search} maxLength={200} onChange={(event) => filter('search', event.target.value)} placeholder="Recruiter, company, position, subject" className={`${inputClass} pl-10`} /></div></label>
        <div className="grid gap-2 text-sm text-white/65"><span>From (UTC)</span><DatePicker label="From date (UTC)" clearable value={filters.from} onChange={(value) => filter('from', value)} /></div>
        <div className="grid gap-2 text-sm text-white/65"><span>Through (UTC)</span><DatePicker label="Through date (UTC)" clearable value={filters.to} onChange={(value) => filter('to', value)} /></div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
      {notice && <p role="status" className="mb-4 text-sm text-blue-200">{notice}</p>}
      {loading ? <div className="flex justify-center py-16" role="status" aria-label="Loading emails"><Loader2 className="animate-spin" /></div> : emails.length === 0 ? <div className="py-16 text-center text-white/45"><Mail className="mx-auto mb-3" size={38} /><p>No recruiter emails found for this view.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45"><tr>{['Recruiters', 'Company / position', 'Subject', 'Sent', 'Actions'].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
        <tbody>{emails.map((email) => <tr key={email.id} className="border-b border-white/5 hover:bg-white/[0.04]">
          <td className="max-w-xs break-words p-3">{email.recipients.map((recipient) => <div key={recipient.email} className="mb-1"><span className="font-bold">{recipient.name || recipient.email}</span>{recipient.name && <div className="text-xs text-white/55">{recipient.email}</div>}</div>)}</td>
          <td className="max-w-xs break-words p-3"><div className="font-bold">{email.company || '—'}</div><div className="text-white/55">{email.position || '—'}</div></td>
          <td className="max-w-xs break-words p-3 text-white/75">{email.subject || '—'}{email.entry_source === 'email' && <small className="ml-2 rounded bg-blue-400/10 px-1.5 py-0.5 text-blue-300">Imported</small>}</td>
          <td className="p-3 text-white/60"><time dateTime={email.sent_at}>{new Date(email.sent_at).toLocaleString()}</time></td>
          <td className="p-3"><div className="flex justify-end gap-1">{email.source_url && <a href={email.source_url} target="_blank" rel="noopener noreferrer" aria-label="Open source email" className="rounded-lg p-2 hover:bg-white/10"><ExternalLink size={16} /></a>}<button onClick={() => open(email)} aria-label="Edit email" className="rounded-lg p-2 hover:bg-white/10"><Pencil size={16} /></button><button disabled={Boolean(deleting)} onClick={() => remove(email)} aria-label="Delete email" className="rounded-lg p-2 text-red-300 hover:bg-red-500/10 disabled:opacity-40">{deleting === email.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button></div></td>
        </tr>)}</tbody>
      </table></div>}
      <div className="mt-5 flex items-center justify-between text-sm text-white/65"><button disabled={loading || filters.page <= 1} onClick={() => filter('page', filters.page - 1)} className="rounded-lg border border-white/15 px-4 py-2 disabled:opacity-35">Previous</button><span>Page {filters.page} of {Math.max(1, Math.ceil(summary.emails / 50))}</span><button disabled={loading || filters.page * 50 >= summary.emails} onClick={() => filter('page', filters.page + 1)} className="rounded-lg border border-white/15 px-4 py-2 disabled:opacity-35">Next</button></div>
    </section>
  </AccountShell>;
}

function Field({ label, value, onChange, className = '', ...props }) {
  return <label className={`grid gap-2 text-sm font-semibold text-white/75 ${className}`}>{label}<input {...props} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></label>;
}
