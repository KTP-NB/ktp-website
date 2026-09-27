'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/coderank/clientFetch';

export default function AccessRolesPanel() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [saved, setSaved] = useState({});
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function applySnapshot(result) {
    setRoles(result.roles || []);
    setPermissions(result.permissions || []);
    setSaved(result.assignments || {});
    setDrafts(result.assignments || {});
  }

  useEffect(() => {
    api('/api/admin/access-roles')
      .then(applySnapshot)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => [...new Set(permissions.map((permission) => permission.category))],
    [permissions],
  );

  function toggle(roleKey, permissionKey) {
    setDrafts((current) => {
      const values = current[roleKey] || [];
      return {
        ...current,
        [roleKey]: values.includes(permissionKey)
          ? values.filter((value) => value !== permissionKey)
          : [...values, permissionKey],
      };
    });
    setNotice('');
  }

  function dirty(roleKey) {
    return JSON.stringify([...(drafts[roleKey] || [])].sort())
      !== JSON.stringify([...(saved[roleKey] || [])].sort());
  }

  async function save(role) {
    setSavingRole(role.role_key);
    setError('');
    setNotice('');
    try {
      const result = await api('/api/admin/access-roles', {
        method: 'PUT',
        body: JSON.stringify({ role_key: role.role_key, permissions: drafts[role.role_key] || [] }),
      });
      applySnapshot(result);
      setNotice(`${role.label} permissions saved. Signed-in members receive the change after their next browser refresh.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingRole(null);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-black">Access Roles &amp; Permissions</h2>
        <p className="mt-1 text-sm text-white/55">
          Configure the default capabilities inherited by everyone in each role. Super Admin is immutable.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4 text-sm text-blue-100">
        Role permissions are the baseline. Additional admin-tab permissions granted to an individual in Member Management remain additive overrides.
      </div>
      {error && <p className="mb-5 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
      {notice && <p className="mb-5 rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}

      <div className="space-y-5">
        {roles.map((role) => {
          const immutable = !role.editable;
          return (
            <article key={role.role_key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black">{role.label}</h3>
                    {immutable && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-200"><ShieldCheck size={13} /> Protected</span>}
                  </div>
                  <p className="mt-1 text-sm text-white/50">{role.description}</p>
                  <p className="mt-1 text-xs text-white/35">Default public directory visibility: {role.default_public_directory_visible ? 'Visible' : 'Hidden'}</p>
                </div>
                {!immutable && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!dirty(role.role_key) || savingRole === role.role_key}
                      onClick={() => setDrafts((current) => ({ ...current, [role.role_key]: [...(saved[role.role_key] || [])] }))}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-35"
                    >
                      <RotateCcw size={15} /> Reset
                    </button>
                    <button
                      type="button"
                      disabled={!dirty(role.role_key) || savingRole === role.role_key}
                      onClick={() => save(role)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500 disabled:opacity-35"
                    >
                      {savingRole === role.role_key ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {categories.map((category) => (
                  <div key={category} className="rounded-xl border border-white/10 p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-wider text-white/45">{category}</p>
                    <div className="space-y-2">
                      {permissions.filter((permission) => permission.category === category).map((permission) => {
                        const checked = (drafts[role.role_key] || []).includes(permission.permission_key);
                        const disabled = immutable || !permission.editable;
                        return (
                          <label key={permission.permission_key} className={`flex items-start gap-3 rounded-xl p-3 transition ${disabled ? 'opacity-65' : 'cursor-pointer hover:bg-white/5'}`}>
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-blue-400 bg-blue-600' : 'border-white/25 bg-white/5'}`}>
                              {checked && <Check size={14} />}
                            </span>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggle(role.role_key, permission.permission_key)}
                            />
                            <span>
                              <span className="block text-sm font-bold">{permission.label}</span>
                              <span className="block text-xs leading-relaxed text-white/45">{permission.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
