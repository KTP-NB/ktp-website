'use client';

import { useAuth } from './authprovider';

export default function AuthStatus() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <a href="/login" className="hover:opacity-80">Login</a>
        <a href="/signup" className="hover:opacity-80">Signup</a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm opacity-80">{user.email}</span>
      <button
        className="rounded-xl px-3 py-1 border border-white/20 hover:bg-white/10 transition"
        onClick={async () => { 
          await signOut(); 
          window.location.href = '/'; 
        }}
      >
        Sign out
      </button>
    </div>
  );
}
