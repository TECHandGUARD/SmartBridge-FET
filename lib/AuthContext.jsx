import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkUser();
    
    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
        // Sync user profile data from user_profiles table
        fetchUserProfile(session.user.email);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    setIsLoadingAuth(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
        await fetchUserProfile(session.user.email);
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
  };

  const fetchUserProfile = async (email) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
      }
      
      // Merge profile data with user object
      if (data) {
        setUser(prev => ({ ...prev, profile: data }));
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

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
        await supabase.from('user_profiles').insert([{
          auth_id: data.user.id,
          email: data.user.email,
          full_name: metadata.full_name || '',
          role: metadata.role || 'student',
          popia_consent: metadata.popia_consent || false,
          popia_consent_date: metadata.popia_consent ? new Date().toISOString() : null
        }]);
      }
      
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true, data };
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthError({ type: 'signup_failed', message: error.message });
      return { success: false, error };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signIn = async (email, password) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      setUser(data.user);
      setIsAuthenticated(true);
      await fetchUserProfile(data.user.email);
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError({ type: 'login_failed', message: error.message });
      return { success: false, error };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const updateUserProfile = async (updates) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('email', user.email);
      
      if (error) throw error;
      
      // Update local user state
      setUser(prev => ({
        ...prev,
        profile: { ...prev?.profile, ...updates }
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      authChecked,
      signUp,
      signIn,
      signOut,
      navigateToLogin,
      updateUserProfile,
      checkUser
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