// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 FULLY SOFT-CODED CONFIGURATION
// ============================================================
const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  LOGIN_ROUTE: import.meta.env.VITE_LOGIN_ROUTE || '/login',
  RESET_PASSWORD_ROUTE: import.meta.env.VITE_RESET_PASSWORD_ROUTE || '/reset-password',
  RESET_REDIRECT_URL: import.meta.env.VITE_RESET_REDIRECT_URL || window.location.origin,

  // Soft-coded alerts & validation messages
  MESSAGES: {
    SUBTITLE: import.meta.env.VITE_FORGOT_SUBTITLE || "Enter your email and we'll send you a reset link",
    EMPTY_EMAIL: import.meta.env.VITE_FORGOT_EMPTY_EMAIL_MSG || 'Please enter your email address',
    INVALID_EMAIL: import.meta.env.VITE_FORGOT_INVALID_EMAIL_MSG || 'Please enter a valid email address',
    SUCCESS: import.meta.env.VITE_FORGOT_SUCCESS_MSG || 'Password reset email sent! Please check your inbox.',
    FAILED: import.meta.env.VITE_FORGOT_FAILED_MSG || 'Failed to send reset email. Please try again.',
  }
};

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      toast.error(CONFIG.MESSAGES.EMPTY_EMAIL);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error(CONFIG.MESSAGES.INVALID_EMAIL);
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${CONFIG.RESET_REDIRECT_URL}${CONFIG.RESET_PASSWORD_ROUTE}`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });

      if (error) throw error;

      setSent(true);
      toast.success(CONFIG.MESSAGES.SUCCESS);
    } catch (error) {
      console.error('Reset password error:', error);
      const message = error.message || CONFIG.MESSAGES.FAILED;
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center space-y-3 pt-8">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-playfair text-3xl font-bold">
            {CONFIG.APP_NAME} – Reset Password
          </CardTitle>
          <p className="text-sm text-muted-foreground">{CONFIG.MESSAGES.SUBTITLE}</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-green-600">✅ {CONFIG.MESSAGES.SUCCESS}</p>
              <Link to={CONFIG.LOGIN_ROUTE} className="w-full block">
                <Button className="w-full">Return to Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                  {errorMsg}
                </div>
              )}
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 gap-2 text-base font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link to={CONFIG.LOGIN_ROUTE} className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
