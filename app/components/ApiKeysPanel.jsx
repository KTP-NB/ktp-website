'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '@/lib/coderank/clientFetch';

function readableDate(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';
}

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('Personal workflow');
  const [read, setRead] = useState(true);
  const [write, setWrite] = useState(true);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const result = await api('/api/applications/keys');
      setKeys(result.keys || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await api('/api/applications/keys', {
        method: 'POST',
        body: JSON.stringify({
          name,
          scopes: [read && 'applications:read', write && 'applications:write'].filter(Boolean),
        }),
      });
      setKeys((current) => [result.key, ...current]);
      setToken(result.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function revoke(key) {
    if (!window.confirm(`Revoke “${key.name}”? Any workflow using it will stop immediately.`)) return;
    try {
      await api(`/api/applications/keys/${key.id}`, { method: 'DELETE' });
      setKeys((current) => current.map((item) => item.id === key.id ? { ...item, revoked_at: new Date().toISOString() } : item));
    } catch (e) {
      setError(e.message);
    }
  }

  async function copyToken() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        <div className="mb-2 flex items-center gap-3"><ShieldCheck className="text-blue-300" /><h2 className="text-xl font-bold">API & Integrations</h2></div>
        <p className="mb-6 max-w-3xl text-sm text-white/60">Create a personal key for your own scripts, Codex, Claude, or a future KTP MCP. A key can access only your applications and stops working if your membership becomes inactive.</p>
        <form onSubmit={create} className="grid gap-4 rounded-xl border border-white/10 bg-black/10 p-4 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold">Key name<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3" /></label>
          <div className="flex flex-wrap items-end gap-4 pb-3 text-sm">
            <label className="flex gap-2"><input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} /> Read</label>
            <label className="flex gap-2"><input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} /> Write</label>
          </div>
          <button disabled={saving || (!read && !write)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold disabled:opacity-50 sm:col-span-2"><Plus size={17} />{saving ? 'Creating…' : 'Create API key'}</button>
        </form>
        {token && <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-400/10 p-4">
          <p className="font-bold text-amber-100">Copy this key now—it will never be shown again.</p>
          <div className="mt-3 flex gap-2"><input readOnly value={token} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg bg-black/30 px-3 py-2 font-mono text-sm" /><button type="button" onClick={copyToken} className="rounded-lg border border-white/15 px-4">{copied ? <Check size={17} /> : <Copy size={17} />}</button></div>
        </div>}
        {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 p-5"><h3 className="font-bold">Your API keys</h3></div>
        {loading ? <Loader2 className="mx-auto my-10 animate-spin" /> : keys.length ? keys.map((key) => <div key={key.id} className="flex flex-col gap-3 border-b border-white/5 p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><KeyRound className="mt-1 shrink-0 text-blue-300" size={19} /><div><p className="font-bold">{key.name}</p><p className="font-mono text-xs text-white/45">{key.key_prefix}••••••••</p><p className="mt-1 text-xs text-white/45">Scopes: {(key.scopes || []).join(', ')} · Last used: {readableDate(key.last_used_at)}</p></div></div>
          {key.revoked_at ? <span className="text-sm font-bold text-white/35">Revoked</span> : <button type="button" onClick={() => revoke(key)} className="inline-flex items-center gap-2 self-start rounded-lg border border-red-300/20 px-3 py-2 text-sm font-bold text-red-300"><Trash2 size={15} /> Revoke</button>}
        </div>) : <p className="p-8 text-center text-white/45">No API keys yet.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        <h3 className="font-bold">Quick start</h3>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-black/35 p-4 text-xs text-blue-100"><code>{`curl -X POST ${typeof window === 'undefined' ? 'https://www.ktpnewbrunswick.org' : window.location.origin}/api/v1/applications \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"company":"Example","position":"Software Engineer Intern","external_id":"unique-source-id"}'`}</code></pre>
        <p className="mt-3 text-xs text-white/50">Company and position are required. Date defaults to today and status defaults to applied. Use a stable external_id to make retries duplicate-safe. Maximum 50 applications per request and 120 API operations per hour.</p>
      </section>
    </div>
  );
}
