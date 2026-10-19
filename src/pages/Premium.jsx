import useSubscriptionPrices from '@/hooks/useSubscriptionPrices';
import { appConfig } from '@/lib/config';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Star, CheckCircle, Shield, Users, Loader2, CreditCard, GraduationCap, Briefcase, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_TEMPLATES = [
{
  id: 'student',
  label: 'Student Premium',
  price: appConfig.prices.student,
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
    'Early access to new content'
  ]
},
{
  id: 'parent',
  label: 'Parent Premium',
  price: appConfig.prices.parent,
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
    'Priority support'
  ]
},
{
  id: 'tutor_pro',
  label: 'Tutor Pro Plan',
  price: appConfig.prices.tutor_pro,
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
    'Branded tutor profile page'
  ]
}];

const YOCO_LINKS = appConfig.checkout;

export default function Premium() {
  const { user } = useAuth() || {};
  const prices = useSubscriptionPrices();
  const PLANS = PLAN_TEMPLATES.map(plan=>({...plan,price:(prices.data?.find(row=>row.product===plan.id)?.amount_cents||0)/100}));
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const paymentIntent = useRef(null);
  const [gateways,setGateways]=useState([]);
  const [gateway,setGateway]=useState('');
  const [gatewayError,setGatewayError]=useState('');
  const [gatewaysLoading,setGatewaysLoading]=useState(false);
  const [checkoutActive,setCheckoutActive]=useState(false);
  const [gatewayRefresh,setGatewayRefresh]=useState(0);
  // Trust the authenticated server gateway catalog, not a stale build-time flag.
  useEffect(()=>{
    let alive=true;
    setGateways([]);setGateway('');setCheckoutActive(false);setGatewayError('');
    if(!user?.id){setGatewaysLoading(false);return()=>{alive=false;};}
    setGatewaysLoading(true);
    supabase.functions.invoke('payment-gateways',{body:{action:'list'}}).then(({data,error})=>{
      if(!alive)return;
      if(error)throw error;
      const active=data?.checkout_active===true;
      const available=Array.isArray(data?.gateways)?data.gateways.filter(item=>['yoco','paystack'].includes(item.provider)&&item.ready===true&&item.enabled===true):[];
      setCheckoutActive(active);setGateways(active?available:[]);setGateway(active?available[0]?.provider||'':'');
    }).catch(()=>{
      if(!alive)return;
      setGatewayError('Could not check online payment availability. Retry to refresh.');
      setCheckoutActive(false);setGateways([]);setGateway('');
    }).finally(()=>{if(alive)setGatewaysLoading(false);});
    return()=>{alive=false;};
  },[user?.id,gatewayRefresh]);

  const beginCheckout = async (plan) => {
    if(!user?.id) { toast.error('Please sign in first.'); return; }
    if(!checkoutActive || !gateways.some(item=>item.provider===gateway)) { toast.error('Online checkout is unavailable. Refresh payment options.'); return; }
    if(!canBuyPlan(plan.id)) { toast.error('This plan is not available for your account.'); return; }
    setCheckingOut(true);
    const storageKey = `smartbridge-checkout:${appConfig.supabaseUrl}:${user.id}:${plan.id}:${gateway}:${plan.price}`;
    if(!paymentIntent.current) {
      try { const saved=sessionStorage.getItem(storageKey); if(saved && /^[0-9a-f-]{36}$/i.test(saved)) paymentIntent.current={product:plan.id,userId:user.id,gateway,price:plan.price,id:saved}; } catch { /* In-memory retry remains available. */ }
    }
    if(paymentIntent.current?.product !== plan.id || paymentIntent.current?.userId !== user.id || paymentIntent.current?.gateway !== gateway || paymentIntent.current?.price !== plan.price) {
      paymentIntent.current = {product: plan.id, userId: user.id, gateway, price:plan.price, id: crypto.randomUUID()};
      try { sessionStorage.setItem(storageKey,paymentIntent.current.id); } catch { /* In-memory retry remains available. */ }
    }
    try {
      const {data,error} = await supabase.functions.invoke('create-checkout', {
        body: {product: plan.id, request_id: paymentIntent.current.id, gateway}
      });
      if(error) throw error;
      if(data?.status === 'paid') { paymentIntent.current=null; try { sessionStorage.removeItem(storageKey); } catch { /* No stored intent. */ } toast.info('Payment already received. Refresh your account status.'); await loadSubscription(); return; }
      if(data?.amount_cents !== Math.round(plan.price * 100)) { await prices.refetch(); throw new Error('The plan price changed. Review the updated price before paying.'); }
      const redirect = new URL(data.redirect_url);
      if(redirect.protocol !== 'https:' || !(gateway==='paystack'?['checkout.paystack.com']:['c.yoco.com','pay.yoco.com']).includes(redirect.hostname) || redirect.username || redirect.password) throw new Error('Invalid payment redirect.');
      window.location.assign(redirect.href);
    } catch(error) { await prices.refetch(); toast.error(error.message || 'Checkout unavailable. Please retry.'); }
    finally { setCheckingOut(false); }
  };

  useEffect(() => {
    // Pre-select plan based on role
    if (user?.role === 'parent') {
      setSelectedPlan('parent');
    } else if (user?.role === 'sace_tutor' || user?.role === 'student_tutor' || user?.role === 'tutor') {
      setSelectedPlan('tutor_pro');
    } else {
      setSelectedPlan('student');
    }
  }, [user]);

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

  const isPremium = subscription?.plan === 'premium' && subscription?.status === 'active' && subscription.end_date >= new Date().toISOString().slice(0, 10);
  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];
  const canBuyPlan = product => product==='student' ? user?.role==='student'
    : product==='parent' ? user?.role==='parent'
    : product==='tutor_pro' && ['tutor','sace_tutor','student_tutor'].includes(user?.role) && user?.is_verified===true;
  const onlineCheckout=checkoutActive && gateways.length>0;

  const copyRef = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied to clipboard.'); }
    catch { toast.error('Could not copy. Please select and copy the text.'); }
  };

  if (loading || prices.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if(prices.isError || !prices.data) return <div className="max-w-lg mx-auto p-8 space-y-4" role="alert"><h1 className="text-xl font-bold">Subscription prices unavailable</h1><p>Please load the current prices before making a payment.</p><Button onClick={()=>prices.refetch()}>Retry prices</Button></div>;
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/20 mb-4">
            <Star className="w-8 h-8 fill-secondary text-secondary" />
          </div>
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-foreground mb-3">SmartBridge Premium</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">Unlock everything SmartBridge FET has to offer for your academic journey.</p>
        </div>

        {isPremium ? (
          <div className="max-w-lg mx-auto">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-8 pb-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="font-playfair text-2xl font-bold text-foreground mb-2">You're Premium! 🎉</h2>
                <p className="text-muted-foreground mb-4">
                  Your premium membership is active until{' '}
                  <strong>{subscription?.end_date}</strong>.
                </p>
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5 px-4 py-1.5 text-sm">
                  <Star className="w-4 h-4 fill-current" /> Premium Active
                </Badge>
              </CardContent>
            </Card>
          </div>
        ) : (
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
                      isSelected ? 'border-primary ring-2 ring-primary bg-primary/5' : 'border-border hover:border-primary/40 bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
                    </div>
                    <p className="font-semibold text-sm">{p.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                    <p className="font-playfair font-bold text-xl mt-2 text-primary">R{p.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                  </button>
                );
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
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                        <span className="text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {plan.id === 'tutor_pro' && (
                  <div className="mt-4 bg-muted rounded-xl p-4 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Standard Plan (Free)</p>
                    <p>No monthly fee. A <strong>10% commission + R20 flat fee</strong> is deducted from each confirmed booking. Switch to Pro anytime to eliminate commissions.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {!user && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
                    <p className="font-medium text-primary mb-1">Sign in required</p>
                    <p className="text-muted-foreground">Please sign in to activate premium.</p>
                  </div>
                )}

                {/* Option 1: Yoco Payment Link */}
                <Card className="border-border shadow-md">
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <p className="font-playfair text-lg font-bold">{onlineCheckout?'Pay online':'Pay via Yoco'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{onlineCheckout ? `Pay R${plan.price} for one month of access. This is a one-off payment and does not renew automatically. Access updates after verified live payment.` : `Click below to pay R${plan.price} via Yoco. Use your account email as the reference. An administrator will confirm payment before activating access.`}</p>
                    {user && <div className="space-y-2">
                      {gatewaysLoading?<p role="status">Loading payment options…</p>:gatewayError?<p role="alert">{gatewayError}</p>:onlineCheckout?<label className="block text-sm">Payment gateway<select className="block w-full border rounded-md p-2 mt-1 bg-background" value={gateway} onChange={event=>setGateway(event.target.value)}>{gateways.map(item=><option key={item.provider} value={item.provider}>{item.name}{item.mode==='test'?' — test mode':''}</option>)}</select></label>:<p role="status">No online payment gateway is currently available.</p>}
                      {!gatewaysLoading && <Button variant="outline" size="sm" onClick={()=>setGatewayRefresh(value=>value+1)}>Refresh payment options</Button>}
                    </div>}
                    {user && !canBuyPlan(plan.id) && <p role="status" className="text-sm text-amber-800">This plan is not available for your account. Tutor Pro requires a verified tutor profile.</p>}
                    {onlineCheckout ? <Button className="w-full" disabled={!user || !canBuyPlan(plan.id) || checkingOut || !gateway || gatewaysLoading} onClick={() => beginCheckout(plan)}>{checkingOut ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}Pay R{plan.price} securely</Button> : !checkoutActive && !gatewayError && !gatewaysLoading && canBuyPlan(plan.id) && YOCO_LINKS[plan.id] && plan.price === appConfig.prices[plan.id] ? <a
                      href={YOCO_LINKS[plan.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-3 text-sm font-semibold transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Pay R{plan.price} on Yoco Portal
                    </a> : <p role="status" className="text-sm text-muted-foreground">Online payment is currently unavailable. Please contact support.</p>}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
                      {onlineCheckout ? (gateways.find(item=>item.provider===gateway)?.mode==='test' ? 'TEST MODE: No real charge or premium activation occurs. Use only provider test cards.':'Payment returning you to this page does not confirm activation. Refresh your account after verification; contact support if it remains pending.') : <>Payment is processed by <strong>Tech &amp; GUARD</strong> on behalf of SmartBridge FET. Use your account email as the reference. An administrator will verify it during business hours.</>}
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
                    {appConfig.bank ? <div className="space-y-2 bg-white rounded-lg border border-amber-200 p-3 text-xs">
                      {[
                        ['Bank', appConfig.bank?.name],
                        ['Account Name', appConfig.bank?.accountName],
                        ['Account Number', appConfig.bank?.accountNumber],
                        ['Branch Code', appConfig.bank?.branchCode],
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
                    </div> : <p role="status" className="text-sm text-muted-foreground">EFT is currently unavailable. Please contact support.</p>}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                      ⏱ EFT payments are verified by Admin during business hours (Mon–Fri, 8am–5pm SAST).
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200"><CardContent className="pt-5 pb-5 space-y-3">
                  <p className="font-semibold text-sm">After payment</p>
                  <p className="text-xs text-muted-foreground">Keep your payment reference. Premium access becomes active after an administrator confirms payment. Refresh this page after confirmation.</p>
                  <Button onClick={loadSubscription} variant="outline">Check membership status</Button>
                </CardContent></Card>

                <p className="text-xs text-center text-muted-foreground">
                  🔒 Payments processed by Tech &amp; GUARD Pty Ltd on behalf of SmartBridge FET. POPIA compliant.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Legal / IP Ownership footer */}
        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            SmartBridge FET is a digital platform owned and operated by <strong>Tech &amp; GUARD Pty Ltd</strong>. All payments are received by Tech &amp; GUARD Pty Ltd on behalf of the SmartBridge FET platform. Payouts to tutors are processed every Thursday. By subscribing, you agree to the platform's terms and POPIA data handling policy.
          </p>
        </div>
      </div>
    </div>
  );
}
