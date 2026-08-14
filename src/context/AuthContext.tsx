import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, type Profile } from '../lib/supabase';

type AuthStatus = 'loading' | 'signed-out' | 'guest' | 'authenticated';

interface SignUpResult {
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  playAsGuest: () => void;
  updateHighScore: (score: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
        setStatus('authenticated');
      } else {
        setStatus('signed-out');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
        setStatus('authenticated');
      } else {
        setUser(null);
        setProfile(null);
        setStatus((prev) => (prev === 'guest' ? 'guest' : 'signed-out'));
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setStatus('signed-out');
  }, []);

  const playAsGuest = useCallback(() => {
    setStatus('guest');
  }, []);

  const updateHighScore = useCallback(
    async (score: number) => {
      if (status !== 'authenticated' || !user) return;
      if (profile && score <= profile.high_score) return;

      const { data } = await supabase
        .from('profiles')
        .update({ high_score: score })
        .eq('id', user.id)
        .lt('high_score', score)
        .select()
        .single();

      if (data) setProfile(data);
    },
    [status, user, profile]
  );

  return (
    <AuthContext.Provider value={{ status, user, profile, signIn, signUp, signOut, playAsGuest, updateHighScore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
