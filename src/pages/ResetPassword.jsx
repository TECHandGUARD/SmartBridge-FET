// src/pages/ResetPassword.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 FULLY SOFT-CODED CONFIGURATION
// ============================================================
const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  LOGIN_ROUTE: import.meta.env.VITE_LOGIN_ROUTE || '/login',
  FORGOT_ROUTE: import.meta.env.VITE_FORGOT_ROUTE || '/forgot-password',
  MIN_PASSWORD_LENGTH: Number(import.meta.env.VITE_MIN_PASSWORD_LENGTH) || 6,
  
  MESSAGES: {
    SUBTITLE: import.meta.env.VITE_RESET_SUBTITLE || 'Enter your new password below.',
    VERIFYING: import.meta.env.VITE_RESET_LOADING_MSG || 'Verifying your reset link...',
    RESET_SUCCESS: import.meta.env.VITE_RESET_SUCCESS_MSG || 'Password reset successfully! Please log in with your new password.',
    RESET_FAILED: import.meta.env.VITE_RESET_FAILED_MSG || 'Failed to reset password. Please try again.',
    TOKEN_EXPIRED: import.meta.env.VITE_TOKEN_EXPIRED_MSG || 'This password reset link has expired. Please request a new one.',
    TOKEN_INVALID: import.meta.env.VITE_TOKEN_INVALID_MSG || 'Invalid password reset link. Please request a new one.',
    PASSWORD_MISMATCH: import.meta.env.VITE_PASSWORD_MISMATCH_MSG || 'Passwords do not match.',
    PASSWORD_TOO_SHORT: import.meta.env.VITE_PASSWORD_TOO_SHORT_MSG || `Password must be at least 6 characters.`,
    EMPTY_FIELDS: import.meta.env.VITE_RESET_EMPTY_FIELDS_MSG || 'Please fill in both password fields.',
  },
};

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
  
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const errCode = searchParams.get('error_code');
  const errDesc = searchParams.get('error_description');

  useEffect(() => {
    let active = true;

    async function verifyToken() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;

        if (sessionError) {
          setError(CONFIG.MESSAGES.TOKEN_INVALID);
          setTokenValid(false);
          setVerifying(false);
          return;
        }

        if (data?.session) {
          setTokenValid(true);
          setVerifying(false);
        } else {
          if (errCode === 'expired_token' || errDesc?.includes('expired')) {
            setError(CONFIG.MESSAGES.TOKEN_EXPIRED);
          } else {
            setError(CONFIG.MESSAGES.TOKEN_INVALID);
          }
          setTokenValid(false);
          setVerifying(false);
        }
      } catch (err) {
        console.error('Token verification error:', err);
        if (active) {
          setError(CONFIG.MESSAGES.TOKEN_INVALID);
          setTokenValid(false);
          setVerifying(false);
        }
      }
    }

    verifyToken();
    return () => { active = false; };
  }, [errCode, errDesc]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirm) {
      toast.error(CONFIG.MESSAGES.EMPTY_FIELDS);
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });

      if (updateError) throw updateError;

      setResetComplete(true);
      toast.success(CONFIG.MESSAGES.RESET_SUCCESS);

      timerRef.current = setTimeout(() => {
        navigate(CONFIG.LOGIN_ROUTE);
      }, 3000);

    } catch (err) {
      console.error('Password reset error:', err);
      let errorMessage = CONFIG.MESSAGES.RESET_FAILED;
      if (err.message?.includes('expired')) errorMessage = CONFIG.MESSAGES.TOKEN_EXPIRED;
      else if (err.message?.includes('invalid')) errorMessage = CONFIG.MESSAGES.TOKEN_INVALID;

      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold">{CONFIG.MESSAGES.VERIFYING}</h2>
        </div>
      </div>
    );
  }

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
            <p className="text-sm text-muted-foreground">{error || CONFIG.MESSAGES.TOKEN_INVALID}</p>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate(CONFIG.FORGOT_ROUTE)} className="w-full gap-2 bg-primary">Request New Reset Link</Button>
              <Button variant="outline" onClick={() => navigate(CONFIG.LOGIN_ROUTE)} className="w-full">Back to Login</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          </CardHeader>
          <CardContent className="space-y-4 pb-8 text-center">
            <Button onClick={() => navigate(CONFIG.LOGIN_ROUTE)} className="w-full gap-2 bg-primary">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center space-y-3 pt-8">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-playfair text-2xl font-bold">{CONFIG.APP_NAME} – Set New Password</CardTitle>
          <p className="text-sm text-muted-foreground">{CONFIG.MESSAGES.SUBTITLE}</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-12"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

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
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 gap-2 text-base font-semibold" disabled={loading}>
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
        </CardContent>
      </Card>
    </div>
  );
}
