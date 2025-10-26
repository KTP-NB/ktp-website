"use client";
import { useState } from "react";
import { useAuth } from "@/components/authprovider";

export default function LoginPage() {
  const { user, loading, signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    if (typeof window !== "undefined") window.location.href = "/";
    return null;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await signIn(email, pwd);
      window.location.href = "/";
    } catch (err) {
      setMsg(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="min-h-[80vh] flex items-start justify-center
                 bg-gradient-to-br from-[#0B1425] via-[#0B1425] to-[#112347]
                 px-4 pt-28 md:pt-36 pb-16"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg mx-auto rounded-2xl p-10 md:p-14
                   bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl
                   flex flex-col gap-6"
      >
        <h1 className="text-4xl font-bold text-center mb-2">Log in</h1>

        <div className="flex flex-col gap-2">
          <label className="text-sm opacity-80">Email</label>
          <input
            className="w-full rounded-xl bg-white/5 border border-white/20 px-4 py-3
                       outline-none focus:border-white/40 placeholder-white/40"
            type="email"
            placeholder="netid@scarletmail.rutgers.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password with perfectly centered eye */}
        <div className="flex flex-col gap-2">
          <label className="text-sm opacity-80">Password</label>
          <div className="relative">
            <input
              className="w-full rounded-xl bg-white/5 border border-white/20 px-4 py-3
                         outline-none focus:border-white/40 placeholder-white/40 pr-12"
              type={showPwd ? "text" : "password"}
              placeholder="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
            >
              {showPwd ? (
                // Eye-slash
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M3 3l18 18M9.88 9.88A3 3 0 0112 9a3 3 0 013 3c0 .74-.27 1.41-.72 1.93M6.1 6.1C4.28 7.36 2.86 9.06 2 12c2.2 6 8 8 10 8 1.46 0 4.52-.62 7.06-3.14M15.54 15.54A3 3 0 0112 18a3 3 0 01-3-3c0-.37.07-.73.2-1.05M21.82 12c-.7-2.02-2-3.6-3.49-4.8-2.13-1.72-4.57-2.2-6.33-2.2-1.03 0-3.6.14-6.07 1.67"
                  />
                </svg>
              ) : (
                // Eye
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
                  />
                  <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          disabled={busy}
          className="w-full rounded-xl px-4 py-3 text-lg font-medium
                     bg-white/10 border border-white/20 hover:bg-white/20
                     transition disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>

        {msg && <p className="text-red-300 text-sm text-center">{msg}</p>}

        <button
          type="button"
          className="underline hover:text-white/90 text-sm text-right"
          onClick={async () => {
            if (!email) {
              setMsg("Enter your email above first");
              return;
            }
            try {
              await resetPassword(email);
              setMsg("Password reset email sent! Check your inbox or spam. If not received you may not have an account registered with us.");
            } catch (err) {
              setMsg(err.message || "Failed to send reset email");
            }
          }}
        >
          Forgot password?
        </button>
      </form>
    </main>
  );
}
