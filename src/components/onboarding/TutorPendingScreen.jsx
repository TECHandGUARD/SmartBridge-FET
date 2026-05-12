import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, RefreshCw, LogOut, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function TutorPendingScreen({ user, userProfile, onRefresh }) {
  const [checking, setChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Poll every 30s automatically
  useEffect(() => {
    const interval = setInterval(() => checkVerification(), 30000);
    checkVerification();
    return () => clearInterval(interval);
  }, []);

  const checkVerification = async () => {
    setChecking(true);
    try {
      const { data: profiles, error } = await supabase
        .from('tutor_profiles')
        .select('is_verified')
        .eq('user_email', user.email)
        .maybeSingle();
      
      if (error) throw error;
      
      if (profiles && profiles.is_verified === true) {
        setIsVerified(true);
        // Trigger a full refresh after a short delay
        setTimeout(() => {
          if (onRefresh) onRefresh();
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (isVerified) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">You're Verified! 🎉</h2>
          <p className="text-muted-foreground">Redirecting to your dashboard…</p>
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const displayName = userProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-playfair font-bold text-xl text-foreground">EduConnect FET</span>
        </div>

        {/* Pending icon */}
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Verification Pending</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hi <strong>{displayName}</strong>! Your tutor profile has been submitted
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
            onClick={handleSignOut}
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