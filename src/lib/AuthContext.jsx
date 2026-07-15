// src/lib/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  APP_URL: import.meta.env.VITE_APP_URL || window.location.origin,
};

// ============================================================
// AuthContext
// ============================================================

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  // Mount ref for preventing state updates on unmounted components
  const isMountedRef = useRef(true);
  
  // Version counter for invalidating stale operations
  const sessionVersionRef = useRef(0);

  // ✅ Computed properties
  const role = user?.role || 'user';
  const isAdmin = user?.role === 'admin' || user?.is_super_admin === true;
  const isTutor = ['sace_tutor', 'student_tutor'].includes(role);
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  // ============================================================
  // Bump session version (invalidates all pending state updates)
  // ============================================================

  const bumpSessionVersion = useCallback(() => {
    sessionVersionRef.current += 1;
    return sessionVersionRef.current;
  }, []);

  // ============================================================
  // Fetch user profile from users table
  // ============================================================

  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
      }
      return data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }, []);

  // ============================================================
  // Set user with profile - accepts explicit version
  // ============================================================

  const setUserWithProfile = useCallback(async (authUser, expectedVersion) => {
    // Validate against the explicit version passed in
    if (expectedVersion !== sessionVersionRef.current) {
      console.log(`🔄 Session version mismatch: expected ${expectedVersion}, current ${sessionVersionRef.current}`);
      return { success: false, reason: 'version_mismatch', expectedVersion, currentVersion: sessionVersionRef.current };
    }

    if (!authUser) {
      if (isMountedRef.current) {
        setUser(null);
        setIsAuthenticated(false);
      }
      return { success: false, reason: 'no_user' };
    }

    const profile = await fetchUserProfile(authUser.id);

    // Check version again after async fetch
    if (expectedVersion !== sessionVersionRef.current) {
      console.log(`🔄 Session version changed during fetch: expected ${expectedVersion}, current ${sessionVersionRef.current}`);
      return { success: false, reason: 'version_changed_during_fetch', expectedVersion, currentVersion: sessionVersionRef.current };
    }

    const mergedUser = {
      ...authUser,
      ...profile,
      id: authUser.id,
      email: authUser.email,
      full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email,
      role: profile?.role || 'user',
      is_super_admin: profile?.is_super_admin || false,
      onboarding_complete: profile?.onboarding_complete ?? false,
      trial_started_at: profile?.trial_started_at || null,
      is_premium: profile?.is_premium || false,
    };

    if (isMountedRef.current) {
      setUser(mergedUser);
      setIsAuthenticated(true);
      return { success: true, user: mergedUser };
    }
    
    return { success: false, reason: 'unmounted' };
  }, [fetchUserProfile]);

  // ============================================================
  // Check current user session
  // ============================================================

  const checkUser = useCallback(async () => {
    const operationVersion = sessionVersionRef.current;
    
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      if (operationVersion !== sessionVersionRef.current) {
        console.log('🔄 checkUser aborted - session version changed');
        return;
      }

      if (session?.user) {
        await setUserWithProfile(session.user, operationVersion);
      } else {
        if (isMountedRef.current && operationVersion === sessionVersionRef.current) {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (isMountedRef.current && operationVersion === sessionVersionRef.current) {
        setAuthError({ type: 'auth_required', message: error.message });
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      if (isMountedRef.current && operationVersion === sessionVersionRef.current) {
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    }
  }, [setUserWithProfile]);

  // ============================================================
  // Listen for auth state changes
  // ============================================================

  useEffect(() => {
    isMountedRef.current = true;

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // SIGNED_OUT - immediately invalidate and clear state
      if (event === 'SIGNED_OUT') {
        bumpSessionVersion();
        if (isMountedRef.current) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
        return;
      }

      // SIGNED_IN - log activity and set user
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await supabase
            .from('activity_log')
            .insert({
              event_type: 'auth_sign_in',
              user_email: session.user.email,
              user_id: session.user.id,
              description: 'User signed in',
              metadata: {
                provider: session.user.app_metadata?.provider || 'email'
              }
            });
        } catch (_) {
          // Silent fail - logging shouldn't break auth
        }

        if (isMountedRef.current) {
          const eventVersion = sessionVersionRef.current;
          await setUserWithProfile(session.user, eventVersion);
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
        return;
      }

      // TOKEN_REFRESHED - simplified, let setUserWithProfile handle it
      if (event === 'TOKEN_REFRESHED' && session?.user && isMountedRef.current) {
        const eventVersion = sessionVersionRef.current;
        await setUserWithProfile(session.user, eventVersion);
        if (isMountedRef.current) {
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
        return;
      }

      // Any other event - just ensure loading states are cleared
      if (isMountedRef.current) {
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [checkUser, setUserWithProfile, bumpSessionVersion]);

  // ============================================================
  // Sign In with Email/Password
  // ============================================================

  const signIn = async (email, password) => {
    const operationVersion = bumpSessionVersion();
    
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const result = await setUserWithProfile(data.user, operationVersion);
      
      if (result.success) {
        toast.success('Signed in successfully!');
        return { success: true, data };
      } else {
        console.log(`⚠️ Sign in completed but session was invalidated: ${result.reason}`);
        return { success: false, error: new Error('Session was invalidated'), invalidated: true };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError({ type: 'login_failed', message: error.message });
      toast.error(error.message || 'Failed to sign in');
      return { success: false, error };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // ============================================================
  // Sign In with Google OAuth
  // ============================================================

  const signInWithGoogle = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${CONFIG.APP_URL}/auth/callback`
        }
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Google sign in error:', error);
      setAuthError({ type: 'login_failed', message: error.message });
      toast.error(error.message || 'Failed to sign in with Google');
      return { success: false, error };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // ============================================================
  // Sign Up with Email/Password
  // ============================================================

  const signUp = async (email, password, metadata = {}) => {
    const operationVersion = bumpSessionVersion();
    
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name || '',
            ...metadata
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            full_name: metadata.full_name || '',
            role: metadata.role || 'user',
            onboarding_complete: false,
            created_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        const result = await setUserWithProfile(data.user, operationVersion);
        
        if (result.success) {
          toast.success('Account created! Please check your email to verify.');
          return { success: true, data };
        } else {
          console.log(`⚠️ Sign up completed but session was invalidated: ${result.reason}`);
          return { success: false, error: new Error('Session was invalidated'), invalidated: true };
        }
      }

      toast.success('Account created! Please check your email to verify.');
      return { success: true, data };
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthError({ type: 'signup_failed', message: error.message });
      toast.error(error.message || 'Failed to sign up');
      return { success: false, error };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // ============================================================
  // Sign Out
  // ============================================================

  const signOut = async () => {
    try {
      bumpSessionVersion();
      
      if (isMountedRef.current) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }

      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          window.location.href = '/';
        }
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // ============================================================
  // Navigate to Login
  // ============================================================

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  // ============================================================
  // Update User Profile
  // ============================================================

  const updateUserProfile = async (updates) => {
    if (!user?.id) return { success: false, error: 'No user logged in' };

    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, ...updates } : null);

      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
      return { success: false, error };
    }
  };

  // ============================================================
  // Check App State
  // ============================================================

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    try {
      setAppPublicSettings({ enabled: true });
    } catch (error) {
      console.error('App state check failed:', error);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, []);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  // ============================================================
  // Context Value
  // ============================================================

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    authChecked,
    role,
    isAdmin,
    isTutor,
    isStudent,
    isParent,
    loading: isLoadingAuth,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    navigateToLogin,
    updateUserProfile,
    checkUser,
    checkAppState,
  };

  return (
    <AuthContext.Provider value={value}>
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
