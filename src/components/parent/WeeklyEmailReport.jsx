import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for future flexibility)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Main Component
// ============================================================

export default function WeeklyEmailReport({ parentUser }) {
  const [childEmail, setChildEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sendReport = async () => {
    if (!childEmail.trim()) { 
      toast.error('Enter your child\'s email address.'); 
      return; 
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(childEmail.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }
    
    if (!parentUser?.email) { 
      toast.error('You must be signed in.'); 
      return; 
    }
    
    setSending(true);

    try {
      // Load student progress from Supabase
      const { data: progress, error: progError } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_email', childEmail.trim());
      
      if (progError) throw progError;

      // Load study reminders from Supabase
      const { data: reminders, error: remError } = await supabase
        .from('study_reminders')
        .select('*')
        .eq('student_email', childEmail.trim())
        .eq('is_active', true);
      
      if (remError) throw remError;

      const totalSessions = (progress || []).reduce((s, p) => s + (p.resources_accessed || 0), 0);
      
      const subjectLines = (progress || [])
        .sort((a, b) => (b.resources_accessed || 0) - (a.resources_accessed || 0))
        .map(p => {
          const sub = SUBJECTS.find(s => s.name === p.subject);
          return `• ${sub?.icon || '📚'} ${p.subject} (${p.grade || 'N/A'}): ${p.resources_accessed || 0} sessions${p.last_accessed ? `, last studied ${p.last_accessed}` : ''}`;
        }).join('\n');

      const reminderLines = (reminders || []).map(r => `• ${r.subject} — ${r.day_of_week} at ${r.time}`).join('\n');

      const bodyText = `Hi,

Here is your child's ${appName} weekly progress summary for ${new Date().toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}.

📊 OVERALL SUMMARY
• Subjects active: ${progress?.length || 0}
• Total study sessions logged: ${totalSessions}
• Active reminders set: ${reminders?.length || 0}

📚 SUBJECT ACTIVITY
${subjectLines || 'No subjects tracked yet.'}

🔔 ACTIVE STUDY REMINDERS
${reminderLines || 'No reminders set.'}

Keep encouraging your child to stay consistent — small daily sessions make a big difference!

Warm regards,
${appName} Team`;

      const bodyHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <div style="background: linear-gradient(135deg, #0F766E, #0d9488); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
    <h2 style="margin: 0;">📊 Weekly Progress Report</h2>
    <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">${childEmail.trim()}</p>
  </div>
  <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p>Hi,</p>
    <p>Here is your child's ${appName} weekly progress summary for ${new Date().toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}.</p>
    
    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #0F766E;">
      <h3 style="margin-top: 0; color: #166534;">📊 OVERALL SUMMARY</h3>
      <p style="margin: 5px 0;">• Subjects active: <strong>${progress?.length || 0}</strong></p>
      <p style="margin: 5px 0;">• Total study sessions logged: <strong>${totalSessions}</strong></p>
      <p style="margin: 5px 0;">• Active reminders set: <strong>${reminders?.length || 0}</strong></p>
    </div>
    
    <h3 style="color: #0F766E;">📚 SUBJECT ACTIVITY</h3>
    <div style="background-color: #ffffff; padding: 15px; border-radius: 10px; margin: 15px 0; border: 1px solid #e5e7eb;">
      ${subjectLines || '<p style="color: #999; font-style: italic;">No subjects tracked yet.</p>'}
    </div>
    
    <h3 style="color: #0F766E;">🔔 ACTIVE STUDY REMINDERS</h3>
    <div style="background-color: #ffffff; padding: 15px; border-radius: 10px; margin: 15px 0; border: 1px solid #e5e7eb;">
      ${reminderLines || '<p style="color: #999; font-style: italic;">No reminders set.</p>'}
    </div>
    
    <p style="margin-top: 20px; font-size: 14px;">Keep encouraging your child to stay consistent — small daily sessions make a big difference! 🎓</p>
    
    <hr style="margin: 20px 0; border-color: #e5e7eb;">
    
    <p style="font-size: 11px; color: #999; text-align: center;">
      Warm regards,<br>
      <strong>${appName} Team</strong><br>
      <a href="${window.location.origin}" style="color: #0F766E;">${window.location.origin}</a>
    </p>
  </div>
</div>`;

      // Call Supabase Edge Function to send email
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: parentUser.email,
          subject: `${appName} Weekly Update — ${childEmail.trim()}`,
          html: bodyHtml,
          text: bodyText,
          from_name: appName,
        }
      });

      if (emailError) throw emailError;

      toast.success('Weekly report sent to your email!');
      setSent(true);
    } catch (err) {
      console.error('Error sending report:', err);
      toast.error(`Failed to send report: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <Card className="border-border">
      <CardContent className="pt-6 pb-6 text-center">
        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
        <p className="font-playfair font-bold text-lg">Report Sent!</p>
        <p className="text-sm text-muted-foreground mb-4">Check your inbox for the weekly summary.</p>
        <Button variant="outline" size="sm" onClick={() => { setSent(false); setChildEmail(''); }}>Send Another</Button>
      </CardContent>
    </Card>
  );

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-playfair flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Weekly Email Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Get a full progress summary emailed directly to you.</p>
        <Input
          placeholder="Child's email address..."
          value={childEmail}
          onChange={e => setChildEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendReport()}
          disabled={sending}
        />
        <Button onClick={sendReport} disabled={sending} className="w-full bg-primary gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Sending...' : 'Send Weekly Report to My Email'}
        </Button>
      </CardContent>
    </Card>
  );
}
