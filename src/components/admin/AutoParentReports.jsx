import { useState, useEffect } from 'react';
import { supabase, invokeFunction } from '@/lib/supabase';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Loader2, CheckCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function AutoParentReports() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [sent, setSent] = useState([]);
  const [parentEmailOverride, setParentEmailOverride] = useState('');

  useEffect(() => {
    fetchStudentProgress();
  }, []);

  // ============================================================
  // Data Fetching — Handles both field naming conventions
  // ============================================================

  const fetchStudentProgress = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by student email — supports both field naming conventions
      const grouped = Object.values((data || []).reduce((acc, p) => {
        const email = p.student_email || p.user_email;
        if (!email) return acc;
        
        if (!acc[email]) {
          acc[email] = { email, subjects: [] };
        }
        acc[email].subjects.push(p);
        return acc;
      }, {}));

      setStudents(grouped);
    } catch (error) {
      console.error('Error fetching student progress:', error);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Email Sending — HTML with professional styling
  // ============================================================

  const sendParentReportEmail = async (studentEmail, recipientEmail, studentData) => {
    // Get session count — handles both field names
    const totalSessions = studentData.subjects.reduce((s, p) => {
      return s + (p.study_sessions || p.resources_accessed || 0);
    }, 0);

    const subjectLines = studentData.subjects
      .sort((a, b) => {
        const aSessions = b.study_sessions || b.resources_accessed || 0;
        const bSessions = a.study_sessions || a.resources_accessed || 0;
        return aSessions - bSessions;
      })
      .map(p => {
        const sub = SUBJECTS.find(s => s.name === p.subject);
        const sessions = p.study_sessions || p.resources_accessed || 0;
        const lastAccess = p.last_accessed || p.last_access;
        return `• ${sub?.icon || '📚'} ${p.subject} (${p.grade}): ${sessions} sessions${lastAccess ? `, last: ${new Date(lastAccess).toLocaleDateString()}` : ''}`;
      }).join('\n');

    // Fetch study reminders — handles both field naming
    const { data: reminders } = await supabase
      .from('study_reminders')
      .select('*')
      .eq('student_email', studentEmail)
      .eq('is_active', true);

    const reminderLines = (reminders || [])
      .map(r => `• ${r.subject} — ${r.day_of_week} at ${r.time || r.reminder_time}`)
      .join('\n');

    const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

    const { data, error } = await invokeFunction('send-email', {
      to: recipientEmail,
      subject: `${appName} — Weekly Progress Report for ${studentEmail}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0F766E, #0d9488); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
            <h2 style="margin: 0;">📊 Weekly Progress Report</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">${studentEmail}</p>
          </div>
          
          <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p>Here is the ${appName} weekly progress report for <strong>${studentEmail}</strong> — generated on ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
            
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #0F766E;">
              <h3 style="margin-top: 0; color: #166534;">📈 SUMMARY</h3>
              <p style="margin: 5px 0;">• Subjects active: <strong>${studentData.subjects.length}</strong></p>
              <p style="margin: 5px 0;">• Total study sessions: <strong>${totalSessions}</strong></p>
              <p style="margin: 5px 0;">• Active reminders: <strong>${reminders?.length || 0}</strong></p>
            </div>
            
            <h3 style="color: #0F766E;">📚 SUBJECT ACTIVITY</h3>
            <div style="background-color: #ffffff; padding: 15px; border-radius: 10px; margin: 15px 0; border: 1px solid #e5e7eb;">
              ${subjectLines || '<p style="color: #999; font-style: italic;">No subjects tracked yet.</p>'}
            </div>
            
            <h3 style="color: #0F766E;">🔔 STUDY REMINDERS</h3>
            <div style="background-color: #ffffff; padding: 15px; border-radius: 10px; margin: 15px 0; border: 1px solid #e5e7eb;">
              ${reminderLines || '<p style="color: #999; font-style: italic;">No reminders set.</p>'}
            </div>
            
            <p style="margin-top: 20px; font-size: 14px;">Keep encouraging consistent study habits — small daily sessions lead to big exam results! 🎓</p>
            
            <hr style="margin: 20px 0; border-color: #e5e7eb;">
            
            <p style="font-size: 11px; color: #999; text-align: center;">
              Warm regards,<br>
              <strong>${appName} Admin Team</strong><br>
              <a href="${appUrl}" style="color: #0F766E;">${appUrl}</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) throw error;
    return { success: true };
  };

  // ============================================================
  // Send Single Report
  // ============================================================

  const sendReport = async (student, customEmail = null) => {
    const targetEmail = customEmail || parentEmailOverride || student.email;
    setSending(student.email);

    try {
      await sendParentReportEmail(student.email, targetEmail, student);
      setSent(prev => [...prev, student.email]);
      toast.success(`Report sent for ${student.email}`);
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error(`Failed to send report for ${student.email}`);
    } finally {
      setSending(null);
    }
  };

  // ============================================================
  // Send All Reports
  // ============================================================

  const sendAllReports = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const student of students) {
      const targetEmail = parentEmailOverride || student.email;
      setSending(student.email);

      try {
        await sendParentReportEmail(student.email, targetEmail, student);
        setSent(prev => [...prev, student.email]);
        successCount++;
      } catch (error) {
        console.error('Error sending report:', error);
        failCount++;
      } finally {
        setSending(null);
      }
    }

    if (failCount > 0) {
      toast.warning(`✅ ${successCount} reports sent, ❌ ${failCount} failed`);
    } else {
      toast.success(`✅ All ${successCount} reports sent successfully!`);
    }
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> Automated Parent Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-playfair flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> Automated Parent Reports
          </CardTitle>
          <Button
            size="sm"
            className="bg-primary gap-1.5 text-xs"
            onClick={sendAllReports}
            disabled={!!sending || students.length === 0}
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Send All Reports
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Override recipient email (optional — defaults to student's email):</p>
          <Input
            placeholder="parent@example.com (leave blank to send to student's email)"
            value={parentEmailOverride}
            onChange={e => setParentEmailOverride(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> {students.length} students with tracked progress
          </p>
          {students.slice(0, 15).map(student => (
            <div key={student.email} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{student.email}</p>
                <p className="text-xs text-muted-foreground">
                  {student.subjects.length} subject{student.subjects.length !== 1 ? 's' : ''} •{' '}
                  {student.subjects.reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0)} sessions
                </p>
              </div>
              {sent.includes(student.email) ? (
                <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                  <CheckCircle className="w-3 h-3" /> Sent
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => sendReport(student)}
                  disabled={sending === student.email}
                >
                  {sending === student.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Send
                </Button>
              )}
            </div>
          ))}
          {students.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No student data yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
