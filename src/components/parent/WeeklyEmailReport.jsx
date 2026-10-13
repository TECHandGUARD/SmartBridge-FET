import ReleaseGate from '@/components/operations/ReleaseGate';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

function WeeklyEmailReportImplementation({ parentUser }) {
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
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {kind: 'parent-report', student_email: childEmail.trim()}
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

export default function WeeklyEmailReport(props) {
 return <ReleaseGate feature="externalEmail"><WeeklyEmailReportImplementation {...props} /></ReleaseGate>;
}
