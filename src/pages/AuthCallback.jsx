// src/pages/AuthCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getCurrentUserProfile } from '@/lib/supabaseClient';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION (Admin control via environment)
// ============================================================

const CONFIG = {
  // Admin emails – comma-separated list in environment
  ADMIN_EMAILS: (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim())
    .filter(Boolean),
  
  // Redirect destinations
  DASHBOARD_ROUTE: import.meta.env.VITE_DASHBOARD_ROUTE || '/',
  ADMIN_ROUTE: import.meta.env.VITE_ADMIN_ROUTE || '/admin',
  ONBOARDING_ROUTE: import.meta.env.VITE_ONBOARDING_ROUTE || '/onboarding',
  LOGIN_ROUTE: import.meta.env.VITE_LOGIN_ROUTE || '/login',

  // Timeouts (ms)
  REDIRECT_DELAY_SUCCESS: Number(import.meta.env.VITE_REDIRECT_DELAY_SUCCESS) || 1000,
  REDIRECT_DELAY_ERROR: Number(import.meta.env.VITE_REDIRECT_DELAY_ERROR) || 2000,

  // Feature flags
  ENABLE_ADMIN_BYPASS: import.meta.env.VITE_ENABLE_ADMIN_BYPASS !== 'false',
};

// ============================================================
// Auth Callback Component
// ============================================================

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data.session) {
          setStatus('error');
          setError('No session found');
          toast.error('Authentication failed');
          setTimeout(() => navigate(CONFIG.LOGIN_ROUTE, { replace: true }), CONFIG.REDIRECT_DELAY_ERROR);
          return;
        }

        setStatus('success');
        toast.success('Successfully signed in!');

        // Fetch user profile using the helper
        const { profile, error: profileError } = await getCurrentUserProfile();
        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        // Determine admin status using soft-coded list and profile flags
        const userEmail = data.session.user.email;
        const isAdmin = CONFIG.ENABLE_ADMIN_BYPASS && (
          CONFIG.ADMIN_EMAILS.includes(userEmail) ||
          profile?.role === 'admin' ||
          profile?.is_super_admin === true
        );

        // Redirect based on role and onboarding status
        setTimeout(() => {
          if (isAdmin) {
            navigate(CONFIG.ADMIN_ROUTE, { replace: true });
          } else if (profile?.onboarding_complete) {
            navigate(CONFIG.DASHBOARD_ROUTE, { replace: true });
          } else {
            navigate(CONFIG.ONBOARDING_ROUTE, { replace: true });
          }
        }, CONFIG.REDIRECT_DELAY_SUCCESS);

      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setError(error.message);
        toast.error(error.message || 'Authentication failed');
        setTimeout(() => navigate(CONFIG.LOGIN_ROUTE, { replace: true }), CONFIG.REDIRECT_DELAY_ERROR);
      }
    };

    handleCallback();
  }, [navigate]);

  // ============================================================
  // Render UI
  // ============================================================

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Completing sign in...</h2>
            <p className="text-sm text-muted-foreground">Please wait while we verify your account</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Successfully signed in!</h2>
            <p className="text-sm text-muted-foreground">Redirecting you to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Authentication failed</h2>
            <p className="text-sm text-muted-foreground">{error || 'Something went wrong. Please try again.'}</p>
            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
