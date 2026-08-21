'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, ExternalLink, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';
import ProfileSectionNav from '@/components/ProfileSectionNav';
import { useAuth } from '@/components/authprovider';
import { supabase } from '@/lib/supabase';

const DEFAULT_TARGET = 40;
const STATUSES = [
  ['applied', 'Applied'], ['assessment', 'Assessment'], ['interviewing', 'Interviewing'],
  ['rejected', 'Rejected'], ['offer', 'Offer'], ['withdrawn', 'Withdrawn'],
];
const emptyForm = { company: '', position: '', date_applied: '', status: 'applied', details: '', application_url: '', referral: false, referral_contact: '' };

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
  const [defaultTarget, setDefaultTarget] = useState(DEFAULT_TARGET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm, date_applied: localDate() });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError('');
    const [{ data: apps, error: appsError }, { data: reqs, error: reqError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from('internship_applications').select('*').order('date_applied', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('application_requirements').select('*').order('month_start', { ascending: false }),
      supabase.from('member_profiles').select('default_application_target').eq('user_id', user.id).maybeSingle(),
    ]);
    setLoading(false);
    if (appsError || reqError || profileError) setError(appsError?.message || reqError?.message || profileError?.message || 'Unable to load applications.');
    else { setApplications(apps || []); setRequirements(reqs || []); setDefaultTarget(profile?.default_application_target ?? DEFAULT_TARGET); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const currentRequirement = useMemo(() => {
    const row = requirements.find((item) => item.month_start?.slice(0, 7) === selectedMonth);
    return row || { target_count: defaultTarget, is_exempt: false, exemption_reason: '' };
  }, [requirements, selectedMonth, defaultTarget]);

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
  const progress = currentRequirement.is_exempt ? 100 : Math.min(100, Math.round((monthlyCount / Math.max(1, target)) * 100));
  const years = [...new Set([String(new Date().getFullYear()), ...applications.map((app) => app.date_applied.slice(0, 4))])].sort().reverse();

  function openNew() { setEditing('new'); setForm({ ...emptyForm, date_applied: localDate() }); }
  function openEdit(app) { setEditing(app.id); setForm({ ...app, referral_contact: app.referral_contact || '', details: app.details || '', application_url: app.application_url || '' }); }
  function closeModal() { if (!saving) setEditing(null); }

  async function save(event) {
    event.preventDefault(); setSaving(true); setError('');
    const payload = {
      user_id: user.id, company: form.company.trim(), position: form.position.trim(), date_applied: form.date_applied,
      status: form.status, details: form.details.trim() || null, application_url: form.application_url.trim() || null,
      referral: Boolean(form.referral), referral_contact: form.referral ? form.referral_contact.trim() || null : null,
    };
    const query = editing === 'new'
      ? supabase.from('internship_applications').insert(payload)
      : supabase.from('internship_applications').update(payload).eq('id', editing);
    const { error: saveError } = await query;
    setSaving(false);
    if (saveError) setError(saveError.message);
    else { setEditing(null); await load(); }
  }

  async function remove(app) {
    if (!window.confirm(`Delete the ${app.position} application at ${app.company}?`)) return;
    const { error: deleteError } = await supabase.from('internship_applications').delete().eq('id', app.id);
    if (deleteError) setError(deleteError.message); else await load();
  }

  const allTimeCounts = useMemo(() => Object.fromEntries(STATUSES.map(([key]) => [key, applications.filter((app) => app.status === key).length])), [applications]);

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      <FadeIn className="mx-auto w-full max-w-6xl">
        <div className="mb-8"><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Member Account</h1><p className="mt-2 text-white/60">Manage your profile, applications, and resume.</p></div>
        <ProfileSectionNav />

        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            {!requirementMet && <p className="text-sm font-bold uppercase tracking-wider text-blue-200">{new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>}
            <h2 className="mt-1 text-3xl font-black">{requirementMet ? 'Monthly requirement met.' : `${monthlyCount} of ${target} applications`}</h2>
            {currentRequirement.exemption_reason
              ? <p className="mt-2 max-w-2xl text-sm text-blue-100/80">{currentRequirement.exemption_reason}</p>
              : !requirementMet && <p className="mt-1 text-sm text-white/55">{target - monthlyCount} remaining this month.</p>}
          </div>
          <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"><Plus size={18}/> Add Application</button>
        </div>
        <div className="mb-8 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>

        <div className="mb-6 grid gap-3 grid-cols-2 md:grid-cols-4">
          <Stat label="This month" value={monthlyCount}/><Stat label={`${selectedYear} total`} value={applications.filter((a) => a.date_applied.startsWith(selectedYear)).length}/><Stat label="All time" value={applications.length}/><Stat label="Offers" value={allTimeCounts.offer}/>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex rounded-xl bg-black/20 p-1">{[['month','Month'],['year','Year'],['all','All time']].map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`rounded-lg px-4 py-2 text-sm font-bold ${view===key?'bg-blue-600':'text-white/55 hover:text-white'}`}>{label}</button>)}</div>
            {view==='month' && <input type="month" value={selectedMonth} onChange={(e)=>{setSelectedMonth(e.target.value);setSelectedYear(e.target.value.slice(0,4));}} className="rounded-xl border border-white/15 bg-slate-900 px-4 py-2.5"/>}
            {view==='year' && <select value={selectedYear} onChange={(e)=>setSelectedYear(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-4 py-2.5">{years.map(y=><option key={y}>{y}</option>)}</select>}
            <div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search company or position" className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-3 outline-none focus:border-blue-300"/></div>
            <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-4 py-2.5"><option value="all">All statuses</option>{STATUSES.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select>
          </div>
          {error && <p className="mb-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
          {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin"/></div> : visible.length===0 ? <div className="py-16 text-center text-white/45"><BriefcaseBusiness className="mx-auto mb-3" size={38}/><p>No applications found for this view.</p></div> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45"><tr><th className="p-3">Company</th><th className="p-3">Position</th><th className="p-3">Date applied</th><th className="p-3">Status</th><th className="p-3">Referral</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{visible.map(app=><tr key={app.id} className="border-b border-white/5 hover:bg-white/[0.04]"><td className="p-3 font-bold">{app.company}</td><td className="p-3 text-white/75">{app.position}</td><td className="p-3 text-white/60">{formatDate(app.date_applied)}</td><td className="p-3"><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">{labelStatus(app.status)}</span></td><td className="p-3 text-white/60">{app.referral?'Yes':'No'}</td><td className="p-3"><div className="flex justify-end gap-1">{app.application_url&&<a href={app.application_url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 hover:bg-white/10" aria-label="Open application"><ExternalLink size={16}/></a>}<button onClick={()=>openEdit(app)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Edit"><Pencil size={16}/></button><button onClick={()=>remove(app)} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10" aria-label="Delete"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>
          )}
        </section>
      </FadeIn>

      {editing && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e)=>{if(e.target===e.currentTarget)closeModal();}}><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-6 shadow-2xl"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-2xl font-black">{editing==='new'?'Add application':'Edit application'}</h2><p className="text-sm text-white/50">The application date determines which month receives credit.</p></div><button type="button" onClick={closeModal} className="rounded-lg p-2 hover:bg-white/10"><X/></button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Company" required value={form.company} onChange={v=>setForm({...form,company:v})}/><Field label="Position" required value={form.position} onChange={v=>setForm({...form,position:v})}/><label className="grid gap-2 text-sm font-semibold text-white/75">Date applied<input required type="date" value={form.date_applied} onChange={e=>setForm({...form,date_applied:e.target.value})} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white [color-scheme:dark]"/></label><label className="grid gap-2 text-sm font-semibold text-white/75">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3">{STATUSES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold text-white/75 sm:col-span-2">Application or portal URL<input type="url" placeholder="https://..." value={form.application_url} onChange={e=>setForm({...form,application_url:e.target.value})} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"/></label><label className="flex items-center gap-3 text-sm font-semibold text-white/75 sm:col-span-2"><input type="checkbox" checked={form.referral} onChange={e=>setForm({...form,referral:e.target.checked})} className="h-4 w-4"/> I had a referral</label>{form.referral&&<Field label="Referral contact (optional)" value={form.referral_contact} onChange={v=>setForm({...form,referral_contact:v})}/>}<label className="grid gap-2 text-sm font-semibold text-white/75 sm:col-span-2">Details<textarea rows={4} value={form.details} onChange={e=>setForm({...form,details:e.target.value})} placeholder="Recruiter, next steps, notes..." className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"/></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/10">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500 disabled:opacity-50">{saving&&<Loader2 size={17} className="animate-spin"/>}{saving?'Saving...':'Save application'}</button></div></form></div>}
    </main>
  );
}

function Stat({ label, value }) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-white/45">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>; }
function Field({ label, value, onChange, required=false }) { return <label className="grid gap-2 text-sm font-semibold text-white/75">{label}<input required={required} value={value} onChange={e=>onChange(e.target.value)} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"/></label>; }
