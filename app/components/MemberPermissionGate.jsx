'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/authprovider';
import { hasPermission } from '@/lib/memberAccess';

export default function MemberPermissionGate({ permission, children, redirectTo = '/' }) {
  const { permissions, profileLoading } = useAuth();
  const allowed = hasPermission(permissions, permission);

  useEffect(() => {
    if (!profileLoading && !allowed) window.location.replace(redirectTo);
  }, [allowed, profileLoading, redirectTo]);

  if (profileLoading) {
    return <div className="mt-20 text-center opacity-70">Checking access…</div>;
  }
  if (!allowed) return null;
  return children;
}
