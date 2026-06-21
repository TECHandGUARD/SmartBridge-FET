import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  // Fetch user profile from user_profiles table
  const fetchUserProfile = useCallback(async (email) => {
    if (!email) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
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

  // Set user with profile data merged
  const setUserWithProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }
    
    const profile = await fetchUserProfile(authUser.email);
    
    setUser({
      ...authUser,
      ...profile,
      email: authUser.email,
      full_name: profile?.full_name || authUser.user_metadata?.full_name,
      role: profile?.role || 'user',
      is_super_admin: profile?.is_super_admin || false,
      onboarding_complete: profile?.onboarding_complete ?? false, // ✅ FIXED
    });
    setIsAuthenticated(true);
  }, [fetchUserProfile]);

  // Check current user session
  const checkUser = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session?.user) {
        await setUserWithProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError({ type: 'auth_required', message: error.message });
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [setUserWithProfile]);

  // Listen for auth state changes
  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await setUserWithProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, [checkUser, setUserWithProfile]);

  // Sign in with email/password
  const signIn = async (email, password) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      await setUserWithProfile(data.user);
      toast.success('Signed in successfully!');
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError({ type: 'login_failed', message: error.message });
      toast.error(error.message || 'Failed to sign in');
      return { success: false, error };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
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

  // Sign up new user
  const signUp = async (email, password, metadata = {}) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) throw error;
      
      // Create user profile in user_profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            email: data.user.email,
            full_name: metadata.full_name || '',
            role: metadata.role || 'user',
            onboarding_complete: false,
          }]);
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
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

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Signed out successfully');
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Navigate to login page
  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    if (!user?.email) return { success: false, error: 'No user logged in' };
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);
      
      if (error) throw error;
      
      // Update local user state
      setUser(prev => ({
        ...prev,
        ...updates
      }));
      
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
      return { success: false, error };
    }
  };

  // Check app state (simplified for Supabase)
  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    try {
      // Check if app is enabled (you can add your own logic here)
      setAppPublicSettings({ enabled: true });
    } catch (error) {
      console.error('App state check failed:', error);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, []);

  // Initial app state check
  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      navigateToLogin,
      updateUserProfile,
      checkUser,
      checkAppState
    }}>
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
