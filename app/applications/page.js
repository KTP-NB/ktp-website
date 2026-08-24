'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, ExternalLink, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import AuthGate from '@/components/authgate';
import AccountShell from '@/components/AccountShell';
import { useAuth } from '@/components/authprovider';
import { supabase } from '@/lib/supabase';
import SelectMenu from '@/components/SelectMenu';
import DatePicker from '@/components/DatePicker';

const DEFAULT_TARGET = 40;
const STATUSES = [
  ['applied', 'Applied'], ['assessment', 'Assessment'], ['interviewing', 'Interviewing'],
  ['rejected', 'Rejected'], ['offer', 'Offer'], ['withdrawn', 'Withdrawn'],
];
const emptyForm = { company: '', position: '', date_applied: '', status: 'applied', details: '', application_url: '', referral: false, referral_contact: '' };
function newBulkRow() { return { ...emptyForm, date_applied: localDate() }; }
function newBulkRows(count = 5) { return Array.from({ length: count }, newBulkRow); }

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function monthKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthStart(key) { return `${key}-01`; }
function labelStatus(value) { return STATUSES.find(([key]) => key === value)?.[1] || value; }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }

export default function ApplicationsPage() {
  return <AuthGate><ApplicationsTracker /></AuthGate>;
}

function ApplicationsTracker() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [chapterRequirements, setChapterRequirements] = useState([]);
  const [memberRequirement, setMemberRequirement] = useState({ target: DEFAULT_TARGET, usesDefault: true, status: 'Active' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState(() => newBulkRows());
  const [form, setForm] = useState({ ...emptyForm, date_applied: localDate() });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError('');
    const [{ data: apps, error: appsError }, { data: reqs, error: reqError }, { data: chapterReqs, error: chapterError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from('internship_applications').select('*').order('date_applied', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('application_requirements').select('*').order('month_start', { ascending: false }),
      supabase.from('chapter_application_requirements').select('month_start,default_target').order('month_start', { ascending: false }),
      supabase.from('member_profiles').select('default_application_target,uses_default_application_target,member_status').eq('user_id', user.id).maybeSingle(),
    ]);
    setLoading(false);
    if (appsError || reqError || chapterError || profileError) setError(appsError?.message || reqError?.message || chapterError?.message || profileError?.message || 'Unable to load applications.');
    else {
      setApplications(apps || []);
      setRequirements(reqs || []);
      setChapterRequirements(chapterReqs || []);
      setMemberRequirement({
        target: profile?.default_application_target ?? DEFAULT_TARGET,
        usesDefault: profile?.uses_default_application_target ?? true,
        status: profile?.member_status || 'Active',
      });
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const currentRequirement = useMemo(() => {
    const row = requirements.find((item) => item.month_start?.slice(0, 7) === selectedMonth);
    const chapterRow = chapterRequirements.find((item) => item.month_start?.slice(0, 7) === selectedMonth);
    const chapterTarget = chapterRow?.default_target ?? DEFAULT_TARGET;
    const noRequirement = ['Inactive', 'Alumni'].includes(memberRequirement.status);
    const baseTarget = noRequirement
      ? 0
      : memberRequirement.usesDefault
        ? chapterTarget
        : memberRequirement.target;
    const target = row?.target_count ?? baseTarget;
    return {
      target_count: target,
      is_exempt: noRequirement || Boolean(row?.is_exempt),
      exemption_reason: row?.exemption_reason || '',
    };
  }, [requirements, chapterRequirements, selectedMonth, memberRequirement]);

  const visible = useMemo(() => applications.filter((app) => {
    if (view === 'month' && !app.date_applied.startsWith(selectedMonth)) return false;
    if (view === 'year' && !app.date_applied.startsWith(selectedYear)) return false;
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (search && !`${app.company} ${app.position}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [applications, view, selectedMonth, selectedYear, statusFilter, search]);

  const monthlyCount = applications.filter((app) => app.date_applied.startsWith(selectedMonth)).length;
  const target = currentRequirement.is_exempt ? 0 : currentRequirement.target_count;
  const requirementMet = monthlyCount >= target;
  const progress = target === 0 || currentRequirement.is_exempt ? 100 : Math.min(100, Math.round((monthlyCount / target) * 100));
  const years = [...new Set([String(new Date().getFullYear()), ...applications.map((app) => app.date_applied.slice(0, 4))])].sort().reverse();

  function openNew() { setBulkRows(newBulkRows()); setBulkOpen(true); setError(''); }
  function openEdit(app) { setEditing(app.id); setForm({ ...app, referral_contact: app.referral_contact || '', details: app.details || '', application_url: app.application_url || '' }); }
  function closeModal() { if (!saving) setEditing(null); }

  async function save(event) {
    event.preventDefault(); setSaving(true); setError('');
    const payload = {
      user_id: user.id, company: form.company.trim(), position: form.position.trim(), date_applied: form.date_applied,
      status: form.status, details: form.details.trim() || null, application_url: form.application_url.trim() || null,
      referral: Boolean(form.referral), referral_contact: form.referral ? form.referral_contact.trim() || null : null,
    };
    const query = supabase.from('internship_applications').update(payload).eq('id', editing);
    const { error: saveError } = await query;
    setSaving(false);
    if (saveError) setError(saveError.message);
    else { setEditing(null); await load(); }
  }

  async function saveBulk(event) {
    event.preventDefault();
    const incomplete = bulkRows.some((row) => Boolean(row.company.trim()) !== Boolean(row.position.trim()));
    if (incomplete) { setError('Each started row needs both Company Name and Position.'); return; }
    const completed = bulkRows.filter((row) => row.company.trim() && row.position.trim());
    if (!completed.length) { setError('Complete at least one application row.'); return; }
    setSaving(true); setError('');
    const payloads = completed.map((row) => ({
      user_id: user.id,
      company: row.company.trim(),
      position: row.position.trim(),
      date_applied: row.date_applied || localDate(),
      status: row.status || 'applied',
      details: row.details.trim() || null,
      application_url: row.application_url.trim() || null,
      referral: Boolean(row.referral),
      referral_contact: row.referral ? row.referral_contact.trim() || null : null,
    }));
    const { error: saveError } = await supabase.from('internship_applications').insert(payloads);
    setSaving(false);
    if (saveError) setError(saveError.message);
    else { setBulkOpen(false); await load(); }
  }

  async function remove(app) {
    if (!window.confirm(`Delete the ${app.position} application at ${app.company}?`)) return;
    const { error: deleteError } = await supabase.from('internship_applications').delete().eq('id', app.id);
    if (deleteError) setError(deleteError.message); else await load();
  }

  const allTimeCounts = useMemo(() => Object.fromEntries(STATUSES.map(([key]) => [key, applications.filter((app) => app.status === key).length])), [applications]);

  return (
    <AccountShell after={<>
      {bulkOpen && (
        <BulkApplicationModal rows={bulkRows} setRows={setBulkRows} saving={saving} error={error} onClose={()=>!saving&&setBulkOpen(false)} onSave={saveBulk}/>
      )}
      {editing && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e)=>{if(e.target===e.currentTarget)closeModal();}}><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-6 shadow-2xl"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-2xl font-black">{editing==='new'?'Add application':'Edit application'}</h2><p className="text-sm text-white/50">The application date determines which month receives credit.</p></div><button type="button" onClick={closeModal} className="rounded-lg p-2 hover:bg-white/10"><X/></button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Company" required value={form.company} onChange={v=>setForm({...form,company:v})}/><Field label="Position" required value={form.position} onChange={v=>setForm({...form,position:v})}/><label className="grid gap-2 text-sm font-semibold text-white/75">Date applied<DatePicker label="Date applied" value={form.date_applied} onChange={(value)=>setForm({...form,date_applied:value})}/></label><label className="grid gap-2 text-sm font-semibold text-white/75">Status<SelectMenu label="Status" value={form.status} onChange={(value)=>setForm({...form,status:value})} options={STATUSES.map(([key,label])=>({value:key,label}))}/></label><label className="grid gap-2 text-sm font-semibold text-white/75 sm:col-span-2">Application or portal URL<input type="url" placeholder="https://..." value={form.application_url} onChange={e=>setForm({...form,application_url:e.target.value})} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"/></label><label className="flex items-center gap-3 text-sm font-semibold text-white/75 sm:col-span-2"><input type="checkbox" checked={form.referral} onChange={e=>setForm({...form,referral:e.target.checked})} className="h-4 w-4"/> I had a referral</label>{form.referral&&<Field label="Referral contact (optional)" value={form.referral_contact} onChange={v=>setForm({...form,referral_contact:v})}/>}<label className="grid gap-2 text-sm font-semibold text-white/75 sm:col-span-2">Details<textarea rows={4} value={form.details} onChange={e=>setForm({...form,details:e.target.value})} placeholder="Recruiter, next steps, notes..." className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"/></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/10">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500 disabled:opacity-50">{saving&&<Loader2 size={17} className="animate-spin"/>}{saving?'Saving...':'Save application'}</button></div></form></div>}
    </>}>

        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            {!requirementMet && <p className="text-sm font-bold uppercase tracking-wider text-blue-200">{new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>}
            <h2 className="mt-1 text-3xl font-black">{target === 0 ? 'No application requirement.' : requirementMet ? 'Monthly requirement met.' : `${monthlyCount} of ${target} applications`}</h2>
            {currentRequirement.exemption_reason
              ? <p className="mt-2 max-w-2xl text-sm text-blue-100/80">{currentRequirement.exemption_reason}</p>
              : !requirementMet && <p className="mt-1 text-sm text-white/55">{target - monthlyCount} remaining this month.</p>}
          </div>
          <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"><Plus size={18}/> Add Application</button>
        </div>
        <div className="mb-8 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>

        <div className="mb-6 grid gap-3 grid-cols-2 md:grid-cols-5">
          <Stat label="This month" value={monthlyCount}/><Stat label={`${selectedYear} total`} value={applications.filter((a) => a.date_applied.startsWith(selectedYear)).length}/><Stat label="All time" value={applications.length}/><Stat label="Interviews" value={allTimeCounts.interviewing}/><Stat label="Offers" value={allTimeCounts.offer}/>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex rounded-xl bg-black/20 p-1">{[['month','Month'],['year','Year'],['all','All time']].map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`rounded-lg px-4 py-2 text-sm font-bold ${view===key?'bg-blue-600':'text-white/55 hover:text-white'}`}>{label}</button>)}</div>
            {view==='month' && <DatePicker mode="month" label="Month" value={selectedMonth} onChange={(value)=>{setSelectedMonth(value);setSelectedYear(value.slice(0,4));}} className="w-52"/>}
            {view==='year' && <SelectMenu label="Year" value={selectedYear} onChange={setSelectedYear} options={years.map((y)=>({value:String(y),label:String(y)}))} className="w-36"/>}
            <div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search company or position" className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-3 outline-none focus:border-blue-300"/></div>
            <SelectMenu label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={[{value:'all',label:'All statuses'},...STATUSES.map(([key,label])=>({value:key,label}))]} align="right" className="lg:w-48"/>
          </div>
          {error && <p className="mb-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
          {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin"/></div> : visible.length===0 ? <div className="py-16 text-center text-white/45"><BriefcaseBusiness className="mx-auto mb-3" size={38}/><p>No applications found for this view.</p></div> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45"><tr><th className="p-3">Company</th><th className="p-3">Position</th><th className="p-3">Date applied</th><th className="p-3">Status</th><th className="p-3">Referral</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{visible.map(app=><tr key={app.id} className="border-b border-white/5 hover:bg-white/[0.04]"><td className="p-3 font-bold">{app.company}{['api','mcp'].includes(app.entry_source)&&<small className="ml-2 rounded bg-blue-400/10 px-1.5 py-0.5 text-[10px] uppercase text-blue-300">{app.entry_source}</small>}</td><td className="p-3 text-white/75">{app.position}</td><td className="p-3 text-white/60">{formatDate(app.date_applied)}</td><td className="p-3"><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">{labelStatus(app.status)}</span></td><td className="p-3 text-white/60">{app.referral?'Yes':'No'}</td><td className="p-3"><div className="flex justify-end gap-1">{app.application_url&&<a href={app.application_url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 hover:bg-white/10" aria-label="Open application"><ExternalLink size={16}/></a>}<button onClick={()=>openEdit(app)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Edit"><Pencil size={16}/></button><button onClick={()=>remove(app)} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10" aria-label="Delete"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>
          )}
        </section>
    </AccountShell>
  );
}

function BulkApplicationModal({ rows, setRows, saving, error, onClose, onSave }) {
  const update = (index, key, value) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const completedCount = rows.filter((row) => row.company.trim() && row.position.trim()).length;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}>
      <form onSubmit={onSave} className="max-h-[94vh] w-full max-w-[1500px] overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-5 shadow-2xl md:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="text-2xl font-black">Add applications</h2><p className="mt-1 text-sm text-white/50">Complete as many rows as you need. Empty rows are ignored.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><X/></button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <div className="min-w-[1320px]">
            <div className="grid grid-cols-[42px_180px_220px_150px_150px_210px_220px_90px_180px] gap-2 bg-white/5 px-3 py-3 text-xs font-bold uppercase tracking-wider text-white/50">
              <span>#</span><span>Company <b className="text-red-400">*</b></span><span>Position <b className="text-red-400">*</b></span><span>Date applied</span><span>Status</span><span>Portal URL</span><span>Details</span><span>Referral</span><span>Referral contact</span>
            </div>
            <div className="divide-y divide-white/5">
              {rows.map((row,index)=>{
                const incomplete=Boolean(row.company.trim())!==Boolean(row.position.trim());
                const inputClass=`w-full rounded-lg border bg-white/5 px-3 py-2 text-sm outline-none focus:border-blue-300 ${incomplete?'border-red-400/60':'border-white/10'}`;
                return <div key={index} className={`grid grid-cols-[42px_180px_220px_150px_150px_210px_220px_90px_180px] items-center gap-2 px-3 py-2 ${incomplete?'bg-red-500/5':''}`}>
                  <span className="text-center text-xs text-white/35">{index+1}</span>
                  <input aria-label={`Company ${index+1}`} value={row.company} onChange={e=>update(index,'company',e.target.value)} placeholder="Company" className={inputClass}/>
                  <input aria-label={`Position ${index+1}`} value={row.position} onChange={e=>update(index,'position',e.target.value)} placeholder="Position" className={inputClass}/>
                  <DatePicker label={`Date applied ${index+1}`} value={row.date_applied} onChange={(value)=>update(index,'date_applied',value)}/>
                  <SelectMenu label={`Status ${index+1}`} value={row.status} onChange={(value)=>update(index,'status',value)} options={STATUSES.map(([key,label])=>({value:key,label}))}/>
                  <input aria-label={`Portal URL ${index+1}`} type="url" value={row.application_url} onChange={e=>update(index,'application_url',e.target.value)} placeholder="https://..." className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"/>
                  <input aria-label={`Details ${index+1}`} value={row.details} onChange={e=>update(index,'details',e.target.value)} placeholder="Notes" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"/>
                  <label className="flex justify-center"><input aria-label={`Referral ${index+1}`} type="checkbox" checked={row.referral} onChange={e=>update(index,'referral',e.target.checked)} className="h-4 w-4"/></label>
                  <input aria-label={`Referral contact ${index+1}`} value={row.referral_contact} onChange={e=>update(index,'referral_contact',e.target.value)} disabled={!row.referral} placeholder="Optional" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm disabled:opacity-35"/>
                </div>;
              })}
            </div>
          </div>
        </div>
        <button type="button" onClick={()=>setRows(current=>[...current,...newBulkRows()])} className="mt-4 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Add 5 More Rows</button>
        {error&&<p className="mt-4 rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-white/15 px-5 py-3 font-bold">Cancel</button><button disabled={saving||completedCount===0} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold disabled:opacity-40">{saving&&<Loader2 size={17} className="animate-spin"/>}{saving?'Saving…':`Save ${completedCount} Application${completedCount===1?'':'s'}`}</button></div>
      </form>
    </div>
  );
}

function Stat({ label, value }) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-white/45">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>; }
function Field({ label, value, onChange, required=false }) { return <label className="grid gap-2 text-sm font-semibold text-white/75">{label}<input required={required} value={value} onChange={e=>onChange(e.target.value)} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"/></label>; }
