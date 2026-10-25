import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { getAccountDestination, getDashboardPath } from '@/lib/navigation';
import { useAuth } from '@/lib/AuthContext';
import { withTimeout } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, GraduationCap, Users, Shield, School, Check, ArrowRight, Loader2 } from 'lucide-react';
import TutorConsentModal from '@/components/onboarding/TutorConsentModal';

const ROLES = [
  { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Study resources, practice and tutor sessions for Grade 10–12 learners.' },
  { id: 'parent', label: 'Parent / Guardian', icon: Users, desc: 'Link a learner, follow their progress and find learning support.' },
  { id: 'sace_tutor', label: 'SACE Registered Tutor', icon: Shield, desc: 'Apply to tutor learners as a SACE-registered educator.' },
  { id: 'student_tutor', label: 'Student Tutor', icon: School, desc: 'Apply to offer paid tutoring opportunities to Grade 10–12 learners while building teaching experience. Approval and bookings are not guaranteed.' },
];
const UNIVERSITIES = ['University of Cape Town (UCT)', 'University of the Witwatersrand (Wits)', 'University of Pretoria (UP)', 'Stellenbosch University (SU)', 'University of KwaZulu-Natal (UKZN)', 'University of Johannesburg (UJ)', 'University of the Free State (UFS)', 'University of the Western Cape (UWC)', 'Rhodes University', 'North-West University (NWU)'];

export default function Onboarding({ user, onComplete }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [role, setRole] = useState('');
  const [step, setStep] = useState(0);
  const [saceNumber, setSaceNumber] = useState('');
  const [university, setUniversity] = useState('');
  const [otherUniversity, setOtherUniversity] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [policyConsent, setPolicyConsent] = useState(false);
  const [tutorStopProfileReminders, setTutorStopProfileReminders] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const heading = useRef(null);
  const tutor = role === 'sace_tutor' || role === 'student_tutor';
  const universityName = university === 'other' ? otherUniversity.trim() : university;
  const steps = tutor ? ['Your role', 'Credentials', 'Review & consent'] : ['Your role', 'Review & consent'];
  const lastStep = step === steps.length - 1;
  const credentialsValid = role === 'sace_tutor' ? !!saceNumber.trim() : !!universityName && !!studentNumber.trim();
  const canContinue = step === 0 ? !!role : credentialsValid;
  const selectedRole = ROLES.find(option => option.id === role);

  useEffect(() => {
    if (user?.is_super_admin === true || user?.onboarding_complete) navigate(getAccountDestination(user), { replace: true });
  }, [user, navigate]);
  useEffect(() => { heading.current?.focus(); }, [step]);

  const move = next => { setError(''); setStep(next); };
  const submit = async () => {
    if (submitting.current || !policyConsent || (tutor && (!credentialsValid || !agreementAccepted))) return;
    submitting.current = true; setSaving(true); setError('');
    try {
      if (!user?.id) throw new Error('Please sign in before completing setup.');
      if (tutor && tutorStopProfileReminders) {
        const {error: preferenceError} = await withTimeout(supabase.from('users')
          .update({communication_preferences:'none'})
          .eq('id',user.id));
        if (preferenceError) throw new Error('Could not save your email reminder choice. Please retry.');
      }
      const { error: requestError } = await withTimeout(supabase.rpc('complete_onboarding', {
        requested_role: role, sace_number: saceNumber.trim(), university_name: universityName,
        student_number: studentNumber.trim(), policy_accepted: policyConsent,
        tutor_agreement_accepted: tutor && agreementAccepted,
      }));
      if (requestError) throw requestError;
      await onComplete?.();
      navigate(getDashboardPath({ ...user, role, onboarding_complete: true }), { replace: true });
    } catch (failure) {
      setError(failure.message || 'Could not complete setup. Please retry. Your entries are still here.');
    } finally { submitting.current = false; setSaving(false); }
  };

  return <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-center gap-3 text-primary">
        <BookOpen className="h-7 w-7" aria-hidden="true" /><span className="font-playfair text-xl font-bold">SmartBridge FET</span>
      </div>
      <ol aria-label="Setup progress" className="mb-8 flex gap-2 sm:gap-4">
        {steps.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className="min-w-0 flex-1">
          <div className={`mb-2 h-1.5 rounded-full ${index <= step ? 'bg-primary' : 'bg-border'}`} />
          <span className={`text-xs sm:text-sm ${index === step ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{index + 1}. {label}</span>
        </li>)}
      </ol>
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8" aria-labelledby="setup-heading">
        <p className="mb-2 text-sm text-primary">Step {step + 1} of {steps.length}</p>
        <h1 id="setup-heading" ref={heading} tabIndex={-1} className="font-playfair text-2xl font-bold outline-none sm:text-3xl">
          {step === 0 ? 'Welcome to SmartBridge FET' : lastStep ? 'Ready for your next step?' : 'Tell us about your qualifications'}
        </h1>
        <p className="mt-3 mb-6 text-sm leading-relaxed text-muted-foreground">
          {step === 0 ? 'Tell us who you are so we can personalise your experience.' : lastStep ? 'Check your details and review the agreements before finishing setup.' : 'Your credentials will be reviewed before tutor tools become available. Tutor applications require approval.'}
        </p>
        {step === 0 && <fieldset disabled={saving}>
          <legend className="mb-3 font-medium">How will you use SmartBridge?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map(({ id, label, desc, icon: Icon }) => <label key={id} className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${role === id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <div className="mb-3 flex items-center gap-3"><Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex-1 text-sm font-semibold">{label}</span>
                <input type="radio" name="onboarding-role" aria-label={label} value={id} checked={role === id} aria-describedby={`${id}-description`} onChange={() => { setRole(id); setAgreementAccepted(false); }} className="h-4 w-4 accent-primary" />
              </div>
              <p id={`${id}-description`} className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </label>)}
          </div>
        </fieldset>}
        {!lastStep && step === 1 && tutor && <div className="space-y-5">
          {role === 'sace_tutor' ? <div className="space-y-2"><Label htmlFor="sace-number">SACE registration number</Label><Input id="sace-number" value={saceNumber} onChange={e => setSaceNumber(e.target.value)} autoComplete="off" required /></div> : <>
            <div className="space-y-2"><Label htmlFor="university">University</Label><select id="university" value={university} onChange={e => setUniversity(e.target.value)} className="flex min-h-11 w-full rounded-md border bg-background px-3 text-sm" required><option value="">Select your university</option>{UNIVERSITIES.map(name => <option key={name}>{name}</option>)}<option value="other">Another university</option></select></div>
            {university === 'other' && <div className="space-y-2"><Label htmlFor="other-university">University name</Label><Input id="other-university" value={otherUniversity} onChange={e => setOtherUniversity(e.target.value)} required /></div>}
            <div className="space-y-2"><Label htmlFor="student-number">Student number</Label><Input id="student-number" value={studentNumber} onChange={e => setStudentNumber(e.target.value)} autoComplete="off" required /></div>
          </>}
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Your application will be reviewed before you can accept bookings. If approved, you can set your rates and availability. Approval, bookings and earnings are not guaranteed.</p>
        </div>}
        {lastStep && <div className="space-y-5">
          <dl className="rounded-xl bg-muted p-4 text-sm"><dt className="text-muted-foreground">Your role</dt><dd className="mt-1 font-semibold">{selectedRole?.label}</dd>
            {role === 'sace_tutor' && <><dt className="mt-3 text-muted-foreground">SACE number</dt><dd className="break-words">{saceNumber}</dd></>}
            {role === 'student_tutor' && <><dt className="mt-3 text-muted-foreground">University</dt><dd className="break-words">{universityName}</dd><dt className="mt-3 text-muted-foreground">Student number</dt><dd className="break-words">{studentNumber}</dd></>}
          </dl>
          <p className="text-sm leading-relaxed">{tutor ? 'Next: your application goes to admin review. Tutor tools stay locked until verification is complete. Approval, bookings and earnings are not guaranteed.' : role === 'parent' ? 'Next: request access using your learner’s email. They must approve before you can see their reports.' : 'Next: open your dashboard to explore subjects and track your study progress.'}</p>
          <div className="flex items-start gap-3"><Checkbox id="policy-consent" checked={policyConsent} onCheckedChange={value => setPolicyConsent(value === true)} disabled={saving} className="mt-1 shrink-0" /><Label htmlFor="policy-consent" className="text-sm font-normal leading-relaxed">I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Privacy Policy</Link> (opens in a new tab).</Label></div>
          {tutor && <label className="flex items-start gap-3 rounded-xl border p-4 text-sm cursor-pointer"><input type="checkbox" checked={tutorStopProfileReminders} onChange={e=>setTutorStopProfileReminders(e.target.checked)} disabled={saving} className="mt-1 h-4 w-4 accent-primary" /><span><strong>Do not email me optional tutor profile reminders</strong><span className="mt-1 block text-muted-foreground">Administrators may send service reminders about an incomplete tutor account after 2–3 days. These are not marketing messages. You can stop these reminders here, from the email itself, or later in your dashboard.</span></span></label>}
          {tutor && <div className="rounded-xl border p-4"><p className="mb-3 text-sm">{agreementAccepted ? 'Tutor agreement accepted. Submit below when you are ready.' : 'Please read and accept the tutor agreement before submitting.'}</p><Button variant="outline" disabled={saving} onClick={() => setShowAgreement(true)}>{agreementAccepted ? 'Review tutor agreement' : 'Read tutor agreement'}</Button>{agreementAccepted && <Check className="ml-3 inline h-5 w-5 text-primary" aria-label="Agreement accepted" />}</div>}
        </div>}
        {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
          {step > 0 ? <Button variant="outline" disabled={saving} onClick={() => move(step - 1)}>Back</Button> : <span className="text-xs text-muted-foreground">You can review before submitting.</span>}
          {lastStep ? <Button disabled={saving || !policyConsent || (tutor && !agreementAccepted)} onClick={submit} className="min-h-11 shrink-0 gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{saving ? 'Saving…' : tutor ? 'Submit application' : 'Complete Setup'}</Button> : <Button disabled={!canContinue} onClick={() => move(step + 1)} className="min-h-11 gap-2">Continue<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>}
        </div>
      </section>
      <p className="mt-5 text-center text-xs text-muted-foreground">Tutor applications are reviewed before approval. Tutoring opportunities depend on learner demand; earnings are not guaranteed.</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-xs text-muted-foreground"><span className="max-w-full break-all">Setting up {user?.email}</span><Button variant="link" size="sm" disabled={saving} onClick={signOut}>Sign out</Button></div>
    </div>
    <TutorConsentModal open={showAgreement} onDecline={() => setShowAgreement(false)} onAccept={() => { setAgreementAccepted(true); setShowAgreement(false); }} />
  </main>;
}
