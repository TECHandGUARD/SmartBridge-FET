// src/pages/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 FULLY SOFT-CODED CONFIGURATION
// ============================================================
const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  LOGIN_ROUTE: import.meta.env.VITE_LOGIN_ROUTE || '/login',
  TERMS_ROUTE: import.meta.env.VITE_TERMS_ROUTE || '/terms',
  PRIVACY_ROUTE: import.meta.env.VITE_PRIVACY_ROUTE || '/privacy',
  ADMIN_ROUTE: import.meta.env.VITE_ADMIN_ROUTE || '/admin',
  
  DEFAULT_ROLE: import.meta.env.VITE_DEFAULT_REGISTER_ROLE || 'user',
  MIN_PASSWORD_LENGTH: Number(import.meta.env.VITE_MIN_PASSWORD_LENGTH) || 6,
  REQUIRE_TERMS_ACCEPTANCE: import.meta.env.VITE_REQUIRE_TERMS_ACCEPTANCE !== 'false',

  // Soft-coded alerts & validation messages
  MESSAGES: {
    SUBTITLE: import.meta.env.VITE_REGISTER_SUBTITLE || 'Start your learning journey today',
    EMPTY_NAME: import.meta.env.VITE_REGISTER_EMPTY_NAME_MSG || 'Please enter your full name',
    EMPTY_EMAIL: import.meta.env.VITE_REGISTER_EMPTY_EMAIL_MSG || 'Please enter your email address',
    INVALID_EMAIL: import.meta.env.VITE_REGISTER_INVALID_EMAIL_MSG || 'Please enter a valid email address',
    PASSWORD_MISMATCH: import.meta.env.VITE_REGISTER_PASSWORD_MISMATCH_MSG || 'Passwords do not match',
    TERMS_REJECTED: import.meta.env.VITE_REGISTER_TERMS_REJECTED_MSG || 'Please accept the Terms of Service and Privacy Policy',
    SUCCESS: import.meta.env.VITE_REGISTER_SUCCESS_MSG || 'Account created! Please check your email to verify.',
    FAILED: import.meta.env.VITE_REGISTER_FAILED_MSG || 'Failed to create account. Please try again.',
  }
};

export default function Register() {
  const { signUp, user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (user && !isLoadingAuth) {
      const redirectTo = user.role === 'admin' ? CONFIG.ADMIN_ROUTE : '/';
      navigate(redirectTo, { replace: true });
    }
  }, [user, isLoadingAuth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFullName) {
      toast.error(CONFIG.MESSAGES.EMPTY_NAME);
      return;
    }

    if (!trimmedEmail) {
      toast.error(CONFIG.MESSAGES.EMPTY_EMAIL);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error(CONFIG.MESSAGES.INVALID_EMAIL);
      return;
    }

    if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${CONFIG.MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(CONFIG.MESSAGES.PASSWORD_MISMATCH);
      return;
    }

    if (CONFIG.REQUIRE_TERMS_ACCEPTANCE && !acceptedTerms) {
      toast.error(CONFIG.MESSAGES.TERMS_REJECTED);
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(trimmedEmail, password, {
        full_name: trimmedFullName,
        role: CONFIG.DEFAULT_ROLE,
      });

      if (result?.success) {
        toast.success(CONFIG.MESSAGES.SUCCESS);
        navigate(CONFIG.LOGIN_ROUTE);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || CONFIG.MESSAGES.FAILED);
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
          <CardTitle className="font-playfair text-3xl font-bold">{CONFIG.APP_NAME} – Create Account</CardTitle>
          <p className="text-sm text-muted-foreground">{CONFIG.MESSAGES.SUBTITLE}</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="pl-10 h-12" disabled={loading} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-12" disabled={loading} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={`Password (min ${CONFIG.MIN_PASSWORD_LENGTH} characters)`}
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
                  placeholder="Confirm Password"
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

            <div className="flex items-start gap-2 pt-2">
              <input type="checkbox" id="terms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 rounded border-border w-4 h-4 accent-primary" disabled={loading} />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                I agree to the <Link to={CONFIG.TERMS_ROUTE} className="text-primary hover:underline">Terms of Service</Link> and <Link to={CONFIG.PRIVACY_ROUTE} className="text-primary hover:underline">Privacy Policy</Link>
              </label>
            </div>

            <Button type="submit" className="w-full h-12 gap-2 text-base font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to={CONFIG.LOGIN_ROUTE} className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
