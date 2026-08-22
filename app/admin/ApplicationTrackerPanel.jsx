"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  Loader2,
  Search,
  Target,
  TriangleAlert,
  UserRoundX,
} from "lucide-react";
import { api } from "@/lib/coderank/clientFetch";
import SelectMenu from "@/components/SelectMenu";
import DatePicker from "@/components/DatePicker";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function progressState(member, paceFraction) {
  const status = (member.member_status || "").trim().toLowerCase();
  if (status !== "active" || member.target <= 0) return "no-requirement";
  if (member.met) return "met";
  if (paceFraction !== null && member.count >= Math.ceil(member.target * paceFraction)) return "on-track";
  return "behind";
}

export default function ApplicationTrackerPanel() {
  const [month, setMonth] = useState(currentMonth());
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api(`/api/applications/admin/overview?month=${month}`)
      .then((result) => {
        if (active) setMembers(result.members || []);
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
  }, [month]);

  const today = new Date();
  const selectedMonth = new Date(`${month}-01T12:00:00`);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const selectedMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const paceFraction = selectedMonthStart < currentMonthStart
    ? 1
    : selectedMonthStart > currentMonthStart
      ? null
      : today.getDate() / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const filtered = useMemo(
    () =>
      members
        .filter((member) => {
          if (filter !== "all" && progressState(member, paceFraction) !== filter) return false;
          return (
            !search ||
            `${member.name} ${member.pledge_class || ""}`
              .toLowerCase()
              .includes(search.toLowerCase())
          );
        })
        .sort(
          (a, b) =>
            a.met - b.met ||
            b.target - b.count - (a.target - a.count) ||
            a.name.localeCompare(b.name),
        ),
    [members, search, filter, paceFraction],
  );
  const active = members.filter((m) => {
    const status = (m.member_status || "").trim().toLowerCase();
    return status === "active";
  });
  const required = active.filter((m) => m.target > 0);
  const noRequirement = members.filter((m) => {
    const status = (m.member_status || "").trim().toLowerCase();
    return status !== "active" || m.target <= 0;
  });
  const met = required.filter((m) => m.met).length;
  const onTrack = required.filter(
    (m) => progressState(m, paceFraction) === "on-track",
  ).length;
  const behind = required.length - met - onTrack;
  const noApplications = required.filter((m) => m.count === 0).length;
  const completionRates = required
    .map((m) => Math.min(100, (m.count / m.target) * 100))
    .sort((a, b) => a - b);
  const averageCompletion = completionRates.length
    ? Math.round(completionRates.reduce((sum, value) => sum + value, 0) / completionRates.length)
    : 0;
  const medianApplications = required.length
    ? [...required.map((m) => m.count)].sort((a, b) => a - b)[Math.floor(required.length / 2)]
    : 0;
  const interviewingOrOffer = required.filter((m) => m.interviews > 0 || m.offers > 0).length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Application Tracker</h2>
          <p className="mt-1 text-sm text-white/50">
            Monitor monthly requirements and member progress.
          </p>
        </div>
        <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-white/50">
          Reporting month
          <DatePicker mode="month" label="Reporting month" value={month} onChange={setMonth} className="w-52" />
        </label>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card icon={CheckCircle2} label="Requirements met" value={`${met} of ${required.length}`} />
        <Card icon={CircleGauge} label="On track" value={onTrack} />
        <Card icon={TriangleAlert} label="Behind pace" value={behind} />
        <Card icon={UserRoundX} label="No applications" value={noApplications} />
        <Card icon={Ban} label="No application requirement" value={noRequirement.length} />
        <Card icon={BarChart3} label="Average completion" value={`${averageCompletion}%`} />
        <Card icon={Target} label="Median applications" value={medianApplications} />
        <Card icon={Target} label="Interviewing or offer" value={interviewingOrOffer} />
      </div>
      <p className="mb-5 text-xs text-white/45">
        {paceFraction === null
          ? "Future reporting months do not have an on-track pace yet."
          : selectedMonthStart < currentMonthStart
            ? "Completed months are classified as Requirement Met or Behind; On Track applies to the current month."
            : `On track means completing at least ${Math.round(paceFraction * 100)}% of the monthly requirement by today (${today.toLocaleDateString(undefined, { month: "short", day: "numeric" })}).`}
      </p>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members"
            className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3 outline-none focus:border-blue-300"
          />
        </div>
        <SelectMenu
          label="Filter members"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All members" },
            { value: "behind", label: "Behind" },
            { value: "on-track", label: "On track" },
            { value: "met", label: "Requirement met" },
            { value: "no-requirement", label: "No application requirement" },
          ]}
          className="sm:w-60"
        />
      </div>
      {error && (
        <p className="rounded-xl border border-red-300/25 bg-red-400/10 p-4 text-sm text-red-100">
          {error}
        </p>
      )}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="p-4">Member</th>
                <th className="p-4">Requirement</th>
                <th className="p-4">Submitted</th>
                <th className="p-4">Remaining</th>
                <th className="p-4">Progress</th>
                <th className="p-4">Offers</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => {
                const status = (member.member_status || "").trim().toLowerCase();
                const hasRequirement = status === "active" && member.target > 0;
                const state = progressState(member, paceFraction);
                const remaining = Math.max(0, member.target - member.count);
                const pct = hasRequirement ? Math.min(100, Math.round((member.count / member.target) * 100)) : 0;
                const progressLabel = state === "met" ? "Met" : state === "on-track" ? "On Track" : "Behind";
                const progressText = state === "met" ? "text-emerald-300" : state === "on-track" ? "text-blue-300" : "text-amber-300";
                const progressBar = state === "met" ? "bg-emerald-400" : state === "on-track" ? "bg-blue-400" : "bg-amber-400";
                return (
                  <tr
                    key={member.id}
                    className="border-t border-white/5 hover:bg-white/[0.04]"
                  >
                    <td className="p-4">
                      <Link
                        href={`/admin/members/${member.id}?tab=applications`}
                        className="flex items-center gap-3 font-bold hover:text-blue-300"
                      >
                        <img
                          src={member.photo_url || "/ktp-icon.png"}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                        <span>
                          {member.name}
                          <small className="block font-normal text-white/40">
                            {member.pledge_class || "No class"}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td className="p-4">
                      {hasRequirement ? member.target : "—"}
                    </td>
                    <td className="p-4 font-bold">{member.count}</td>
                    <td className="p-4">{hasRequirement ? remaining : "—"}</td>
                    <td className="p-4">
                      {hasRequirement ? <div className="w-32">
                        <div className="mb-1 flex justify-between text-xs">
                          <span
                            className={progressText}
                          >
                            {progressLabel}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${progressBar}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div> : <span className="text-xs font-semibold text-white/45">No requirement</span>}
                    </td>
                    <td className="p-4">{member.offers}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-12 text-center text-white/45">
              No members match this view.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <Icon size={18} className="mb-3 text-blue-300" />
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-white/45">{label}</p>
    </div>
  );
}
