import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, RefreshCw, LogOut, BookOpen, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

// ✅ Admin emails that should bypass this screen
const ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];

export default function TutorPendingScreen({ user, onRefresh }) {
  const [checking, setChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasNoProfile, setHasNoProfile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ NEW: Check if user is admin and bypass immediately
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.email) return;
      
      // Check if email is in admin list
      if (ADMIN_EMAILS.includes(user.email)) {
        console.log('✅ Admin user detected - bypassing pending screen');
        setIsAdmin(true);
        setIsVerified(true);
        
        // Make sure admin has correct role in database
        const { error } = await supabase
          .from('user_profiles')
          .update({
            role: 'admin',
            onboarding_complete: true,
            is_super_admin: true,
            updated_at: new Date().toISOString()
          })
          .eq('email', user.email);
        
        if (error) {
          console.error('Failed to update admin role:', error);
        }
        
        // Redirect to admin dashboard
        setTimeout(() => {
          if (onRefresh) onRefresh();
          window.location.href = '/admin';
        }, 500);
        return;
      }
      
      // Check if user has admin role in database
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, is_super_admin')
        .eq('email', user.email)
        .maybeSingle();
      
      if (!profileError && profile) {
        if (profile.role === 'admin' || profile.is_super_admin === true) {
          console.log('✅ Admin role detected - bypassing pending screen');
          setIsAdmin(true);
          setIsVerified(true);
          setTimeout(() => {
            if (onRefresh) onRefresh();
            window.location.href = '/admin';
          }, 500);
          return;
        }
      }
    };
    
    checkAdmin();
  }, [user, onRefresh]);

  const checkVerification = useCallback(async () => {
    if (checking) return;
    
    setChecking(true);
    try {
      // FIRST check if user role changed (admin approved)
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      
      // Get user profile from user_profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', authUser?.email)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }
      
      const currentRole = profile?.role || 'user';
      
      // ✅ Check if admin first
      if (ADMIN_EMAILS.includes(authUser?.email) || currentRole === 'admin' || profile?.is_super_admin === true) {
        console.log('Admin user - bypassing');
        setIsVerified(true);
        setTimeout(() => {
          if (onRefresh) onRefresh();
          window.location.href = '/admin';
        }, 500);
        return;
      }
      
      if (currentRole !== 'tutor_pending' && currentRole !== 'user') {
        console.log('User role changed to:', currentRole);
        setIsVerified(true);
        setTimeout(() => onRefresh(), 500);
        return;
      }
      
      // SECOND check profile verification status
      const { data: profiles, error: tutorError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_email', user?.email);
      
      if (tutorError) throw tutorError;
      
      if (profiles.length === 0) {
        setHasNoProfile(true);
      } else if (profiles[0].is_verified) {
        console.log('Tutor profile verified!');
        setIsVerified(true);
        onRefresh();
      } else {
        setHasNoProfile(false);
      }
    } catch (err) {
      console.error('Verification check failed:', err);
      toast.error('Failed to check verification status');
    } finally {
      setChecking(false);
    }
  }, [checking, user?.email, onRefresh]);

  // Poll every 30s automatically (but skip if admin)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAdmin) {
        checkVerification();
      }
    }, 30000);
    checkVerification();
    return () => clearInterval(interval);
  }, [checkVerification, isAdmin]);

  const handleResubmit = async () => {
    try {
      // Delete existing profile
      const { data: profiles } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_email', user?.email);
      
      if (profiles && profiles.length > 0) {
        const { error: deleteError } = await supabase
          .from('tutor_profiles')
          .delete()
          .eq('id', profiles[0].id);
        
        if (deleteError) throw deleteError;
      }
      
      // Reset user profile to start onboarding again
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_complete: false, 
          role: 'user'
        })
        .eq('email', user?.email);
      
      if (updateError) throw updateError;
      
      onRefresh();
    } catch (err) {
      console.error('Resubmit failed:', err);
      toast.error('Failed to reset profile. Please contact support.');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    } else {
      window.location.href = '/';
    }
  };

  // ✅ If admin, show loading while redirecting (should never actually render)
  if (isAdmin) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <Shield className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Admin Access</h2>
          <p className="text-muted-foreground">Redirecting to admin dashboard…</p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">You're Verified! 🎉</h2>
          <p className="text-muted-foreground">Redirecting to your dashboard…</p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  // No profile submitted yet — guide them to complete registration
  if (hasNoProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-playfair font-bold text-xl text-foreground">SmartBridge FET</span>
          </div>

          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Profile Incomplete</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Hi <strong>{user?.full_name || 'there'}</strong>! It looks like your tutor profile
              was not fully submitted. You need to complete your registration before admin can review you.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-red-800">What you need to do:</p>
            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
              <li>Click the button below to restart your profile setup</li>
              <li>Re-select your tutor type (SACE or Student Tutor)</li>
              <li>Enter your credentials and submit</li>
              <li>Admin will then review and approve your profile</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={handleResubmit} className="gap-2 bg-primary">
              <CheckCircle className="w-4 h-4" /> Complete My Registration
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Normal pending screen for regular tutors
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-playfair font-bold text-xl text-foreground">SmartBridge FET</span>
        </div>

        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Verification Pending</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hi <strong>{user?.full_name || 'there'}</strong>! Your tutor profile has been submitted
            and is currently under review by our admin team.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-amber-800">What happens next?</p>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>Our admin verifies your credentials (SACE number / student number)</li>
            <li>You'll receive a confirmation email once approved</li>
            <li>You'll be automatically redirected to your dashboard</li>
            <li>This typically takes <strong>1–2 business days</strong></li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={checkVerification}
            disabled={checking}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking status…' : 'Check Verification Status'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          This page auto-refreshes every 30 seconds. You'll be redirected automatically once verified.
        </p>
      </div>
    </div>
  );
}
