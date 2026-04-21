'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading: user === undefined,
    signOut: () => supabase.auth.signOut(),
    signIn: async (email, password) => {
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
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      return data;
    },
  }), [user]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider/>');
  return ctx;
}