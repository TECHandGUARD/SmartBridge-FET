import ReleaseGate from '@/components/operations/ReleaseGate';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, TrendingUp, BookOpen, Download,
  TrendingDown, TrendingUp as TrendUp,
  Loader2, Bell
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { toast } from 'sonner';

// Subjects that score below this threshold are flagged as needing focus
const FOCUS_THRESHOLD = 3;
const INACTIVE_THRESHOLD_DAYS = 14;

const TIME_FRAMES = {
  'current': { label: 'Current Term', days: 90 },
  'term1': { label: 'Term 1', start: '2026-01-15', end: '2026-03-20' },
  'term2': { label: 'Term 2', start: '2026-04-05', end: '2026-06-10' },
  'term3': { label: 'Term 3', start: '2026-07-15', end: '2026-09-20' },
  'term4': { label: 'Term 4 (Exams)', start: '2026-10-01', end: '2026-12-05' },
  'year': { label: 'Full Year', days: 365 }
};

const SUBJECT_COLORS = [
  '#16a34a', '#2563eb', '#9333ea', '#ea580c', '#0891b2',
  '#dc2626', '#ca8a04', '#0d9488', '#7c3aed', '#db2777',
];

// Helper to get date filter
const getDateFilter = (timeFrame) => {
  const frame = TIME_FRAMES[timeFrame];
  if (frame.start && frame.end) {
    return { gte: frame.start, lte: frame.end };
  }
  const days = frame.days || 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return { gte: date.toISOString().split('T')[0] };
};

function TutorStudentProgressChartImplementation({ user }) {
  const [progress, setProgress] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState('current');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [trendData, setTrendData] = useState({});

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Use immutable user UUIDs for all tutor/learner ownership checks.
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('student_id, student_email, student_name, subject, date')
        .eq('tutor_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .order('date', { ascending: false })
        .limit(500);

      if (bookingsError) throw bookingsError;

      const profilesMap = {};
      (bookingsData || []).forEach((booking) => {
        if (!booking.student_id) return;
        if (!profilesMap[booking.student_id]) {
          profilesMap[booking.student_id] = {
            id: booking.student_id,
            email: booking.student_email || '',
            full_name: booking.student_name || 'Learner',
            grade: 'Not set',
            lastAccess: null
          };
        }
      });

      const studentIds = Object.keys(profilesMap);
      if (studentIds.length === 0) {
        setProgress([]);
        setStudentProfiles({});
        setTrendData({});
        setLoading(false);
        return;
      }

      // Grade is read through the security-invoker progress view, whose underlying
      // RLS permits a tutor to see only learners with a confirmed/completed booking.
      const [{ data: gradeRows, error: gradeError }, { data: sessionsData, error: sessionsError }] = await Promise.all([
        supabase.from('study_progress').select('student_id, grade').in('student_id', studentIds),
        supabase.from('study_sessions').select('student_id, subject, date').in('student_id', studentIds)
          .eq('is_completed', true).order('date', { ascending: false }).limit(5000)
      ]);
      if (gradeError) throw gradeError;
      if (sessionsError) throw sessionsError;

      (gradeRows || []).forEach((row) => {
        if (profilesMap[row.student_id] && row.grade) profilesMap[row.student_id].grade = row.grade;
      });

      const allSessions = sessionsData || [];
      const latestByStudent = {};
      allSessions.forEach((session) => {
        if (!session.student_id || !session.date) return;
        const current = latestByStudent[session.student_id];
        if (!current || session.date > current) latestByStudent[session.student_id] = session.date;
      });
      Object.entries(profilesMap).forEach(([studentId, profile]) => {
        profile.lastAccess = latestByStudent[studentId] || null;
      });

      const dateFilter = getDateFilter(timeFrame);
      const currentStart = new Date(dateFilter.gte);
      const currentEnd = new Date(dateFilter.lte || new Date().toISOString().split('T')[0]);
      const periodDays = Math.max(1, Math.round((currentEnd - currentStart) / 86400000) + 1);
      const previousEnd = new Date(currentStart);
      previousEnd.setDate(previousEnd.getDate() - 1);
      const previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - periodDays + 1);
      const toDate = (date) => date.toISOString().split('T')[0];
      const currentStartText = toDate(currentStart);
      const currentEndText = toDate(currentEnd);
      const previousStartText = toDate(previousStart);
      const previousEndText = toDate(previousEnd);

      const currentCounts = {};
      const previousCounts = {};
      const currentLastAccess = {};
      allSessions.forEach((session) => {
        if (!session.student_id || !session.subject || !session.date) return;
        const key = `${session.student_id}_${session.subject}`;
        if (session.date >= currentStartText && session.date <= currentEndText) {
          currentCounts[key] = (currentCounts[key] || 0) + 1;
          if (!currentLastAccess[session.student_id] || session.date > currentLastAccess[session.student_id]) {
            currentLastAccess[session.student_id] = session.date;
          }
        } else if (session.date >= previousStartText && session.date <= previousEndText) {
          previousCounts[key] = (previousCounts[key] || 0) + 1;
        }
      });

      const progressRows = Object.entries(currentCounts).map(([key, count]) => {
        const splitAt = key.indexOf('_');
        const studentId = key.slice(0, splitAt);
        const subject = key.slice(splitAt + 1);
        return {
          student_id: studentId,
          subject,
          study_sessions: count,
          last_access: currentLastAccess[studentId] || null,
        };
      });

      const changes = {};
      new Set([...Object.keys(currentCounts), ...Object.keys(previousCounts)]).forEach((key) => {
        changes[key] = (currentCounts[key] || 0) - (previousCounts[key] || 0);
      });

      setStudentProfiles(profilesMap);
      setProgress(progressRows);
      setTrendData(changes);
    } catch (err) {
      console.error('Error loading student progress:', err);
      toast.error('Failed to load student progress data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, timeFrame]);
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate alerts
  // Aggregate completed study sessions by subject and learner.
  const subjectStats = useMemo(() => {
    const map = {};
    progress.forEach((row) => {
      if (!row.subject) return;
      if (!map[row.subject]) map[row.subject] = { total: 0, count: 0, students: new Set() };
      map[row.subject].total += Number(row.study_sessions) || 0;
      map[row.subject].count++;
      map[row.subject].students.add(row.student_id);
    });
    return Object.entries(map)
      .map(([subject, data]) => ({
        subject: subject.length > 14 ? subject.slice(0, 13) + '…' : subject,
        fullSubject: subject,
        avgSessions: data.count ? Math.round((data.total / data.count) * 10) / 10 : 0,
        studentCount: data.students.size,
        needsFocus: data.count > 0 && data.total / data.count < FOCUS_THRESHOLD
      }))
      .sort((a, b) => b.avgSessions - a.avgSessions);
  }, [progress]);
  useEffect(() => {
    const newAlerts = [];
    const inactiveCutoff = new Date();
    inactiveCutoff.setDate(inactiveCutoff.getDate() - INACTIVE_THRESHOLD_DAYS);
    Object.values(studentProfiles).forEach((profile) => {
      const lastAccess = profile.lastAccess ? new Date(profile.lastAccess) : null;
      if (!lastAccess || lastAccess < inactiveCutoff) {
        newAlerts.push({
          type: 'inactive_student',
          student_id: profile.id,
          student_name: profile.full_name || 'Learner',
          severity: 'critical',
          message: `${profile.full_name || 'A learner'} has no recorded study activity in ${INACTIVE_THRESHOLD_DAYS} days`,
          recommendedAction: 'Review engagement and arrange a learner follow-up'
        });
      }
    });
    subjectStats.forEach((subject) => {
      if (subject.needsFocus) {
        newAlerts.push({
          type: 'subject_struggle',
          subject: subject.fullSubject,
          severity: 'warning',
          message: `${subject.studentCount} learner(s) averaging below ${FOCUS_THRESHOLD} completed study sessions in ${subject.fullSubject}`,
          recommendedAction: 'Schedule a focused support session'
        });
      }
    });
    setAlerts(newAlerts);
  }, [studentProfiles, subjectStats]);


  // Per-student engagement with full names and grades
  const studentStats = useMemo(() => {
    const map = {};
    Object.entries(studentProfiles).forEach(([studentId, profile]) => {
      map[studentId] = { subjects: 0, sessions: 0, lastAccess: profile.lastAccess || null, subjectNames: new Set() };
    });
    progress.forEach((row) => {
      if (!map[row.student_id]) return;
      map[row.student_id].sessions += Number(row.study_sessions) || 0;
      map[row.student_id].subjectNames.add(row.subject);
      map[row.student_id].lastAccess = row.last_access && (!map[row.student_id].lastAccess || row.last_access > map[row.student_id].lastAccess)
        ? row.last_access : map[row.student_id].lastAccess;
    });
    return Object.entries(map)
      .map(([studentId, data]) => {
        const profile = studentProfiles[studentId];
        const lastAccessDays = data.lastAccess
          ? Math.max(0, Math.floor((Date.now() - new Date(data.lastAccess).getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        return {
          id: studentId,
          email: profile?.email || '',
          name: profile?.full_name || 'Learner',
          grade: profile?.grade || 'Not set',
          subjects: data.subjectNames.size,
          sessions: data.sessions,
          lastAccessDays,
          isInactive: lastAccessDays === null || lastAccessDays > INACTIVE_THRESHOLD_DAYS,
          trend: Object.entries(trendData).filter(([key]) => key.startsWith(`${studentId}_`)).reduce((sum, [, value]) => sum + value, 0)
        };
      })
      .filter((student) => gradeFilter === 'all' || student.grade === gradeFilter)
      .sort((a, b) => {
        if (a.isInactive && !b.isInactive) return -1;
        if (!a.isInactive && b.isInactive) return 1;
        return b.sessions - a.sessions;
      });
  }, [progress, studentProfiles, gradeFilter, trendData]);

  const needsFocusSubjects = subjectStats.filter(s => s.needsFocus);
  const inactiveStudents = studentStats.filter(s => s.isInactive);

  const radarData = subjectStats.slice(0, 8).map(s => ({
    subject: s.subject,
    engagement: s.avgSessions,
  }));

  const handleExportReport = async () => {
    setExporting(true);
    try {
      // Generate CSV
      const csvRows = [
        ['Learner', 'Grade', 'Subjects', 'Completed Sessions', 'Engagement', 'Last Activity'],
        ...studentStats.map(s => [
          s.name, s.grade, s.subjects, s.sessions,
          s.isInactive ? 'Needs follow-up' : 'Active',
          s.lastAccessDays === null ? 'No recorded activity' : `${s.lastAccessDays} days ago`
        ])
      ];

      const csv = csvRows.map(row => row.map((value) => {
        const text = String(value ?? '');
        const safe = /^\s*[=+@\-\t\r]/.test(text) ? `'${text}` : text;
        return `"${safe.replace(/"/g, '""')}"`;
      }).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-progress-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const CustomTooltip = ({ active = false, payload = [], label = null }) => {
    if (!active || !payload?.length) return null;
    const stat = subjectStats.find(s => s.subject === label || s.fullSubject === label);
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow text-xs">
        <p className="font-semibold mb-0.5">{stat?.fullSubject || label}</p>
        <p className="text-primary">Avg sessions: {payload[0]?.value}</p>
        <p className="text-muted-foreground">{stat?.studentCount || 0} student(s)</p>
        {stat?.needsFocus && <p className="text-amber-600 font-medium mt-0.5">⚠ Needs focus</p>}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="border-border mb-6">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (progress.length === 0 && studentStats.length === 0) {
    return (
      <Card className="border-border mb-6">
        <CardContent className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No learners are linked to your completed or confirmed sessions yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Once learners are booked and study sessions are recorded, their engagement will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Student Progress Overview
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={timeFrame} onValueChange={setTimeFrame}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="Time frame" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_FRAMES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="Grade 10">Grade 10</SelectItem>
                <SelectItem value="Grade 11">Grade 11</SelectItem>
                <SelectItem value="Grade 12">Grade 12</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleExportReport} disabled={exporting}>
              {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Action Required ({alerts.length})
            </p>
            <div className="space-y-1.5">
              {alerts.slice(0, 3).map((alert, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-amber-800">{alert.message}</span>
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                    {alert.recommendedAction}
                  </Badge>
                </div>
              ))}
              {alerts.length > 3 && (
                <p className="text-xs text-amber-600">+{alerts.length - 3} more alerts</p>
              )}
            </div>
          </div>
        )}

        {/* Needs Focus Subjects */}
        {needsFocusSubjects.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Subjects Needing Attention
            </p>
            <div className="flex flex-wrap gap-1.5">
              {needsFocusSubjects.map(s => (
                <Badge key={s.subject} className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                  {s.fullSubject} — avg {s.avgSessions} sessions
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Bar chart: avg sessions per subject */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Completed Study Sessions by Subject
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectStats} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="subject" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgSessions" radius={[0, 4, 4, 0]}>
                  {subjectStats.map((entry, i) => (
                    <Cell
                      key={entry.subject}
                      fill={entry.needsFocus ? '#f59e0b' : SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-amber-400 inline-block" /> Needs focus</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-600 inline-block" /> On track</span>
            </div>
          </div>

          {/* Radar chart */}
          {radarData.length >= 3 ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Engagement Spread
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                  <Radar
                    dataKey="engagement"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-muted/20 rounded-xl p-4 text-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-xs text-muted-foreground">Add more subjects to see engagement radar</p>
            </div>
          )}
        </div>

        {/* Student Engagement Table */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Students ({studentStats.length})
            {inactiveStudents.length > 0 && (
              <Badge className="bg-red-100 text-red-700 text-[10px]">
                {inactiveStudents.length} inactive
              </Badge>
            )}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-semibold text-xs">Student</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Grade</th>
                  <th className="text-center py-2 px-2 font-semibold text-xs">Subjects</th>
                  <th className="text-center py-2 px-2 font-semibold text-xs">Sessions</th>
                  <th className="text-center py-2 px-2 font-semibold text-xs">Status</th>
                  <th className="text-center py-2 px-2 font-semibold text-xs">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.slice(0, 10).map((student) => (
                  <tr key={student.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{student.name}</p>
                          <p className="text-[10px] text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="text-[10px]">{student.grade}</Badge>
                    </td>
                    <td className="py-2 px-2 text-center text-xs">{student.subjects}</td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs font-semibold">{student.sessions}</span>
                        {student.trend > 0 && <TrendUp className="w-3 h-3 text-green-500" />}
                        {student.trend < 0 && <TrendingDown className="w-3 h-3 text-red-500" />}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {student.isInactive ? (
                        <Badge className="bg-red-100 text-red-700 text-[10px]">Inactive</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">Active</Badge>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-xs text-muted-foreground">{student.lastAccessDays === null ? 'No record' : student.lastAccessDays === 0 ? 'Today' : `${student.lastAccessDays}d ago`}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {studentStats.length > 10 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              +{studentStats.length - 10} more students
            </p>
          )}
        </div>

        {/* Engagement follow-up reminder */}
        {inactiveStudents.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Learner Follow-up
            </p>
            <p className="text-xs text-red-600">
              {inactiveStudents.length} student(s) have been inactive for {INACTIVE_THRESHOLD_DAYS}+ days.
              Review their recent activity and arrange a follow-up through the platform's approved communication channel.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TutorStudentProgressChart(props) {
  return <ReleaseGate feature="tutorAnalytics"><TutorStudentProgressChartImplementation {...props} /></ReleaseGate>;
}
