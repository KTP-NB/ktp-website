"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function JoinPage() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/join/${token}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setInvite(j.invite);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch(`/api/join/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMessage(j.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen px-4 pb-20 pt-32 text-white">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
        <h1 className="text-3xl font-black">Join Kappa Theta Pi</h1>
        {loading && !invite && !error ? (
          <p className="mt-4 text-white/60">Checking invitation…</p>
        ) : error && !invite ? (
          <p className="mt-4 text-red-300">{error}</p>
        ) : message ? (
          <div className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-5 text-emerald-100">
            {message}
          </div>
        ) : (
          <>
            <p className="mt-2 text-white/60">
              {invite?.label}
              {invite?.pledge_class ? ` · ${invite.pledge_class} class` : ""}
            </p>
            <form onSubmit={submit} className="mt-7 grid gap-4">
              <label className="grid gap-2 text-sm font-bold">
                Full name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"
                />
              </label>
              {invite?.requiresApprovedEmail && (
                <p className="text-xs text-white/50">
                  Use the email address provided to the chapter.
                </p>
              )}
              {error && <p className="text-sm text-red-300">{error}</p>}
              <button
                disabled={loading}
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send my account invitation"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
