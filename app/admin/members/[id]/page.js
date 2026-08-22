"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  FileText,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Save,
  StickyNote,
} from "lucide-react";
import AuthGate from "@/components/authgate";
import useAdminPermission from "@/components/useAdminPermission";
import FadeIn from "@/components/FadeIn";
import { useAuth } from "@/components/authprovider";
import { api } from "@/lib/coderank/clientFetch";
import DatePicker from '@/components/DatePicker';
import SelectMenu from '@/components/SelectMenu';

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

export default function AdminMemberPage() {
  return (
    <AuthGate>
      <AdminMemberReview />
    </AuthGate>
  );
}

function AdminMemberReview() {
  const { user } = useAuth();
  const params = useParams();
  const memberId = params?.id;

  // Reached from Member Management and from Resumes, so either grant opens it.
  const { checking: checkingAccess, allowed: isAuthorized } = useAdminPermission([
    'members.manage',
    'resumes.manage',
  ]);

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
          <p className="text-white/60">
            Your account does not have permission to manage this member.
          </p>
        </FadeIn>
      </main>
    );
  }

  return <MemberDetail memberId={memberId} />;
}

function MemberDetail({ memberId }) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "applications" ? "applications" : "resume",
  );
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!memberId) return;
    let isMounted = true;

    setLoading(true);
    setError(null);

    api(`/api/coderank/admin/members/${memberId}`)
      .then((res) => {
        if (!isMounted) return;
        setMember(res.member);
        setNotes(res.notes?.notes || "");
        setSavedNotes(res.notes?.notes || "");
        setUpdatedAt(res.notes?.updated_at || null);
      })
      .catch((e) => {
        if (isMounted) setError(e.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [memberId]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api(`/api/coderank/admin/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify({ notes }),
      });
      setSavedNotes(res.notes?.notes || "");
      setUpdatedAt(res.notes?.updated_at || null);
      setMessage({ type: "success", text: "Notes saved." });
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Failed to save notes." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </main>
    );
  }

  if (error || !member) {
    return (
      <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
        <FadeIn className="mx-auto w-full max-w-3xl">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition mb-6"
          >
            <ArrowLeft size={16} /> Back to Admin Portal
          </Link>
          <div className="rounded-xl border border-red-300/25 bg-red-400/10 px-5 py-4 text-sm text-red-100">
            {error || "Member not found."}
          </div>
        </FadeIn>
      </main>
    );
  }

  const meta = [
    member.member_status,
    member.pledge_class,
    member.major,
    member.graduation_year,
  ]
    .filter(Boolean)
    .join(" · ");
  const dirty = notes !== savedNotes;
  const formattedUpdatedAt = formatDate(updatedAt);

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      <FadeIn className="mx-auto w-full max-w-3xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition mb-6"
        >
          <ArrowLeft size={16} /> Back to Admin Portal
        </Link>

        {/* Member header */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/5">
              <img
                src={member.photo_url || "/ktp-icon.png"}
                alt={member.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">
                {member.name}
              </h1>
              {meta && <p className="mt-1 text-sm text-white/60">{meta}</p>}
              {member.email && (
                <p className="mt-0.5 text-sm text-white/40 truncate">
                  {member.email}
                </p>
              )}
            </div>

            {/* Resume button */}
            {member.resume_url ? (
              <a
                href={member.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition shrink-0"
              >
                <ExternalLink size={16} /> View Resume
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/40 shrink-0">
                <FileText size={16} /> No resume uploaded
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
          <button
            onClick={() => setActiveTab("resume")}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold ${activeTab === "resume" ? "bg-blue-600" : "text-white/60 hover:bg-white/10"}`}
          >
            Resume
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold ${activeTab === "applications" ? "bg-blue-600" : "text-white/60 hover:bg-white/10"}`}
          >
            Applications
          </button>
        </div>

        {/* Resume notes */}
        {activeTab === "resume" && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:p-8">
            <div className="flex items-center gap-2 mb-1">
              <StickyNote size={20} className="text-amber-300" />
              <h2 className="text-xl font-bold">Resume Notes</h2>
            </div>
            <p className="text-sm text-white/60 mb-5">
              Feedback you write here is visible to{" "}
              {member.name?.split(" ")[0] || "the member"} on their profile
              page.
            </p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={10}
              placeholder="Write your resume review and notes for this member..."
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-blue-300 resize-y"
            />

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Notes"}
              </button>
              {formattedUpdatedAt && (
                <span className="text-xs text-white/40">
                  Last updated {formattedUpdatedAt}
                </span>
              )}
            </div>

            {message && (
              <p
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                    : "border border-red-300/25 bg-red-400/10 text-red-100"
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        )}
        {activeTab === "applications" && (
          <MemberApplications memberId={memberId} />
        )}
      </FadeIn>
    </main>
  );
}

function MemberApplications({ memberId }) {
  const [applications, setApplications] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [chapterRequirements, setChapterRequirements] = useState([]);
  const [defaultTarget, setDefaultTarget] = useState(40);
  const [profileUsesDefault, setProfileUsesDefault] = useState(true);
  const [useBaseline, setUseBaseline] = useState(true);
  const [memberStatus, setMemberStatus] = useState("Active");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [target, setTarget] = useState(40);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingRequirement, setSavingRequirement] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/api/applications/admin/members/${memberId}`)
      .then((result) => {
        if (!active) return;
        setApplications(result.applications || []);
        setRequirements(result.requirements || []);
        setChapterRequirements(result.chapter_requirements || []);
        setDefaultTarget(result.default_target ?? 40);
        setProfileUsesDefault(result.uses_default_application_target ?? true);
        setMemberStatus(result.member_status || "Active");
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [memberId]);

  useEffect(() => {
    const row = requirements.find((item) =>
      item.month_start?.startsWith(month),
    );
    const chapterRow = chapterRequirements.find((item) => item.month_start?.startsWith(month));
    const chapterDefault = chapterRow?.default_target ?? 40;
    const noRequirement = ["Inactive", "Alumni"].includes(memberStatus);
    const baselineTarget = noRequirement ? 0 : profileUsesDefault ? chapterDefault : defaultTarget;
    setUseBaseline(!row);
    setTarget(row?.target_count ?? baselineTarget);
    setReason(row?.exemption_reason || "");
  }, [requirements, chapterRequirements, month, defaultTarget, profileUsesDefault, memberStatus]);

  async function saveRequirement() {
    setSavingRequirement(true);
    setError("");
    setMessage("");
    try {
      const result = await api(`/api/applications/admin/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify({
          month,
          target_count: Number(target),
          use_baseline: useBaseline,
          exemption_reason: reason,
        }),
      });
      setRequirements((current) => result.requirement
        ? [result.requirement, ...current.filter((item) => item.month_start !== result.requirement.month_start)]
        : current.filter((item) => !item.month_start?.startsWith(month)));
      setMessage("Monthly requirement saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingRequirement(false);
    }
  }

  const monthApps = applications.filter((app) =>
    app.date_applied.startsWith(month),
  );
  const year = month.slice(0, 4);
  const yearCount = applications.filter((app) =>
    app.date_applied.startsWith(year),
  ).length;
  const selectedChapterDefault = chapterRequirements.find((item) => item.month_start?.startsWith(month))?.default_target ?? 40;
  const noRequirement = ["Inactive", "Alumni"].includes(memberStatus);
  const baselineTarget = noRequirement ? 0 : profileUsesDefault ? selectedChapterDefault : defaultTarget;

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        <div className="mb-5 flex items-center gap-2">
          <BriefcaseBusiness className="text-blue-300" />
          <h2 className="text-xl font-bold">Application Requirement</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-white/70">
            Month
            <DatePicker mode="month" label="Month" value={month} onChange={setMonth} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/70">
            Requirement mode
            <SelectMenu
              label="Requirement mode"
              value={useBaseline ? "baseline" : "override"}
              disabled={noRequirement}
              onChange={(value) => {
                const nextBaseline = value === "baseline";
                setUseBaseline(nextBaseline);
                if (nextBaseline) setTarget(baselineTarget);
              }}
              options={[
                { value: "baseline", label: `Use member baseline (${baselineTarget})` },
                { value: "override", label: "Override for this month" },
              ]}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/70">
            Target
            <input
              type="number"
              min="0"
              max="1000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={useBaseline || noRequirement}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 disabled:opacity-40"
            />
          </label>
          <p className="text-xs text-white/45 sm:col-span-2">Monthly overrides apply only to the selected month. Resetting to the member baseline makes this month follow future baseline changes.</p>
          <label className="grid gap-2 text-sm font-semibold text-white/70 sm:col-span-2">
            Member-visible explanation
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"
              placeholder="Offer accepted or requirement adjusted after discussion..."
            />
          </label>
        </div>
        <button
          onClick={saveRequirement}
          disabled={savingRequirement}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500 disabled:opacity-50"
        >
          <Save size={17} />
          {savingRequirement ? "Saving..." : "Save Requirement"}
        </button>
        {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </section>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="This month" value={monthApps.length} />
        <MiniStat label={`${year} total`} value={yearCount} />
        <MiniStat label="All time" value={applications.length} />
      </div>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/45">
                <tr>
                  <th className="p-4">Company</th>
                  <th className="p-4">Position</th>
                  <th className="p-4">Date applied</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Referral</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-t border-white/5">
                    <td className="p-4 font-bold">{app.company}</td>
                    <td className="p-4 text-white/70">{app.position}</td>
                    <td className="p-4 text-white/55">
                      {new Date(
                        `${app.date_applied}T12:00:00`,
                      ).toLocaleDateString()}
                    </td>
                    <td className="p-4 capitalize">{app.status}</td>
                    <td className="p-4">{app.referral ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {applications.length === 0 && (
              <p className="p-12 text-center text-white/45">
                No applications recorded yet.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
