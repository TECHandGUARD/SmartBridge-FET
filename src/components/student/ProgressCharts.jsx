import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart2, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import StudyStreakTracker from './StudyStreakTracker';

interface UserProps {
  email: string;
  full_name?: string;
}

interface DBProgressItem {
  id?: string;
  subject: string;
  study_sessions: number;
  last_access: string | null;
  grade?: string;
}

interface ChartDataItem {
  name: string;
  sessions: number;
  fill: string;
}

const COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#ea580c', '#7c3aed', 
  '#db2777', '#059669', '#4f46e5', '#0891b2', '#e11d48'
];

export default function ProgressCharts({ user }: { user: UserProps }) {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsTelemetry = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch from Supabase using correct field names
      const { data, error: dbError } = await supabase
        .from('student_progress')
        .select('subject, study_sessions, last_access')
        .eq('user_email', user.email);

      if (dbError) throw dbError;

      const progressData: DBProgressItem[] = (data || []).map(item => ({
        ...item,
        study_sessions: item.study_sessions || 0
      }));

      // ============================================
      // FIXED STREAK CALCULATION
      // Forgiving policy: preserves streak until day ends
      // ============================================
      const rawDates = progressData
        .filter(p => p.last_access)
        .map(p => p.last_access!.split('T')[0]);
      
      // Deduplicate dates (multiple sessions on same day count as 1)
      const uniqueSortedDates = [...new Set(rawDates)].sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );

      let calculatedStreak = 0;
      
      if (uniqueSortedDates.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // FORGIVING POLICY: Check if active today OR yesterday
        // Student hasn't studied yet today? That's fine - streak continues until day ends
        if (uniqueSortedDates[0] === todayStr || uniqueSortedDates[0] === yesterdayStr) {
          calculatedStreak = 1;
          
          for (let i = 1; i < uniqueSortedDates.length; i++) {
            const prevTime = new Date(uniqueSortedDates[i - 1]).getTime();
            const currTime = new Date(uniqueSortedDates[i]).getTime();
            const dayDifference = (prevTime - currTime) / 86400000;

            if (dayDifference === 1) {
              calculatedStreak++;
            } else if (dayDifference > 1) {
              break; // Streak broken
            }
          }
        }
      }
      setStreak(calculatedStreak);

      // ============================================
      // TRANSFORM FOR RECHARTS
      // ============================================
      const formattedChartData: ChartDataItem[] = progressData
        .filter(p => (p.study_sessions || 0) > 0)
        .map((p, i) => {
          const shortSubjectName = p.subject.length > 10 
            ? p.subject.slice(0, 10) + '…' 
            : p.subject;
          
          return {
            name: shortSubjectName,
            sessions: p.study_sessions || 0,
            fill: COLORS[i % COLORS.length]
          };
        })
        .sort((a, b) => b.sessions - a.sessions); // Sort by most studied

      setChartData(formattedChartData);
      
    } catch (err: any) {
      console.error('Error fetching progress:', err);
      setError(err.message || 'Failed to load progress data');
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchAnalyticsTelemetry();
  }, [fetchAnalyticsTelemetry]);

  // Calculate total study time for summary
  const totalSessions = chartData.reduce((sum, item) => sum + item.sessions, 0);
  const activeSubjects = chartData.length;

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading your progress data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full">
      
      {/* Streak Tracker Component */}
      <StudyStreakTracker streak={streak} />

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <span>{error}</span>
          <button 
            onClick={fetchAnalyticsTelemetry}
            className="ml-auto text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Stats */}
      {!error && chartData.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border bg-muted/20">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">{totalSessions}</p>
              <p className="text-xs text-muted-foreground">Total Study Sessions</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-muted/20">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">{activeSubjects}</p>
              <p className="text-xs text-muted-foreground">Subjects Studied</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bar Chart */}
      {chartData.length > 0 && !error && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 border-b bg-muted/30">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" /> 
              Study Sessions by Subject
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    allowDecimals={false} 
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value} sessions`, 'Study Time']}
                    contentStyle={{ 
                      fontSize: 11, 
                      borderRadius: 8, 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  />
                  <Bar dataKey="sessions" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {chartData.length === 0 && !error && !loading && (
        <Card className="border-border">
          <CardContent className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No study data yet</p>
            <p className="text-xs mt-1">
              Start logging study sessions to see your progress!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
