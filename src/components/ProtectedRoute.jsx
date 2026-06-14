// lib/AuthContext.jsx - Remove hardcoded admin email checks
// Instead, rely on database queries for admin status

// ... inside your checkUserAuth function:

const checkUserAuth = useCallback(async () => {
  setIsLoadingAuth(true);
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    if (authUser) {
      // Get user profile from user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', authUser.email)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }
      
      const userData = {
        ...authUser,
        ...profile,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name,
        role: profile?.role || 'user',
        is_super_admin: profile?.is_super_admin || false,
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  } catch (err) {
    console.error('Auth check error:', err);
    setAuthError({ type: 'auth_required', message: err.message });
    setUser(null);
    setIsAuthenticated(false);
  } finally {
    setIsLoadingAuth(false);
    setAuthChecked(true);
  }
}, []);
