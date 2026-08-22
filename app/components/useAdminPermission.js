'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/coderank/clientFetch';
import { profileHasPermission } from '@/lib/adminAccess';

/**
 * Resolve whether the signed-in account holds any of `permissions`, using the
 * same rule as the portal tabs: super admins hold everything, admins and
 * managers hold exactly what a Super Admin granted them.
 *
 * The APIs enforce this too — this only decides what the page renders.
 */
export default function useAdminPermission(permissions) {
  const key = permissions.join(',');
  const [state, setState] = useState({ checking: true, allowed: false, profile: null });

  useEffect(() => {
    let isMounted = true;
    setState({ checking: true, allowed: false, profile: null });
    api('/api/admin/me')
      .then((result) => {
        if (!isMounted) return;
        const allowed = key
          .split(',')
          .some((permission) => profileHasPermission(result.profile, permission));
        setState({ checking: false, allowed, profile: result.profile });
      })
      .catch(() => {
        if (isMounted) setState({ checking: false, allowed: false, profile: null });
      });
    return () => {
      isMounted = false;
    };
  }, [key]);

  return state;
}
