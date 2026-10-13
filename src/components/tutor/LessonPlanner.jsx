import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Plus, Pencil, Trash2, Lock, Crown, Calendar, BookOpen, Loader2, AlertCircle, Search, CheckCircle, Sparkles, Mail, LinkIcon, Download, Lightbulb, X, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import LessonPlanForm from './LessonPlanForm';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground dark:bg-muted/50',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300'
};
const getCompletionRate = stats => {
  if (stats.total === 0) return 0;
  return Math.round(stats.completed / stats.total * 100);
};
export default function LessonPlanner({
  user,
  onLessonUpdate = undefined
}) {
  const {
    isPremium,
    loading: premLoading
  } = usePremiumAccess(user);
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    planned: 0,
    draft: 0
  });
  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {
        data: plansData,
        error: plansError
      } = await supabase.from('lesson_plans').select('*').eq('tutor_email', user.email).order('session_date', {
        ascending: false
      });
      if (plansError) throw plansError;
      const {
        data: bookingsData,
        error: bookingsError
      } = await supabase.from('tutor_bookings').select('student_email, student_name, id, date, subject').eq('tutor_email', user.email).eq('status', 'confirmed').gte('date', new Date().toISOString().split('T')[0]).order('date', {
        ascending: true
      });
      if (bookingsError) throw bookingsError;
      const studentMap = {};
      (bookingsData || []).forEach(b => {
        if (b.student_email && !studentMap[b.student_email]) {
          studentMap[b.student_email] = {
            email: b.student_email,
            name: b.student_name || b.student_email
          };
        }
      });
      (plansData || []).forEach(p => {
        if (p.student_email && !studentMap[p.student_email]) {
          studentMap[p.student_email] = {
            email: p.student_email,
            name: p.student_name || p.student_email
          };
        }
      });
      setPlans(plansData || []);
      setStudents(Object.values(studentMap));
      setUpcomingBookings(bookingsData || []);
      const total = plansData?.length || 0;
      const completed = plansData?.filter(p => p.status === 'completed').length || 0;
      const planned = plansData?.filter(p => p.status === 'planned').length || 0;
      const draft = plansData?.filter(p => p.status === 'draft').length || 0;
      setStats({
        total,
        completed,
        planned,
        draft
      });
    } catch (err) {
      console.error('Error loading lesson plans:', err);
      setError('Failed to load lesson plans');
      toast.error('Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    if (!user?.email) return;
    const channel = supabase.channel('tutor_lesson_plans').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lesson_plans',
      filter: `tutor_email=eq.${user.email}`
    }, payload => {
      if (payload.eventType === 'INSERT') {
        setPlans(prev => [payload.new, ...prev]);
        toast.success('New lesson plan created');
      } else if (payload.eventType === 'UPDATE') {
        setPlans(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      } else if (payload.eventType === 'DELETE') {
        setPlans(prev => prev.filter(p => p.id !== payload.old.id));
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);
  const toggleSelect = id => {
    const newSet = new Set(selectedPlans);
    if (newSet.has(id)) newSet.delete(id);else newSet.add(id);
    setSelectedPlans(newSet);
  };
  const toggleSelectAll = () => {
    if (selectedPlans.size === filtered.length) {
      setSelectedPlans(new Set());
    } else {
      setSelectedPlans(new Set(filtered.map(p => p.id)));
    }
  };
  const batchComplete = async () => {
    const pendingPlans = Array.from(selectedPlans).filter(id => {
      const plan = plans.find(p => p.id === id);
      return plan && plan.status !== 'completed';
    });
    if (pendingPlans.length === 0) {
      toast.error('No incomplete plans selected');
      return;
    }
    let completedCount = 0;
    let failedCount = 0;
    for (const id of pendingPlans) {
      const plan = plans.find(p => p.id === id);
      if (plan) {
        const success = await markPlanCompleted(plan);
        if (success) completedCount++;else failedCount++;
      }
    }
    setSelectedPlans(new Set());
    setBatchMode(false);
    toast.success(`${completedCount} plans completed${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
  };
  const batchDelete = async () => {
    if (selectedPlans.size === 0) return;
    if (!confirm(`Delete ${selectedPlans.size} lesson plan${selectedPlans.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    let deletedCount = 0;
    for (const id of selectedPlans) {
      const {
        error
      } = await supabase.from('lesson_plans').delete().eq('id', id);
      if (!error) deletedCount++;
    }
    setPlans(prev => prev.filter(p => !selectedPlans.has(p.id)));
    setSelectedPlans(new Set());
    setBatchMode(false);
    toast.success(`${deletedCount} plan${deletedCount !== 1 ? 's' : ''} deleted`);
  };
  const markPlanCompleted = async plan => {
    try {
      const {
        error: updateError
      } = await supabase.from('lesson_plans').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', plan.id);
      if (updateError) throw updateError;
      setPlans(prev => prev.map(p => p.id === plan.id ? {
        ...p,
        status: 'completed'
      } : p));
      toast.success('Plan marked complete.');
      if (onLessonUpdate) onLessonUpdate();
      return true;
    } catch (err) {
      console.error('Error completing plan:', err);
      toast.error('Failed to mark plan as complete');
      return false;
    }
  };
  const shareWithStudent = async plan => {
    if (!plan.student_email) {
      toast.error('No student linked to this plan');
      return;
    }
    try {
      const {
        error
      } = await supabase.functions.invoke('send-email', {
        body: {
          kind: 'lesson-plan',
          plan_id: plan.id
        }
      });
      if (error) throw error;
      await Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'lesson_plan_shared',
        user_email: user.email,
        user_id: user.id || null,
        description: `Shared lesson plan with ${plan.student_email}`,
        metadata: {
          plan_id: plan.id,
          student: plan.student_email
        }
      })).catch(() => {});
      toast.success('Lesson plan shared with student');
    } catch (err) {
      console.error('Error sharing plan:', err);
      toast.error('Failed to share lesson plan');
    }
  };
  const generateAIPlan = async (subject, topic, grade) => {
    if (!subject || !topic) {
      toast.error('Please select subject and enter topic first');
      return;
    }
    setGenerating(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-lesson-plan', {
        body: {
          subject,
          topic,
          grade,
          curriculum: 'CAPS',
          school_level: 'FET',
          user_email: user?.email
        }
      });
      if (error) throw error;
      if (data) {
        setEditing({
          session_title: `${subject} - ${topic}`,
          subject,
          grade,
          objectives: data.objectives || [],
          resources_used: data.resources || [],
          homework_assigned: data.homework || '',
          notes: data.notes || '',
          status: 'draft',
          student_email: ''
        });
        setShowForm(true);
        toast.success('AI-generated plan loaded! Review and adjust as needed.');
      }
    } catch (err) {
      console.error('Error generating AI plan:', err);
      toast.error('Failed to generate AI plan');
    } finally {
      setGenerating(false);
    }
  };
  const handleDelete = async id => {
    if (!confirm('Are you sure you want to delete this lesson plan? This action cannot be undone.')) return;
    try {
      const {
        error
      } = await supabase.from('lesson_plans').delete().eq('id', id);
      if (error) throw error;
      setPlans(prev => prev.filter(p => p.id !== id));
      toast.success('Lesson plan deleted');
      if (onLessonUpdate) onLessonUpdate();
    } catch (err) {
      console.error('Error deleting lesson plan:', err);
      toast.error('Failed to delete lesson plan');
    }
  };
  const exportPlans = () => {
    const headers = ['Title', 'Subject', 'Grade', 'Student', 'Status', 'Date', 'Objectives', 'Resources', 'Homework'];
    const rows = filtered.map(p => [p.session_title || '', p.subject || '', p.grade || '', p.student_name || p.student_email || 'Not assigned', p.status || '', p.session_date || 'TBD', p.objectives?.join('; ') || '', p.resources_used?.join('; ') || '', p.homework_assigned || '']);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson-plans-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete!');
  };
  const filtered = useMemo(() => {
    let result = plans;
    if (filter !== 'all') {
      result = result.filter(p => p.status === filter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => p.session_title?.toLowerCase().includes(term) || p.student_name?.toLowerCase().includes(term) || p.student_email?.toLowerCase().includes(term) || p.subject?.toLowerCase().includes(term));
    }
    return result;
  }, [plans, filter, searchTerm]);
  const completionRate = getCompletionRate(stats);
  if (!premLoading && !isPremium) {
    return <Card className="border-border">
        <CardContent className="py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>
          <h3 className="font-playfair text-lg font-bold mb-1">Lesson Planner — Premium</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            Draft objectives, resources, and homework for each session. Linked directly to student progress tracking.
          </p>
          <Link to="/premium">
            <Button className="bg-primary gap-2"><Crown className="w-4 h-4" /> Upgrade to Premium</Button>
          </Link>
        </CardContent>
      </Card>;
  }
  if (loading) {
    return <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Lesson Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>;
  }
  if (error) {
    return <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Lesson Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>Retry</Button>
        </CardContent>
      </Card>;
  }
  if (showForm || editing) {
    return <LessonPlanForm user={user} plan={editing} students={students} upcomingBookings={upcomingBookings} onSaved={() => {
      loadData();
      setShowForm(false);
      setEditing(null);
      if (onLessonUpdate) onLessonUpdate();
    }} onCancel={() => {
      setShowForm(false);
      setEditing(null);
    }} />;
  }
  return <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Lesson Planner
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] gap-1 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
              <Crown className="w-3 h-3" /> Premium
            </Badge>
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {selectedPlans.size > 0 && <>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setBatchMode(true)}>
                  <Check className="w-3.5 h-3.5" /> {selectedPlans.size} selected
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-green-600" onClick={batchComplete}>
                  <CheckCircle className="w-3.5 h-3.5" /> Complete
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-600" onClick={batchDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </>}
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportPlans}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> New Plan
            </Button>
          </div>
        </div>

        {}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-muted/40 rounded-lg p-2 text-center dark:bg-muted/20">
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center dark:bg-green-950/20">
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center dark:bg-blue-950/20">
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.planned}</p>
            <p className="text-[10px] text-muted-foreground">Planned</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2 text-center dark:bg-amber-950/20">
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.draft}</p>
            <p className="text-[10px] text-muted-foreground">Draft</p>
          </div>
        </div>

        {}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Completion Rate</span>
            <span>{completionRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{
            width: `${completionRate}%`
          }} />
          </div>
        </div>

        {}
        <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 dark:from-purple-950/20 dark:to-blue-950/20 dark:border-purple-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">🤖 AI Lesson Plan Generator</p>
              <p className="text-[10px] text-purple-600 dark:text-purple-400">Describe your topic and get AI-generated lesson plan</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/20" onClick={() => {
            const topic = prompt('Enter the topic (e.g., "Quadratic Equations"):');
            if (topic) {
              const subject = prompt('Enter the subject (e.g., "Mathematics"):');
              if (subject) {
                generateAIPlan(subject, topic, 'Grade 11');
              }
            }
          }} disabled={generating}>
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Generating...' : 'Generate with AI'}
            </Button>
          </div>
        </div>

        {}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search by title, student, or subject..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-7 h-8 text-xs" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {selectedPlans.size > 0 && <Button size="sm" variant="ghost" className="h-8 w-8" onClick={() => setSelectedPlans(new Set())}>
              <X className="w-3.5 h-3.5" />
            </Button>}
        </div>

        {}
        {selectedPlans.size > 0 && <div className="flex items-center justify-between mt-2 px-2 py-1 bg-muted/50 rounded-lg dark:bg-muted/20">
            <span className="text-xs text-muted-foreground">{selectedPlans.size} selected</span>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={toggleSelectAll}>
              {selectedPlans.size === filtered.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>}
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            {plans.length === 0 ? 'No lesson plans yet — create your first one!' : searchTerm ? 'No lesson plans match your search.' : `No ${filter} lesson plans found.`}
          </div> : <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filtered.map(p => {
          const isPast = p.session_date && new Date(p.session_date) < new Date();
          const isToday = p.session_date && new Date(p.session_date).toDateString() === new Date().toDateString();
          const student = students.find(s => s.email === p.student_email);
          const linkedBooking = upcomingBookings.find(b => b.student_email === p.student_email && b.subject === p.subject && new Date(b.date).toDateString() === new Date(p.session_date).toDateString());
          const isSelected = selectedPlans.has(p.id);
          return <div key={p.id} className={`flex items-start gap-3 p-3 rounded-xl transition-colors group ${isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/40 hover:bg-muted dark:bg-muted/20 dark:hover:bg-muted/30'}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} className="mt-1 w-4 h-4 rounded border-gray-300" />
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{p.session_title}</p>
                      <Badge className={`${STATUS_COLORS[p.status]} text-[10px]`}>{p.status}</Badge>
                      {isToday && p.status === 'planned' && <Badge className="bg-green-100 text-green-700 text-[10px] animate-pulse dark:bg-green-950/30 dark:text-green-300">Today</Badge>}
                      {isPast && p.status === 'planned' && <Badge className="bg-amber-100 text-amber-700 text-[10px] dark:bg-amber-950/30 dark:text-amber-300">Overdue</Badge>}
                      {linkedBooking && <Badge className="bg-purple-100 text-purple-700 text-[10px] gap-1 dark:bg-purple-950/30 dark:text-purple-300">
                          <LinkIcon className="w-2.5 h-2.5" /> Linked to Booking
                        </Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {student?.name || p.student_name || p.student_email || 'No student assigned'} · {p.subject} · {p.grade}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {p.session_date && <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(p.session_date), 'dd MMM yyyy')}
                        </span>}
                      {p.objectives?.length > 0 && <span>{p.objectives.length} objective{p.objectives.length !== 1 ? 's' : ''}</span>}
                      {p.resources_used?.length > 0 && <span>{p.resources_used.length} resource{p.resources_used.length !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.status !== 'completed' && p.student_email && <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Share with student" onClick={() => shareWithStudent(p)}>
                        <Mail className="w-3.5 h-3.5" />
                      </Button>}
                    {p.status !== 'completed' && <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" title="Mark complete" onClick={() => markPlanCompleted(p)}>
                        <CheckCircle className="w-3.5 h-3.5" />
                      </Button>}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(p)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>;
        })}
          </div>}

        {}
        {plans.length > 0 && filtered.length > 0 && <div className="mt-4 p-3 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground flex gap-2 dark:bg-muted/10">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <span className="font-semibold text-foreground">Pro-Tip:</span> Link your lesson plans to upcoming tutoring bookings to track homework deadlines and automatically feed completed tasks into the students' progress logs!
            </div>
          </div>}
      </CardContent>
    </Card>;
}
