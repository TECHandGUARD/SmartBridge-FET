import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// ✅ Admin emails that bypass onboarding
const ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (data.session) {
          setStatus('success');
          
          // Check user profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('onboarding_complete, role, is_super_admin')
            .eq('email', data.session.user.email)
            .maybeSingle();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
          }

          toast.success('Successfully signed in!');
          
          // ✅ ADMIN BYPASS: Check if user is admin
          const isAdmin = ADMIN_EMAILS.includes(data.session.user.email) ||
                          profile?.role === 'admin' ||
                          profile?.is_super_admin === true;

          setTimeout(() => {
            if (isAdmin) {
              navigate('/', { replace: true }); // Admin → home
            } else if (profile?.onboarding_complete) {
              navigate('/', { replace: true }); // Onboarding complete → home
            } else {
              navigate('/onboarding', { replace: true }); // Need onboarding
            }
          }, 1000);
        } else {
          setStatus('error');
          setError('No session found');
          toast.error('Authentication failed');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setError(error.message);
        toast.error(error.message || 'Authentication failed');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate]);

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
