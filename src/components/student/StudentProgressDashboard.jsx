import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Legend
} from 'recharts';
import { TrendingUp, BookOpen, Flame, Target, BarChart2, Activity, Download, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UserProps {
  full_name?: string;
  email: string;
}

interface DBProgressItem {
  id?: string;
  subject: string;
  grade_level: number;
  study_sessions: number;
  last_access: string | null;
  notes?: string;
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string | null;
  color: string;
}

// Production CSV Exporter Engine
function exportCSV(progress: DBProgressItem[], user: UserProps) {
  const headers = ['Subject', 'Grade Level', 'Study Sessions', 'Last Access', 'Notes'];
  const rows = progress.map(p => [
    p.subject || '',
    `Grade ${p.grade_level}`,
    p.study_sessions || 0,
    p.last_access || '',
    (p.notes || '').replace(/,/g, ';'),
  ]);
  
  const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  
  const dateStamp = new Date().toISOString().split('T')[0];
  anchor.download = `progress-report-${user?.full_name?.replace(/\s+/g, '-') || 'student'}-${dateStamp}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#ea580c', '#7c3aed', '#db2777', '#059669', '#4f46e5', '#0891b2', '#84cc16'];

const SHORT = (s: string) => s?.length > 10 ? s.slice(0, 10) + '…' : s;

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2 shadow-sm`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-2xl font-black text-foreground leading-none">{value}</p>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mt-1.5">{label}</p>
        {sub && <p className="text-xs text-primary font-semibold mt-1 truncate" title={sub}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function StudentProgressDashboard({ user }: { user: UserProps }) {
  const [progress, setProgress] = useState<DBProgressItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardTelemetry = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('student_progress')
        .select('subject, grade_level, study_sessions, last_access, notes')
        .eq('user_email', user.email);

      if (dbError) throw dbError;
      setProgress(data || []);
    } catch (err: any) {
      console.error('Dashboard pipeline failure:', err);
      setError(err.message || 'Failed to sync analytics data.');
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchDashboardTelemetry();
  }, [fetchDashboardTelemetry]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground font-bold text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span>Loading progress data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-semibold flex items-center gap-2 max-w-xl mx-auto">
        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
        <span>Error: {error}</span>
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <Card className="border-border bg-card shadow-md">
        <CardContent className="py-12 text-center space-y-2">
          <Activity className="w-10 h-10 text-muted-foreground mx-auto stroke-[1.5]" />
          <h4 className="text-sm font-bold text-foreground">No Data Found</h4>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Start exploring subjects and resources to see your progress here!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Core Metrics
  const totalSessions = progress.reduce((a, p) => a + (p.study_sessions || 0), 0);
  const topSubject = [...progress].sort((a, b) => (b.study_sessions || 0) - (a.study_sessions || 0))[0];
  const activeSubjects = progress.filter(p => (p.study_sessions || 0) > 0).length;

  // Streak Calculation
  const rawDates = progress
    .filter(p => p.last_access)
    .map(p => p.last_access!.split('T')[0]);
  const uniqueSortedDates = [...new Set(rawDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  let streak = 0;
  if (uniqueSortedDates.length > 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (uniqueSortedDates[0] === todayStr || uniqueSortedDates[0] === yesterdayStr) {
      streak = 1;
      for (let i = 1; i < uniqueSortedDates.length; i++) {
        const prevTime = new Date(uniqueSortedDates[i - 1]).getTime();
        const currTime = new Date(uniqueSortedDates[i]).getTime();
        if ((prevTime - currTime) / 86400000 === 1) streak++;
        else break;
      }
    }
  }

  // Bar Chart Data
  const barData = progress
    .filter(p => (p.study_sessions || 0) > 0)
    .map((p, i) => ({
      name: SHORT(p.subject),
      fullName: p.subject,
      sessions: p.study_sessions || 0,
      fill: COLORS[i % COLORS.length],
    }))
    .sort((a, b) => b.sessions - a.sessions);

  // Radar Chart Data
  const radarData = progress.map((p, i) => ({
    subject: SHORT(p.subject),
    sessions: p.study_sessions || 0,
  }));

  // Pie Chart Data by Grade
  const gradeMap: Record<number, number> = {};
  progress.forEach(p => {
    gradeMap[p.grade_level] = (gradeMap[p.grade_level] || 0) + (p.study_sessions || 0);
  });
  const pieData = Object.entries(gradeMap).map(([gradeNum, val], i) => ({
    name: `Grade ${gradeNum}`,
    value: val,
    fill: COLORS[(i + 2) % COLORS.length],
  }));

  // Timeline Data (Last 14 Days)
  const last14DaysArray = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });
  const dailyCounts: Record<string, number> = {};
  progress.forEach(p => {
    if (p.last_access) {
      const dateKey = p.last_access.split('T')[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    }
  });
  const lineData = last14DaysArray.map(dateStr => ({
    date: dateStr.slice(5),
    subjects: dailyCounts[dateStr] || 0,
  }));

  return (
    <div className="space-y-5 w-full max-w-6xl mx-auto p-1">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground">My Progress Dashboard</h2>
            <p className="text-xs text-muted-foreground">Track your learning journey</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 font-bold text-xs h-8" onClick={() => exportCSV(progress, user)}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Sessions" value={totalSessions} color="bg-primary/10 text-primary" />
        <StatCard icon={Target} label="Active Subjects" value={activeSubjects} color="bg-blue-100 text-blue-700" />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={streak}
          sub={streak >= 3 ? '🔥 On fire!' : streak === 1 ? 'Started today' : null}
          color="bg-orange-100 text-orange-600"
        />
        <StatCard
          icon={BarChart2}
          label="Top Subject"
          value={topSubject?.study_sessions || 0}
          sub={topSubject?.subject || '—'}
          color="bg-green-100 text-green-700"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Bar Chart */}
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2 border-b bg-muted/30">
            <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-primary" /> Study Sessions per Subject
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                <Tooltip
                  formatter={(val: any, _, props) => [val, props?.payload?.fullName || 'Sessions']}
                  contentStyle={{ fontSize: 11, borderRadius: 8, backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2 border-b bg-muted/30">
            <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-primary" /> Activity (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="subjects" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Radar Chart */}
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2 border-b bg-muted/30">
            <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" /> Subject Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <PolarRadiusAxis tick={{ fontSize: 8 }} />
                <Radar name="Sessions" dataKey="sessions" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <Card className="border-border bg-card shadow-md">
            <CardHeader className="pb-2 border-b bg-muted/30">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" /> Distribution by Grade
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
