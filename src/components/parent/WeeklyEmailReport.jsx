import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
    if (!childEmail.trim()) { 
      toast.error('Enter your child\'s email address.'); 
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
        .eq('user_email', childEmail.trim());
      
      if (progError) throw progError;

      // Load study reminders from Supabase
      const { data: reminders, error: remError } = await supabase
        .from('study_reminders')
        .select('*')
        .eq('user_email', childEmail.trim())
        .eq('is_active', true);
      
      if (remError) throw remError;

      const totalSessions = (progress || []).reduce((s, p) => s + (p.study_sessions || 0), 0);
      
      const subjectLines = (progress || [])
        .sort((a, b) => (b.study_sessions || 0) - (a.study_sessions || 0))
        .map(p => {
          const sub = SUBJECTS.find(s => s.name === p.subject);
          return `• ${sub?.icon || '📚'} ${p.subject} (${p.grade || 'N/A'}): ${p.study_sessions || 0} sessions${p.last_access ? `, last studied ${p.last_access}` : ''}`;
        }).join('\n');

      const reminderLines = (reminders || []).map(r => `• ${r.subject} — ${r.day_of_week} at ${r.time}`).join('\n');

      const body = `Hi,

Here is your child's SmartBridge FET weekly progress summary for ${new Date().toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}.

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
SmartBridge FET Team`;

      // Call Supabase Edge Function to send email
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: parentUser.email,
          subject: `SmartBridge Weekly Update — ${childEmail.trim()}`,
          body: body,
          from_name: 'SmartBridge FET',
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
        />
        <Button onClick={sendReport} disabled={sending} className="w-full bg-primary gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Sending...' : 'Send Weekly Report to My Email'}
        </Button>
      </CardContent>
    </Card>
  );
}
