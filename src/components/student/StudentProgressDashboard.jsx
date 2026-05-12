import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { TrendingUp, BookOpen, Flame, Target, BarChart2, Activity, Download } from 'lucide-react';

function exportCSV(progress, user) {
  const headers = ['Subject', 'Grade', 'Resources Accessed', 'Last Accessed', 'Notes'];
  const rows = progress.map(p => [
    p.subject || '',
    p.grade || '',
    p.study_sessions || p.resources_accessed || 0,
    p.last_access || '',
    (p.notes || '').replace(/,/g, ';'),
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `progress-report-${user?.user_metadata?.full_name?.replace(/\s+/g, '-') || 'student'}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const COLORS = ['#2e7d52','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16','#a78bfa'];

const SHORT = (s) => s?.length > 10 ? s.slice(0, 10) + '…' : s;

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4">
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="font-playfair text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-primary font-medium mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function StudentProgressDashboard({ user }) {
  const [progress, setProgress] = useState([]);
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
      } catch (error) {
        console.error('Error fetching student progress:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProgress();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-2" />
        Loading your progress…
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No progress data yet. Start exploring subjects and resources!</p>
        </CardContent>
      </Card>
    );
  }

  // --- Derived data ---
  const totalSessions = progress.reduce((a, p) => a + (p.study_sessions || p.resources_accessed || 0), 0);
  const topSubject = [...progress].sort((a, b) => (b.study_sessions || b.resources_accessed || 0) - (a.study_sessions || a.resources_accessed || 0))[0];
  const activeSubjects = progress.filter(p => (p.study_sessions || p.resources_accessed || 0) > 0).length;

  // Streak
  const dates = progress.filter(p => p.last_access).map(p => p.last_access).sort().reverse();
  let streak = 0;
  if (dates.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    if (dates[0] === today) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i - 1]) - new Date(dates[i])) / 86400000;
        if (diff === 1) streak++; else break;
      }
    }
  }

  // Bar chart: resources accessed per subject
  const barData = progress
    .filter(p => (p.study_sessions || p.resources_accessed || 0) > 0)
    .map((p, i) => ({
      name: SHORT(p.subject),
      fullName: p.subject,
      sessions: p.study_sessions || p.resources_accessed || 0,
      fill: COLORS[i % COLORS.length],
    }))
    .sort((a, b) => b.sessions - a.sessions);

  // Radar chart: subject engagement
  const radarData = progress.map((p, i) => ({
    subject: SHORT(p.subject),
    sessions: p.study_sessions || p.resources_accessed || 0,
  }));

  // Pie chart: distribution across grades
  const gradeMap = {};
  progress.forEach(p => {
    gradeMap[p.grade] = (gradeMap[p.grade] || 0) + (p.study_sessions || p.resources_accessed || 0);
  });
  const pieData = Object.entries(gradeMap).map(([grade, val], i) => ({
    name: grade, value: val, fill: COLORS[i % COLORS.length],
  }));

  // Timeline: last_access dates sorted for a line chart (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });
  const dailyCounts = {};
  progress.forEach(p => {
    if (p.last_access) dailyCounts[p.last_access] = (dailyCounts[p.last_access] || 0) + 1;
  });
  const lineData = last14.map(date => ({
    date: date.slice(5), // MM-DD
    subjects: dailyCounts[date] || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-playfair text-xl font-bold">My Progress Dashboard</h2>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(progress, user)}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Sessions" value={totalSessions} color="bg-primary/10 text-primary" />
        <StatCard icon={Target} label="Active Subjects" value={activeSubjects} color="bg-blue-100 text-blue-700" />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={streak}
          sub={streak >= 3 ? '🔥 On fire!' : streak === 1 ? 'Started today!' : null}
          color="bg-orange-100 text-orange-600"
        />
        <StatCard
          icon={BarChart2}
          label="Top Subject"
          value={topSubject?.study_sessions || topSubject?.resources_accessed || 0}
          sub={topSubject?.subject || '—'}
          color="bg-green-100 text-green-700"
        />
      </div>

      {/* Bar + Line row */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Sessions per Subject */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" /> Sessions per Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v, _, props) => [v, props.payload?.fullName || 'Sessions']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
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

        {/* Activity over last 14 days */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Activity — Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={1} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [v, 'Subjects studied']} />
                <Line
                  type="monotone"
                  dataKey="subjects"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Radar + Pie row */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Radar */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Subject Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 8 }} />
                <Radar
                  name="Sessions"
                  dataKey="sessions"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie — grade distribution */}
        {pieData.length > 1 ? (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-playfair flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Sessions by Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [v, 'Sessions']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          // Fallback: subject notes list
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-playfair flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Subject Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {progress.filter(p => p.notes).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0 text-xs">{p.subject}</Badge>
                  <p className="text-muted-foreground text-xs">{p.notes}</p>
                </div>
              ))}
              {progress.filter(p => p.notes).length === 0 && (
                <p className="text-sm text-muted-foreground">No notes added yet.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}