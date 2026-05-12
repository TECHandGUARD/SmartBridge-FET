import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function WeeklyEmailReport({ parentUser }) {
  const [childEmail, setChildEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sendReport = async () => {
    if (!childEmail.trim()) { toast.error('Enter your child\'s email address.'); return; }
    if (!parentUser?.email) { toast.error('You must be signed in.'); return; }
    setSending(true);

    try {
      // Fetch student progress
      const { data: progress, error: progError } = await supabase
        .from('student_progress')
        .select('*')
        .eq('user_email', childEmail.trim());
      
      if (progError) console.error('Progress fetch error:', progError);

      // Fetch study reminders
      const { data: reminders, error: remError } = await supabase
        .from('study_reminders')
        .select('*')
        .eq('user_email', childEmail.trim())
        .eq('is_active', true);
      
      if (remError) console.error('Reminders fetch error:', remError);

      const totalSessions = (progress || []).reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0);
      
      const subjectLines = (progress || [])
        .sort((a, b) => (b.study_sessions || b.resources_accessed || 0) - (a.study_sessions || a.resources_accessed || 0))
        .map(p => {
          const sub = SUBJECTS.find(s => s.name === p.subject);
          const sessions = p.study_sessions || p.resources_accessed || 0;
          return `• ${sub?.icon || '📚'} ${p.subject} (${p.grade}): ${sessions} sessions${p.last_access ? `, last studied ${new Date(p.last_access).toLocaleDateString()}` : ''}`;
        }).join('\n');

      const reminderLines = (reminders || []).map(r => `• ${r.subject}`).join('\n');

      const emailBody = `Hi,

Here is your child's EduConnect FET weekly progress summary for ${new Date().toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}.

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
EduConnect FET Team`;

      // For now, show the email content and log it
      console.log('Weekly report email would send to:', parentUser.email);
      console.log('Email content:', emailBody);
      
      // TODO: Replace with actual email sending via Supabase Edge Function
      // const { error } = await supabase.functions.invoke('send-email', {
      //   body: {
      //     to: parentUser.email,
      //     subject: `EduConnect Weekly Update — ${childEmail.trim()}`,
      //     body: emailBody,
      //   },
      // });
      // if (error) throw error;

      toast.success(`Weekly report preview saved to console. Email would send to ${parentUser.email}`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setSending(false);
      setSent(true);
    }
  };

  if (sent) return (
    <Card className="border-border">
      <CardContent className="pt-6 pb-6 text-center">
        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
        <p className="font-playfair font-bold text-lg">Report Generated!</p>
        <p className="text-sm text-muted-foreground mb-4">Preview logged to console. Email sending will be configured for production.</p>
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
        />
        <Button onClick={sendReport} disabled={sending} className="w-full bg-primary gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Generating...' : 'Generate Weekly Report'}
        </Button>
      </CardContent>
    </Card>
  );
}