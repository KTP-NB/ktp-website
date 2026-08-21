'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [profileName, setProfileName] = useState(null);
  const [accessRole, setAccessRole] = useState(null);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setUser(null);
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      if (nextUser?.user_metadata?.must_set_password && window.location.pathname !== '/update-password') {
        window.location.replace('/update-password');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      if (nextUser?.user_metadata?.must_set_password && window.location.pathname !== '/update-password') {
        setTimeout(() => window.location.replace('/update-password'), 0);
      }
      setUser((currentUser) => {
        if (currentUser?.id && nextUser?.id && currentUser.id === nextUser.id && currentUser.email === nextUser.email) {
          return currentUser;
        }

        return nextUser;
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig || !user?.id) {
      setProfileName(null);
      setAccessRole(null);
      return undefined;
    }

    let isMounted = true;

    async function loadProfileName() {
      const { data, error } = await supabase
        .from('member_profiles')
        .select('name,access_role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;
      setProfileName(error ? null : data?.name || null);
      setAccessRole(error ? null : data?.access_role || 'member');
    }

    loadProfileName();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const value = useMemo(() => ({
    user,
    loading: user === undefined,
    displayName:
      profileName ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      '',
    setProfileName,
    accessRole,
    hasAdminAccess: ['manager', 'admin', 'super_admin'].includes(accessRole),
    signOut: () => (hasSupabaseConfig ? supabase.auth.signOut() : Promise.resolve()),
    signIn: async (email, password) => {
      if (!hasSupabaseConfig) {
        throw new Error('Authentication is not configured.');
      }

      const formattedEmail = email.toLowerCase();

      // 1. Attempt standard Supabase login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password,
      });

      // 2. If it succeeds immediately, they are a standard user
      if (!error) return data;

      // 3. THE TRAPDOOR: Intercept specific Firebase migration candidates
      if (error.message === 'Invalid login credentials') {
        console.log("Attempting background Firebase migration via Node API...");

        try {
          // Call your local Next.js API Route instead of the Edge Function
          const migrationResponse = await fetch('/api/migrate-auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: formattedEmail, password }),
          });

          const migrationResult = await migrationResponse.json();

          if (migrationResult.success) {
            console.log("Migration successful! Natively logging in...");
            
            // 4. The Node API natively hashed the password. Run login again!
            const { data: finalData, error: finalError } = await supabase.auth.signInWithPassword({
              email: formattedEmail,
              password,
            });

            if (finalError) throw finalError;
            return finalData; // Migration and login fully complete
          } else {
            // API ran, but the password was legitimately incorrect
            console.log("API confirmed incorrect password.");
            throw error; 
          }
        } catch (migrationErr) {
          console.error("Migration failed silently:", migrationErr);
          // Throw original invalid credentials error so the UI handles it normally
          throw error; 
        }
      }

      // 5. Throw any other standard errors (like rate limiting)
      throw error;
    },
    resetPassword: async (email) => {
      if (!hasSupabaseConfig) {
        throw new Error('Authentication is not configured.');
      }

      const { data, error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      return data;
    },
  }), [user, profileName, accessRole]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider/>');
  return ctx;
}
