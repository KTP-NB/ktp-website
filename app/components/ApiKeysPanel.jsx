'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '@/lib/coderank/clientFetch';

function readableDate(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';
}

function CodeBlock({ children }) {
  const [wasCopied, setWasCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(children);
    setWasCopied(true);
    setTimeout(() => setWasCopied(false), 1500);
  }
  return <div className="relative mt-3">
    <pre className="overflow-x-auto rounded-xl bg-black/35 p-4 pr-12 text-xs leading-6 text-blue-100"><code>{children}</code></pre>
    <button type="button" onClick={copy} aria-label="Copy example" className="absolute right-3 top-3 rounded-lg border border-white/10 bg-slate-950/80 p-2 text-white/65 hover:text-white">{wasCopied ? <Check size={14} /> : <Copy size={14} />}</button>
  </div>;
}

function DocSection({ title, children, open = false }) {
  return <details open={open} className="group border-b border-white/10 last:border-0">
    <summary className="cursor-pointer list-none px-5 py-4 font-bold marker:content-none"><span className="mr-2 inline-block text-blue-300 transition group-open:rotate-90">›</span>{title}</summary>
    <div className="px-5 pb-6 text-sm text-white/65">{children}</div>
  </details>;
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
  const [origin, setOrigin] = useState('https://www.ktpnewbrunswick.org');

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
  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

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
        <p className="mb-6 max-w-3xl text-sm text-white/60">Create a personal key for your own scripts, Codex, Claude, or the KTP MCP. A key can access only your applications and stops working if your membership becomes inactive.</p>
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

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 p-6 md:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-bold">Application API and MCP documentation</h3>
            <a href="/docs/ktp-application-api.md" download="KTP-Application-API.md" className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10 sm:self-auto">
              <Download size={16} /> Download documentation
            </a>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-white/60">Everything needed to connect a script, automation, or AI workflow. Every endpoint operates only on the member who owns the API key.</p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-black/15 p-3"><span className="block text-xs uppercase text-white/40">Base URL</span><code className="break-all text-blue-200">{origin}/api/v1</code></div>
            <div className="rounded-xl bg-black/15 p-3"><span className="block text-xs uppercase text-white/40">Batch limit</span><b>50 applications</b></div>
            <div className="rounded-xl bg-black/15 p-3"><span className="block text-xs uppercase text-white/40">Rate limit</span><b>120 operations/hour</b></div>
          </div>
        </div>

        <DocSection title="1. Authentication and key safety" open>
          <p>Send the key in the <code className="text-blue-200">Authorization</code> header on every request. Never place it in a URL, commit it to Git, or share it with another member. Revoking a key disables it immediately.</p>
          <CodeBlock>{`Authorization: Bearer ktp_live_YOUR_KEY`}</CodeBlock>
          <p className="mt-3"><b className="text-white">Read</b> permits GET requests. <b className="text-white">Write</b> permits POST and PATCH requests. Inactive and alumni accounts cannot use API keys.</p>
          <p className="mt-4 font-semibold text-white">Use an environment variable with Codex or Claude</p>
          <p className="mt-1">Set the key in the terminal that launches your agent. This lets its commands authenticate without putting the secret in your prompt or source code.</p>
          <CodeBlock>{`# PowerShell — current terminal session
$secureKey = Read-Host "Paste API key" -AsSecureString
$env:KTP_API_KEY = [System.Net.NetworkCredential]::new("", $secureKey).Password
$env:KTP_API_BASE_URL = "${origin}/api/v1"

# Then launch Codex or Claude from this terminal.`}</CodeBlock>
          <p className="mt-3 text-xs">For a reusable script, use a private <code>.env</code> file excluded by <code>.gitignore</code>. Never upload or commit that file. The downloadable guide includes PowerShell, macOS/Linux, and <code>.env</code> instructions.</p>
        </DocSection>

        <DocSection title="2. Supported endpoints">
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="text-xs uppercase text-white/40"><tr><th className="pb-3">Method</th><th>Endpoint</th><th>Scope</th><th>Purpose</th></tr></thead><tbody className="divide-y divide-white/5">
            {[
              ['GET','/me','Read','Confirm the key and member identity'],
              ['GET','/applications','Read','List and filter your applications'],
              ['POST','/applications','Write','Add one or up to 50 applications'],
              ['GET','/applications/{id}','Read','Retrieve one application'],
              ['PATCH','/applications/{id}','Write','Update one application'],
            ].map((row) => <tr key={`${row[0]}${row[1]}`}><td className="py-3 font-bold text-blue-300">{row[0]}</td><td><code>{row[1]}</code></td><td>{row[2]}</td><td>{row[3]}</td></tr>)}
          </tbody></table></div>
          <p className="mt-3 text-xs">API deletion is intentionally unavailable. Delete an application from the website when necessary.</p>
        </DocSection>

        <DocSection title="3. Application fields and statuses">
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="text-xs uppercase text-white/40"><tr><th className="pb-3">Field</th><th>Required</th><th>Default</th><th>Description</th></tr></thead><tbody className="divide-y divide-white/5">
            {[
              ['company','Yes','—','Company name, up to 160 characters'],
              ['position','Yes','—','Position title, up to 200 characters'],
              ['date_applied','No','Today','Original application date in YYYY-MM-DD format'],
              ['status','No','applied','Current tracking status'],
              ['details','No','null','Notes, up to 5,000 characters'],
              ['application_url','No','null','An http:// or https:// URL'],
              ['referral','No','false','Whether a referral was used'],
              ['referral_contact','No','null','Referral contact, up to 200 characters'],
              ['external_id','No','null','Stable source ID used to prevent duplicates'],
            ].map((row) => <tr key={row[0]}><td className="py-3"><code className="text-blue-200">{row[0]}</code></td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td></tr>)}
          </tbody></table></div>
          <p className="mt-4">Statuses: <code className="text-blue-200">applied</code>, <code className="text-blue-200">assessment</code>, <code className="text-blue-200">interviewing</code>, <code className="text-blue-200">rejected</code>, <code className="text-blue-200">offer</code>, and <code className="text-blue-200">withdrawn</code>.</p>
        </DocSection>

        <DocSection title="4. Check your connection">
          <CodeBlock>{`curl ${origin}/api/v1/me \\
  -H "Authorization: Bearer YOUR_KEY"`}</CodeBlock>
          <p className="mt-4 font-semibold text-white">PowerShell</p>
          <CodeBlock>{`$secureKey = Read-Host "Paste API key" -AsSecureString
$ktpApiKey = [System.Net.NetworkCredential]::new("", $secureKey).Password

Invoke-RestMethod \
  -Uri "${origin}/api/v1/me" \
  -Headers @{ Authorization = "Bearer $ktpApiKey" }`}</CodeBlock>
        </DocSection>

        <DocSection title="5. Add one application">
          <CodeBlock>{`curl -X POST ${origin}/api/v1/applications \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"company":"Example Company","position":"Software Engineering Intern","date_applied":"2026-09-03","status":"applied","external_id":"gmail-message-id"}'`}</CodeBlock>
          <p className="mt-3">A successful response has <code className="text-blue-200">created: 1</code> and includes the saved application.</p>
        </DocSection>

        <DocSection title="6. Add multiple applications">
          <CodeBlock>{`curl -X POST ${origin}/api/v1/applications \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"applications":[
    {"company":"Company One","position":"Data Intern","external_id":"email-001"},
    {"company":"Company Two","position":"Product Intern","external_id":"email-002"}
  ]}'`}</CodeBlock>
          <p className="mt-3">Each row receives <code className="text-blue-200">created</code>, <code className="text-blue-200">duplicate</code>, or <code className="text-blue-200">invalid</code>. Valid rows still save when another row is invalid.</p>
        </DocSection>

        <DocSection title="7. List and filter applications">
          <CodeBlock>{`# Paginated list (1-100 rows per page)
curl "${origin}/api/v1/applications?page=1&limit=50" \\
  -H "Authorization: Bearer YOUR_KEY"

# Filter by month and status
curl "${origin}/api/v1/applications?month=2026-09&status=interviewing" \\
  -H "Authorization: Bearer YOUR_KEY"`}</CodeBlock>
          <p className="mt-3">Responses include <code className="text-blue-200">data</code> and pagination values for <code>page</code>, <code>limit</code>, and <code>total</code>.</p>
        </DocSection>

        <DocSection title="8. Read or update an application">
          <CodeBlock>{`# Read one
curl ${origin}/api/v1/applications/APPLICATION_ID \\
  -H "Authorization: Bearer YOUR_KEY"

# Update only the supplied fields
curl -X PATCH ${origin}/api/v1/applications/APPLICATION_ID \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"interviewing","details":"First-round interview scheduled"}'`}</CodeBlock>
          <p className="mt-3">A key can never read or update another member&apos;s application—even if it knows the application ID.</p>
        </DocSection>

        <DocSection title="9. Duplicate-safe automations">
          <p>Set <code className="text-blue-200">external_id</code> to a stable source identifier, such as a Gmail message ID. Repeating a request with that ID returns the existing record as a duplicate rather than inserting another application.</p>
          <CodeBlock>{`{
  "company": "Example Company",
  "position": "Engineering Intern",
  "external_id": "gmail-message-18f3abc123"
}`}</CodeBlock>
          <p className="mt-3">External IDs are unique only within your account, so different members may safely process the same posting.</p>
        </DocSection>

        <DocSection title="10. Responses, errors, and limits">
          <ul className="grid list-disc gap-2 pl-5">
            <li><b className="text-white">200</b> — successful read/update or duplicate-only batch</li>
            <li><b className="text-white">201</b> — at least one application created</li>
            <li><b className="text-white">400</b> — malformed JSON or invalid fields</li>
            <li><b className="text-white">401</b> — missing, invalid, expired, or revoked key</li>
            <li><b className="text-white">403</b> — missing scope or inactive membership</li>
            <li><b className="text-white">404</b> — missing application or another member&apos;s record</li>
            <li><b className="text-white">429</b> — rate limit reached; respect the Retry-After header</li>
          </ul>
          <p className="mt-4">Machine-readable OpenAPI: <a className="text-blue-300 underline" href={`${origin}/api/v1/openapi`} target="_blank" rel="noreferrer"><code>/api/v1/openapi</code></a>.</p>
        </DocSection>

        <DocSection title="11. Connect Codex through the KTP MCP">
          <p>The hosted MCP exposes the same secured application operations as tools. It uses this API key, so ownership, scopes, revocation, rate limits, duplicate protection, and audit logs behave exactly like the REST API.</p>
          <p className="mt-4 font-semibold text-white">1. Store the key in the terminal environment</p>
          <CodeBlock>{`$secureKey = Read-Host "Paste API key" -AsSecureString
$env:KTP_API_KEY = [System.Net.NetworkCredential]::new("", $secureKey).Password`}</CodeBlock>
          <p className="mt-4 font-semibold text-white">2. Add the remote MCP to Codex</p>
          <CodeBlock>{`codex mcp add ktp-applications \
  --url https://tagpabkdkbyjfmexikxn.supabase.co/functions/v1/application-tracker-mcp/mcp \
  --bearer-token-env-var KTP_API_KEY`}</CodeBlock>
          <p className="mt-3">Restart Codex after adding the connection. Available tools include identifying your account, listing, reading, adding one or many, and updating your applications.</p>
          <p className="mt-3 text-xs">Never paste the key into a prompt or store it directly in a shared MCP configuration file. Claude and other Streamable HTTP MCP clients can use the same endpoint with the key as a Bearer token.</p>
        </DocSection>
      </section>
    </div>
  );
}
