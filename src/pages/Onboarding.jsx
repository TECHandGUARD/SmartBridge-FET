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

  // ✅ IMMEDIATE ADMIN DETECTION & REDIRECT
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  useEffect(() => {
    if (isAdmin) {
      console.log('Admin detected - redirecting to dashboard');
      // Force redirect to home (which will route to dashboard)
      navigate('/', { replace: true });
    }
  }, [isAdmin, navigate]);

  // If admin, show a loading spinner while redirecting (prevents form from rendering)
  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to admin dashboard...</p>
      </div>
    );
  }

  // --- Normal onboarding for non-admin users (unchanged) ---
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
      onComplete?.();
    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  // The rest of the UI (same as before) – only shown for non-admin users
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

        {/* Role cards, etc. – unchanged */}
        {/* ... (the rest of your existing JSX) ... */}
        {/* To save space, I'll omit the repeated UI, but you should keep your existing form content */}
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
