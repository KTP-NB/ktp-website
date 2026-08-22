"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  ExternalLink,
  Search,
  Users,
  Loader2,
  ShieldAlert,
  Settings,
  Plus,
  Clock,
  ListChecks,
} from "lucide-react";
import AuthGate from "@/components/authgate";
import FadeIn from "@/components/FadeIn";
import Tabs from "@/components/Tabs";
import { useAuth } from "@/components/authprovider";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { api } from "@/lib/coderank/clientFetch";
import { profileHasPermission } from "@/lib/adminAccess";
import ApplicationTrackerPanel from "./ApplicationTrackerPanel";
import FineTrackerPanel from "./FineTrackerPanel";
import MemberManagementPanel from "./MemberManagementPanel";
import OaComplianceView from "./OaComplianceView";
import SelectMenu from "@/components/SelectMenu";

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
  const [adminProfile, setAdminProfile] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    api("/api/admin/me")
      .then((result) => {
        if (isMounted) setAdminProfile(result.profile);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setCheckingAccess(false);
      });
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email]);

  const isAuthorized = Boolean(adminProfile);

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
            Your account does not have an administrative role or scoped
            management permission.
          </p>
        </FadeIn>
      </main>
    );
  }

  return <AdminDashboard adminProfile={adminProfile} />;
}

/* ─── Admin Dashboard (tabbed layout — add more tabs later) ─── */
// Add more tab names here as you build out the admin portal
const TAB_PERMISSIONS = {
  "Member Management": "members.manage",
  Resumes: "resumes.manage",
  CodeRank: "coderank.manage",
  "Monthly OA": "coderank.manage",
  "Application Tracker": "applications.manage",
  "Fine Tracker": "fines.manage",
};

function AdminDashboard({ adminProfile }) {
  const tabs = useMemo(
    () => Object.keys(TAB_PERMISSIONS).filter(
      (tab) => profileHasPermission(adminProfile, TAB_PERMISSIONS[tab]),
    ),
    [adminProfile],
  );
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tab");
    if (tabs.includes(param)) setActiveTab(param);
    setHydrated(true);
  }, [tabs]);

  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    if (activeTab === tabs[0]) {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", activeTab);
    }
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [activeTab, hydrated, tabs]);

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
        {tabs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
            <ShieldAlert size={40} className="mx-auto mb-3 text-white/25" />
            <p className="text-white/60">No portal tabs have been shared with your account yet.</p>
            <p className="mt-1 text-sm text-white/40">Ask a Super Admin to grant access in Member Management.</p>
          </div>
        ) : (
          <Tabs tabs={tabs} active={activeTab} setActive={setActiveTab} />
        )}

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "Member Management" && (
            <MemberManagementPanel viewerRole={adminProfile.access_role} />
          )}
          {activeTab === "Resumes" && <ResumesPanel />}
          {activeTab === "CodeRank" && <CodeRankPanel />}
          {activeTab === "Monthly OA" && <OaComplianceView />}
          {activeTab === "Application Tracker" && <ApplicationTrackerPanel />}
          {activeTab === "Fine Tracker" && <FineTrackerPanel />}
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
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  useEffect(() => {
    if (!hasSupabaseConfig) return;

    let isMounted = true;

    async function loadMembers() {
      setLoading(true);
      setError(null);

      const [{ data, error: fetchError }, { data: resumes, error: resumeError }] =
        await Promise.all([
          supabase
            .from("member_profiles")
            .select(
              "id, name, position, pledge_class, member_status, graduation_year, major, photo_url, sort_order",
            )
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          // Resumes live in their own table; RLS returns rows only to holders
          // of resumes.manage (and to a member for their own row).
          supabase.from("member_resumes").select("member_id, url, storage_path"),
        ]);

      if (!isMounted) return;

      if (fetchError || resumeError) {
        setError((fetchError || resumeError).message);
      } else {
        const resumeByMember = new Map((resumes || []).map((row) => [row.member_id, row]));
        setMembers(
          (data || []).map((member) => ({
            ...member,
            resume_url: resumeByMember.get(member.id)?.url || null,
            resume_storage_path: resumeByMember.get(member.id)?.storage_path || null,
          })),
        );
      }

      setLoading(false);
    }

    loadMembers();
    return () => {
      isMounted = false;
    };
  }, []);

  const pledgeClasses = useMemo(() => {
    const classes = new Set();
    members.forEach((m) => {
      if (m.pledge_class) classes.add(m.pledge_class);
    });
    return ["all", ...Array.from(classes).sort()];
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (filterClass !== "all" && m.pledge_class !== filterClass) return false;
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

  const activeWithResume = filtered.filter(
    (m) => m.resume_url && m.member_status !== "Alumni",
  );
  const activeWithoutResume = filtered.filter(
    (m) => !m.resume_url && m.member_status !== "Alumni",
  );
  const alumniList = filtered.filter((m) => m.member_status === "Alumni");

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            placeholder="Search by name, major, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 pl-11 pr-4 py-3 text-white outline-none transition placeholder:text-white/40 focus:border-blue-300"
          />
        </div>

        <SelectMenu
          label="Filter by pledge class"
          value={filterClass}
          onChange={setFilterClass}
          options={pledgeClasses.map((cls) => ({
            value: cls,
            label: cls === "all" ? "All Classes" : cls,
          }))}
          align="right"
          className="shrink-0 sm:w-48"
        />
      </div>

      {/* Stats */}
      <div className="mb-6 flex gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm">
          <Users size={16} className="text-blue-300" />
          <span className="text-white/70">{filtered.length} members</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-2.5 text-sm">
          <FileText size={16} className="text-emerald-300" />
          <span className="text-emerald-200">
            {filtered.filter((m) => m.resume_url).length} resumes uploaded
          </span>
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
                  <Link
                    key={member.id}
                    href={`/admin/members/${member.id}`}
                    className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {/* Avatar */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5">
                      <img
                        src={member.photo_url || "/ktp-icon.png"}
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
                          .join(" · ")}
                      </p>
                    </div>

                    {/* Icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-400/20 group-hover:bg-blue-600/30 transition">
                      <ExternalLink size={16} className="text-blue-300" />
                    </div>
                  </Link>
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
                  <Link
                    key={member.id}
                    href={`/admin/members/${member.id}`}
                    className="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 opacity-60 transition-all duration-200 hover:opacity-100 hover:bg-white/5 hover:border-white/15"
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      <img
                        src={member.photo_url || "/ktp-icon.png"}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{member.name}</p>
                      <p className="text-xs text-white/40 truncate">
                        {[member.member_status, member.pledge_class]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <span className="text-xs text-white/30 shrink-0">
                      No resume
                    </span>
                  </Link>
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

                  return (
                    <Link
                      key={member.id}
                      href={`/admin/members/${member.id}`}
                      className={
                        hasResume
                          ? "group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg"
                          : "group flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 opacity-60 transition-all duration-200 hover:opacity-100 hover:bg-white/5 hover:border-white/15"
                      }
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                        <img
                          src={member.photo_url || "/ktp-icon.png"}
                          alt={member.name}
                          className="h-full w-full object-cover grayscale opacity-80"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-white/80">
                          {member.name}
                        </p>
                        <p className="text-xs text-white/40 truncate">
                          {[member.member_status, member.pledge_class]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      {hasResume ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10 group-hover:bg-white/20 transition">
                          <ExternalLink size={16} className="text-white/60" />
                        </div>
                      ) : (
                        <span className="text-xs text-white/30 shrink-0">
                          No resume
                        </span>
                      )}
                    </Link>
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

  const loadAssessments = useCallback(() => {
    setError(null);
    api("/api/coderank/admin/assessments")
      .then((r) => setAssessments(r.assessments || []))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadAssessments();

    const onVisibility = () => {
      if (document.visibilityState === "visible") loadAssessments();
    };

    window.addEventListener("focus", loadAssessments);
    window.addEventListener("pageshow", loadAssessments);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", loadAssessments);
      window.removeEventListener("pageshow", loadAssessments);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadAssessments]);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1">Coding Assessments</h2>
          <p className="text-white/50 text-sm">
            Build NeetCode-style assessments and monitor member performance.
          </p>
        </div>
        <Link
          href="/admin/coderank/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition"
        >
          <Plus size={16} /> New Assessment
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300/25 bg-red-400/10 px-5 py-4 text-sm text-red-100 mb-4">
          {error}
        </div>
      )}

      {assessments === null && !error && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
        </div>
      )}

      {assessments && assessments.length === 0 && (
        <div className="py-16 text-center rounded-2xl border border-white/10 bg-white/[0.02]">
          <p className="text-white/60 mb-4">No assessments created yet.</p>
          <Link
            href="/admin/coderank/new"
            className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 font-bold"
          >
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
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-400/30">
                        Published
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/15">
                        Draft
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-white/50 line-clamp-1 mb-1">
                      {a.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <ListChecks size={12} />
                      {(a.cr_assessment_questions || []).length} problems
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimeLimit(a.time_limit_minutes)}
                    </span>
                    <span>
                      {(a.cr_assignments || []).length} assignment
                      {(a.cr_assignments || []).length === 1 ? "" : "s"}
                    </span>
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
  return Number(minutes) > 0 ? `${minutes} min` : "No time limit";
}
