import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { mergeProfile, editableProfile, withTimeout } from './auth-utils.js';

/** @typedef {{ user: any, role: string, isAuthenticated: boolean, isLoadingAuth: boolean, loading: boolean,
 * authError: any, authChecked: boolean, isLoadingPublicSettings: boolean, appPublicSettings: {enabled: boolean},
 * isAdmin: boolean, isTutor: boolean, isStudent: boolean, isParent: boolean,
 * signIn: (email: string, password: string) => Promise<any>, signUp: (email: string, password: string, metadata?: any) => Promise<any>,
 * signInWithGoogle: () => Promise<any>, signOut: () => Promise<void>, updateUserProfile: (updates: any) => Promise<any>,
 * checkUser: () => Promise<any>, navigateToLogin: () => void, checkAppState: () => Promise<any> }} AuthState */
/** @type {import('react').Context<AuthState | null>} */
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const hydrate = useCallback(async (authUser) => {
    const request = ++generation.current;
    try {
      let next = null;
      if (authUser) {
        const { data, error } = await withTimeout(supabase.from('users').select('*').eq('id', authUser.id).maybeSingle());
        if (error) throw error;
        if (!data) throw new Error('Your account profile is unavailable. Please retry or contact support.');
        if (data.is_active === false) throw new Error('Your account is inactive. Please contact support.');
        next = mergeProfile(authUser, data);
      }
      if (alive.current && request === generation.current) {
        setUser(next); setAuthError(null); setIsLoadingAuth(false);
      }
      return next;
    } catch (error) {
      if (alive.current && request === generation.current) {
        setUser(null); setAuthError({ type: 'profile_unavailable', message: error.message }); setIsLoadingAuth(false);
      }
      throw error;
    }
  }, []);
  const checkUser = useCallback(async () => {
    setIsLoadingAuth(true);
    const request = generation.current;
    try {
      const { data, error } = await withTimeout(supabase.auth.getUser());
      if (request !== generation.current) return null;
      if (error) {
        if (error.name === 'AuthSessionMissingError') return await hydrate(null);
        throw error;
      }
      return await hydrate(data.user);
    } catch (error) {
      if (alive.current && request === generation.current) {
        setUser(null); setAuthError({ type: 'auth_failed', message: error.message }); setIsLoadingAuth(false);
      }
      return null;
    }
  }, [hydrate]);
  useEffect(() => {
    alive.current = true;
    let timer;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Leave the auth callback before calling Supabase to avoid auth-lock deadlocks.
      clearTimeout(timer);
      if (!session?.user) {
        ++generation.current; setUser(null); setIsLoadingAuth(false); setAuthError(null); return;
      }
      timer = setTimeout(() => { hydrate(session.user).catch(() => {}); }, 0);
    });
    checkUser();
    return () => { alive.current = false; ++generation.current; clearTimeout(timer); subscription.unsubscribe(); };
  }, [checkUser, hydrate]);
  const signIn = async (email, password) => {
    setIsLoadingAuth(true);
    try {
      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email: email.trim(), password }));
      if (error) throw error;
      await hydrate(data.user);
      return { success: true, data };
    } catch (error) {
      setAuthError({ type: 'login_failed', message: error.message }); toast.error(error.message);
      return { success: false, error };
    } finally { setIsLoadingAuth(false); }
  };
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await withTimeout(supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } }));
      if (error) throw error;
      return { success: true, data };
    } catch (error) { toast.error(error.message); return { success: false, error }; }
  };
  const signUp = async (email, password, metadata = {}) => {
    try {
      // Profile creation and privileges belong to the database trigger.
      const { data, error } = await withTimeout(supabase.auth.signUp({ email: email.trim(), password,
        options: { data: { full_name: metadata.full_name?.trim() || '' }, emailRedirectTo: `${window.location.origin}/auth/callback` } }));
      if (error) throw error;
      toast.success(data.session ? 'Account created.' : 'Please check your email to verify your account.');
      return { success: true, data };
    } catch (error) { toast.error(error.message); return { success: false, error }; }
  };
  const signOut = async () => {
    try {
      const { error } = await withTimeout(supabase.auth.signOut());
      if (error) throw error;
      ++generation.current; setUser(null); setAuthError(null); window.location.assign('/login');
    } catch (error) { toast.error(error.message || 'Could not sign out. Please retry.'); }
  };
  const updateUserProfile = async (updates) => {
    try {
      if (!user?.id) throw new Error('Please sign in.');
      const { error } = await withTimeout(supabase.from('users').update(editableProfile(updates)).eq('id', user.id).select('id').single());
      if (error) throw error;
      if (!await checkUser()) throw new Error('Profile saved, but could not refresh. Please retry.');
      return { success: true };
    } catch (error) { toast.error(error.message); return { success: false, error }; }
  };
  const role = user?.is_super_admin ? 'admin' : user?.role || 'user';
  return <AuthContext.Provider value={{ user, role, isAuthenticated: !!user, isLoadingAuth, loading: isLoadingAuth,
    authError, authChecked: !isLoadingAuth, isLoadingPublicSettings: false, appPublicSettings: { enabled: true },
    isAdmin: user?.is_super_admin === true, isTutor: ['sace_tutor', 'student_tutor', 'tutor'].includes(role), isStudent: role === 'student', isParent: role === 'parent',
    signIn, signUp, signInWithGoogle, signOut, updateUserProfile, checkUser,
    navigateToLogin: () => window.location.assign('/login'), checkAppState: checkUser,
  }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
