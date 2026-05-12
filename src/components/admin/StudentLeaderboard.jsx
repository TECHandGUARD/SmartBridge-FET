import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentLeaderboard() {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    fetchStudentProgress();
  }, []);

  const fetchStudentProgress = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .order('study_sessions', { ascending: false });
      
      if (error) throw error;
      setProgress(data || []);
    } catch (error) {
      console.error('Error fetching student progress:', error);
      toast.error('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  // Aggregate by student email
  const leaderboard = Object.values(
    progress.reduce((acc, p) => {
      const email = p.user_email;
      if (!acc[email]) {
        acc[email] = { 
          email, 
          totalSessions: 0, 
          subjects: new Set(), 
          lastActive: null 
        };
      }
      const sessions = p.study_sessions || p.resources_accessed || 0;
      acc[email].totalSessions += sessions;
      acc[email].subjects.add(p.subject);
      if (!acc[email].lastActive || (p.last_access && p.last_access > acc[email].lastActive)) {
        acc[email].lastActive = p.last_access;
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
          subject: 'Keep it up — EduConnect FET 🎉',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #0F766E;">🎉 You're on the Leaderboard!</h2>
              <p>Hi there!</p>
              <p>The EduConnect FET team noticed your dedication to studying. You're on the leaderboard!</p>
              
              <div style="background-color: #f0fdf4; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
                <span style="font-size: 48px;">🎓</span>
                <p style="margin-top: 10px;"><strong>Keep up the great work</strong> — your effort will pay off in your exams.</p>
              </div>
              
              <p>Good luck with your studies!</p>
              
              <hr style="margin: 20px 0; border-color: #e5e7eb;">
              
              <p style="font-size: 11px; color: #999; text-align: center;">
                — EduConnect FET Team<br>
                <a href="${window.location.origin}" style="color: #0F766E;">${window.location.origin}</a>
              </p>
            </div>
          `,
        },
      });
      
      if (error) throw error;
      toast.success(`Encouragement email sent to ${email}`);
    } catch (error) {
      console.error('Error sending encouragement email:', error);
      toast.error(`Failed to send email to ${email}`);
    }
  };

  const sendEncouragement = async (email) => {
    setSending(email);
    await sendEncouragementEmail(email);
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
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
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
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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