import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../supabaseClient';
import { getCurrentUserProfile, updateCurrentUserProfile } from '../utils/backendApi';

const AuthContext = createContext(null);
const PENDING_USERNAME_KEY = 'sipSwoonPendingUsername';
const PENDING_SIGNUP_EMAIL_KEY = 'sipSwoonPendingSignupEmail';

function getPendingSignup() {
  return {
    username: localStorage.getItem(PENDING_USERNAME_KEY),
    email: localStorage.getItem(PENDING_SIGNUP_EMAIL_KEY),
  };
}

function clearPendingSignup() {
  localStorage.removeItem(PENDING_USERNAME_KEY);
  localStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
}

export function savePendingSignupUsername({ email, username }) {
  if (!email || !username?.trim()) {
    return;
  }

  localStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, email.toLowerCase().trim());
  localStorage.setItem(PENDING_USERNAME_KEY, username.trim());
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (nextSession = session) => {
    if (!nextSession?.access_token) {
      setProfile(null);
      return null;
    }

    const response = await getCurrentUserProfile(nextSession.access_token);
    setProfile(response.data);
    return response.data;
  };

  const applyPendingUsername = async (nextSession = session) => {
    if (!nextSession?.access_token || !nextSession?.user?.email) {
      return null;
    }

    const pending = getPendingSignup();

    if (!pending.username || !pending.email) {
      return null;
    }

    if (pending.email !== nextSession.user.email.toLowerCase().trim()) {
      return null;
    }

    try {
      const response = await updateCurrentUserProfile(nextSession.access_token, {
        username: pending.username,
      });
      setProfile(response.data);
      clearPendingSignup();
      return response.data;
    } catch (error) {
      console.warn('Unable to apply pending username:', error);
      clearPendingSignup();
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        try {
          await refreshProfile(data.session);
          await applyPendingUsername(data.session);
        } catch (error) {
          console.warn('Unable to load user profile:', error);
        }
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        try {
          await refreshProfile(nextSession);
          await applyPendingUsername(nextSession);
        } catch (error) {
          console.warn('Unable to load user profile:', error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    user: session?.user || null,
    session,
    accessToken: session?.access_token || null,
    profile,
    loading,
    refreshProfile,
    signOut: async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }
      setSession(null);
      setProfile(null);
    },
  }), [session, profile, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
