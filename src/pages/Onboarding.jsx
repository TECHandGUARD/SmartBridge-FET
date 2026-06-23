// src/pages/Onboarding.jsx
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
  const [saving, setSaving] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [policyConsent, setPolicyConsent] = useState(false);

  // ✅ Admin redirect (already logged in as admin)
  useEffect(() => {
    const isAdmin = ADMIN_EMAILS.includes(user?.email) || user?.role === 'admin' || user?.is_super_admin === true;
    if (isAdmin) {
      console.log('🚀 Admin detected in Onboarding – redirecting to home');
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // If admin, show loading spinner
  const isAdmin = ADMIN_EMAILS.includes(user?.email) || user?.role === 'admin' || user?.is_super_admin === true;
  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
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
    const isTutor = role === 'sace_tutor' || role === 'student_tutor';
    setSaving(true);

    try {
      // 1. Build the user profile update
      const profileUpdates = {
        role: isTutor ? 'tutor_pending' : role,
        onboarding_complete: true,
        trial_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add tutor-specific fields
      if (role === 'sace_tutor') {
        profileUpdates.sace_number = saceNumber;
      }
      if (role === 'student_tutor') {
        profileUpdates.university = university;
        profileUpdates.student_number = studentNumber;
      }
      if (role === 'parent' && linkedEmail) {
        profileUpdates.linked_student_email = linkedEmail;
      }

      // ✅ Update user_profiles
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('email', user.email);

      if (updateError) throw updateError;

      // 2. If tutor, create/update tutor profile
      if (isTutor) {
        const tutorType = role === 'sace_tutor' ? 'SACE Tutor' : 'Student Tutor';
        const credentials = role === 'sace_tutor'
          ? `SACE Number: ${saceNumber}`
          : `University: ${university} | Student No: ${studentNumber}`;
        const qualifications = role === 'student_tutor'
          ? `${university} — Student No. ${studentNumber}`
          : `SACE Registered: ${saceNumber}`;

        // Check for existing tutor profile
        const { data: existingProfile } = await supabase
          .from('tutor_profiles')
          .select('id')
          .eq('user_email', user.email)
          .maybeSingle();

        if (existingProfile) {
          // Update
          const { error: tutorUpdateError } = await supabase
            .from('tutor_profiles')
            .update({
              full_name: user.full_name || user.email,
              sace_number: saceNumber || '',
              qualifications: [qualifications],
              is_verified: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingProfile.id);
          if (tutorUpdateError) throw tutorUpdateError;
        } else {
          // Create
          const { error: tutorInsertError } = await supabase
            .from('tutor_profiles')
            .insert({
              user_email: user.email,
              full_name: user.full_name || user.email,
              sace_number: saceNumber || '',
              qualifications: [qualifications],
              subjects: [],
              hourly_rate: 0,
              is_verified: false,
              is_premium: false,
              rating: 0,
              bio: '',
            });
          if (tutorInsertError) throw tutorInsertError;
        }

        // ✅ Log activity
        await supabase.from('activity_logs').insert({
          event_type: 'user_joined',
          user_email: user.email,
          description: `New ${tutorType} registered: ${user.full_name || user.email} — Awaiting verification.`,
        }).catch(() => {});

        // ✅ Send admin alert emails (fire and forget)
        const adminEmails = ['aneleq@techandguard.co.za', 'aneleqamata95@gmail.com'];
        const adminUrl = `${window.location.origin}/admin`;
        setTimeout(() => {
          adminEmails.forEach(email => {
            supabase.functions.invoke('send-email', {
              body: {
                to: email,
                subject: `🚨 New Tutor Pending — ${user.full_name || user.email}`,
                text: [
                  `New ${tutorType} requires verification on SmartBridge FET.`,
                  ``,
                  `👤 Name: ${user.full_name || 'Not provided'}`,
                  `📧 Email: ${user.email}`,
                  `📋 ${credentials}`,
                  `⏰ ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} SAST`,
                  ``,
                  `👉 Verify now: ${adminUrl}`,
                  `(Verification tab → find their name → click Verify)`,
                  ``,
                  `— SmartBridge FET / Tech & GUARD Pty Ltd`,
                ].join('\n'),
                from_name: 'SmartBridge FET'
              }
            }).catch(() => {});
          });
        }, 500);
      }

      toast.success(
        isTutor
          ? '✅ Profile submitted! Admin will verify you within 1–2 business days.'
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-playfair text-3xl font-bold mb-2">Welcome to SmartBridge FET</h1>
          <p className="text-muted-foreground">Tell us who you are so we can personalise your experience.</p>
          {user?.full_name && <p className="text-sm text-primary mt-1 font-medium">Hi, {user.full_name}! 👋</p>}
        </div>

        {/* Role cards */}
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

        {/* Conditional fields */}
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

        {/* Consent & Policy */}
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
            </Link>.
          </Label>
        </div>

        <Button
          onClick={handleSubmitClick}
          disabled={!canSubmit() || saving}
          className="w-full bg-primary gap-2 text-base py-5 rounded-xl"
          size="lg"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {saving ? 'Setting up your account...' : isTutorRole && !consentAccepted ? 'Review Agreement & Register' : 'Complete Setup'}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-3">You can update your profile details anytime from your dashboard.</p>
      </div>

      {/* Consent Modal */}
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
