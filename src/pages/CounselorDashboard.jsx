import ReleaseGate from '@/components/operations/ReleaseGate';
// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Document types
  DOC_TYPES: (import.meta.env.VITE_COUNSELOR_DOC_TYPES || "ID Copy,Matric Certificate,Proof of Payment,NBT Results,Academic Transcript,Motivation Letter,Reference Letter,Other").split(',').map(d => d.trim()),
  // Stage styles
  STAGE_STYLES: {
    Saved: import.meta.env.VITE_STAGE_SAVED_STYLE || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    Started: import.meta.env.VITE_STAGE_STARTED_STYLE || 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Submitted: import.meta.env.VITE_STAGE_SUBMITTED_STYLE || 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Pending NBT': import.meta.env.VITE_STAGE_PENDING_NBT_STYLE || 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Accepted: import.meta.env.VITE_STAGE_ACCEPTED_STYLE || 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Rejected: import.meta.env.VITE_STAGE_REJECTED_STYLE || 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Waitlisted: import.meta.env.VITE_STAGE_WAITLISTED_STYLE || 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  },
  // Feature flags
  ENABLE_REMINDERS: import.meta.env.VITE_COUNSELOR_ENABLE_REMINDERS !== 'false',
  ENABLE_REALTIME: import.meta.env.VITE_COUNSELOR_ENABLE_REALTIME !== 'false',
  // Deadline thresholds (days)
  URGENT_DAYS: Number(import.meta.env.VITE_COUNSELOR_URGENT_DAYS) || 7,
  WARNING_DAYS: Number(import.meta.env.VITE_COUNSELOR_WARNING_DAYS) || 14,
  // Messages
  MESSAGES: {
    LOAD_FAILED: import.meta.env.VITE_COUNSELOR_LOAD_FAILED_MSG || 'Failed to load counselor data. Please try again.',
    REMINDER_SENT: import.meta.env.VITE_COUNSELOR_REMINDER_SENT_MSG || 'Reminder successfully sent to {name}.',
    REMINDER_FAILED: import.meta.env.VITE_COUNSELOR_REMINDER_FAILED_MSG || 'Failed to send reminder. Please try again.',
    NO_STUDENTS: import.meta.env.VITE_COUNSELOR_NO_STUDENTS_MSG || 'No students match selection parameters.',
    ADD_STUDENTS: import.meta.env.VITE_COUNSELOR_ADD_STUDENTS_MSG || 'Add students to get started.',
    LOADING: import.meta.env.VITE_COUNSELOR_LOADING_MSG || 'Loading student data...',
    SYNC_SUCCESS: import.meta.env.VITE_COUNSELOR_SYNC_SUCCESS_MSG || 'Dashboard synchronized successfully.',
    SYNC_FAILED: import.meta.env.VITE_COUNSELOR_SYNC_FAILED_MSG || 'Sync failed. Please try again.'
  }
};

// ============================================================
// Constants
// ============================================================

const STAGE_ORDER = {
  Saved: 0,
  Started: 1,
  Submitted: 2,
  'Pending NBT': 3,
  Accepted: 4,
  Waitlisted: 4,
  Rejected: 4
};

// ============================================================
// Helper Functions
// ============================================================
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, GraduationCap, CheckCircle2, Clock, ChevronDown, ChevronUp, Mail, Search, RefreshCw, Loader2, AlertCircle, Building2 } from 'lucide-react';
const DOC_TYPES = ["ID Copy", "Matric Certificate", "Proof of Payment", "NBT Results", "Academic Transcript", "Motivation Letter", "Reference Letter", "Other"];
const STAGE_STYLES = {
  Saved: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Started: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Submitted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Pending NBT': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Waitlisted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
};
const getDaysBetween = targetDateStr => {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const differenceMs = target.getTime() - today.getTime();
  return Math.ceil(differenceMs / 86400000);
};
function StageBar({
  stage
}) {
  const step = Math.min(STAGE_ORDER[stage] ?? 0, 3);
  return <div className="flex gap-0.5 mt-1.5 w-full" role="progressbar" aria-valuenow={step} aria-valuemin={0} aria-valuemax={3}>
      {[0, 1, 2, 3].map(i => <div key={i} className={`flex-1 h-1 rounded-full ${i < step ? 'bg-primary' : 'bg-muted'}`} />)}
    </div>;
}
function StudentRow({
  student,
  applications,
  documents,
  onRemind,
  isLoading
}) {
  const [expanded, setExpanded] = useState(false);
  const apps = useMemo(() => applications.filter(a => a.student_email === student.email), [applications, student.email]);
  const docs = useMemo(() => documents.filter(d => d.student_email === student.email), [documents, student.email]);
  const hasUpcomingDeadline = useMemo(() => apps.some(a => {
    const days = getDaysBetween(a.deadline);
    return days !== null && days >= 0 && days <= CONFIG.WARNING_DAYS;
  }), [apps]);
  const docProgress = useMemo(() => {
    if (apps.length === 0) return 0;
    const uniqueUploadedPairs = new Set(docs.map(d => `${d.application_id}|${d.doc_type}`));
    const totalRequiredDocs = apps.length * DOC_TYPES.length;
    return Math.min(Math.round(uniqueUploadedPairs.size / totalRequiredDocs * 100), 100);
  }, [apps, docs]);
  const submitted = useMemo(() => apps.filter(a => ['Submitted', 'Pending NBT', 'Accepted', 'Waitlisted'].includes(a.stage)).length, [apps]);
  const accepted = useMemo(() => apps.filter(a => a.stage === 'Accepted').length, [apps]);
  const getProgressColor = progress => {
    if (progress >= 100) return 'text-green-600 dark:text-green-400';
    if (progress >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
  };
  return <div className="border rounded-xl overflow-hidden bg-card shadow-sm transition-all duration-200">
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setExpanded(e => !e)} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setExpanded(e => !e)} aria-expanded={expanded}>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">
            {(student.full_name || student.email).charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate text-foreground">
              {student.full_name || "Unregistered Student"}
            </p>
            {hasUpcomingDeadline && <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0 border-none">
                <Clock className="w-2.5 h-2.5 mr-0.5 inline" /> Deadline Soon
              </Badge>}
            {accepted > 0 && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0 border-none">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 inline" /> Accepted
              </Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{student.email}</p>
        </div>
        <div className="hidden sm:flex items-center gap-5 text-xs text-muted-foreground shrink-0 px-2">
          <div className="text-center">
            <div className="font-semibold text-foreground">{apps.length}</div>
            <div className="text-[10px]">Apps</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-foreground">{submitted}</div>
            <div className="text-[10px]">Submitted</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${getProgressColor(docProgress)}`}>
              {docProgress}%
            </div>
            <div className="text-[10px]">Docs</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {CONFIG.ENABLE_REMINDERS && <Button size="sm" variant="outline" className="h-7 text-xs gap-1 hidden sm:flex font-medium" onClick={e => {
          e.stopPropagation();
          onRemind(student);
        }} disabled={isLoading}>
              <Mail className="w-3 h-3" /> Remind
            </Button>}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && <div className="border-t bg-muted/10 px-4 py-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
          {CONFIG.ENABLE_REMINDERS && <Button size="sm" variant="outline" className="h-8 text-xs gap-1 sm:hidden w-full font-medium" onClick={() => onRemind(student)} disabled={isLoading}>
              <Mail className="w-3 h-3" /> Send Deadline Reminder
            </Button>}
          {apps.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4 bg-card rounded-lg border border-dashed">
              No active applications currently tracked.
            </p> : <div className="space-y-2.5">
              {apps.map(app => {
          const appDocs = docs.filter(d => d.application_id === app.id);
          const uploadedTypes = new Set(appDocs.map(d => d.doc_type));
          const daysLeft = getDaysBetween(app.deadline);
          const getDaysLeftColor = () => {
            if (daysLeft === null) return 'text-muted-foreground';
            if (daysLeft < 0) return 'text-red-500';
            if (daysLeft <= CONFIG.URGENT_DAYS) return 'text-amber-600';
            return 'text-muted-foreground';
          };
          return <div key={app.id} className="border rounded-lg p-3.5 bg-card shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-xs font-bold text-foreground">{app.university_name}</p>
                          <Badge className={`text-[10px] border-0 px-1.5 py-0 font-semibold ${STAGE_STYLES[app.stage] || 'bg-gray-100'}`}>
                            {app.stage}
                          </Badge>
                        </div>
                        {app.course && <p className="text-[11px] font-medium text-muted-foreground">{app.course}</p>}
                        {daysLeft !== null && <p className={`text-[11px] mt-1 font-semibold ${getDaysLeftColor()}`}>
                            {daysLeft < 0 ? `🛑 Overdue by ${Math.abs(daysLeft)}d` : `⚠️ ${daysLeft} days remaining`}
                          </p>}
                        <StageBar stage={app.stage} />
                      </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-border/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Documents ({uploadedTypes.size}/{DOC_TYPES.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {DOC_TYPES.map(dt => <span key={dt} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${uploadedTypes.has(dt) ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30' : 'bg-muted text-muted-foreground border-border'}`}>
                            {uploadedTypes.has(dt) ? '✓ ' : ''}{dt}
                          </span>)}
                      </div>
                    </div>
                  </div>;
        })}
            </div>}
        </div>}
    </div>;
}
function CounselorDashboardImplementation() {
  const {
    user
  } = useAuth();
  const [students, setStudents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [remindingEmail, setRemindingEmail] = useState(null);
  const fetchTrackerRef = useRef({
    inFlight: false,
    lastFetchTime: 0
  });
  const loadDashboardData = useCallback(async (silent = false) => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    if (fetchTrackerRef.current.inFlight) {
      return;
    }
    const now = Date.now();
    if (silent && now - fetchTrackerRef.current.lastFetchTime < 2000) {
      return;
    }
    fetchTrackerRef.current.inFlight = true;
    fetchTrackerRef.current.lastFetchTime = now;
    if (!silent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const [studentsRes, appsRes, docsRes] = await Promise.all([supabase.from('users').select('*').eq('role', 'student'), supabase.from('university_applications').select('*'), supabase.from('application_documents').select('*')]);
      if (studentsRes.error) throw studentsRes.error;
      if (appsRes.error) throw appsRes.error;
      if (docsRes.error) throw docsRes.error;
      setStudents(studentsRes.data || []);
      setApplications(appsRes.data || []);
      setDocuments(docsRes.data || []);
      if (!silent) {
        toast.success(CONFIG.MESSAGES.SYNC_SUCCESS);
      }
    } catch (err) {
      console.error("Dashboard orchestration pipeline error:", err);
      setError(CONFIG.MESSAGES.LOAD_FAILED);
      if (!silent) {
        toast.error(CONFIG.MESSAGES.LOAD_FAILED);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      fetchTrackerRef.current.inFlight = false;
    }
  }, [user?.email]);
  useEffect(() => {
    let active = true;
    if (active) {
      loadDashboardData(false);
    }
    if (!CONFIG.ENABLE_REALTIME) return;
    const channelIdSuffix = Math.random().toString(36).substring(2, 8);
    const appChannel = supabase.channel(`counselor-apps-${channelIdSuffix}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'university_applications'
    }, () => {
      if (active) loadDashboardData(true);
    }).subscribe();
    const docChannel = supabase.channel(`counselor-docs-${channelIdSuffix}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'application_documents'
    }, () => {
      if (active) loadDashboardData(true);
    }).subscribe();
    return () => {
      active = false;
      supabase.removeChannel(appChannel);
      supabase.removeChannel(docChannel);
    };
  }, [loadDashboardData]);
  const handleSendReminder = async student => {
    if (!CONFIG.ENABLE_REMINDERS) {
      toast.warning('Reminders are currently disabled.');
      return;
    }
    setRemindingEmail(student.email);
    try {
      toast.loading(`Dispatching portfolio reminder to ${student.email}...`);
      const {
        error
      } = await supabase.functions.invoke('send-counselor-reminders', {
        body: {
          students: [{
            email: student.email,
            name: student.full_name || student.email,
            university_name: 'Portfolio Review',
            deadline: new Date().toISOString().split('T')[0],
            school_name: 'Counselor Dashboard'
          }]
        }
      });
      if (error) throw error;
      toast.dismiss();
      toast.success(CONFIG.MESSAGES.REMINDER_SENT.replace('{name}', student.full_name || student.email));
    } catch (err) {
      console.error('Reminder error:', err);
      toast.dismiss();
      toast.error(CONFIG.MESSAGES.REMINDER_FAILED);
    } finally {
      setRemindingEmail(null);
    }
  };
  const handleRefresh = useCallback(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter(s => (s.full_name || '').toLowerCase().includes(query) || (s.email || '').toLowerCase().includes(query));
  }, [students, searchQuery]);
  const totalStudents = students.length;
  const totalApps = applications.length;
  const submittedApps = applications.filter(a => ['Submitted', 'Pending NBT', 'Accepted', 'Waitlisted'].includes(a.stage)).length;
  const urgentDeadlines = useMemo(() => {
    const uniqueStudents = new Set(applications.filter(a => {
      if (!a.deadline) return false;
      const d = getDaysBetween(a.deadline);
      return d !== null && d >= 0 && d <= CONFIG.URGENT_DAYS;
    }).map(a => a.student_email));
    return uniqueStudents.size;
  }, [applications]);
  return <div className="min-h-screen bg-background">
      {}
      <div className="bg-gradient-to-br from-primary via-green-dark to-navy text-white py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-playfair">
                  Counselor Dashboard
                </h1>
                <p className="text-white/70 text-sm">
                  Monitor student applications and document verification.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={handleRefresh} disabled={loading || isRefreshing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Syncing...' : 'Sync'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[{
          label: "Students",
          value: totalStudents,
          icon: <Users className="w-4 h-4 text-primary" />,
          bg: "bg-primary/5"
        }, {
          label: "Applications",
          value: totalApps,
          icon: <GraduationCap className="w-4 h-4 text-blue-500" />,
          bg: "bg-blue-50"
        }, {
          label: "Submitted",
          value: submittedApps,
          icon: <CheckCircle2 className="w-4 h-4 text-purple-500" />,
          bg: "bg-purple-50"
        }, {
          label: `Urgent (${CONFIG.URGENT_DAYS}d)`,
          value: urgentDeadlines,
          icon: <Clock className="w-4 h-4 text-amber-500" />,
          bg: "bg-amber-50"
        }].map(k => <div key={k.label} className={`${k.bg} rounded-xl p-3 flex items-center gap-2.5`}>
              {k.icon}
              <div>
                <div className="text-xl font-bold leading-none">{k.value}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </div>
            </div>)}
        </div>

        {}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search students by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-10 w-full" aria-label="Search students" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              ✕
            </button>}
        </div>

        {}
        {error && <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3 flex-wrap">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button size="sm" variant="outline" onClick={handleRefresh} className="shrink-0">
                Retry
              </Button>
            </CardContent>
          </Card>}

        {}
        {loading && !isRefreshing ? <div className="flex flex-col justify-center items-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">{CONFIG.MESSAGES.LOADING}</p>
          </div> : filteredStudents.length === 0 ? <div className="text-center py-16 border rounded-xl bg-muted/10">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground mb-1">{CONFIG.MESSAGES.NO_STUDENTS}</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try adjusting your search criteria.' : CONFIG.MESSAGES.ADD_STUDENTS}
            </p>
          </div> : <div className="space-y-2">
            {filteredStudents.map(student => <StudentRow key={student.id || student.email} student={student} applications={applications} documents={documents} onRemind={handleSendReminder} isLoading={remindingEmail === student.email} />)}
          </div>}
      </div>
    </div>;
}

export default function CounselorDashboard(props) {
  return <ReleaseGate feature="counselorPortal"><CounselorDashboardImplementation {...props} /></ReleaseGate>;
}
