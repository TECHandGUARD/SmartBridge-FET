import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Target, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

const GOAL_TYPES = [
  { value: 'quizzes_completed',  label: 'Quizzes Completed',   unit: 'quizzes',  icon: '🧩' },
  { value: 'study_sessions',     label: 'Study Sessions',       unit: 'sessions', icon: '📚' },
  { value: 'subjects_studied',   label: 'Subjects Studied',     unit: 'subjects', icon: '🌟' },
  { value: 'tutoring_sessions',  label: 'Tutoring Sessions',    unit: 'sessions', icon: '👨‍🏫' },
];

// Return the ISO date string for the most recent Monday
function getWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

// Compute actual progress for a goal given fetched data
function computeProgress(goal, quizzes, progress, bookings) {
  const weekStart = new Date(goal.week_start);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  switch (goal.goal_type) {
    case 'quizzes_completed': {
      const filtered = quizzes.filter(q => {
        const d = new Date(q.created_at);
        return d >= weekStart && d < weekEnd && (!goal.subject || q.subject === goal.subject);
      });
      return filtered.length;
    }
    case 'study_sessions': {
      return progress
        .filter(p => !goal.subject || p.subject === goal.subject)
        .reduce((sum, p) => {
          const d = new Date(p.updated_at || p.last_access || '');
          return d >= weekStart && d < weekEnd ? sum + 1 : sum;
        }, 0);
    }
    case 'subjects_studied': {
      return progress.filter(p => {
        const d = new Date(p.updated_at || p.last_access || '');
        return d >= weekStart && d < weekEnd;
      }).length;
    }
    case 'tutoring_sessions': {
      return bookings.filter(b => {
        const d = new Date(b.booking_date || b.created_at || '');
        return d >= weekStart && d < weekEnd && b.status === 'completed';
      }).length;
    }
    default:
      return 0;
  }
}

const EMPTY_FORM = { goal_type: 'quizzes_completed', subject: '', target: 5, label: '' };

export default function WeeklyGoals({ user }) {
  const [goals, setGoals] = useState([]);
  const [progress, setProgress] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(true);

  const weekStart = getWeekStart();

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch weekly goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('weekly_goals')
          .select('*')
          .eq('user_email', user.email)
          .eq('week_start', weekStart);
        
        if (goalsError) throw goalsError;
        
        // Fetch student progress
        const { data: progData, error: progError } = await supabase
          .from('student_progress')
          .select('*')
          .eq('user_email', user.email);
        
        if (progError) throw progError;
        
        // Fetch quiz results
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_email', user.email);
        
        if (quizError) throw quizError;
        
        // Fetch tutor bookings
        const { data: bookData, error: bookError } = await supabase
          .from('tutor_bookings')
          .select('*')
          .eq('student_email', user.email);
        
        if (bookError) throw bookError;
        
        setGoals(goalsData || []);
        setProgress(progData || []);
        setQuizzes(quizData || []);
        setBookings(bookData || []);
      } catch (error) {
        console.error('Error fetching weekly goals data:', error);
        toast.error('Failed to load goals');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, weekStart]);

  const addGoal = async () => {
    if (!form.target || form.target < 1) { toast.error('Target must be at least 1.'); return; }
    const goalType = GOAL_TYPES.find(t => t.value === form.goal_type);
    const label = form.label.trim() ||
      `${goalType.label}${form.subject ? ` (${form.subject})` : ''}`;
    
    try {
      const { data, error } = await supabase
        .from('weekly_goals')
        .insert({
          user_email: user.email,
          goal_type: form.goal_type,
          subject: form.subject || '',
          target: Number(form.target),
          week_start: weekStart,
          label: label,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setGoals(prev => [...prev, data]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Goal added!');
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error('Failed to add goal');
    }
  };

  const deleteGoal = async (id) => {
    try {
      const { error } = await supabase
        .from('weekly_goals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== id));
      toast.success('Goal deleted');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Weekly Goals
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Weekly Goals
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2" onClick={() => setShowForm(v => !v)}>
              <Plus className="w-3.5 h-3.5" /> Add Goal
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(v => !v)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Week of {weekStart}</p>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Add goal form */}
          {showForm && (
            <div className="bg-muted/40 rounded-xl p-3 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Goal Type *</Label>
                  <Select value={form.goal_type} onValueChange={v => setForm({ ...form, goal_type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subject (optional)</Label>
                  <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All subjects" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All subjects</SelectItem>
                      {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target *</Label>
                  <Input
                    type="number" min={1} className="h-8 text-xs"
                    value={form.target}
                    onChange={e => setForm({ ...form, target: e.target.value })}
                    placeholder="e.g. 5"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custom Label (optional)</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. Finish Maths quizzes"
                    value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs bg-primary" onClick={addGoal}>Save Goal</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Goals list */}
          {goals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No goals set for this week. Click <strong>Add Goal</strong> to get started! 🎯
            </p>
          ) : (
            <div className="space-y-3">
              {goals.map(goal => {
                const goalType = GOAL_TYPES.find(t => t.value === goal.goal_type);
                const current = computeProgress(goal, quizzes, progress, bookings);
                const pct = Math.min(100, Math.round((current / goal.target) * 100));
                const done = pct >= 100;
                return (
                  <div key={goal.id} className={`rounded-xl border p-3 transition-all ${done ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-card border-border'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg leading-none">{goalType?.icon || '🎯'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{goal.label}</p>
                          {goal.subject && <p className="text-xs text-muted-foreground">{goal.subject}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-bold ${done ? 'text-green-600' : 'text-foreground'}`}>
                          {current}/{goal.target}
                          <span className="font-normal text-muted-foreground ml-1">{goalType?.unit}</span>
                        </span>
                        {done && <span className="text-green-600 text-sm">✅</span>}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteGoal(goal.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={pct} className={`h-2 ${done ? '[&>div]:bg-green-500' : '[&>div]:bg-primary'}`} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {done ? '🎉 Goal complete!' : `${pct}% — ${goal.target - current} more to go`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}