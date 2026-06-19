import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Users, BookOpen, School, CheckCircle, Loader2, Shield, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import TutorConsentModal from '@/components/onboarding/TutorConsentModal';

const ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];

const SA_UNIVERSITIES = [
  'University of Cape Town (UCT)',
  'University of the Witwatersrand (Wits)',
  'University of Pretoria (UP)',
  'Stellenbosch University (SU)',
  'University of KwaZulu-Natal (UKZN)',
  'University of Johannesburg (UJ)',
  'University of the Free State (UFS)',
  'University of the Western Cape (UWC)',
  'Rhodes University',
  'North-West University (NWU)',
  'Durban University of Technology (DUT)',
  'Cape Peninsula University of Technology (CPUT)',
  'Tshwane University of Technology (TUT)',
  'University of Limpopo (UL)',
  'University of Venda (UNIVEN)',
  'University of Zululand (UNIZULU)',
  'Mangosuthu University of Technology (MUT)',
  'Central University of Technology (CUT)',
  'Vaal University of Technology (VUT)',
  'Walter Sisulu University (WSU)',
  'University of Mpumalanga (UMP)',
  'Sefako Makgatho Health Sciences University (SMU)',
  'Sol Plaatje University (SPU)',
];

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
    color: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    selectedColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-400',
    desc: 'I am a Grade 10–12 learner looking for study resources and tutor sessions.',
  },
  {
    id: 'parent',
    label: 'Parent / Guardian',
    icon: Users,
    color: 'border-green-200 bg-green-50 hover:bg-green-100',
    selectedColor: 'border-green-500 bg-green-100 ring-2 ring-green-400',
    desc: "I want to monitor my child's academic progress and connect with tutors.",
  },
  {
    id: 'sace_tutor',
    label: 'SACE Registered Tutor',
    icon: Shield,
    color: 'border-primary/20 bg-primary/5 hover:bg-primary/10',
    selectedColor: 'border-primary ring-2 ring-primary bg-primary/10',
    desc: 'I am a qualified, SACE-registered educator who wants to tutor learners.',
  },
  {
    id: 'student_tutor',
    label: 'Student Tutor',
    icon: School,
    color: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
    selectedColor: 'border-purple-500 bg-purple-100 ring-2 ring-purple-400',
    desc: 'I am a university student who wants to tutor Grade 10–12 learners.',
  },
];

export default function Onboarding({ user, onComplete }) {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('');
  const [saceNumber, setSaceNumber] = useState('');
  const [university, setUniversity] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [linkedEmail, setLinkedEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [saving, setSaving] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [policyConsent, setPolicyConsent] = useState(false);

  // ✅ IMMEDIATE ADMIN REDIRECT - Runs BEFORE rendering the form
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  // If admin, redirect to home IMMEDIATELY
  useEffect(() => {
    if (isAdmin) {
      console.log('Admin detected - redirecting to dashboard');
      navigate('/', { replace: true });
    }
  }, [isAdmin, navigate]);

  // If admin, show NOTHING - just a loading spinner while redirecting
  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to admin dashboard...</p>
      </div>
    );
  }

  const isTutorRole = selectedRole === 'sace_tutor' || selectedRole === 'student_tutor';

  const canSubmit = () => {
    if (!selectedRole) return false;
    if (selectedRole === 'sace_tutor' && !saceNumber.trim()) return false;
    if (selectedRole === 'student_tutor' && (!university || !studentNumber.trim())) return false;
    if (!policyConsent) return false;
    return true;
  };

  const handleSubmitClick = () => {
    if (!canSubmit()) { toast.error('Please complete all required fields.'); return; }
    if (isTutorRole && !consentAccepted) {
      setShowConsent(true);
      return;
    }
    doSubmit(selectedRole);
  };

  const doSubmit = async (role) => {
    const resolvedRole = role || selectedRole;
    const isTutor = resolvedRole === 'sace_tutor' || resolvedRole === 'student_tutor';
    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('No authenticated user');

      const assignedRole = isTutor ? 'tutor_pending' : resolvedRole;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          role: assignedRole,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
          ...(resolvedRole === 'sace_tutor' && { sace_number: saceNumber, tutor_type: 'sace_tutor' }),
          ...(resolvedRole === 'student_tutor' && { university, student_number: studentNumber, tutor_type: 'student_tutor' }),
          ...(resolvedRole === 'parent' && linkedEmail && { linked_student_email: linkedEmail }),
        })
        .eq('email', authUser.email);

      if (updateError) throw updateError;

      if (isTutor) {
        const tutorType = resolvedRole === 'sace_tutor' ? 'SACE Tutor' : 'Student Tutor';
        const qualifications = resolvedRole === 'student_tutor'
          ? `${university} — Student No. ${studentNumber}`
          : `SACE Registered: ${saceNumber}`;

        const { data: existingProfiles } = await supabase
          .from('tutor_profiles')
          .select('*')
          .eq('user_email', authUser.email);

        if (!existingProfiles || existingProfiles.length === 0) {
          await supabase.from('tutor_profiles').insert({
            user_email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email,
            sace_number: saceNumber || '',
            qualifications: [qualifications],
            subjects: [],
            hourly_rate: 0,
            is_verified: false,
            is_premium: selectedPlan === 'pro',
            rating: 0,
            bio: '',
          });
        } else {
          await supabase
            .from('tutor_profiles')
            .update({
              full_name: authUser.user_metadata?.full_name || authUser.email,
              sace_number: saceNumber || '',
              qualifications: [qualifications],
              is_verified: false,
              is_premium: selectedPlan === 'pro',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingProfiles[0].id);
        }

        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1);
        
        await supabase.from('subscriptions').insert({
          user_email: authUser.email,
          plan: selectedPlan === 'pro' ? 'tutor_pro' : 'tutor_standard',
          status: 'active',
          amount_paid: selectedPlan === 'pro' ? 150 : 0,
          currency: 'ZAR',
          start_date: now.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          plan_type: 'tutor',
        });

        toast.info(`Admin will be notified of your registration for verification.`);
      }

      toast.success(
        isTutor
          ? `✅ Profile submitted! ${selectedPlan === 'pro' ? 'Pro Plan' : 'Standard Plan'} activated.`
          : '🎉 Welcome to SmartBridge FET!'
      );
      setSaving(false);
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  // Normal onboarding form for non-admin users
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-playfair text-3xl font-bold mb-2">Welcome to SmartBridge FET</h1>
          <p className="text-muted-foreground">Tell us who you are so we can personalise your experience.</p>
          {user?.full_name && <p className="text-sm text-primary mt-1 font-medium">Hi, {user.full_name}! 👋</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {ROLES.map(role => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${isSelected ? role.selectedColor : role.color}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{role.label}</span>
                    {isSelected && <CheckCircle className="w-4 h-4 text-green-600" />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{role.desc}</p>
              </button>
            );
          })}
        </div>

        {selectedRole === 'sace_tutor' && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <p className="font-semibold text-sm">SACE Registration Verification</p>
            </div>
            <p className="text-xs text-muted-foreground">Enter your SACE registration number. Our admin team will verify it before activating tutor privileges.</p>
            <div className="space-y-1.5">
              <Label>SACE Registration Number *</Label>
              <Input
                placeholder="e.g. 20012345678"
                value={saceNumber}
                onChange={e => setSaceNumber(e.target.value)}
                className="font-mono"
              />
            </div>
            <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
              ⏳ Your profile will be reviewed by an admin before going live
            </Badge>
          </div>
        )}

        {selectedRole === 'student_tutor' && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <School className="w-4 h-4 text-purple-600" />
              <p className="font-semibold text-sm">University Verification</p>
            </div>
            <p className="text-xs text-muted-foreground">Select your university and enter your student number for verification.</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>University *</Label>
                <Select value={university} onValueChange={setUniversity}>
                  <SelectTrigger><SelectValue placeholder="Select your university..." /></SelectTrigger>
                  <SelectContent>
                    {SA_UNIVERSITIES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Student Number *</Label>
                <Input
                  placeholder="e.g. 2023012345"
                  value={studentNumber}
                  onChange={e => setStudentNumber(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <Badge variant="outline" className="text-xs text-purple-700 border-purple-200 bg-purple-50">
              ⏳ Your student tutor profile will be reviewed by an admin
            </Badge>
          </div>
        )}

        {selectedRole === 'parent' && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-600" />
              <p className="font-semibold text-sm">Link Your Child's Account (Optional)</p>
            </div>
            <p className="text-xs text-muted-foreground">Enter your child's registered email to automatically view their progress reports.</p>
            <div className="space-y-1.5">
              <Label>Child's SmartBridge FET Email</Label>
              <Input
                type="email"
                placeholder="child@example.com"
                value={linkedEmail}
                onChange={e => setLinkedEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {isTutorRole && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <p className="font-semibold text-sm">Choose Your Payment Plan</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Select how you want to earn on SmartBridge FET. You can change plans anytime in your dashboard.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan('standard')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedPlan === 'standard' 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">Standard Plan</p>
                  <span className="text-xs text-green-600 font-medium">R0/month</span>
                </div>
                <p className="text-xs text-muted-foreground">10% commission + R20 per booking</p>
                <ul className="mt-2 space-y-0.5">
                  <li className="text-[11px] text-green-600 flex items-center gap-1">✓ No monthly fee</li>
                  <li className="text-[11px] text-muted-foreground flex items-center gap-1">○ Commission deducted from each booking</li>
                  <li className="text-[11px] text-muted-foreground flex items-center gap-1">○ Standard listing in tutor directory</li>
                </ul>
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedPlan('pro')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedPlan === 'pro' 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">Pro Plan</p>
                  <span className="text-xs text-primary font-medium">R150/month</span>
                </div>
                <p className="text-xs text-muted-foreground">0% commission — keep 100% of earnings</p>
                <ul className="mt-2 space-y-0.5">
                  <li className="text-[11px] text-primary flex items-center gap-1">✓ No commission on bookings</li>
                  <li className="text-[11px] text-green-600 flex items-center gap-1">✓ Featured listing in search results</li>
                  <li className="text-[11px] text-green-600 flex items-center gap-1">✓ Priority support</li>
                  <li className="text-[11px] text-green-600 flex items-center gap-1">✓ Advanced analytics dashboard</li>
                </ul>
              </button>
            </div>
            
            {selectedPlan === 'pro' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mt-2">
                💡 Pro Plan costs R150/month. You will be billed monthly. You can upgrade or downgrade anytime in your dashboard.
              </div>
            )}
          </div>
        )}

        {isTutorRole && !consentAccepted && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-xs text-amber-800">
            <p className="font-semibold mb-0.5">⚖️ Service Agreement Required</p>
            <p>You'll need to review and accept the Independent Tutor Service Agreement before completing registration.</p>
          </div>
        )}
        {isTutorRole && consentAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-green-800">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>Service Agreement accepted. You may now complete your registration.</span>
          </div>
        )}

        <div className="flex items-start gap-3 mb-5 p-4 bg-card border border-border rounded-xl">
          <Checkbox
            id="policyConsent"
            checked={policyConsent}
            onCheckedChange={setPolicyConsent}
            className="mt-1 flex-shrink-0"
          />
          <Label htmlFor="policyConsent" className="text-xs text-foreground cursor-pointer leading-relaxed">
            I have read and agree to the{' '}
            <Link to="/privacy" target="_blank" className="text-primary font-semibold hover:underline">
              Privacy Policy
            </Link>
            {' '}and{' '}
            <Link to="/terms" target="_blank" className="text-primary font-semibold hover:underline">
              Terms of Service
            </Link>
            .
          </Label>
        </div>

        <Button
          onClick={handleSubmitClick}
          disabled={!canSubmit() || saving}
          className="w-full bg-primary gap-2 text-base py-5 rounded-xl"
          size="lg"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {saving ? 'Setting up your account...' : isTutorRole && !consentAccepted ? 'Review Agreement & Register' : 'Complete Setup & Enter SmartBridge'}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-3">You can update your profile details anytime from your dashboard.</p>
      </div>

      <TutorConsentModal
        open={showConsent}
        user={user}
        onAccept={() => {
          setConsentAccepted(true);
          setShowConsent(false);
          setTimeout(() => doSubmit(selectedRole), 100);
        }}
        onDecline={() => setShowConsent(false)}
      />
    </div>
  );
}
