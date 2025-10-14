'use client';
import { useEffect } from 'react';
import { useAuth } from './authprovider';

export default function AuthGate({ children, redirectTo = '/login' }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) window.location.href = redirectTo;
  }, [user, loading, redirectTo]);

  if (loading) return <div className="mt-20 text-center opacity-70">Checking session…</div>;
  if (!user) return null; // will redirect
  return children;
}
