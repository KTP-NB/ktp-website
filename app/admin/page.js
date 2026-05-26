'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { FileText, ExternalLink, Search, Users, Loader2, ShieldAlert, Settings, Plus, Clock, ListChecks } from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';
import Tabs from '@/components/Tabs';
import { useAuth } from '@/components/authprovider';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { api } from '@/lib/coderank/clientFetch';

/* ─── Positions that grant Admin Portal access ─── */
const ADMIN_POSITIONS = [
  'vp of tech development',
  'vp of prof development',
];

function hasAdminAccess(position) {
  if (!position) return false;
  const pos = position.toLowerCase();
  return ADMIN_POSITIONS.some((admin) => pos.includes(admin));
}

/* ─── Main Export ─── */
export default function AdminPortalPage() {
  return (
    <AuthGate>
      <AdminPortal />
    </AuthGate>
  );
}

/* ─── Admin Portal Shell ─── */
function AdminPortal() {
  const { user } = useAuth();
  const [userPosition, setUserPosition] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    if (!hasSupabaseConfig) {
      setCheckingAccess(false);
      return;
    }

    let isMounted = true;

    async function checkPosition() {
      // Try by user_id first
      let { data } = await supabase
        .from('member_profiles')
        .select('position')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fallback: try by email if user_id didn't match
      if (!data && user.email) {
        const { data: emailData } = await supabase
          .from('member_profiles')
          .select('position')
          .eq('email', user.email)
          .maybeSingle();
        data = emailData;
      }

      if (!isMounted) return;

      console.log('[Admin Portal] Position check:', { position: data?.position });
      setUserPosition(data?.position || null);
      setCheckingAccess(false);
    }

    checkPosition();
    return () => { isMounted = false; };
  }, [user?.id, user?.email]);

  const isAuthorized = useMemo(() => hasAdminAccess(userPosition), [userPosition]);

  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
        <FadeIn className="text-center max-w-md">
          <ShieldAlert size={48} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="text-white/60 mb-4">
            The Admin Portal is only accessible to executive board members with VP or President positions.
          </p>

        </FadeIn>
      </main>
    );
  }

  return <AdminDashboard />;
}

/* ─── Admin Dashboard (tabbed layout — add more tabs later) ─── */
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Resumes');

  // Add more tab names here as you build out the admin portal
  const tabs = ['Resumes', 'CodeRank'];

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      <FadeIn className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl text-white">
            Admin Portal
          </h1>
          <p className="mt-2 text-[1.1rem] text-[#bdbdbd] mb-3">
            Manage members, resumes, and chapter operations
          </p>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} active={activeTab} setActive={setActiveTab} />

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'Resumes' && <ResumesPanel />}
          {activeTab === 'CodeRank' && <CodeRankPanel />}
        </div>
      </FadeIn>
    </main>
  );
}

/* ─── Resumes Panel ─── */
function ResumesPanel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.class-dropdown-container')) {
        setClassDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    let isMounted = true;

    async function loadMembers() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('member_profiles')
        .select('id, name, position, pledge_class, member_status, graduation_year, major, resume_url, resume_storage_path, photo_url, sort_order')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setMembers(data || []);
      }

      setLoading(false);
    }

    loadMembers();
    return () => { isMounted = false; };
  }, []);

  const pledgeClasses = useMemo(() => {
    const classes = new Set();
    members.forEach((m) => { if (m.pledge_class) classes.add(m.pledge_class); });
    return ['all', ...Array.from(classes).sort()];
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (filterClass !== 'all' && m.pledge_class !== filterClass) return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = m.name?.toLowerCase().includes(q);
        const majorMatch = m.major?.toLowerCase().includes(q);
        const posMatch = m.position?.toLowerCase().includes(q);
        if (!nameMatch && !majorMatch && !posMatch) return false;
      }
      return true;
    });
  }, [members, search, filterClass]);

  const activeWithResume = filtered.filter((m) => m.resume_url && m.member_status !== 'Alumni');
  const activeWithoutResume = filtered.filter((m) => !m.resume_url && m.member_status !== 'Alumni');
  const alumniList = filtered.filter((m) => m.member_status === 'Alumni');

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, major, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 pl-11 pr-4 py-3 text-white outline-none transition placeholder:text-white/40 focus:border-blue-300"
          />
        </div>

        <div className="relative shrink-0 class-dropdown-container">
          <button
            type="button"
            onClick={() => setClassDropdownOpen(!classDropdownOpen)}
            className="w-full sm:w-auto flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 pl-4 pr-3 py-3 text-white outline-none transition focus:border-blue-300 hover:bg-white/10 min-w-[160px]"
          >
            <span className="truncate">{filterClass === 'all' ? 'All Classes' : filterClass}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-white/50 transition-transform ${classDropdownOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
          </button>
          
          {classDropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-full sm:w-48 origin-top-right rounded-2xl border border-white/10 bg-[#0f172a] p-2 shadow-xl ring-1 ring-black ring-opacity-5">
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {pledgeClasses.map((cls) => {
                  const isActive = filterClass === cls;
                  return (
                    <button
                      key={cls}
                      onClick={() => {
                        setFilterClass(cls);
                        setClassDropdownOpen(false);
                      }}
                      className={`block w-full text-left rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-white hover:bg-white/10 hover:text-blue-200'
                      }`}
                    >
                      {cls === 'all' ? 'All Classes' : cls}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 flex gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm">
          <Users size={16} className="text-blue-300" />
          <span className="text-white/70">{filtered.length} members</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-2.5 text-sm">
          <FileText size={16} className="text-emerald-300" />
          <span className="text-emerald-200">{filtered.filter(m => m.resume_url).length} resumes uploaded</span>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
          <p className="text-white/70 text-sm">Loading members...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-300/25 bg-red-400/10 px-5 py-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-8">
          {/* Active Members WITH resumes */}
          {activeWithResume.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white/90 mb-4">
                Uploaded ({activeWithResume.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeWithResume.map((member) => (
                  <a
                    key={member.id}
                    href={member.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {/* Avatar */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5">
                      <img
                        src={member.photo_url || '/ktp-icon.png'}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{member.name}</p>
                      <p className="text-xs text-white/50 truncate">
                        {[member.member_status, member.pledge_class]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>

                    {/* Icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-400/20 group-hover:bg-blue-600/30 transition">
                      <ExternalLink size={16} className="text-blue-300" />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Active Members WITHOUT resumes */}
          {activeWithoutResume.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white/40 mb-4">
                Not Uploaded ({activeWithoutResume.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {activeWithoutResume.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 opacity-50"
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      <img
                        src={member.photo_url || '/ktp-icon.png'}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{member.name}</p>
                      <p className="text-xs text-white/40 truncate">
                        {[member.member_status, member.pledge_class]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                    <span className="text-xs text-white/30 shrink-0">No resume</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Alumni */}
          {alumniList.length > 0 && (
            <section className="pt-4 border-t border-white/10">
              <h2 className="text-lg font-bold text-white/60 mb-4">
                Alumni ({alumniList.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {alumniList.map((member) => {
                  const hasResume = !!member.resume_url;
                  const CardWrapper = hasResume ? 'a' : 'div';
                  const wrapperProps = hasResume ? {
                    href: member.resume_url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg"
                  } : {
                    className: "flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 opacity-50"
                  };

                  return (
                    <CardWrapper key={member.id} {...wrapperProps}>
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                        <img
                          src={member.photo_url || '/ktp-icon.png'}
                          alt={member.name}
                          className="h-full w-full object-cover grayscale opacity-80"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-white/80">{member.name}</p>
                        <p className="text-xs text-white/40 truncate">
                          {[member.member_status, member.pledge_class]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </p>
                      </div>
                      {hasResume ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10 group-hover:bg-white/20 transition">
                          <ExternalLink size={16} className="text-white/60" />
                        </div>
                      ) : (
                        <span className="text-xs text-white/30 shrink-0">No resume</span>
                      )}
                    </CardWrapper>
                  );
                })}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Users size={40} className="mx-auto mb-3 text-white/20" />
              <p className="text-white/50">No members match your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CodeRank Panel ─── */
function CodeRankPanel() {
  const [assessments, setAssessments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/api/coderank/admin/assessments')
      .then((r) => setAssessments(r.assessments || []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1">
            Coding Assessments
          </h2>
          <p className="text-white/50 text-sm">Build NeetCode-style assessments and monitor member performance.</p>
        </div>
        <Link
          href="/admin/coderank/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition"
        >
          <Plus size={16} /> New Assessment
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300/25 bg-red-400/10 px-5 py-4 text-sm text-red-100 mb-4">{error}</div>
      )}

      {assessments === null && !error && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
        </div>
      )}

      {assessments && assessments.length === 0 && (
        <div className="py-16 text-center rounded-2xl border border-white/10 bg-white/[0.02]">
          <p className="text-white/60 mb-4">No assessments created yet.</p>
          <Link href="/admin/coderank/new" className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 font-bold">
            <Plus size={14} /> Create the first one
          </Link>
        </div>
      )}

      {assessments && assessments.length > 0 && (
        <div className="space-y-3">
          {assessments.map((a) => (
            <Link
              key={a.id}
              href={`/admin/coderank/${a.id}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold truncate">{a.title}</h3>
                    {a.published ? (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-400/30">Published</span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/15">Draft</span>
                    )}
                  </div>
                  {a.description && <p className="text-xs text-white/50 line-clamp-1 mb-1">{a.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1"><ListChecks size={12}/>{(a.cr_assessment_questions || []).length} problems</span>
                    <span className="flex items-center gap-1"><Clock size={12}/>{formatTimeLimit(a.time_limit_minutes)}</span>
                    <span>{(a.cr_assignments || []).length} assignment{(a.cr_assignments || []).length === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <ExternalLink size={16} className="text-white/40 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTimeLimit(minutes) {
  return Number(minutes) > 0 ? `${minutes} min` : 'No time limit';
}
