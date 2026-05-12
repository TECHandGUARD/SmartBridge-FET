import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Star, CheckCircle, Shield, Users, Loader2, CreditCard, GraduationCap, Briefcase, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
{
  id: 'student',
  label: 'Student Premium',
  price: 20,
  icon: GraduationCap,
  color: 'from-blue-600 to-blue-800',
  badge: 'bg-blue-100 text-blue-700',
  desc: 'For Grade 10–12 learners.',
  features: [
  'Unlimited resource downloads',
  'All past exam papers (2014–2024)',
  'Premium tutor notes & summaries',
  'Priority tutor matching',
  'Ad-free experience',
  'CAPS memo solutions',
  'Exclusive Grade 12 exam prep bundle',
  'Early access to new content']

},
{
  id: 'parent',
  label: 'Parent Premium',
  price: 50,
  icon: Users,
  color: 'from-green-600 to-green-800',
  badge: 'bg-green-100 text-green-700',
  desc: 'For parents monitoring their child.',
  features: [
  'Full student progress dashboard',
  'Automated weekly email reports',
  'Direct tutor communication',
  'Session history & booking records',
  'Premium resource access for child',
  'Priority support']

},
{
  id: 'tutor_pro',
  label: 'Tutor Pro Plan',
  price: 150,
  icon: Briefcase,
  color: 'from-primary to-green-dark',
  badge: 'bg-primary/10 text-primary',
  desc: 'For verified tutors. Zero commission.',
  features: [
  '0% platform commission on bookings',
  'Featured listing in tutor directory',
  'Priority booking notifications',
  'Advanced analytics dashboard',
  'Unlimited resource uploads',
  'Branded tutor profile page']

}];


export default function Premium() {
  const { user, userProfile } = useOutletContext() || {};
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    // Pre-select plan based on role from userProfile
    const userRole = userProfile?.role || user?.role;
    if (userRole === 'parent') setSelectedPlan('parent');
    else if (userRole === 'sace_tutor' || userRole === 'student_tutor') setSelectedPlan('tutor_pro');
    else setSelectedPlan('student');
  }, [user, userProfile]);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    
    const fetchSubscription = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_email', user.email)
          .maybeSingle();
        
        if (error) throw error;
        setSubscription(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [user]);

  const YOCO_LINKS = {
    student: 'https://pay.yoco.com/r/2A55BY',
    parent: 'https://pay.yoco.com/r/4jppyY',
    tutor_pro: 'https://pay.yoco.com/r/78MMPk'
  };

  const isPremium = subscription?.plan === 'premium' && subscription?.status === 'active';
  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];

  const activateSubscription = async (paymentRef) => {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    const subData = {
      user_email: user.email,
      plan_type: subscription?.plan_type || 'premium',
      status: 'active',
      amount_paid: plan.price,
      payment_reference: paymentRef,
    };
    
    try {
      if (subscription) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            amount_paid: plan.price,
            payment_reference: paymentRef,
          })
          .eq('id', subscription.id);
        
        if (error) throw error;
        setSubscription({ ...subscription, status: 'active', amount_paid: plan.price, payment_reference: paymentRef });
      } else {
        const { data, error } = await supabase
          .from('subscriptions')
          .insert({
            user_email: user.email,
            plan_type: plan.id,
            status: 'active',
            amount_paid: plan.price,
            payment_reference: paymentRef,
          })
          .select()
          .single();
        
        if (error) throw error;
        setSubscription(data);
      }
      
      // Log activity
      await supabase.from('activity_logs').insert({
        event_type: 'payment_made',
        user_email: user.email,
        description: `${user.email} subscribed to ${plan.label} — R${plan.price}`
      }).catch(() => {});
      
      toast.success(`🎉 ${plan.label} activated!`);
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast.error('Failed to activate subscription');
      throw error;
    }
  };

  const copyRef = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleManualActivate = async () => {
    if (!user) { window.location.href = '/login'; return; }
    if (!payRef.trim()) { toast.error('Please enter your payment reference.'); return; }
    setPaying(true);
    await activateSubscription(payRef);
    setPaying(false);
    setPayRef('');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/20 mb-4">
            <Star className="w-8 h-8 fill-secondary text-secondary" />
          </div>
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-foreground mb-3">EduConnect Premium</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">Unlock everything EduConnect FET has to offer for your academic journey.</p>
        </div>

        {isPremium ?
        <div className="max-w-lg mx-auto">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-8 pb-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="font-playfair text-2xl font-bold text-foreground mb-2">You're Premium! 🎉</h2>
                <p className="text-muted-foreground mb-4">
                  Your premium membership is active.
                </p>
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5 px-4 py-1.5 text-sm">
                  <Star className="w-4 h-4 fill-current" /> Premium Active
                </Badge>
              </CardContent>
            </Card>
          </div> :

        <div className="space-y-8">
            {/* Plan selector */}
            <div className="grid sm:grid-cols-3 gap-4">
              {PLANS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPlan === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  isSelected ? 'border-primary ring-2 ring-primary bg-primary/5' : 'border-border hover:border-primary/40 bg-card'}`
                  }>
                  
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
                    </div>
                    <p className="font-semibold text-sm">{p.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                    <p className="font-playfair font-bold text-xl mt-2 text-primary">R{p.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                  </button>);

            })}
            </div>

            {/* Selected plan details + payment */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className={`bg-gradient-to-br ${plan.color} rounded-3xl p-8 text-primary-foreground`}>
                  <p className="font-playfair text-sm font-semibold mb-1 opacity-70">{plan.label}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="font-playfair text-5xl font-bold">R{plan.price}</span>
                    <span className="opacity-70">/month</span>
                  </div>
                  <div className="space-y-2.5">
                    {plan.features.map((f) =>
                  <div key={f} className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                        <span className="text-sm">{f}</span>
                      </div>
                  )}
                  </div>
                </div>

                {plan.id === 'tutor_pro' &&
              <div className="mt-4 bg-muted rounded-xl p-4 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Standard Plan (Free)</p>
                    <p>No monthly fee. A <strong>10% commission + R20 flat fee</strong> is deducted from each confirmed booking. Switch to Pro anytime to eliminate commissions.</p>
                  </div>
              }
              </div>

              <div className="space-y-4">
                {!user &&
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
                    <p className="font-medium text-primary mb-1">Sign in required</p>
                    <p className="text-muted-foreground">Please sign in to activate premium.</p>
                  </div>
              }

                {/* Option 1: Yoco Payment Link */}
                <Card className="border-border shadow-md">
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <p className="font-playfair text-lg font-bold">Pay via Yoco</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Click below to pay R{plan.price} via the secure Yoco payment portal. Once paid, come back and enter your reference number to activate.</p>
                    <a
                    href={YOCO_LINKS[selectedPlan]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-3 text-sm font-semibold transition-colors">
                    
                      <ExternalLink className="w-4 h-4" /> Pay R{plan.price} on Yoco Portal
                    </a>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
                      💡 Payment is processed by <strong>Tech &amp; GUARD</strong>. Please enter your <strong>email address as the reference</strong> on the Yoco page. Once paid, your account will be manually verified by our Admin within <strong>60 minutes</strong>.
                    </div>
                  </CardContent>
                </Card>

                {/* Option 2: EFT */}
                <Card className="border-amber-200 bg-amber-50/30">
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-600" />
                      <p className="font-playfair text-lg font-bold">Pay via EFT</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Transfer directly to our bank account. Use your email address as the payment reference.</p>
                    <div className="space-y-2 bg-white rounded-lg border border-amber-200 p-3 text-xs">
                      {[
                        ['Bank', 'Standard Bank'],
                        ['Account Name', 'TECH AND GUARD PTY LTD'],
                        ['Account Number', '10270501728'],
                        ['Branch Code', '051001'],
                        ['Reference', user?.email || 'Your email address'],
                        ['Amount', `R${plan.price}`],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center">
                          <span className="text-muted-foreground">{k}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{v}</span>
                            {k !== 'Bank' && k !== 'Amount' && (
                              <button onClick={() => copyRef(v)} className="text-primary hover:text-primary/70">
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                      ⏱ EFT payments are verified by Admin within <strong>60 minutes</strong> during business hours (Mon–Fri, 8am–5pm SAST).
                    </div>
                  </CardContent>
                </Card>

                {/* Activate after payment */}
                <Card className="border-green-200">
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <p className="font-semibold text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Already Paid? Activate Now</p>
                    <p className="text-xs text-muted-foreground">Enter your Yoco transaction ID or EFT reference to activate your subscription immediately.</p>
                    <div className="flex gap-2">
                      <Input placeholder="e.g. YCO-12345678 or EFT ref" value={payRef} onChange={(e) => setPayRef(e.target.value)} className="text-xs" />
                      <Button onClick={handleManualActivate} disabled={paying || !payRef.trim()} className="bg-green-600 hover:bg-green-700 gap-1 whitespace-nowrap text-xs px-3">
                        {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Activate
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-xs text-center text-muted-foreground">
                  🔒 Payments processed by Tech &amp; GUARD Pty Ltd on behalf of EduConnect FET. POPIA compliant.
                </p>
              </div>
            </div>
          </div>
        }

        {/* Legal / IP Ownership footer */}
        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            EduConnect FET is a digital platform owned and operated by <strong>Tech &amp; GUARD Pty Ltd</strong>. All payments are received by Tech &amp; GUARD Pty Ltd on behalf of the EduConnect FET platform. Payouts to tutors are processed every Thursday. By subscribing, you agree to the platform's terms and POPIA data handling policy.
          </p>
        </div>
      </div>
    </div>
  );
}