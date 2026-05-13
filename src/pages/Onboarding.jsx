import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Users, BookOpen, School, CheckCircle, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import TutorConsentModal from '@/components/onboarding/TutorConsentModal';

const ADMIN_EMAILS = ['aneleq@techandguard.co.za', 'aneleqamata95@gmail.com'];

// SA Universities ordered by ranking (1 = highest ranked)
const SA_UNIVERSITIES = [
  'University of Cape Town (UCT)',
  'University of the Witwatersrand (Wits)',
  'Stellenbosch University (SU)',
  'University of Johannesburg (UJ)',
  'University of Pretoria (UP)',
  'University of KwaZulu-Natal (UKZN)',
  'University of South Africa (UNISA)',
  'North-West University (NWU)',
  'University of the Western Cape (UWC)',
  'Rhodes University',
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

export default function Onboarding({ user, userProfile, onComplete }) {
  const [selectedRole, setSelectedRole] = useState('');
  const [saceNumber, setSaceNumber] = useState('');
  const [university, setUniversity] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [linkedEmail, setLinkedEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [policyConsent, setPolicyConsent] = useState(false);

  const isTutorRole = selectedRole === 'sace_tutor' || selectedRole === 'student_tutor';

  const canSubmit = () => {
    if (!selectedRole) return false;
    if (selectedRole === 'sace_tutor' && !saceNumber.trim()) return false;
    if (selectedRole === 'student_tutor' && (!university || !studentNumber.trim())) return false;
    if (!policyConsent) return false;
    return true;
  };

  const handleSaceChange = (val) => setSaceNumber(val);
  const handleStudentNumberChange = (val) => setStudentNumber(val);
  const handleUniversityChange = (val) => setUniversity(val);

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
      // 1. Update user profile in Supabase (user_profiles table)
      const assignedRole = isTutor ? 'tutor_pending' : resolvedRole;
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          role: assignedRole,
          onboarding_complete: true,
          ...(resolvedRole === 'sace_tutor' && { sace_number: saceNumber }),
          ...(resolvedRole === 'student_tutor' && { university, student_number: studentNumber }),
          ...(resolvedRole === 'parent' && linkedEmail && { linked_student_email: linkedEmail }),
        })
        .eq('email', user.email);

      if (profileError) throw profileError;

      // 2. If tutor, create TutorProfile record
      if (isTutor) {
        const tutorType = resolvedRole === 'sace_tutor' ? 'SACE Tutor' : 'Student Tutor';
        const credentials = resolvedRole === 'sace_tutor'
          ? `SACE Number: ${saceNumber}`
          : `University: ${university} | Student No: ${studentNumber}`;
        const qualifications = resolvedRole === 'student_tutor'
          ? `${university} — Student No. ${studentNumber}`
          : `SACE Registered: ${saceNumber}`;

        // Check if TutorProfile already exists
        const { data: existing } = await supabase
          .from('tutor_profiles')
          .select('*')
          .eq('user_email', user.email)
          .maybeSingle();

        if (!existing) {
          await supabase.from('tutor_profiles').insert({
            user_email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            sace_number: saceNumber || '',
            university: university || '',
            student_number: studentNumber || '',
            qualifications,
            is_verified: false,
            is_premium: false,
            hourly_rate: 0,
          });
        } else {
          await supabase
            .from('tutor_profiles')
            .update({
              sace_number: saceNumber || '',
              university: university || '',
              student_number: studentNumber || '',
              qualifications,
              is_verified: false,
            })
            .eq('user_email', user.email);
        }

        // 3. Send email notification to admin using Resend + Supabase Edge Function
        const tutorName = user.user_metadata?.full_name || user.email;
        const adminEmail = ADMIN_EMAILS[0];
        
        try {
          const { error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: adminEmail,
              subject: `📋 New Tutor Pending Verification: ${tutorName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #0F766E;">New Tutor Registration</h2>
                  
                  <div style="background-color: #f0fdf4; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #166534;">📝 Tutor Details</h3>
                    <p><strong>Name:</strong> ${tutorName}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Tutor Type:</strong> ${resolvedRole === 'sace_tutor' ? 'SACE Registered Tutor' : 'Student Tutor'}</p>
                    ${resolvedRole === 'sace_tutor' ? `<p><strong>SACE Number:</strong> ${saceNumber}</p>` : ''}
                    ${resolvedRole === 'student_tutor' ? `<p><strong>University:</strong> ${university}</p>` : ''}
                    ${resolvedRole === 'student_tutor' ? `<p><strong>Student Number:</strong> ${studentNumber}</p>` : ''}
                  </div>
                  
                  <div style="background-color: #fef3c7; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #92400e;">⏳ Action Required</h3>
                    <p>This tutor is waiting for verification. Please review their credentials and approve or reject their application.</p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${window.location.origin}/admin" 
                       style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                      🚀 Go to Admin Dashboard
                    </a>
                  </div>
                  
                  <hr style="margin: 20px 0; border-color: #e5e7eb;">
                  
                  <p style="font-size: 11px; color: #999; text-align: center;">
                    — EduConnect FET / Tech &amp; GUARD Pty Ltd<br>
                    <a href="${window.location.origin}" style="color: #0F766E;">${window.location.origin}</a>
                  </p>
                </div>
              `,
            },
          });
          
          if (emailError) {
            console.error('Failed to send admin email:', emailError);
          } else {
            console.log('Admin notification email sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending admin email:', emailError);
        }

        toast.info(`Admin verification required for ${user.email}. An email notification has been sent to the admin.`);
      }

      toast.success(
        isTutor
          ? '✅ Profile submitted! Admin will verify you within 1–2 business days.'
          : '🎉 Welcome to EduConnect FET!'
      );
      
      onComplete?.();
    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
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
          <h1 className="font-playfair text-3xl font-bold mb-2">Welcome to EduConnect FET</h1>
          <p className="text-muted-foreground">Tell us who you are so we can personalise your experience.</p>
          {user?.user_metadata?.full_name && <p className="text-sm text-primary mt-1 font-medium">Hi, {user.user_metadata.full_name}! 👋</p>}
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
                onChange={e => handleSaceChange(e.target.value)}
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
                <Select value={university} onValueChange={handleUniversityChange}>
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
                  onChange={e => handleStudentNumberChange(e.target.value)}
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
              <Label>Child's EduConnect Email</Label>
              <Input
                type="email"
                placeholder="child@example.com"
                value={linkedEmail}
                onChange={e => setLinkedEmail(e.target.value)}
              />
            </div>
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

        {/* POPIA Consent Checkbox */}
        <div className="flex items-start gap-3 mb-5 p-4 bg-card border border-border rounded-xl">
          <Checkbox
            id="policyConsent"
            checked={policyConsent}
            onCheckedChange={setPolicyConsent}
            className="mt-1 flex-shrink-0"
          />
          <label htmlFor="policyConsent" className="text-xs text-foreground cursor-pointer leading-relaxed">
            I have read and agree to the{' '}
            <Link to="/privacy" target="_blank" className="text-primary font-semibold hover:underline">
              Privacy Policy
            </Link>
            {' '}and{' '}
            <Link to="/terms" target="_blank" className="text-primary font-semibold hover:underline">
              Terms of Service
            </Link>
            .
          </label>
        </div>

        <Button
          onClick={handleSubmitClick}
          disabled={!canSubmit() || saving}
          className="w-full bg-primary gap-2 text-base py-5 rounded-xl"
          size="lg"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {saving ? 'Setting up your account...' : isTutorRole && !consentAccepted ? 'Review Agreement & Register' : 'Complete Setup & Enter EduConnect'}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-3">You can update your profile details anytime from your dashboard.</p>
      </div>

      <TutorConsentModal
        open={showConsent}
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
