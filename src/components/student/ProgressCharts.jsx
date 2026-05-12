import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart2 } from 'lucide-react';
import StudyStreakTracker from './StudyStreakTracker';

const COLORS = ['#2e7d52','#4a9e6a','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16'];

export default function ProgressCharts({ user }) {
  const [progress, setProgress] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchProgress = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('student_progress')
          .select('*')
          .eq('user_email', user.email);
        
        if (error) throw error;
        
        setProgress(data || []);
        
        // Calculate streak from last_access dates
        const dates = (data || [])
          .filter(p => p.last_access)
          .map(p => p.last_access)
          .sort()
          .reverse();
          
        if (dates.length === 0) { 
          setStreak(0); 
          return; 
        }
        
        let s = 1;
        const today = new Date().toISOString().split('T')[0];
        if (dates[0] !== today) { 
          setStreak(0); 
          return; 
        }
        
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1]);
          const curr = new Date(dates[i]);
          const diff = (prev - curr) / (1000 * 60 * 60 * 24);
          if (diff === 1) s++;
          else break;
        }
        setStreak(s);
        
      } catch (error) {
        console.error('Error fetching progress charts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProgress();
  }, [user]);

  const chartData = progress.map((p, i) => ({
    name: p.subject?.length > 8 ? p.subject.slice(0, 8) + '…' : (p.subject || 'Unknown'),
    sessions: p.study_sessions || p.resources_accessed || 0,
    fill: COLORS[i % COLORS.length],
  })).filter(d => d.sessions > 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <StudyStreakTracker streak={0} />
        <Card className="border-border">
          <CardContent className="pt-8 pb-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StudyStreakTracker streak={streak} />

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" /> Sessions per Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'Sessions']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      
      {chartData.length === 0 && !loading && (
        <Card className="border-border">
          <CardContent className="pt-8 pb-8 text-center">
            <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">No study data yet.</p>
            <p className="text-xs text-muted-foreground">Complete some study sessions to see your progress chart.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}