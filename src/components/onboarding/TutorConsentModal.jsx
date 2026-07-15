// src/components/onboarding/TutorConsentModal.jsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Agreement version tracking (POPIA compliance)
  AGREEMENT_VERSION: import.meta.env.VITE_TUTOR_AGREEMENT_VERSION || '1.0.0',
  AGREEMENT_EFFECTIVE_DATE: import.meta.env.VITE_TUTOR_AGREEMENT_EFFECTIVE_DATE || '2025-01-01',

  // App name
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

  // Company
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME || 'Tech & GUARD Pty Ltd',

  // Support email
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || 'aneleq@techandguard.co.za',

  // Feature flags
  ENABLE_CONSENT_RECORDING: import.meta.env.VITE_ENABLE_CONSENT_RECORDING !== 'false',

  // Messages
  MESSAGES: {
    CONSENT_RECORDED: import.meta.env.VITE_CONSENT_RECORDED_MSG || 'Consent recorded successfully',
    CONSENT_FAILED: import.meta.env.VITE_CONSENT_FAILED_MSG || 'Could not record consent. Your acceptance has been noted, but please contact support if you experience issues.',
    CONSENT_ALREADY_RECORDED: import.meta.env.VITE_CONSENT_ALREADY_RECORDED_MSG || 'Consent already recorded for this version',
    RECORDING: import.meta.env.VITE_CONSENT_RECORDING_MSG || 'Recording Consent...',
    ACCEPT_BUTTON: import.meta.env.VITE_CONSENT_ACCEPT_BUTTON || 'I Accept — Proceed to Sign Up',
    DECLINE_BUTTON: import.meta.env.VITE_CONSENT_DECLINE_BUTTON || 'Decline',
    SCROLL_TO_ENABLE: import.meta.env.VITE_CONSENT_SCROLL_MSG || '↓ Scroll to bottom to enable acceptance',
  },
};

// ============================================================
// Main Component
// ============================================================

export default function TutorConsentModal({ open, onAccept, onDecline, user }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [tableExists, setTableExists] = useState(true);

  // Reset scroll state each time modal opens
  useEffect(() => {
    if (open) setScrolledToBottom(false);
  }, [open]);

  // Check if user_consents table exists on mount
  useEffect(() => {
    const checkTable = async () => {
      try {
        const { error } = await supabase
          .from('user_consents')
          .select('id')
          .limit(1);
        if (error && error.code === 'PGRST205') {
          setTableExists(false);
          console.warn('user_consents table does not exist. Consent will be logged to activity_log only.');
        }
      } catch {
        setTableExists(false);
      }
    };
    checkTable();
  }, []);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setScrolledToBottom(true);
    }
  };

  // ============================================================
  // POPIA Compliance: Record consent with proper data handling
  // ============================================================

  const recordConsent = async () => {
    if (!user?.id || !user?.email) {
      console.error('Cannot record consent: No user data');
      return false;
    }

    try {
      // If table doesn't exist, skip to activity log
      if (!tableExists || !CONFIG.ENABLE_CONSENT_RECORDING) {
        console.log('Consent recording skipped (table missing or disabled)');
        return true;
      }

      // Check if consent already recorded for this version
      const { data: existingConsent, error: checkError } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id)
        .eq('consent_type', 'tutor_service_agreement')
        .eq('consent_metadata->version', CONFIG.AGREEMENT_VERSION);

      if (checkError) {
        if (checkError.code === 'PGRST205') {
          setTableExists(false);
          return true; // Continue anyway
        }
        throw checkError;
      }

      if (existingConsent && existingConsent.length > 0) {
        console.log(CONFIG.MESSAGES.CONSENT_ALREADY_RECORDED);
        return true;
      }

      // Record new consent - POPIA compliant data minimization
      const { error: insertError } = await supabase
        .from('user_consents')
        .insert({
          user_id: user.id,
          consent_type: 'tutor_service_agreement',
          consent_given: true,
          consent_date: new Date().toISOString(),
          consent_source: 'web',
          consent_metadata: {
            version: CONFIG.AGREEMENT_VERSION,
            effective_date: CONFIG.AGREEMENT_EFFECTIVE_DATE,
            user_agent: navigator.userAgent.substring(0, 100),
          },
        });

      if (insertError) {
        if (insertError.code === 'PGRST205') {
          setTableExists(false);
          return true; // Continue anyway
        }
        throw insertError;
      }

      return true;
    } catch (error) {
      console.error('Failed to record consent:', error);
      return false;
    }
  };

  // ============================================================
  // Activity Logging (always works)
  // ============================================================

  const logConsentActivity = async () => {
    try {
      await supabase.from('activity_log').insert({
        event_type: 'user_consent_given',
        user_email: user.email,
        user_id: user.id,
        description: `Accepted Tutor Service Agreement v${CONFIG.AGREEMENT_VERSION}`,
        metadata: {
          agreement_version: CONFIG.AGREEMENT_VERSION,
          effective_date: CONFIG.AGREEMENT_EFFECTIVE_DATE,
          consent_source: 'web',
        },
      });
    } catch (error) {
      console.warn('Failed to log consent activity:', error);
    }
  };

  // ============================================================
  // Handlers
  // ============================================================

  const handleAccept = async () => {
    setRecordingConsent(true);

    // Record consent in user_consents (if available)
    const consentRecorded = await recordConsent();

    // Always log activity (this should work even if user_consents fails)
    await logConsentActivity();

    if (!consentRecorded && CONFIG.ENABLE_CONSENT_RECORDING) {
      toast.warning(CONFIG.MESSAGES.CONSENT_FAILED);
    } else {
      toast.success(CONFIG.MESSAGES.CONSENT_RECORDED);
    }

    setRecordingConsent(false);
    onAccept();
  };

  const handleDecline = () => {
    onDecline();
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDecline(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-playfair text-xl">Independent Tutor Service Agreement</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {CONFIG.APP_NAME} — Please read carefully before proceeding
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Version {CONFIG.AGREEMENT_VERSION} · Effective {CONFIG.AGREEMENT_EFFECTIVE_DATE}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed space-y-5"
          style={{ maxHeight: '55vh' }}
          onScroll={handleScroll}
        >
          <section>
            <h3 className="font-bold text-base mb-2">1. Nature of Relationship</h3>
            <p className="text-muted-foreground">
              The Tutor acknowledges that they are an <strong className="text-foreground">Independent Contractor</strong> and not an employee of {CONFIG.APP_NAME}. This agreement does not create a partnership, joint venture, or employer-employee relationship. The Tutor is responsible for their own tax obligations (SARS) and does not qualify for UIF or COIDA benefits through {CONFIG.APP_NAME}.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">2. Verification Lockdown</h3>
            <p className="text-muted-foreground">
              Upon registration, the Tutor's account will be placed in a <strong className="text-foreground">"Pending Verification"</strong> state. The Tutor will not have access to dashboard features, file uploads, or the public tutor directory until the {CONFIG.APP_NAME} Admin has verified their SACE registration or University credentials. This process typically takes <strong className="text-foreground">1–2 business days</strong>.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">3. Warranties &amp; Qualifications</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">SACE Tutors:</strong> Must provide a valid SACE registration number.</li>
              <li><strong className="text-foreground">Student Tutors:</strong> Must select their university and provide a valid student number.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              The Tutor warrants that all information provided is truthful. Providing fraudulent credentials will result in a <strong className="text-foreground">permanent ban</strong>.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">4. Tutor Payment Plans &amp; Commissions</h3>
            <p className="text-muted-foreground text-xs mb-3">
              All subscription payments are collected via <strong className="text-foreground">Yoco</strong> (Yoco Technologies Pty Ltd), linked exclusively to the {CONFIG.COMPANY_NAME} merchant account. The Tutor agrees to the following commission structure:
            </p>
            <div className="space-y-3">
              <div className="bg-muted rounded-xl p-4">
                <p className="font-semibold text-foreground mb-1">Standard Plan — R0/month (Free)</p>
                <ul className="text-muted-foreground text-xs space-y-0.5">
                  <li>• <strong>10% platform commission</strong> on every confirmed booking amount</li>
                  <li>• Plus a <strong>R20 flat fee</strong> per confirmed session</li>
                  <li>• Example: R200 session → Tutor receives R160 (R200 − 10% − R20)</li>
                </ul>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="font-semibold text-foreground mb-1">Pro Plan — R150/month</p>
                <ul className="text-muted-foreground text-xs space-y-0.5">
                  <li>• <strong>0% commission</strong> — Tutor retains 100% of booking fees</li>
                  <li>• Monthly subscription of R150 paid via Yoco or EFT to {CONFIG.COMPANY_NAME}</li>
                  <li>• Standard Yoco gateway fees (≈2.5%) may apply to payment processing</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">5. Thursday Payouts by {CONFIG.COMPANY_NAME}</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-xs text-muted-foreground dark:bg-amber-950/20 dark:border-amber-800">
              <p>• All student-to-tutor payments are held and processed by <strong className="text-foreground">{CONFIG.COMPANY_NAME}</strong> via the {CONFIG.APP_NAME} platform.</p>
              <p>• Tutor net payouts are disbursed <strong className="text-foreground">every Thursday of the week</strong> via EFT to the tutor's registered South African bank account.</p>
              <p>• Tutors must submit valid South African banking details to <strong className="text-foreground">{CONFIG.SUPPORT_EMAIL}</strong> before their first payout.</p>
              <p>• {CONFIG.COMPANY_NAME} reserves the right to hold payouts pending identity verification in compliance with FICA regulations.</p>
              <p>• Payout summaries are emailed to the tutor's registered address each Thursday alongside their session breakdown.</p>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">6. CAPS Compliance &amp; Conduct</h3>
            <p className="text-muted-foreground">
              The Tutor agrees to provide educational support strictly aligned with the South African <strong className="text-foreground">CAPS Curriculum</strong>. All interactions via built-in Zoom or Microsoft Teams must remain professional, safe, and focused on student academic success.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">7. POPIA &amp; Data Privacy</h3>
            <p className="text-muted-foreground">
              The Tutor agrees to handle all student data in accordance with the <strong className="text-foreground">Protection of Personal Information Act (POPIA)</strong>. Tutors may not harvest student contact details for use outside the platform.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">8. Indemnity</h3>
            <p className="text-muted-foreground">
              The Tutor indemnifies {CONFIG.APP_NAME} and <strong className="text-foreground">{CONFIG.COMPANY_NAME}</strong> against any claims, losses, or damages arising from the Tutor's sessions, conduct, or study materials.
            </p>
          </section>

          {!scrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground italic">
              {CONFIG.MESSAGES.SCROLL_TO_ENABLE}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDecline}
            disabled={recordingConsent}
          >
            {CONFIG.MESSAGES.DECLINE_BUTTON}
          </Button>
          <Button
            className="flex-1 bg-primary gap-2"
            disabled={!scrolledToBottom || recordingConsent}
            onClick={handleAccept}
          >
            {recordingConsent ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {recordingConsent
              ? CONFIG.MESSAGES.RECORDING
              : CONFIG.MESSAGES.ACCEPT_BUTTON}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
