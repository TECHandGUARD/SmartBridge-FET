import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, AlertTriangle, TrendingUp, BookOpen, Download, 
  Mail, Calendar, TrendingDown, TrendingUp as TrendUp, 
  Loader2, FileText, Bell, User, GraduationCap, Shield
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  LineChart, Line, CartesianGrid
} from 'recharts';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const FOCUS_THRESHOLD = 3;
const INACTIVE_THRESHOLD_DAYS = 14;

// ============================================================
// Time Frames (Soft-coded for admin control)
// ============================================================

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

// ============================================================
// PropTypes
// ============================================================

const propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string.isRequired,
    id: PropTypes.string,
    full_name: PropTypes.string,
  }).isRequired,
  onContactParent: PropTypes.func,
  schoolContext: PropTypes.shape({
    schoolId: PropTypes.string,
    schoolName: PropTypes.string,
  }),
};

// ============================================================
// Helper Functions
// ============================================================

const getDateFilter = (timeFrame) => {
  const frame = TIME_FRAMES[timeFrame];
  if (frame?.start && frame?.end) {
    return { gte: frame.start, lte: frame.end };
  }
  const days = frame?.days || 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return { gte: date.toISOString().split('T')[0] };
};

// ============================================================
// Main Component
// ============================================================

export default function TutorStudentProgressChart({ user, onContactParent, schoolContext }) {
  const [progress, setProgress] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState('current');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [schoolAverages, setSchoolAverages] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [trendData, setTrendData] = useState({});

  // ============================================================
  // ✅ FIXED: Calculate Trends with explicit data parameter
  // ============================================================

  const calculateTrends = useCallback(async (studentEmails, currentProgressData) => {
    try {
      const currentFilter = getDateFilter(timeFrame);
      if (!currentFilter.gte) return {};

      const prevStart = new Date(currentFilter.gte);
      prevStart.setDate(prevStart.getDate() - 90);
      const prevEnd = new Date(currentFilter.gte);
      prevEnd.setDate(prevEnd.getDate() - 1);

      const { data: prevData } = await supabase
        .from('student_progress')
        .select('*')
        .in('student_email', studentEmails)
        .gte('last_accessed', prevStart.toISOString().split('T')[0])
        .lte('last_accessed', prevEnd.toISOString().split('T')[0]);

      const trends = {};
      if (prevData) {
        prevData.forEach(p => {
          const key = `${p.student_email}_${p.subject}`;
          trends[key] = p.resources_accessed || 0;
        });
      }

      // ✅ Use the passed-in currentProgressData instead of state
      const currentTrends = {};
      currentProgressData.forEach(p => {
        const key = `${p.student_email}_${p.subject}`;
        currentTrends[key] = p.resources_accessed || 0;
      });

      const changes = {};
      Object.keys(currentTrends).forEach(key => {
        const prev = trends[key] || 0;
        const current = currentTrends[key];
        changes[key] = current - prev;
      });

      setTrendData(changes);
      return changes;
    } catch (err) {
      console.error('Error calculating trends:', err);
      return {};
    }
  }, [timeFrame]);

  // ============================================================
  // Load Data
  // ============================================================

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const dateFilter = getDateFilter(timeFrame);
      
      // Load tutor's completed bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_email', user.email)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(100);
      
      if (bookingsError) throw bookingsError;
      
      const studentEmails = [...new Set((bookingsData || []).map(b => b.student_email).filter(Boolean))];
      setBookings(bookingsData || []);
      
      if (studentEmails.length === 0) {
        setProgress([]);
        setStudentProfiles({});
        setTrendData({});
        setLoading(false);
        return;
      }
      
      // Fetch student progress
      let progressQuery = supabase
        .from('student_progress')
        .select('*')
        .in('student_email', studentEmails);
      
      if (dateFilter.gte) {
        progressQuery = progressQuery.gte('last_accessed', dateFilter.gte);
      }
      if (dateFilter.lte) {
        progressQuery = progressQuery.lte('last_accessed', dateFilter.lte);
      }
      
      const { data: progressData, error: progressError } = await progressQuery;
      if (progressError) throw progressError;
      
      // ✅ Store the fetched data for later use
      const fetchedProgress = progressData || [];
      
      // Load student profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('users')
        .select('id, email, full_name, grade, parent_email, phone')
        .in('email', studentEmails);
      
      if (profilesError) throw profilesError;
      
      const profilesMap = {};
      (profilesData || []).forEach(p => {
        profilesMap[p.email] = p;
      });
      
      // Load school averages if available
      if (schoolContext?.schoolId) {
        const { data: avgData } = await supabase
          .from('school_subject_averages')
          .select('*')
          .eq('school_id', schoolContext.schoolId);
        if (avgData) {
          const avgMap = {};
          avgData.forEach(a => { avgMap[a.subject] = a.avg_resources; });
          setSchoolAverages(avgMap);
        }
      }
      
      // ✅ Update state with fetched data
      setStudentProfiles(profilesMap);
      setProgress(fetchedProgress);
      
      // ✅ Calculate trends using the fetched data directly
      await calculateTrends(studentEmails, fetchedProgress);
      
      // Log activity for POPIA compliance
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'student_progress_chart_viewed',
          user_email: user.email,
          user_id: user.id || null,
          description: 'Viewed student progress chart',
          metadata: {
            time_frame: timeFrame,
            student_count: studentEmails.length,
            school_id: schoolContext?.schoolId
          }
        })
        .catch(() => {});
      
    } catch (err) {
      console.error('Error loading student progress:', err);
      toast.error('Failed to load student progress data');
    } finally {
      setLoading(false);
    }
  }, [user?.email, timeFrame, schoolContext, calculateTrends]);

  // ============================================================
  // Real-time Subscription
  // ============================================================

  useEffect(() => {
    if (!user?.email) return;
    
    const channel = supabase
      .channel('tutor_student_progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_progress',
        },
        () => {
          loadData();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // ✅ FIXED: Memoized Calculations (Alerts included)
  // ============================================================

  // ✅ Fixed: resources_accessed
  const subjectStats = useMemo(() => {
    const map = {};
    progress.forEach(p => {
      if (!p.subject) return;
      if (!map[p.subject]) map[p.subject] = { total: 0, count: 0, students: new Set() };
      map[p.subject].total += (p.resources_accessed || 0);
      map[p.subject].count++;
      map[p.subject].students.add(p.student_email);
    });
    return Object.entries(map)
      .map(([subject, data]) => ({
        subject: subject.length > 14 ? subject.slice(0, 13) + '…' : subject,
        fullSubject: subject,
        avgSessions: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
        studentCount: data.students.size,
        needsFocus: (data.total / data.count) < FOCUS_THRESHOLD,
        vsSchoolAvg: schoolAverages ? 
          ((data.total / data.count) - (schoolAverages[subject] || 0)).toFixed(1) : null
      }))
      .sort((a, b) => b.avgSessions - a.avgSessions);
  }, [progress, schoolAverages]);

  // ✅ Fixed: student_email and resources_accessed
  const studentStats = useMemo(() => {
    const map = {};
    progress.forEach(p => {
      if (!map[p.student_email]) map[p.student_email] = { subjects: 0, sessions: 0, lastAccess: null };
      map[p.student_email].subjects++;
      map[p.student_email].sessions += (p.resources_accessed || 0);
      if (p.last_accessed && (!map[p.student_email].lastAccess || p.last_accessed > map[p.student_email].lastAccess)) {
        map[p.student_email].lastAccess = p.last_accessed;
      }
    });
    return Object.entries(map)
      .map(([email, data]) => {
        const profile = studentProfiles[email];
        const lastAccessDays = data.lastAccess ? 
          Math.ceil((new Date() - new Date(data.lastAccess)) / (1000 * 60 * 60 * 24)) : null;
        return {
          email,
          name: profile?.full_name || email.split('@')[0],
          grade: profile?.grade || 'Not set',
          parentEmail: profile?.parent_email,
          phone: profile?.phone,
          subjects: data.subjects,
          sessions: data.sessions,
          lastAccessDays,
          isInactive: lastAccessDays > INACTIVE_THRESHOLD_DAYS,
          trend: trendData[`${email}_${data.subjects}`] || 0
        };
      })
      .filter(s => gradeFilter === 'all' || s.grade === gradeFilter)
      .sort((a, b) => {
        if (a.isInactive && !b.isInactive) return -1;
        if (!a.isInactive && b.isInactive) return 1;
        return b.sessions - a.sessions;
      });
  }, [progress, studentProfiles, gradeFilter, trendData]);

  // ✅ FIXED: Alerts computed with useMemo
  const alerts = useMemo(() => {
    const newAlerts = [];
    
    if (Object.keys(studentProfiles).length === 0 && progress.length === 0) {
      return newAlerts;
    }
    
    const activeStudents = new Set(progress.map(p => p.student_email));
    const allStudents = Object.keys(studentProfiles);
    
    allStudents.forEach(email => {
      if (!activeStudents.has(email)) {
        const profile = studentProfiles[email];
        newAlerts.push({
          type: 'inactive_student',
          student_email: email,
          student_name: profile?.full_name || email,
          severity: 'critical',
          message: `${profile?.full_name || email} has no study activity in ${INACTIVE_THRESHOLD_DAYS} days`,
          recommendedAction: 'Contact parent immediately'
        });
      }
    });
    
    subjectStats.forEach(subject => {
      if (subject.needsFocus) {
        newAlerts.push({
          type: 'subject_struggle',
          subject: subject.fullSubject,
          severity: 'warning',
          message: `${subject.studentCount} student(s) averaging below ${FOCUS_THRESHOLD} sessions in ${subject.fullSubject}`,
          recommendedAction: 'Schedule tutoring focus session'
        });
      }
    });
    
    return newAlerts;
  }, [progress, studentProfiles, subjectStats]);

  const needsFocusSubjects = subjectStats.filter(s => s.needsFocus);
  const inactiveStudents = studentStats.filter(s => s.isInactive);
  
  const radarData = subjectStats.slice(0, 8).map(s => ({
    subject: s.subject,
    engagement: s.avgSessions,
  }));

  // ============================================================
  // Handle Contact Parent
  // ============================================================

  const handleContactParent = (student) => {
    if (student.parentEmail) {
      window.location.href = `mailto:${student.parentEmail}?subject=Academic%20Progress%20Update%20for%20${encodeURIComponent(student.name)}`;
    } else {
      toast.error(`No parent email on file for ${student.name}`);
    }
    if (onContactParent) onContactParent(student);
  };

  // ============================================================
  // Handle Export Report
  // ============================================================

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const csvRows = [
        ['Student Name', 'Grade', 'Subjects Studied', 'Total Sessions', 'Status', 'Parent Email'],
        ...studentStats.map(s => [
          s.name, s.grade, s.subjects, s.sessions, 
          s.isInactive ? 'Inactive' : 'Active',
          s.parentEmail || 'Not provided'
        ])
      ];
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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

  // ============================================================
  // Custom Tooltip
  // ============================================================

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const stat = subjectStats.find(s => s.subject === label || s.fullSubject === label);
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow text-xs dark:bg-slate-900">
        <p className="font-semibold mb-0.5">{stat?.fullSubject || label}</p>
        <p className="text-primary">Avg sessions: {payload[0]?.value}</p>
        <p className="text-muted-foreground">{stat?.studentCount || 0} student(s)</p>
        {stat?.vsSchoolAvg !== null && (
          <p className={stat.vsSchoolAvg >= 0 ? 'text-green-600' : 'text-red-600'}>
            {stat.vsSchoolAvg >= 0 ? '▲' : '▼'} {Math.abs(stat.vsSchoolAvg)} vs school avg
          </p>
        )}
        {stat?.needsFocus && <p className="text-amber-600 font-medium mt-0.5">⚠ Needs focus</p>}
      </div>
    );
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <Card className="border-border mb-6">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Empty State
  // ============================================================

  if (progress.length === 0 && studentStats.length === 0) {
    return (
      <Card className="border-border mb-6">
        <CardContent className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No student progress data yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Complete sessions with students to see their progress here.</p>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className="border-border mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Student Progress Overview
            </CardTitle>
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Private
            </Badge>
          </div>
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
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 dark:bg-amber-950/20 dark:border-amber-800">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Action Required ({alerts.length})
            </p>
            <div className="space-y-1.5">
              {alerts.slice(0, 3).map((alert, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-amber-800 dark:text-amber-300">{alert.message}</span>
                  <Badge className="bg-amber-100 text-amber-700 text-[10px] dark:bg-amber-950/30 dark:text-amber-300">
                    {alert.recommendedAction}
                  </Badge>
                </div>
              ))}
              {alerts.length > 3 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">+{alerts.length - 3} more alerts</p>
              )}
            </div>
          </div>
        )}

        {/* Needs Focus Subjects */}
        {needsFocusSubjects.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 dark:bg-blue-950/20 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Subjects Needing Attention
            </p>
            <div className="flex flex-wrap gap-1.5">
              {needsFocusSubjects.map(s => (
                <Badge key={s.subject} className="bg-blue-100 text-blue-800 border-blue-300 text-xs dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                  {s.fullSubject} — avg {s.avgSessions} sessions
                  {s.vsSchoolAvg !== null && s.vsSchoolAvg < 0 && (
                    <span className="ml-1 text-red-500 dark:text-red-400">({s.vsSchoolAvg} below avg)</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Bar chart */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Average Study Sessions per Subject
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
              {schoolAverages && (
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-400 inline-block" /> Below school avg</span>
              )}
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
              <Badge className="bg-red-100 text-red-700 text-[10px] dark:bg-red-950/30 dark:text-red-300">
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
                  <th className="text-center py-2 px-2 font-semibold text-xs">Action</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.slice(0, 10).map((student) => (
                  <tr key={student.email} className="border-b border-border/50 hover:bg-muted/30 dark:hover:bg-muted/10">
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
                        <Badge className="bg-red-100 text-red-700 text-[10px] dark:bg-red-950/30 dark:text-red-300">Inactive</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 text-[10px] dark:bg-green-950/30 dark:text-green-300">Active</Badge>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <Button 
                        type="button"
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => handleContactParent(student)}
                        title="Contact Parent"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </Button>
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

        {/* Parent Contact Reminder */}
        {inactiveStudents.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 dark:bg-red-950/20 dark:border-red-800">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Parent Contact Required
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              {inactiveStudents.length} student(s) have been inactive for {INACTIVE_THRESHOLD_DAYS}+ days.
              Click the email icon next to their name to contact parents.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Add PropTypes
TutorStudentProgressChart.propTypes = propTypes;
