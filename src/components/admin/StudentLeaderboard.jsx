import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Main Component
// ============================================================

export default function StudentLeaderboard() {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  const fetchStudentProgress = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Handle both field naming conventions
      const normalized = (data || []).map(p => ({
        ...p,
        student_email: p.student_email || p.user_email,
        resources_accessed: p.resources_accessed || p.study_sessions || 0,
        last_accessed: p.last_accessed || p.last_access,
      }));
      
      setProgress(normalized);
    } catch (error) {
      console.error('Error fetching student progress:', error);
      toast.error('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentProgress();
  }, [fetchStudentProgress]);

  // Aggregate by student email
  const leaderboard = Object.values(
    progress.reduce((acc, p) => {
      const email = p.student_email || p.user_email;
      if (!email) return acc;
      
      if (!acc[email]) {
        acc[email] = { 
          email, 
          totalSessions: 0, 
          subjects: new Set(), 
          lastActive: null 
        };
      }
      
      const sessions = p.resources_accessed || p.study_sessions || 0;
      acc[email].totalSessions += sessions;
      acc[email].subjects.add(p.subject);
      
      if (!acc[email].lastActive || (p.last_accessed && p.last_accessed > acc[email].lastActive)) {
        acc[email].lastActive = p.last_accessed;
      }
      return acc;
    }, {})
  )
    .map(s => ({ ...s, subjects: [...s.subjects] }))
    .sort((a, b) => b.totalSessions - a.totalSessions)
    .slice(0, 20);

  const sendEncouragementEmail = async (email) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: `Keep it up — ${appName} 🎉`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0F766E, #0d9488); padding: 20px; border-radius: 10px 10px 0 0; color: white; text-align: center;">
                <h2 style="margin: 0;">🎉 You're on the Leaderboard!</h2>
              </div>
              <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
                <p>Hi there!</p>
                <p>The ${appName} team noticed your dedication to studying. You're on the leaderboard!</p>
                
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center; border-left: 4px solid #0F766E;">
                  <span style="font-size: 48px;">🎓</span>
                  <p style="margin-top: 10px;"><strong>Keep up the great work</strong> — your effort will pay off in your exams.</p>
                </div>
                
                <p>Good luck with your studies!</p>
                
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                
                <p style="font-size: 11px; color: #999; text-align: center;">
                  — ${appName} Team<br>
                  <a href="${appUrl}" style="color: #0F766E;">${appUrl}</a>
                </p>
              </div>
            </div>
          `,
        },
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error sending encouragement email:', error);
      return { success: false, error };
    }
  };

  const sendEncouragement = async (email) => {
    setSending(email);
    const result = await sendEncouragementEmail(email);
    if (result.success) {
      toast.success(`Encouragement email sent to ${email}`);
    } else {
      toast.error(`Failed to send email to ${email}`);
    }
    setSending(null);
  };

  const medal = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Student Performance Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-playfair flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Student Performance Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No student progress recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((s, i) => (
              <div key={s.email} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${i < 3 ? 'bg-amber-50 border border-amber-100' : 'bg-muted/40'}`}>
                <span className="text-lg w-8 text-center flex-shrink-0">{medal(i)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.email}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{s.subjects.slice(0, 3).join(', ')}</span>
                    {s.lastActive && <span className="text-xs text-muted-foreground">• Last: {new Date(s.lastActive).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="text-right mr-2 flex-shrink-0">
                  <p className="text-sm font-bold text-primary">{s.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">sessions</p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">{s.subjects.length} subj.</Badge>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 px-2 text-xs gap-1 text-blue-600 hover:bg-blue-50 flex-shrink-0" 
                  onClick={() => sendEncouragement(s.email)}
                  disabled={sending === s.email}
                >
                  {sending === s.email ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Mail className="w-3 h-3" />
                  )}
                  Encourage
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
