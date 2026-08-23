'use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/authgate';
import AccountShell from '@/components/AccountShell';
import ApiKeysPanel from '@/components/ApiKeysPanel';
import { useAuth } from '@/components/authprovider';
import { supabase } from '@/lib/supabase';

function MemberIntegrations() {
  const { user } = useAuth();
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return undefined;

    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      // API keys are only issued to accounts linked to a member profile.
      const { data, error: profileError } = await supabase
        .from('member_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError) {
        setError(profileError.message);
      } else if (!data) {
        setError('No member profile is linked to this account yet.');
      } else {
        setHasProfile(true);
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return (
    <AccountShell>
      {loading && <p className="text-white/60">Loading integrations...</p>}

      {!loading && error && (
        <p className="rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      )}

      {!loading && hasProfile && <ApiKeysPanel />}
    </AccountShell>
  );
}

export default function MemberIntegrationsPage() {
  return (
    <AuthGate>
      <MemberIntegrations />
    </AuthGate>
  );
}
