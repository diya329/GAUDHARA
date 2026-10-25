import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isDemoUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; unconfirmed?: boolean }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  loginAsDemoUser: (role?: 'veterinarian' | 'dairy_manager') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'gaudhara_demo_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  useEffect(() => {
    // Check for demo user session in local storage first
    const savedDemo = localStorage.getItem(DEMO_USER_KEY);
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setUser(parsed.user);
        setIsDemoUser(true);
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
      }
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get current Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        setIsDemoUser(false);
        localStorage.removeItem(DEMO_USER_KEY);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { 
        error: new Error('Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env, or use "Demo Test Login".') 
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return { error, unconfirmed: true };
        }
        return { error };
      }
      setUser(data.user);
      setSession(data.session);
      setIsDemoUser(false);
      localStorage.removeItem(DEMO_USER_KEY);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!isSupabaseConfigured) {
      return { 
        error: new Error('Supabase credentials required to create live accounts. You can also test using "Demo Test Mode".') 
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || 'Dairy Farm Operator',
            organization: 'GauDhara Dairy Farm',
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        return { error };
      }

      // Check if session was returned or email confirmation is required
      const requiresEmailConfirmation = !data.session;
      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
      }
      return { error: null, requiresEmailConfirmation };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    if (isDemoUser) {
      setIsDemoUser(false);
      setUser(null);
      setSession(null);
      localStorage.removeItem(DEMO_USER_KEY);
      return { error: null };
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      return { error };
    }

    setUser(null);
    setSession(null);
    return { error: null };
  };

  const requestPasswordReset = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { 
        error: new Error('Supabase is not configured. Add credentials in your .env to send real recovery emails.') 
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#reset-password`,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updatePassword = async (password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured.') };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const loginAsDemoUser = (role: 'veterinarian' | 'dairy_manager' = 'veterinarian') => {
    const mockUser: User = {
      id: 'demo-user-101',
      app_metadata: { provider: 'email' },
      user_metadata: {
        full_name: role === 'veterinarian' ? 'Dr. Sunita Sharma (DVM)' : 'Rajesh Patil (Farm Manager)',
        role: role === 'veterinarian' ? 'Veterinary Specialist' : 'Lead Dairy Herdsperson',
        farm_name: 'GauDhara Dairy Research Herd #4 (Demo)',
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: role === 'veterinarian' ? 'vet.sharma@mammarysentinel.local' : 'manager.patil@mammarysentinel.local',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    setUser(mockUser);
    setIsDemoUser(true);
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify({ user: mockUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        isDemoUser,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
        loginAsDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
