// src/lib/AuthContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { supabase, supabaseInitError } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  APP_URL: import.meta.env.VITE_APP_URL || window.location.origin,
  AUTH_TIMEOUT_MS: Number(import.meta.env.VITE_AUTH_TIMEOUT_MS) || 8000,
};

// ============================================================
// 🧩 AuthContext
// ============================================================

const AuthContext = createContext();

// ============================================================
// 🛡️ Capability map (Phase 3 seam — string role today, data tomorrow)
//    Every entry maps a role to the capabilities it grants.
//    When we move to server-issued capability claims, this map is
//    deleted and replaced by a JWT read — call sites do not change.
// ============================================================

const ROLE_CAPABILITIES = {
  admin: [
    'view:admin_dashboard',
    'manage:users',
    'manage:tutors',
    'manage:resources',
    'manage:sessions',
    'view:reports',
  ],
  super_admin: [
    'view:admin_dashboard',
    'manage:users',
    'manage:tutors',
    'manage:resources',
    'manage:sessions',
    'view:reports',
    'manage:tenant',
    'manage:billing',
  ],
  sace_tutor: ['view:tutor_dashboard', 'manage:sessions', 'view:students'],
  student_tutor: ['view:tutor_dashboard', 'manage:sessions', 'view:students'],
  parent: ['view:parent_dashboard', 'view:student_progress', 'manage:bookings'],
  student: ['view:student_dashboard', 'manage:bookings', 'view:resources'],
  user: ['view:profile'],
};

// ============================================================
// ⏱️ Timeout helper — prevents "stuck on loading forever"
// ============================================================

const withTimeout = (promise, ms, label = 'operation') =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);

// ============================================================
// 🚀 AuthProvider
// ============================================================

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  // Mount ref — prevents state updates on unmounted components
  const isMountedRef = useRef(true);

  // Version counter — invalidates stale async operations
  const sessionVersionRef = useRef(0);

  // True if Supabase never initialised (missing env vars, bad config)
  const supabaseUnavailable = !supabase;
  const configError = supabaseInitError;

  // ============================================================
  // ✅ Derived authorization state (memoized)
  // ============================================================

  const authorization = useMemo(() => {
    const role = user?.role || 'user';
    const isSuperAdmin = user?.is_super_admin === true;

    // Super admin is promoted to 'super_admin' role for capability lookup.
    // This is the E fix: role no longer lies about super-admins.
    const effectiveRole = isSuperAdmin ? 'super_admin' : role;

    const capabilities = new Set(ROLE_CAPABILITIES[effectiveRole] || ROLE_CAPABILITIES.user);

    return {
      role,
      effectiveRole,
      capabilities,
      isAdmin: effectiveRole === 'admin' || effectiveRole === 'super_admin',
      isSuperAdmin,
      isTutor: effectiveRole === 'sace_tutor' || effectiveRole === 'student_tutor',
      isStudent: effectiveRole === 'student',
      isParent: effectiveRole === 'parent',
    };
  }, [user]);

  // Backward-compatible destructure — every existing consumer still works
  const {
    role,
    isAdmin,
    isTutor,
    isStudent,
    isParent,
  } = authorization;

  // ============================================================
  // 🎫 can() — capability check (Phase 3 seam, safe today)
  //    Existing code keeps using `role`. New code uses `can()`.
  //    When capabilities move to JWT claims, only this function changes.
  // ============================================================

  const can = useCallback(
    (capability) => {
      if (!user) return false;
      if (authorization.isSuperAdmin) return true; // super admin bypasses
      return authorization.capabilities.has(capability);
    },
    [user, authorization]
  );

  // ============================================================
  // 🔄 Session version bump
  // ============================================================

  const bumpSessionVersion = useCallback(() => {
    sessionVersionRef.current += 1;
    return sessionVersionRef.current;
  }, []);

  // ============================================================
  // 👤 Fetch user profile from users table
  //    NOTE: role is read here temporarily. In Phase 2 this becomes
  //    a JWT claim read — see CIO Principle 2.
  // ============================================================

  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId || !supabase) return null;
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
  // 👥 Set user with profile (version-guarded)
  // ============================================================

  const setUserWithProfile = useCallback(
    async (authUser, expectedVersion) => {
      if (expectedVersion !== sessionVersionRef.current) {
        return { success: false, reason: 'version_mismatch' };
      }

      if (!authUser) {
        if (isMountedRef.current) {
          setUser(null);
          setIsAuthenticated(false);
        }
        return { success: false, reason: 'no_user' };
      }

      const profile = await fetchUserProfile(authUser.id);

      if (expectedVersion !== sessionVersionRef.current) {
        return { success: false, reason: 'version_changed_during_fetch' };
      }

      const mergedUser = {
        ...authUser,
        ...profile,
        id: authUser.id,
        email: authUser.email,
        full_name:
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.email,
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
    },
    [fetchUserProfile]
  );

  // ============================================================
  // 🔍 Check current user session (with timeout + null guard)
  // ============================================================

  const checkUser = useCallback(async () => {
    // 🛡️ Graceful degradation — Supabase not configured
    if (!supabase) {
      if (isMountedRef.current) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        setAuthError({
          type: 'config_error',
          message:
            configError?.message ||
            'Supabase is not configured. Auth features are unavailable.',
        });
      }
      return;
    }

    const operationVersion = sessionVersionRef.current;
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data: { session }, error } = await withTimeout(
        supabase.auth.getSession(),
        CONFIG.AUTH_TIMEOUT_MS,
        'Auth check'
      );

      if (error) throw error;

      if (operationVersion !== sessionVersionRef.current) return;

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
        setAuthError({
          type: error.message?.includes('timed out')
            ? 'auth_timeout'
            : 'auth_required',
          message: error.message,
        });
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      if (isMountedRef.current && operationVersion === sessionVersionRef.current) {
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    }
  }, [setUserWithProfile, configError]);

  // ============================================================
  // 📡 Auth state change listener
  //    ⚠️ CRITICAL: callback is SYNCHRONOUS. Async work is deferred
  //    to a microtask to avoid deadlocking Supabase's internal lock.
  //    This is the fix for Finding A.
  // ============================================================

  useEffect(() => {
    isMountedRef.current = true;

    // If Supabase isn't available, don't try to subscribe
    if (!supabase) {
      checkUser();
      return () => {
        isMountedRef.current = false;
      };
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // ⚠️ Keep this callback SYNCHRONOUS. Defer all async work.
      // Supabase holds an internal lock during this callback; awaiting
      // any Supabase method here causes deadlock / AbortErrors.

      // SIGNED_OUT — clear state immediately
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

      // SIGNED_IN — defer profile fetch + activity log
      if (event === 'SIGNED_IN' && session?.user) {
        const eventVersion = sessionVersionRef.current;

        queueMicrotask(async () => {
          // Non-blocking activity log
          if (supabase) {
            try {
              await supabase.from('activity_log').insert({
                event_type: 'auth_sign_in',
                user_email: session.user.email,
                user_id: session.user.id,
                description: 'User signed in',
                metadata: {
                  provider: session.user.app_metadata?.provider || 'email',
                },
              });
            } catch (_) {
              // Logging failures must never break auth
            }
          }

          if (isMountedRef.current) {
            await setUserWithProfile(session.user, eventVersion);
            if (isMountedRef.current) {
              setIsLoadingAuth(false);
              setAuthChecked(true);
            }
          }
        });
        return;
      }

      // TOKEN_REFRESHED — defer profile refresh
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        const eventVersion = sessionVersionRef.current;

        queueMicrotask(async () => {
          if (isMountedRef.current) {
            await setUserWithProfile(session.user, eventVersion);
            if (isMountedRef.current) {
              setIsLoadingAuth(false);
              setAuthChecked(true);
            }
          }
        });
        return;
      }

      // Any other event — clear loading flags
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
  // 👁️ Re-check session when tab becomes visible again
  //    (Fix for Finding F — stale sessions on suspended tabs)
  // ============================================================

  useEffect(() => {
    if (!supabase) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && authChecked) {
        // Soft re-check — does not clear UI, just refreshes state
        supabase.auth.getSession().catch(() => {
          // Non-fatal: if the session is gone, onAuthStateChange will fire
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authChecked]);

  // ============================================================
  // 🔑 Sign In — email/password
  // ============================================================

  const signIn = async (email, password) => {
    if (!supabase) {
      const err = configError || new Error('Supabase not configured');
      toast.error(err.message);
      return { success: false, error: err };
    }

    const operationVersion = bumpSessionVersion();
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        CONFIG.AUTH_TIMEOUT_MS,
        'Sign in'
      );

      if (error) throw error;

      const result = await setUserWithProfile(data.user, operationVersion);

      if (result.success) {
        toast.success('Signed in successfully!');
        return { success: true, data };
      }
      return {
        success: false,
        error: new Error('Session was invalidated'),
        invalidated: true,
      };
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
  // 🔑 Sign In — Google OAuth
  // ============================================================

  const signInWithGoogle = async () => {
    if (!supabase) {
      const err = configError || new Error('Supabase not configured');
      toast.error(err.message);
      return { success: false, error: err };
    }

    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${CONFIG.APP_URL}/auth/callback` },
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
  // 📝 Sign Up
  // ============================================================

  const signUp = async (email, password, metadata = {}) => {
    if (!supabase) {
      const err = configError || new Error('Supabase not configured');
      toast.error(err.message);
      return { success: false, error: err };
    }

    const operationVersion = bumpSessionVersion();
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: metadata.full_name || '',
              ...metadata,
            },
          },
        }),
        CONFIG.AUTH_TIMEOUT_MS,
        'Sign up'
      );

      if (error) throw error;

      if (data.user) {
        // TODO (Phase 2): move profile creation server-side.
        // Role must never be writable by the client long-term.
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              full_name: metadata.full_name || '',
              role: 'user', // hard-locked: never trust metadata.role
              onboarding_complete: false,
              created_at: new Date().toISOString(),
            },
          ]);

        if (profileError) console.error('Profile creation error:', profileError);

        const result = await setUserWithProfile(data.user, operationVersion);
        if (result.success) {
          toast.success('Account created! Please check your email to verify.');
          return { success: true, data };
        }
        return {
          success: false,
          error: new Error('Session was invalidated'),
          invalidated: true,
        };
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
  // 🚪 Sign Out
  //    Routes through supabaseClient.signOut so channel cleanup
  //    happens in exactly one place. Fix for Finding C.
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

      // Import the canonical signOut from supabaseClient (which does
      // unsubscribeAll → auth.signOut). This is the single source of truth.
      const { signOut: canonicalSignOut } = await import('@/lib/supabaseClient');
      await canonicalSignOut();

      toast.success('Signed out successfully');

      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          // replace() — no back-button history entry
          window.location.replace('/');
        }
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // ============================================================
  // ➡️ Navigate to Login
  // ============================================================

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  // ============================================================
  // ✏️ Update User Profile
  // ============================================================

  const updateUserProfile = async (updates) => {
    if (!user?.id) return { success: false, error: 'No user logged in' };
    if (!supabase) {
      const err = configError || new Error('Supabase not configured');
      return { success: false, error: err };
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      setUser((prev) => (prev ? { ...prev, ...updates } : null));
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
      return { success: false, error };
    }
  };

  // ============================================================
  // 📊 App State
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
  // 📦 Context Value
  // ============================================================

  const value = useMemo(
    () => ({
      // Session
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      authChecked,
      appPublicSettings,

      // Authorization (existing API — preserved)
      role,
      isAdmin,
      isTutor,
      isStudent,
      isParent,
      isSuperAdmin: authorization.isSuperAdmin,

      // ✨ NEW — capability API (Phase 3 seam)
      can,
      capabilities: authorization.capabilities,

      // Legacy compatibility
      loading: isLoadingAuth,

      // Actions
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      navigateToLogin,
      updateUserProfile,
      checkUser,
      checkAppState,

      // Diagnostics
      supabaseUnavailable,
    }),
    [
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      authChecked,
      appPublicSettings,
      role,
      isAdmin,
      isTutor,
      isStudent,
      isParent,
      authorization,
      can,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      navigateToLogin,
      updateUserProfile,
      checkUser,
      checkAppState,
      supabaseUnavailable,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================
// 🪝 useAuth hook
// ============================================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
