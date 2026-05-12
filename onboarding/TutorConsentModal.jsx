import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function TutorConsentModal({ open, onAccept, onDecline }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  // Reset scroll state each time modal opens
  useEffect(() => {
    if (open) setScrolledToBottom(false);
  }, [open]);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setScrolledToBottom(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDecline(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-playfair text-xl">Independent Tutor Service Agreement</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">EduConnect FET — Please read carefully before proceeding</p>
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
            <p className="text-muted-foreground">The Tutor acknowledges that they are an <strong className="text-foreground">Independent Contractor</strong> and not an employee of EduConnect FET. This agreement does not create a partnership, joint venture, or employer-employee relationship. The Tutor is responsible for their own tax obligations (SARS) and does not qualify for UIF or COIDA benefits through EduConnect FET.</p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">2. Verification Lockdown</h3>
            <p className="text-muted-foreground">Upon registration, the Tutor's account will be placed in a <strong className="text-foreground">"Pending Verification"</strong> state. The Tutor will not have access to dashboard features, file uploads, or the public tutor directory until the EduConnect Admin has verified their SACE registration or University credentials. This process typically takes <strong className="text-foreground">1–2 business days</strong>.</p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">3. Warranties &amp; Qualifications</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">SACE Tutors:</strong> Must provide a valid SACE registration number.</li>
              <li><strong className="text-foreground">Student Tutors:</strong> Must select their university and provide a valid student number.</li>
            </ul>
            <p className="text-muted-foreground mt-2">The Tutor warrants that all information provided is truthful. Providing fraudulent credentials will result in a <strong className="text-foreground">permanent ban</strong>.</p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">4. Tutor Payment Plans &amp; Commissions</h3>
            <p className="text-muted-foreground text-xs mb-3">All subscription payments are collected via <strong className="text-foreground">Yoco</strong> (Yoco Technologies Pty Ltd), linked exclusively to the Tech &amp; GUARD Pty Ltd merchant account (Public Key: pk_live_2a11173e2rggAWL2ada4). The Tutor agrees to the following commission structure:</p>
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
                  <li>• Monthly subscription of R150 paid via Yoco or EFT to Tech &amp; GUARD Pty Ltd</li>
                  <li>• Standard Yoco gateway fees (≈2.5%) may apply to payment processing</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">5. Thursday Payouts by Tech &amp; GUARD Pty Ltd</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
              <p>• All student-to-tutor payments are held and processed by <strong className="text-foreground">Tech &amp; GUARD Pty Ltd</strong> via the EduConnect FET platform.</p>
              <p>• Tutor net payouts are disbursed <strong className="text-foreground">every Thursday of the week</strong> via EFT to the tutor's registered South African bank account.</p>
              <p>• Tutors must submit valid South African banking details to <strong className="text-foreground">aneleq@techandguard.co.za</strong> before their first payout.</p>
              <p>• Tech &amp; GUARD Pty Ltd reserves the right to hold payouts pending identity verification in compliance with FICA regulations.</p>
              <p>• Payout summaries are emailed to the tutor's registered address each Thursday alongside their session breakdown.</p>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">6. CAPS Compliance &amp; Conduct</h3>
            <p className="text-muted-foreground">The Tutor agrees to provide educational support strictly aligned with the South African <strong className="text-foreground">CAPS Curriculum</strong>. All interactions via built-in Zoom or Microsoft Teams must remain professional, safe, and focused on student academic success.</p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">7. POPIA &amp; Data Privacy</h3>
            <p className="text-muted-foreground">The Tutor agrees to handle all student data in accordance with the <strong className="text-foreground">Protection of Personal Information Act (POPIA)</strong>. Tutors may not harvest student contact details for use outside the platform.</p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">8. Indemnity</h3>
            <p className="text-muted-foreground">The Tutor indemnifies EduConnect FET and <strong className="text-foreground">Tech &amp; GUARD Pty Ltd</strong> against any claims, losses, or damages arising from the Tutor's sessions, conduct, or study materials.</p>
          </section>

          {!scrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground italic">↓ Scroll to bottom to enable acceptance</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={onDecline}>
            Decline
          </Button>
          <Button
            className="flex-1 bg-primary gap-2"
            disabled={!scrolledToBottom}
            onClick={onAccept}
          >
            <CheckCircle className="w-4 h-4" />
            I Accept — Proceed to Sign Up
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}