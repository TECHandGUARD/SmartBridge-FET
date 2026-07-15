// src/pages/TutorPendingScreen.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, RefreshCw, LogOut, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // App name
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

  // Polling interval (ms)
  POLL_INTERVAL: Number(import.meta.env.VITE_PENDING_POLL_INTERVAL) || 30000,

  // Verification days message
  VERIFICATION_DAYS: import.meta.env.VITE_VERIFICATION_DAYS || '1–2 business days',

  // Messages
  MESSAGES: {
    VERIFIED: import.meta.env.VITE_VERIFIED_MSG || "You're Verified! 🎉",
    REDIRECTING: import.meta.env.VITE_REDIRECTING_MSG || 'Redirecting to your dashboard…',
    PROFILE_INCOMPLETE: import.meta.env.VITE_PROFILE_INCOMPLETE_MSG || 'Profile Incomplete',
    PROFILE_SUBMITTED: import.meta.env.VITE_PROFILE_SUBMITTED_MSG || 'Verification Pending',
    RESUBMIT_SUCCESS: import.meta.env.VITE_RESUBMIT_SUCCESS_MSG || 'Profile reset. Please complete registration again.',
    RESUBMIT_ERROR: import.meta.env.VITE_RESUBMIT_ERROR_MSG || 'Failed to reset profile. Please try again.',
    LOGOUT_ERROR: import.meta.env.VITE_LOGOUT_ERROR_MSG || 'Failed to sign out',
    CHECK_ERROR: import.meta.env.VITE_CHECK_ERROR_MSG || 'Failed to check verification status',
  },
};

// ============================================================
// Main Component
// ============================================================

export default function TutorPendingScreen({ user, onRefresh }) {
  const [checking, setChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasNoProfile, setHasNoProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ============================================================
  // Check verification status
  // ============================================================

  const checkVerification = useCallback(async () => {
    if (checking || !user?.email) return;

    setChecking(true);
    try {
      // 1. Get current authenticated user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (currentUser) {
        // 2. Get user profile from `users` table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
        }

        const userRole = profile?.role || currentUser.user_metadata?.role || 'user';

        // If role is no longer pending, user is verified (admin approved)
        if (userRole !== 'tutor_pending' && userRole !== 'user') {
          console.log('User role changed to:', userRole);
          setIsVerified(true);
          setTimeout(() => onRefresh(), 500);
          return;
        }
      }

      // 3. Check tutor_profiles table for verification status
      const { data: profiles, error: tutorError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_email', user.email);

      if (tutorError) throw tutorError;

      if (profiles.length === 0) {
        // No profile exists → user never completed onboarding
        setHasNoProfile(true);
      } else if (profiles[0].is_verified) {
        // Profile exists and is verified
        console.log('Tutor profile verified!');
        setIsVerified(true);
        onRefresh();
      } else {
        // Profile exists but not yet verified
        setHasNoProfile(false);
      }
    } catch (err) {
      console.error('Verification check failed:', err);
      toast.error(CONFIG.MESSAGES.CHECK_ERROR);
    } finally {
      setChecking(false);
    }
  }, [user?.email, checking, onRefresh]);

  // ============================================================
  // Poll automatically
  // ============================================================

  useEffect(() => {
    const interval = setInterval(() => checkVerification(), CONFIG.POLL_INTERVAL);
    checkVerification();
    return () => clearInterval(interval);
  }, [checkVerification]);

  // ============================================================
  // Handlers
  // ============================================================

  const handleResubmit = async () => {
    try {
      // Delete existing tutor profile
      const { data: profiles, error: fetchError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_email', user.email);

      if (fetchError) throw fetchError;

      if (profiles.length > 0) {
        const { error: deleteError } = await supabase
          .from('tutor_profiles')
          .delete()
          .eq('id', profiles[0].id);

        if (deleteError) throw deleteError;
      }

      // Reset user role to 'user' so onboarding starts fresh
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: 'user',
          onboarding_complete: false,
          updated_at: new Date().toISOString(),
        })
        .eq('email', user.email);

      if (updateError) throw updateError;

      toast.success(CONFIG.MESSAGES.RESUBMIT_SUCCESS);
      onRefresh();
    } catch (err) {
      console.error('Resubmit failed:', err);
      toast.error(CONFIG.MESSAGES.RESUBMIT_ERROR);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(CONFIG.MESSAGES.LOGOUT_ERROR);
      setIsLoggingOut(false);
    }
  };

  // ============================================================
  // Render states
  // ============================================================

  // ✅ Verified – redirecting
  if (isVerified) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto dark:bg-green-950/30">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{CONFIG.MESSAGES.VERIFIED}</h2>
          <p className="text-muted-foreground">{CONFIG.MESSAGES.REDIRECTING}</p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  // ❌ No profile submitted – guide user to complete registration
  if (hasNoProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-playfair font-bold text-xl text-foreground">{CONFIG.APP_NAME}</span>
          </div>

          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto dark:bg-red-950/30">
            <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{CONFIG.MESSAGES.PROFILE_INCOMPLETE}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Hi <strong>{user?.full_name || 'there'}</strong>! It looks like your tutor profile
              was not fully submitted. You need to complete your registration before admin can review you.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left space-y-2 dark:bg-red-950/20 dark:border-red-800">
            <p className="text-xs font-semibold text-red-800 dark:text-red-300">What you need to do:</p>
            <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
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
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ⏳ Pending verification – default state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-playfair font-bold text-xl text-foreground">{CONFIG.APP_NAME}</span>
        </div>

        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto dark:bg-amber-950/30">
          <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{CONFIG.MESSAGES.PROFILE_SUBMITTED}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hi <strong>{user?.full_name || 'there'}</strong>! Your tutor profile has been submitted
            and is currently under review by our admin team.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2 dark:bg-amber-950/20 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">What happens next?</p>
          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
            <li>Our admin verifies your credentials (SACE number / student number)</li>
            <li>You'll receive a confirmation email once approved</li>
            <li>You'll be automatically redirected to your dashboard</li>
            <li>This typically takes <strong>{CONFIG.VERIFICATION_DAYS}</strong></li>
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
            disabled={isLoggingOut}
          >
            {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          This page auto-refreshes every {CONFIG.POLL_INTERVAL / 1000} seconds.
          You'll be redirected automatically once verified.
        </p>
      </div>
    </div>
  );
}
