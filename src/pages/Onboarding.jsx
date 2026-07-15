// src/pages/Onboarding.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GraduationCap, Users, BookOpen, School, CheckCircle, 
  Loader2, Shield, DollarSign, Sparkles, ArrowRight,
  UserCheck, Briefcase, Building2, Mail, Lock,
  Star, Award, TrendingUp, Clock, Zap, Heart
} from 'lucide-react';
import { toast } from 'sonner';
import TutorConsentModal from '@/components/onboarding/TutorConsentModal';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Admin emails
  ADMIN_EMAILS: (import.meta.env.VITE_ADMIN_EMAILS || 'aneleqamata95@gmail.com,aneleq@techandguard.co.za')
    .split(',').map(e => e.trim()),

  // South African Universities
  SA_UNIVERSITIES: (import.meta.env.VITE_SA_UNIVERSITIES || 
    'University of Cape Town (UCT),University of the Witwatersrand (Wits),University of Pretoria (UP),Stellenbosch University (SU),University of KwaZulu-Natal (UKZN),University of Johannesburg (UJ),University of the Free State (UFS),University of the Western Cape (UWC),Rhodes University,North-West University (NWU)'
  ).split(',').map(u => u.trim()),

  // App name
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

  // Company
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME || 'Tech & GUARD Pty Ltd',

  // Feature flags
  ENABLE_PARENT_LINK: import.meta.env.VITE_ENABLE_PARENT_LINK !== 'false',
  ENABLE_TUTOR_CONSENT: import.meta.env.VITE_ENABLE_TUTOR_CONSENT !== 'false',

  // Verification messages
  VERIFICATION: {
    SACE_DAYS: import.meta.env.VITE_SACE_VERIFICATION_DAYS || '1–2 business days',
    TUTOR_DAYS: import.meta.env.VITE_TUTOR_VERIFICATION_DAYS || '1–2 business days',
  },

  // Messages
  MESSAGES: {
    WELCOME: import.meta.env.VITE_ONBOARDING_WELCOME_MSG || 'Tell us who you are so we can personalise your experience.',
    SUCCESS_STUDENT: import.meta.env.VITE_ONBOARDING_SUCCESS_STUDENT || '🎉 Welcome to {app}! Start exploring your learning journey.',
    SUCCESS_TUTOR: import.meta.env.VITE_ONBOARDING_SUCCESS_TUTOR || '✅ Profile submitted! Admin will verify you within {days}.',
    ERROR: import.meta.env.VITE_ONBOARDING_ERROR_MSG || 'Something went wrong. Please try again.',
    FILL_REQUIRED: import.meta.env.VITE_ONBOARDING_FILL_REQUIRED || 'Please complete all required fields.',
    CONSENT_REQUIRED: import.meta.env.VITE_ONBOARDING_CONSENT_REQUIRED || 'Please review and accept the Service Agreement.',
    POLICY_REQUIRED: import.meta.env.VITE_ONBOARDING_POLICY_REQUIRED || 'Please accept the Privacy Policy and Terms of Service.',
  },
};

// ============================================================
// Constants
// ============================================================

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
    color: 'border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50',
    selectedColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-400 dark:border-blue-400 dark:bg-blue-950/50 dark:ring-blue-400',
    desc: 'I am a Grade 10–12 learner looking for study resources and tutor sessions.',
    features: ['Access to 1000+ resources', 'Live tutor sessions', 'AI-powered study tools'],
  },
  {
    id: 'parent',
    label: 'Parent / Guardian',
    icon: Users,
    color: 'border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:hover:bg-green-950/50',
    selectedColor: 'border-green-500 bg-green-100 ring-2 ring-green-400 dark:border-green-400 dark:bg-green-950/50 dark:ring-green-400',
    desc: "I want to monitor my child's academic progress and connect with tutors.",
    features: ['Child progress tracking', 'Weekly email reports', 'Tutor communication'],
  },
  {
    id: 'sace_tutor',
    label: 'SACE Registered Tutor',
    icon: Shield,
    color: 'border-primary/20 bg-primary/5 hover:bg-primary/10 dark:border-primary/30 dark:bg-primary/10 dark:hover:bg-primary/20',
    selectedColor: 'border-primary ring-2 ring-primary bg-primary/10 dark:bg-primary/20 dark:ring-primary',
    desc: 'I am a qualified, SACE-registered educator who wants to tutor learners.',
    features: ['SACE verification', 'Earn income tutoring', 'Build your reputation'],
  },
  {
    id: 'student_tutor',
    label: 'Student Tutor',
    icon: School,
    color: 'border-purple-200 bg-purple-50 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/30 dark:hover:bg-purple-950/50',
    selectedColor: 'border-purple-500 bg-purple-100 ring-2 ring-purple-400 dark:border-purple-400 dark:bg-purple-950/50 dark:ring-purple-400',
    desc: 'I am a university student who wants to tutor Grade 10–12 learners.',
    features: ['University verified', 'Flexible hours', 'Gain teaching experience'],
  },
];

// ============================================================
// Sub-Components
// ============================================================

function RoleCard({ role, isSelected, onSelect }) {
  const Icon = role.icon;
  
  return (
    <button
      onClick={() => onSelect(role.id)}
      className={`text-left p-4 rounded-2xl border-2 transition-all duration-300 group ${
        isSelected ? role.selectedColor : role.color
      } hover:scale-[1.02] active:scale-[0.98]`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected 
            ? 'bg-white/80 dark:bg-black/20' 
            : 'bg-white/60 dark:bg-black/10'
        }`}>
          <Icon className={`w-5 h-5 transition-colors ${
            isSelected ? 'text-foreground' : 'text-foreground/60'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm transition-colors ${
              isSelected ? 'text-foreground' : 'text-foreground/70'
            }`}>
              {role.label}
            </span>
            {isSelected && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{role.desc}</p>
          {isSelected && role.features && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {role.features.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-[10px] font-medium">
                  {feature}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================
// Main Component
// ============================================================

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
  const [step, setStep] = useState(1); // Step 1: Role, Step 2: Details

  // ============================================================
  // Admin Redirect
  // ============================================================

  const isAdmin = useMemo(() => 
    CONFIG.ADMIN_EMAILS.includes(user?.email) || 
    user?.role === 'admin' || 
    user?.is_super_admin === true,
    [user]
  );

  useEffect(() => {
    if (isAdmin) {
      navigate('/', { replace: true });
    }
  }, [isAdmin, navigate]);

  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Redirecting to dashboard...</p>
      </div>
    );
  }

  // ============================================================
  // Computed
  // ============================================================

  const isTutorRole = selectedRole === 'sace_tutor' || selectedRole === 'student_tutor';
  const isParentRole = selectedRole === 'parent';

  const canSubmit = () => {
    if (!selectedRole) return false;
    if (selectedRole === 'sace_tutor' && !saceNumber.trim()) return false;
    if (selectedRole === 'student_tutor' && (!university || !studentNumber.trim())) return false;
    if (!policyConsent) return false;
    return true;
  };

  const getRoleLabel = () => {
    const role = ROLES.find(r => r.id === selectedRole);
    return role?.label || '';
  };

  // ============================================================
  // Submission
  // ============================================================

  const handleSubmitClick = () => {
    if (!canSubmit()) {
      toast.error(CONFIG.MESSAGES.FILL_REQUIRED);
      return;
    }
    if (isTutorRole && !consentAccepted && CONFIG.ENABLE_TUTOR_CONSENT) {
      setShowConsent(true);
      return;
    }
    doSubmit(selectedRole);
  };

  const doSubmit = async (role) => {
    const isTutor = role === 'sace_tutor' || role === 'student_tutor';
    setSaving(true);

    try {
      // 1. Build profile updates
      const profileUpdates = {
        role: isTutor ? 'tutor_pending' : role,
        onboarding_complete: true,
        trial_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

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

      // 2. Update users table (not user_profiles) – this is the correct table
      const { error: updateError } = await supabase
        .from('users')
        .update(profileUpdates)
        .eq('email', user.email);

      if (updateError) throw updateError;

      // 3. Handle tutor profile
      if (isTutor) {
        const tutorType = role === 'sace_tutor' ? 'SACE Tutor' : 'Student Tutor';
        const credentials = role === 'sace_tutor'
          ? `SACE Number: ${saceNumber}`
          : `University: ${university} | Student No: ${studentNumber}`;
        const qualifications = role === 'student_tutor'
          ? `${university} — Student No. ${studentNumber}`
          : `SACE Registered: ${saceNumber}`;

        const { data: existingProfile } = await supabase
          .from('tutor_profiles')
          .select('id')
          .eq('user_email', user.email)
          .maybeSingle();

        if (existingProfile) {
          await supabase
            .from('tutor_profiles')
            .update({
              full_name: user.full_name || user.email,
              sace_number: saceNumber || '',
              qualifications: [qualifications],
              is_verified: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingProfile.id);
        } else {
          await supabase
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
        }

        // Log activity
        await supabase.from('activity_log').insert({
          event_type: 'user_joined',
          user_email: user.email,
          description: `New ${tutorType} registered: ${user.full_name || user.email} — Awaiting verification.`,
        }).catch(() => {});

        // Send admin alerts
        const adminUrl = `${window.location.origin}/admin`;
        setTimeout(() => {
          CONFIG.ADMIN_EMAILS.forEach(email => {
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
                  ``,
                  `— ${CONFIG.COMPANY_NAME}`,
                ].join('\n'),
                from_name: CONFIG.APP_NAME,
              }
            }).catch(() => {});
          });
        }, 500);
      }

      toast.success(
        isTutor
          ? CONFIG.MESSAGES.SUCCESS_TUTOR.replace('{days}', CONFIG.VERIFICATION.TUTOR_DAYS)
          : CONFIG.MESSAGES.SUCCESS_STUDENT.replace('{app}', CONFIG.APP_NAME)
      );
      
      setSaving(false);
      onComplete?.();

    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error(CONFIG.MESSAGES.ERROR);
      setSaving(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome to {CONFIG.APP_NAME}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {CONFIG.MESSAGES.WELCOME}
          </p>
          {user?.full_name && (
            <p className="text-sm text-primary mt-1 font-medium flex items-center justify-center gap-1">
              <UserCheck className="w-4 h-4" /> Hi, {user.full_name}! 👋
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s === step 
                  ? 'bg-primary text-primary-foreground scale-110 shadow-md' 
                  : s < step 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                {s < step ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-500' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {ROLES.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  isSelected={selectedRole === role.id}
                  onSelect={(id) => {
                    setSelectedRole(id);
                    setStep(2);
                  }}
                />
              ))}
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Choose the role that best describes you. You can always update this later.
              </p>
            </div>
          </>
        )}

        {/* Step 2: Details & Verification */}
        {step === 2 && (
          <>
            {/* Back button */}
            <button
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-4"
            >
              ← Back to role selection
            </button>

            {/* Role badge */}
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-primary/10 text-primary text-sm px-3 py-1">
                {getRoleLabel()}
              </Badge>
              <span className="text-xs text-muted-foreground">— Complete your profile</span>
            </div>

            {/* SACE Tutor Fields */}
            {selectedRole === 'sace_tutor' && (
              <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm">SACE Registration Verification</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your SACE registration number. Our admin team will verify it before activating tutor privileges.
                </p>
                <div className="space-y-1.5">
                  <Label>SACE Registration Number *</Label>
                  <Input
                    placeholder="e.g. 20012345678"
                    value={saceNumber}
                    onChange={e => setSaceNumber(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800">
                  ⏳ Your profile will be reviewed within {CONFIG.VERIFICATION.SACE_DAYS}
                </Badge>
              </div>
            )}

            {/* Student Tutor Fields */}
            {selectedRole === 'student_tutor' && (
              <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <School className="w-4 h-4 text-purple-600" />
                  <p className="font-semibold text-sm">University Verification</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select your university and enter your student number for verification.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>University *</Label>
                    <Select value={university} onValueChange={setUniversity}>
                      <SelectTrigger><SelectValue placeholder="Select your university..." /></SelectTrigger>
                      <SelectContent>
                        {CONFIG.SA_UNIVERSITIES.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
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
                <Badge variant="outline" className="text-xs text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800">
                  ⏳ Your profile will be reviewed within {CONFIG.VERIFICATION.TUTOR_DAYS}
                </Badge>
              </div>
            )}

            {/* Parent Fields */}
            {selectedRole === 'parent' && CONFIG.ENABLE_PARENT_LINK && (
              <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-green-600" />
                  <p className="font-semibold text-sm">Link Your Child's Account (Optional)</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your child's registered email to automatically view their progress reports.
                </p>
                <div className="space-y-1.5">
                  <Label>Child's {CONFIG.APP_NAME} Email</Label>
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
            {isTutorRole && CONFIG.ENABLE_TUTOR_CONSENT && (
              <>
                {!consentAccepted ? (
                  <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 rounded-xl p-4 mb-4 text-xs text-amber-800 dark:text-amber-400">
                    <p className="font-semibold mb-0.5">⚖️ Service Agreement Required</p>
                    <p>You'll need to review and accept the Independent Tutor Service Agreement before completing registration.</p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-green-800 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span>Service Agreement accepted. You may now complete your registration.</span>
                  </div>
                )}
              </>
            )}

            {/* Policy Consent */}
            <div className="flex items-start gap-3 mb-5 p-4 bg-card border border-border rounded-xl shadow-sm">
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

            {/* Submit Button */}
            <Button
              onClick={handleSubmitClick}
              disabled={!canSubmit() || saving}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2 text-base py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              {saving ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Setting up your account...</>
              ) : (
                <>
                  {isTutorRole && !consentAccepted && CONFIG.ENABLE_TUTOR_CONSENT 
                    ? 'Review Agreement & Register' 
                    : 'Complete Setup & Enter SmartBridge'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-3">
              You can update your profile details anytime from your dashboard.
            </p>
          </>
        )}
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
