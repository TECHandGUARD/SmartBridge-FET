// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  LOGIN_ROUTE: import.meta.env.VITE_LOGIN_ROUTE || '/login',

  // Password constraints
  MIN_PASSWORD_LENGTH: Number(import.meta.env.VITE_MIN_PASSWORD_LENGTH) || 6,

  // Messages
  MESSAGES: {
    RESET_SUCCESS: import.meta.env.VITE_RESET_SUCCESS_MSG || 'Password reset successfully! Please log in with your new password.',
    RESET_FAILED: import.meta.env.VITE_RESET_FAILED_MSG || 'Failed to reset password. Please try again.',
    TOKEN_EXPIRED: import.meta.env.VITE_TOKEN_EXPIRED_MSG || 'This password reset link has expired. Please request a new one.',
    TOKEN_INVALID: import.meta.env.VITE_TOKEN_INVALID_MSG || 'Invalid password reset link. Please request a new one.',
    PASSWORD_MISMATCH: import.meta.env.VITE_PASSWORD_MISMATCH_MSG || 'Passwords do not match.',
    PASSWORD_TOO_SHORT: import.meta.env.VITE_PASSWORD_TOO_SHORT_MSG || `Password must be at least ${Number(import.meta.env.VITE_MIN_PASSWORD_LENGTH) || 6} characters.`,
    LOADING: import.meta.env.VITE_RESET_LOADING_MSG || 'Verifying your reset link...',
  },
};

// ============================================================
// Main Component
// ============================================================

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState(null);
  const [resetComplete, setResetComplete] = useState(false);

  // ============================================================
  // Verify the reset token on mount
  // ============================================================

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Get the current session – if the user has a valid session
        // from the reset link, the token is valid
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(CONFIG.MESSAGES.TOKEN_INVALID);
          setTokenValid(false);
          setVerifying(false);
          return;
        }

        // Check if we have a session (user is authenticated via the reset link)
        if (data?.session) {
          setTokenValid(true);
          setVerifying(false);
        } else {
          // No session – token might be expired or invalid
          // Check if there's an error code in the URL
          const errorCode = searchParams.get('error_code');
          const errorDescription = searchParams.get('error_description');

          if (errorCode === 'expired_token' || errorDescription?.includes('expired')) {
            setError(CONFIG.MESSAGES.TOKEN_EXPIRED);
          } else {
            setError(CONFIG.MESSAGES.TOKEN_INVALID);
          }
          setTokenValid(false);
          setVerifying(false);
        }
      } catch (err) {
        console.error('Token verification error:', err);
        setError(CONFIG.MESSAGES.TOKEN_INVALID);
        setTokenValid(false);
        setVerifying(false);
      }
    };

    verifyToken();
  }, [searchParams]);

  // ============================================================
  // Handle password reset submission
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirm) {
      toast.error('Please fill in both password fields.');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      toast.error(CONFIG.MESSAGES.PASSWORD_MISMATCH);
      return;
    }

    if (trimmedPassword.length < CONFIG.MIN_PASSWORD_LENGTH) {
      toast.error(CONFIG.MESSAGES.PASSWORD_TOO_SHORT);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });

      if (updateError) throw updateError;

      setResetComplete(true);
      toast.success(CONFIG.MESSAGES.RESET_SUCCESS);

      // Redirect to login after a delay
      setTimeout(() => {
        navigate(CONFIG.LOGIN_ROUTE);
      }, 3000);

    } catch (err) {
      console.error('Password reset error:', err);
      let errorMessage = CONFIG.MESSAGES.RESET_FAILED;

      // Check for specific error types
      if (err.message?.includes('expired')) {
        errorMessage = CONFIG.MESSAGES.TOKEN_EXPIRED;
      } else if (err.message?.includes('invalid')) {
        errorMessage = CONFIG.MESSAGES.TOKEN_INVALID;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Request a new reset link
  // ============================================================

  const handleRequestNewLink = () => {
    navigate('/forgot-password');
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold">Verifying your reset link...</h2>
          <p className="text-sm text-muted-foreground">Please wait while we confirm your request.</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // Invalid/Expired Token
  // ============================================================

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-border shadow-xl">
          <CardHeader className="text-center space-y-3 pt-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="font-playfair text-2xl font-bold">Link Invalid or Expired</CardTitle>
            <p className="text-sm text-muted-foreground">
              {error || CONFIG.MESSAGES.TOKEN_INVALID}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <p className="text-xs text-muted-foreground text-center">
              Password reset links expire after a short time for security reasons.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleRequestNewLink}
                className="w-full gap-2 bg-primary"
              >
                Request New Reset Link
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(CONFIG.LOGIN_ROUTE)}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // Reset Complete
  // ============================================================

  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-border shadow-xl">
          <CardHeader className="text-center space-y-3 pt-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="font-playfair text-2xl font-bold">Password Reset Complete!</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your password has been successfully updated.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-8 text-center">
            <p className="text-xs text-muted-foreground">
              You will be redirected to the login page in a few seconds.
            </p>
            <Button
              onClick={() => navigate(CONFIG.LOGIN_ROUTE)}
              className="w-full gap-2 bg-primary"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // Reset Password Form
  // ============================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center space-y-3 pt-8">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-playfair text-2xl font-bold">
            {CONFIG.APP_NAME} – Set New Password
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={`New Password (min ${CONFIG.MIN_PASSWORD_LENGTH} chars)`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={CONFIG.MIN_PASSWORD_LENGTH}
                  className="pl-10 pr-10 h-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 gap-2 bg-primary hover:bg-primary/90 text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <button
              onClick={() => navigate(CONFIG.LOGIN_ROUTE)}
              className="text-primary font-semibold hover:underline"
            >
              Sign in
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
