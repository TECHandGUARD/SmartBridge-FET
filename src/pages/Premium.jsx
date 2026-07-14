// src/pages/Premium.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Star, CheckCircle, Shield, Users, Loader2, CreditCard,
  GraduationCap, Briefcase, Copy, ExternalLink, AlertCircle,
  Sparkles, Zap, Crown, Gift, Rocket, Clock, Award,
  TrendingUp, BarChart3, Calendar, Check, X, HelpCircle,
  ArrowRight, ChevronRight, DollarSign, Lock, Unlock
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // App name
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

  // Currency
  CURRENCY: import.meta.env.VITE_PREMIUM_CURRENCY || 'R',

  // Company
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME || 'Tech & GUARD Pty Ltd',

  // Yoco Links
  YOCO_LINKS: {
    student: import.meta.env.VITE_YOCO_STUDENT_LINK || 'https://pay.yoco.com/r/2A55BY',
    parent: import.meta.env.VITE_YOCO_PARENT_LINK || 'https://pay.yoco.com/r/4jppyY',
    tutor_pro: import.meta.env.VITE_YOCO_TUTOR_PRO_LINK || 'https://pay.yoco.com/r/78MMPk',
  },

  // Bank Details
  BANK: {
    name: import.meta.env.VITE_BANK_NAME || 'Standard Bank',
    account_name: import.meta.env.VITE_BANK_ACCOUNT_NAME || 'TECH AND GUARD PTY LTD',
    account_number: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || '10270501728',
    branch_code: import.meta.env.VITE_BANK_BRANCH_CODE || '051001',
  },

  // Commission settings
  COMMISSION: {
    percentage: Number(import.meta.env.VITE_TUTOR_COMMISSION_PERCENTAGE) || 10,
    flat_fee: Number(import.meta.env.VITE_TUTOR_COMMISSION_FLAT_FEE) || 20,
  },

  // Feature flags
  ENABLE_ANNUAL_PRICING: import.meta.env.VITE_ENABLE_ANNUAL_PRICING !== 'false',
  ENABLE_TRIAL: import.meta.env.VITE_ENABLE_TRIAL !== 'false',

  // Messages
  MESSAGES: {
    ACTIVATE_SUCCESS: import.meta.env.VITE_PREMIUM_ACTIVATE_SUCCESS_MSG || '🎉 {plan} activated successfully!',
    ACTIVATE_FAILED: import.meta.env.VITE_PREMIUM_ACTIVATE_FAILED_MSG || 'Failed to activate subscription. Please contact support.',
    COPY_SUCCESS: import.meta.env.VITE_PREMIUM_COPY_SUCCESS_MSG || 'Copied to clipboard!',
    ENTER_REFERENCE: import.meta.env.VITE_PREMIUM_ENTER_REFERENCE_MSG || 'Please enter your payment reference.',
    SIGN_IN_REQUIRED: import.meta.env.VITE_PREMIUM_SIGN_IN_MSG || 'Please sign in to activate premium.',
    ALREADY_PREMIUM: import.meta.env.VITE_PREMIUM_ALREADY_MSG || 'You already have an active premium subscription!',
  },
};

// ============================================================
// Constants
// ============================================================

const PLANS = [
  {
    id: 'student',
    label: 'Student Premium',
    price: Number(import.meta.env.VITE_STUDENT_PREMIUM_PRICE) || 20,
    annual_price: Number(import.meta.env.VITE_STUDENT_PREMIUM_ANNUAL_PRICE) || 200,
    icon: GraduationCap,
    color: 'from-blue-600 to-blue-800',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    desc: 'For Grade 10–12 learners.',
    popular: false,
    features: [
      'Unlimited resource downloads',
      'All past exam papers (2014–2024)',
      'Premium tutor notes & summaries',
      'Priority tutor matching',
      'Ad-free experience',
      'CAPS memo solutions',
      'Exclusive Grade 12 exam prep bundle',
      'Early access to new content'
    ],
  },
  {
    id: 'parent',
    label: 'Parent Premium',
    price: Number(import.meta.env.VITE_PARENT_PREMIUM_PRICE) || 50,
    annual_price: Number(import.meta.env.VITE_PARENT_PREMIUM_ANNUAL_PRICE) || 500,
    icon: Users,
    color: 'from-green-600 to-green-800',
    badge: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    desc: 'For parents monitoring their child.',
    popular: false,
    features: [
      'Full student progress dashboard',
      'Automated weekly email reports',
      'Direct tutor communication',
      'Session history & booking records',
      'Premium resource access for child',
      'Priority support'
    ],
  },
  {
    id: 'tutor_pro',
    label: 'Tutor Pro',
    price: Number(import.meta.env.VITE_TUTOR_PRO_PRICE) || 150,
    annual_price: Number(import.meta.env.VITE_TUTOR_PRO_ANNUAL_PRICE) || 1500,
    icon: Briefcase,
    color: 'from-primary to-green-dark',
    badge: 'bg-primary/10 text-primary dark:bg-primary/20',
    desc: 'For verified tutors. Zero commission.',
    popular: true,
    features: [
      '0% platform commission on bookings',
      'Featured listing in tutor directory',
      'Priority booking notifications',
      'Advanced analytics dashboard',
      'Unlimited resource uploads',
      'Branded tutor profile page'
    ],
  },
];

// ============================================================
// Sub-Components
// ============================================================

function PlanCard({ plan, isSelected, onSelect }) {
  const Icon = plan.icon;
  const savings = plan.annual_price ? Math.round((1 - plan.annual_price / (plan.price * 12)) * 100) : 0;

  return (
    <button
      onClick={() => onSelect(plan.id)}
      className={`text-left p-4 rounded-2xl border-2 transition-all duration-300 relative ${
        isSelected
          ? 'border-primary ring-2 ring-primary bg-primary/5 scale-[1.02] shadow-lg'
          : 'border-border hover:border-primary/40 bg-card hover:shadow-md'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-2 right-3">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5">
            <Sparkles className="w-2.5 h-2.5 mr-1 inline" /> Most Popular
          </Badge>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {isSelected && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
      </div>
      <p className="font-semibold text-sm">{plan.label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
      <div className="mt-2">
        <p className="font-playfair font-bold text-xl text-primary">
          {CONFIG.CURRENCY}{plan.price}
          <span className="text-xs font-normal text-muted-foreground">/mo</span>
        </p>
        {CONFIG.ENABLE_ANNUAL_PRICING && plan.annual_price && (
          <p className="text-[10px] text-muted-foreground">
            {CONFIG.CURRENCY}{plan.annual_price}/year
            {savings > 0 && (
              <span className="text-green-600 ml-1 font-semibold">(Save {savings}%)</span>
            )}
          </p>
        )}
      </div>
    </button>
  );
}

function FeatureList({ features }) {
  return (
    <div className="space-y-2">
      {features.map((f) => (
        <div key={f} className="flex items-center gap-2.5 text-sm">
          <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
          <span>{f}</span>
        </div>
      ))}
    </div>
  );
}

function PaymentMethodCard({ icon: Icon, title, children, className = '' }) {
  return (
    <Card className={`border-border shadow-md hover:shadow-lg transition-shadow ${className}`}>
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <p className="font-playfair text-lg font-bold">{title}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function Premium() {
  const { user } = useOutletContext() || {};
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'annual'

  // ============================================================
  // Load Subscription
  // ============================================================

  const loadSubscription = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_email', user.email)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      setSubscription(data || null);
    } catch (err) {
      console.error('Error loading subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // ============================================================
  // Pre-select Plan
  // ============================================================

  useEffect(() => {
    if (user?.role === 'parent') {
      setSelectedPlan('parent');
    } else if (user?.role === 'sace_tutor' || user?.role === 'student_tutor') {
      setSelectedPlan('tutor_pro');
    } else {
      setSelectedPlan('student');
    }
  }, [user]);

  // ============================================================
  // Computed Values
  // ============================================================

  const isPremium = subscription?.plan === 'premium' && subscription?.status === 'active';
  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];

  const getPrice = () => {
    if (billingPeriod === 'annual' && plan.annual_price) {
      return plan.annual_price;
    }
    return plan.price;
  };

  const getPriceLabel = () => {
    if (billingPeriod === 'annual') {
      return `/year (${CONFIG.CURRENCY}${Math.round(plan.annual_price / 12)}/mo)`;
    }
    return '/month';
  };

  const yocoLink = CONFIG.YOCO_LINKS[selectedPlan] || CONFIG.YOCO_LINKS.student;

  // ============================================================
  // Handlers
  // ============================================================

  const activateSubscription = async (paymentRef) => {
    const now = new Date();
    const end = new Date(now);
    const months = billingPeriod === 'annual' ? 12 : 1;
    end.setMonth(end.getMonth() + months);

    const subData = {
      user_email: user.email,
      plan: 'premium',
      status: 'active',
      amount_paid: getPrice(),
      currency: 'ZAR',
      payment_reference: paymentRef,
      start_date: now.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      billing_period: billingPeriod,
      updated_at: new Date().toISOString()
    };

    try {
      if (subscription) {
        const { error } = await supabase
          .from('subscriptions')
          .update(subData)
          .eq('id', subscription.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert([{
            ...subData,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'payment_made',
          user_email: user.email,
          description: `${user.email} subscribed to ${plan.label} — ${CONFIG.CURRENCY}${getPrice()} (${billingPeriod})`,
          created_at: new Date().toISOString()
        })
        .catch(() => {});

      await loadSubscription();
      toast.success(CONFIG.MESSAGES.ACTIVATE_SUCCESS.replace('{plan}', plan.label));
    } catch (err) {
      console.error('Error activating subscription:', err);
      toast.error(CONFIG.MESSAGES.ACTIVATE_FAILED);
    }
  };

  const copyRef = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(CONFIG.MESSAGES.COPY_SUCCESS);
  };

  const handleManualActivate = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!payRef.trim()) {
      toast.error(CONFIG.MESSAGES.ENTER_REFERENCE);
      return;
    }
    setPaying(true);
    await activateSubscription(payRef);
    setPaying(false);
    setPayRef('');
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground animate-pulse">Loading premium options...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // Active Premium State
  // ============================================================

  if (isPremium) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-lg mx-auto px-4">
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 shadow-lg">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="font-playfair text-2xl font-bold text-foreground mb-2">
                You're Premium! 🎉
              </h2>
              <p className="text-muted-foreground mb-4">
                Your premium membership is active until{' '}
                <strong>{subscription?.end_date}</strong>.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 gap-1.5 px-4 py-1.5 text-sm">
                  <Star className="w-4 h-4 fill-current" /> Premium Active
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {subscription?.billing_period || 'Monthly'}
                </Badge>
              </div>
              {subscription?.end_date && (
                <p className="text-xs text-muted-foreground mt-4">
                  🗓️ Renews on {new Date(subscription.end_date).toLocaleDateString('en-ZA', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Premium Plans
  // ============================================================

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/10 mb-4">
            <Crown className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-foreground mb-3">
            {CONFIG.APP_NAME} Premium
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Unlock everything {CONFIG.APP_NAME} has to offer for your academic journey.
          </p>
        </div>

        {/* Billing Toggle */}
        {CONFIG.ENABLE_ANNUAL_PRICING && (
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${
                billingPeriod === 'annual' ? 'bg-primary' : 'bg-muted'
              }`}
              aria-label="Toggle billing period"
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                  billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingPeriod === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual <span className="text-green-600 font-semibold">(Save up to 20%)</span>
            </span>
          </div>
        )}

        {/* Plan Selector */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {PLANS.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              isSelected={selectedPlan === p.id}
              onSelect={setSelectedPlan}
            />
          ))}
        </div>

        {/* Selected Plan Details */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Plan Features */}
          <div>
            <div className={`bg-gradient-to-br ${plan.color} rounded-3xl p-8 text-primary-foreground shadow-xl`}>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-playfair text-sm font-semibold opacity-70">{plan.label}</p>
                {plan.popular && (
                  <Badge className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5">
                    <Sparkles className="w-2.5 h-2.5 mr-1 inline" /> Popular
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-playfair text-5xl font-bold">
                  {CONFIG.CURRENCY}{getPrice()}
                </span>
                <span className="opacity-70 text-sm">{getPriceLabel()}</span>
              </div>
              <FeatureList features={plan.features} />
            </div>

            {/* Tutor Pro Note */}
            {plan.id === 'tutor_pro' && (
              <div className="mt-4 bg-muted rounded-xl p-4 text-xs text-muted-foreground border border-border">
                <p className="font-semibold text-foreground mb-1">📊 Standard Plan (Free)</p>
                <p>
                  No monthly fee. A <strong>{CONFIG.COMMISSION.percentage}% commission + {CONFIG.CURRENCY}{CONFIG.COMMISSION.flat_fee} flat fee</strong>{' '}
                  is deducted from each confirmed booking. Switch to Pro anytime to eliminate commissions.
                </p>
              </div>
            )}
          </div>

          {/* Right: Payment Methods */}
          <div className="space-y-4">
            {!user && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
                <p className="font-medium text-primary mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> {CONFIG.MESSAGES.SIGN_IN_REQUIRED}
                </p>
                <p className="text-muted-foreground">Please sign in to activate premium.</p>
              </div>
            )}

            {/* Yoco Payment */}
            <PaymentMethodCard icon={CreditCard} title="Pay via Yoco">
              <p className="text-xs text-muted-foreground">
                Click below to pay {CONFIG.CURRENCY}{getPrice()} via the secure Yoco payment portal.
              </p>
              <a
                href={yocoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-3 text-sm font-semibold transition-all hover:shadow-lg"
              >
                <ExternalLink className="w-4 h-4" /> Pay {CONFIG.CURRENCY}{getPrice()} on Yoco
              </a>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
                💡 Payment is processed by <strong>{CONFIG.COMPANY_NAME}</strong> on behalf of {CONFIG.APP_NAME}.
                <br />
                Use your <strong>email address as the reference</strong>. Activated within <strong>60 minutes</strong>.
              </div>
            </PaymentMethodCard>

            {/* EFT Payment */}
            <PaymentMethodCard icon={Shield} title="Pay via EFT" className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
              <p className="text-xs text-muted-foreground">
                Transfer directly to our bank account. Use your email address as the payment reference.
              </p>
              <div className="space-y-2 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800 p-3 text-xs">
                {[
                  ['Bank', CONFIG.BANK.name],
                  ['Account Name', CONFIG.BANK.account_name],
                  ['Account Number', CONFIG.BANK.account_number],
                  ['Branch Code', CONFIG.BANK.branch_code],
                  ['Reference', user?.email || 'Your email address'],
                  ['Amount', `${CONFIG.CURRENCY}${getPrice()}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{k}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{v}</span>
                      {k !== 'Bank' && k !== 'Amount' && k !== 'Branch Code' && (
                        <button
                          onClick={() => copyRef(v)}
                          className="text-primary hover:text-primary/70 transition-colors"
                          aria-label={`Copy ${k}`}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-400">
                ⏱ EFT payments are verified within <strong>60 minutes</strong> during business hours (Mon–Fri, 8am–5pm SAST).
              </div>
            </PaymentMethodCard>

            {/* Manual Activation */}
            <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10 hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5 space-y-3">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  Already Paid? Activate Now
                </p>
                <p className="text-xs text-muted-foreground">
                  Enter your Yoco transaction ID or EFT reference to activate your subscription immediately.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. YCO-12345678 or EFT ref"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="text-xs"
                    disabled={!user}
                  />
                  <Button
                    onClick={handleManualActivate}
                    disabled={paying || !payRef.trim() || !user}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 gap-1 whitespace-nowrap text-xs px-3"
                  >
                    {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Activate
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Payments processed by {CONFIG.COMPANY_NAME}. POPIA compliant.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {CONFIG.APP_NAME} is a digital platform owned and operated by <strong>{CONFIG.COMPANY_NAME}</strong>.
            All payments are received by {CONFIG.COMPANY_NAME} on behalf of the {CONFIG.APP_NAME} platform.
            Payouts to tutors are processed every {import.meta.env.VITE_PAYOUT_DAY || 'Thursday'}.
            By subscribing, you agree to the platform's terms and POPIA data handling policy.
          </p>
        </div>
      </div>
    </div>
  );
}
