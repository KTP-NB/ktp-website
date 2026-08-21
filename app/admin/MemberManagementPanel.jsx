"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "@/lib/coderank/clientFetch";

const SCOPES = [
  ["members.manage", "Member management"],
  ["resumes.manage", "Resumes"],
  ["coderank.manage", "CodeRank"],
  ["applications.manage", "Applications"],
];
const empty = {
  name: "",
  email: "",
  position: "",
  pledge_class: "",
  member_status: "Active",
  graduation_year: "",
  major: "",
  minors: "",
  linkedin_url: "",
  access_role: "member",
  manager_permissions: [],
  current_application_target: 40,
  uses_default_application_target: true,
};

function formatRole(value) {
  return { member: "Member", manager: "Manager", admin: "Admin", super_admin: "Super Admin" }[value] || "Member";
}

function formatPosition(value) {
  if (!value) return "Member";
  const lowercase = new Set(["of", "and", "the", "for"]);
  return value.trim().split(/\s+/).map((word, index) => {
    if (/^(vp|ktp)$/i.test(word)) return word.toUpperCase();
    if (index > 0 && lowercase.has(word.toLowerCase())) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

export default function MemberManagementPanel({ viewerRole }) {
  const [members, setMembers] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("Active"),
    [pledgeClass, setPledgeClass] = useState("All"),
    [accessRole, setAccessRole] = useState("All"),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState(empty),
    [saving, setSaving] = useState(false),
    [adding, setAdding] = useState(false),
    [inviteOpen, setInviteOpen] = useState(false),
    [chapterDefault, setChapterDefault] = useState(40);
  const load = () => {
    setLoading(true);
    api("/api/admin/members")
      .then((r) => {
        setMembers(r.members || []);
        setChapterDefault(r.chapterDefault ?? 40);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const pledgeClasses = useMemo(
    () => [...new Set(members.map((m) => m.pledge_class).filter(Boolean))].sort(),
    [members],
  );
  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          (status === "All" || m.member_status === status) &&
          (pledgeClass === "All" || m.pledge_class === pledgeClass) &&
          (accessRole === "All" || m.access_role === accessRole) &&
          (!search ||
            `${m.name} ${m.email || ""} ${m.pledge_class || ""}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [members, status, pledgeClass, accessRole, search],
  );
  function open(m) {
    setEditing(m);
    setForm({
      ...empty,
      ...m,
      manager_permissions: m.manager_permissions || [],
    });
  }
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const r = await api(`/api/admin/members/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setMembers((v) => v.map((m) => (m.id === r.member.id ? r.member : m)));
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function add(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api("/api/admin/members", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMembers((v) =>
        [...v, r.member].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setAdding(false);
      setForm(empty);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(member) {
    if (!window.confirm(`Are you sure you want to remove ${member.name}? This permanently removes their account and associated tracker data.`)) return;
    setError("");
    try {
      await api(`/api/admin/members/${member.id}`, { method: "DELETE" });
      setMembers((current) => current.filter((item) => item.id !== member.id));
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Member Management</h2>
          <p className="text-white/55">
            Profiles, membership status, and access control.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-xl border border-white/15 px-4 py-2.5 font-bold hover:bg-white/10"
          >
            Create invite link
          </button>
          <button
            onClick={() => {
              setForm(empty);
              setAdding(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold"
          >
            <Plus size={17} />
            Add member
          </button>
        </div>
      </div>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(300px,1fr)_auto_auto_auto]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 text-white/40" size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members"
            className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-3"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-white/15 bg-slate-900 px-4"
        >
          {["Active", "Inactive", "Alumni", "All"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select value={pledgeClass} onChange={(e) => setPledgeClass(e.target.value)} aria-label="Filter by pledge class" className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3">
          <option value="All">All classes</option>
          {pledgeClasses.map((value) => <option key={value} value={value}>{value} Class</option>)}
        </select>
        <select value={accessRole} onChange={(e) => setAccessRole(e.target.value)} aria-label="Filter by access role" className="rounded-xl border border-white/15 bg-slate-900 px-4 py-3">
          <option value="All">All access roles</option>
          {["member","manager","admin","super_admin"].map((value) => <option key={value} value={value}>{formatRole(value)}</option>)}
        </select>
      </div>
      <p className="mb-4 text-sm font-semibold text-white/60">
        Showing <span className="text-white">{filtered.length}</span> of {members.length} members
      </p>
      {error && (
        <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-red-200">
          {error}
        </p>
      )}
      {loading ? (
        <Loader2 className="mx-auto my-16 animate-spin" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-white/45">
              <tr>
                <th className="p-4">Member</th>
                <th>Status</th>
                <th>Class</th>
                <th>Position</th>
                <th>Requirement</th>
                <th>Access</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={m.photo_url || "/ktp-icon.png"} alt="" className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover" />
                      <div><b>{m.name}</b><small className="block text-white/40">{m.email}</small></div>
                    </div>
                  </td>
                  <td>{m.member_status}</td>
                  <td>{m.pledge_class || "—"}</td>
                  <td>{formatPosition(m.position)}</td>
                  <td>
                    {m.current_application_target ?? 40}
                    {m.member_status === "Active" && (
                      <small className="block text-white/40">
                        {m.uses_default_application_target ? "Chapter default" : "Custom"}
                      </small>
                    )}
                  </td>
                  <td>{formatRole(m.access_role)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2"><button onClick={() => open(m)} className="rounded-lg border border-white/15 px-3 py-2 font-bold hover:bg-white/10">Edit</button>
                    {viewerRole === "super_admin" && <button onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="rounded-lg border border-red-300/20 p-2.5 text-red-300 hover:bg-red-500/10"><Trash2 size={16}/></button>}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(editing || adding) && (
        <MemberModal
          title={adding ? "Add member and send invite" : "Edit member"}
          form={form}
          setForm={setForm}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSubmit={adding ? add : save}
          saving={saving}
          canRoles={viewerRole === "super_admin"}
          inviteMode={adding}
          chapterDefault={chapterDefault}
        />
      )}{" "}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

function MemberModal({
  title,
  form,
  setForm,
  onClose,
  onSubmit,
  saving,
  canRoles,
  inviteMode,
  chapterDefault,
}) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-6"
      >
        <div className="mb-5 flex justify-between">
          <h2 className="text-2xl font-black">{title}</h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["name", "Full name"],
            ["email", "Email"],
            ["position", "Position"],
            ["pledge_class", "Pledge class"],
            ["graduation_year", "Graduation year"],
            ["major", "Major"],
            ["minors", "Minor(s)"],
            ["linkedin_url", "LinkedIn URL"],
          ].map(([k, l]) => (
            <label key={k} className="grid gap-1 text-sm font-bold">
              {l}
              <input
                required={["name", "email"].includes(k)}
                disabled={!inviteMode && k === "email"}
                value={form[k] || ""}
                onChange={(e) => set(k, e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 disabled:opacity-50"
              />
            </label>
          ))}
          {!inviteMode && (
            <>
            <label className="grid gap-1 text-sm font-bold">
              Member status
              <select
                value={form.member_status}
                onChange={(e) => {
                  const nextStatus = e.target.value;
                  setForm((current) => ({
                    ...current,
                    member_status: nextStatus,
                    current_application_target: ["Inactive", "Alumni"].includes(nextStatus)
                      ? 0
                      : current.current_application_target,
                  }));
                }}
                className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
              >
                {["Active", "Inactive", "Alumni"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Requirement mode
              <select
                value={form.uses_default_application_target ? "default" : "custom"}
                disabled={["Inactive", "Alumni"].includes(form.member_status)}
                onChange={(e) => setForm((current) => ({
                  ...current,
                  uses_default_application_target: e.target.value === "default",
                  current_application_target: e.target.value === "default"
                    ? chapterDefault
                    : current.current_application_target,
                }))}
                className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 disabled:opacity-50"
              >
                <option value="default">Use chapter default ({chapterDefault})</option>
                <option value="custom">Custom requirement</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Monthly application requirement
              <input type="number" min="0" max="1000" value={form.uses_default_application_target ? chapterDefault : form.current_application_target}
                onChange={(e) => set("current_application_target", Number(e.target.value))}
                disabled={form.uses_default_application_target || ["Inactive", "Alumni"].includes(form.member_status)}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 disabled:opacity-50" />
            </label>
            </>
          )}
          {canRoles && !inviteMode && (
            <>
              <label className="grid gap-1 text-sm font-bold">
                Access role
                <select
                  value={form.access_role}
                  onChange={(e) => set("access_role", e.target.value)}
                  className="rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5"
                >
                  {["member", "manager", "admin", "super_admin"].map((x) => (
                    <option key={x} value={x}>
                      {formatRole(x)}
                    </option>
                  ))}
                </select>
              </label>
              {form.access_role === "manager" && (
                <div className="sm:col-span-2 rounded-xl border border-white/10 p-4">
                  <p className="mb-2 font-bold">Manager permissions</p>
                  {SCOPES.map(([v, l]) => (
                    <label key={v} className="mr-5 inline-flex gap-2">
                      <input
                        type="checkbox"
                        checked={form.manager_permissions.includes(v)}
                        onChange={(e) =>
                          set(
                            "manager_permissions",
                            e.target.checked
                              ? [...form.manager_permissions, v]
                              : form.manager_permissions.filter((x) => x !== v),
                          )
                        }
                      />
                      {l}
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-5 py-3"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold"
          >
            {saving
              ? "Saving…"
              : inviteMode
                ? "Send invitation"
                : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InviteModal({ onClose }) {
  const [form, setForm] = useState({
      label: "New member class",
      pledge_class: "",
      default_application_target: 40,
      expires_at: "",
      max_uses: 50,
      allowed_emails: "",
    }),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api("/api/admin/invites", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setUrl(r.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-950 p-6"
      >
        <div className="flex justify-between">
          <h2 className="text-2xl font-black">Create cohort invite</h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        {url ? (
          <>
            <p className="mt-5 text-white/60">
              Copy this link now. For security, the token is not stored in
              readable form.
            </p>
            <input
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="mt-3 w-full rounded-xl bg-white/10 p-3"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(url)}
              className="mt-3 rounded-xl bg-blue-600 px-5 py-3 font-bold"
            >
              Copy link
            </button>
          </>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["label", "Label"],
              ["pledge_class", "Pledge class"],
              ["default_application_target", "Monthly target"],
              ["expires_at", "Expires"],
              ["max_uses", "Maximum uses"],
            ].map(([k, l]) => (
              <label key={k} className="grid gap-1 text-sm font-bold">
                {l}
                <input
                  required={!["pledge_class"].includes(k)}
                  type={
                    k === "expires_at"
                      ? "datetime-local"
                      : k.includes("target") || k === "max_uses"
                        ? "number"
                        : "text"
                  }
                  value={form[k]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [k]: e.target.value }))
                  }
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 [color-scheme:dark]"
                />
              </label>
            ))}
            <label className="grid gap-1 text-sm font-bold sm:col-span-2">
              Approved emails (recommended)
              <textarea
                rows="4"
                value={form.allowed_emails}
                onChange={(e) =>
                  setForm((f) => ({ ...f, allowed_emails: e.target.value }))
                }
                placeholder="One per line or comma-separated"
                className="rounded-xl border border-white/15 bg-white/5 p-3"
              />
            </label>
            {error && <p className="text-red-300 sm:col-span-2">{error}</p>}
            <button
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold sm:col-span-2"
            >
              {saving ? "Creating…" : "Create secure link"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
