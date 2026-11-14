import ReleaseGate from '@/components/operations/ReleaseGate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, BookOpen, Download, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { PROGRESS_TIMEFRAMES, buildTutorProgressSummary, getProgressCutoff, toCsv } from '@/lib/tutor-progress-utils';

function TutorStudentProgressChartImplementation({ user }) {
  const [bookings, setBookings] = useState([]);
  const [progress, setProgress] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('quarter');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setBookings([]);
      setProgress([]);
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // RLS authorises a tutor by auth.uid() and a confirmed/completed booking.
      // Never widen this to an email-only filter or fetch other users' profile rows.
      const { data: bookingRows, error: bookingError } = await supabase
        .from('tutor_bookings')
        .select('id, student_id, student_email, student_name, subject, date, status')
        .eq('tutor_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .order('date', { ascending: false })
        .limit(250);
      if (bookingError) throw bookingError;

      const learnerIds = [...new Set((bookingRows || []).map((row) => row.student_id).filter(Boolean))];
      setBookings(bookingRows || []);

      if (!learnerIds.length) {
        setProgress([]);
        setSessions([]);
        return;
      }

      let progressQuery = supabase
        .from('student_progress')
        .select('student_id, subject, grade, current_score, target_score, overall_score, progress_percentage, attendance_percentage, assignments_completed, assignments_total, at_risk, risk_factors, last_accessed, updated_at, created_at')
        .in('student_id', learnerIds);
      let sessionQuery = supabase
        .from('study_sessions')
        .select('student_id, subject, date, is_completed, completed_at, duration_minutes')
        .in('student_id', learnerIds)
        .eq('is_completed', true);

      const cutoff = getProgressCutoff(timeframe);
      if (cutoff) {
        progressQuery = progressQuery.gte('last_accessed', cutoff);
        sessionQuery = sessionQuery.gte('date', cutoff);
      }

      const [{ data: progressRows, error: progressError }, { data: sessionRows, error: sessionError }] = await Promise.all([
        progressQuery,
        sessionQuery,
      ]);
      if (progressError) throw progressError;
      if (sessionError) throw sessionError;

      setProgress(progressRows || []);
      setSessions(sessionRows || []);
    } catch (loadError) {
      console.error('Tutor learner progress could not be loaded:', loadError);
      setError('We could not load learner progress. Please try again.');
      toast.error('Could not load learner progress');
    } finally {
      setLoading(false);
    }
  }, [user?.id, timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(
    () => buildTutorProgressSummary({ bookings, progress, sessions, gradeFilter }),
    [bookings, progress, sessions, gradeFilter],
  );

  const exportReport = () => {
    setExporting(true);
    try {
      const csv = toCsv(summary.learners);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smartbridge-learner-progress-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Learner progress report exported');
    } catch (exportError) {
      console.error('Learner progress export failed:', exportError);
      toast.error('Could not export the report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <Card className="mb-6 border-border"><CardContent className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>;
  }

  if (error) {
    return (
      <Card className="mb-6 border-border">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Learner Progress</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="mr-2 h-4 w-4" /> Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!summary.totalLearners) {
    return (
      <Card className="mb-6 border-border">
        <CardContent className="py-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
          <p className="font-medium">Your learner list will appear here</p>
          <p className="mt-1 text-sm text-muted-foreground">Learners appear after they have a confirmed or completed booking with you.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-border">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Learner Progress</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROGRESS_TIMEFRAMES).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All grades</SelectItem>
                {['Grade 10', 'Grade 11', 'Grade 12'].map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportReport} disabled={exporting || !summary.learners.length}>
              {exporting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />} Export
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Only learners with an active or completed tutor booking are included. Personal parent contact details are not exposed in this view.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-2xl font-semibold">{summary.totalLearners}</p><p className="text-xs text-muted-foreground">Linked learners</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-2xl font-semibold">{summary.totalSessions}</p><p className="text-xs text-muted-foreground">Study sessions</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-2xl font-semibold">{summary.progressRecords}</p><p className="text-xs text-muted-foreground">Progress records</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-2xl font-semibold">{summary.atRiskLearners}</p><p className="text-xs text-muted-foreground">Flagged for support</p></div>
        </div>

        {!summary.progressRecords && !summary.totalSessions && (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="font-medium">Learning data has not been recorded yet</p><p className="mt-1 text-xs">Your booked learners are listed below, but SmartBridge has not yet received progress records or completed study sessions for this period. No performance score is being assumed.</p></div>
          </div>
        )}

        {summary.subjects.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><BookOpen className="h-3.5 w-3.5" /> Average recorded score by subject</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.subjects} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="subject" width={110} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Average score']} />
                <Bar dataKey="averageScore" fill="hsl(var(--primary))" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Learner overview ({summary.learners.length})</p>
            {summary.atRiskLearners > 0 && <Badge variant="destructive">{summary.atRiskLearners} need attention</Badge>}
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40"><tr className="text-left text-xs text-muted-foreground">
                <th className="p-3">Learner</th><th className="p-3">Grade</th><th className="p-3">Subjects</th><th className="p-3">Sessions</th><th className="p-3">Average score</th><th className="p-3">Progress</th><th className="p-3">Status</th>
              </tr></thead>
              <tbody>
                {summary.learners.map((learner) => (
                  <tr key={learner.id} className="border-t">
                    <td className="p-3"><p className="font-medium">{learner.name}</p><p className="text-xs text-muted-foreground">{learner.email || 'Learner account'}</p></td>
                    <td className="p-3 text-xs">{learner.grade}</td>
                    <td className="max-w-[180px] p-3 text-xs">{learner.subjects.join(', ') || 'Not recorded'}</td>
                    <td className="p-3 text-xs">{learner.sessions}</td>
                    <td className="p-3 text-xs">{learner.averageScore === null ? 'Not recorded' : `${learner.averageScore}%`}</td>
                    <td className="p-3 text-xs">{learner.averageProgress === null ? 'Not recorded' : `${learner.averageProgress}%`}</td>
                    <td className="p-3">{learner.atRisk ? <Badge variant="destructive">Support needed</Badge> : learner.hasProgress ? <Badge variant="secondary">Progress recorded</Badge> : <Badge variant="outline">Awaiting data</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!summary.learners.length && <p className="p-6 text-center text-sm text-muted-foreground">No learners match this grade filter.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TutorStudentProgressChart(props) {
  return <ReleaseGate feature="tutorAnalytics"><TutorStudentProgressChartImplementation {...props} /></ReleaseGate>;
}
