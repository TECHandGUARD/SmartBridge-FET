import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Target, Plus, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// PropTypes definitions instead of TypeScript interfaces
const UserProps = {
  email: PropTypes.string.isRequired
};

// PropTypes for component props
const propTypes = {
  user: PropTypes.shape(UserProps).isRequired
};

const GOAL_TYPES = [
  { value: 'quizzes_completed',  label: 'Quizzes Completed',   unit: 'quizzes',  icon: '🧩' },
  { value: 'study_sessions',     label: 'Study Sessions',       unit: 'sessions', icon: '📚' },
  { value: 'subjects_studied',   label: 'Subjects Studied',     unit: 'subjects', icon: '🌟' },
  { value: 'tutoring_sessions',  label: 'Tutoring Sessions',    unit: 'sessions', icon: '👨‍🏫' },
];

const SUBJECT_OPTIONS = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 'Economics', 'History', 'Geography', 'Business Studies'];

// FIXED: Removed TypeScript return type annotation
function getWeekStartDateString() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const targetMonday = new Date(d.setDate(d.getDate() + diff));
  return targetMonday.toISOString().split('T')[0];
}

function computeProgressValue(goal, quizzes, progress, bookings) {
  const startTime = new Date(goal.week_start_date + 'T00:00:00Z').getTime();
  const endTime = startTime + (7 * 24 * 60 * 60 * 1000);

  switch (goal.goal_type) {
    case 'quizzes_completed': {
      return quizzes.filter(q => {
        const time = new Date(q.completed_at).getTime();
        return time >= startTime && time < endTime && (!goal.subject || q.subject === goal.subject);
      }).length;
    }
    case 'study_sessions': {
      return progress.filter(p => {
        const time = new Date(p.last_accessed).getTime();
        return time >= startTime && time < endTime && (!goal.subject || p.subject === goal.subject);
      }).length;
    }
    case 'subjects_studied': {
      const activeWeekSubjects = progress.filter(p => {
        const time = new Date(p.last_accessed).getTime();
        return time >= startTime && time < endTime;
      }).map(p => p.subject);
      return new Set(activeWeekSubjects).size;
    }
    case 'tutoring_sessions': {
      return bookings.filter(b => {
        const time = new Date(b.session_date + 'T00:00:00Z').getTime();
        return time >= startTime && time < endTime && b.status === 'completed';
      }).length;
    }
    default:
      return 0;
  }
}

export default function WeeklyGoals({ user }) {
  const [goals, setGoals] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [progress, setProgress] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const [form, setForm] = useState({
    goal_type: 'quizzes_completed',
    subject: 'All',
    target_value: '3',
    custom_label: ''
  });

  const currentMondayStr = getWeekStartDateString();

  useEffect(() => {
    if (!user?.email) return;
    fetchWeeklyMetricsPipeline();
  }, [user]);

  const fetchWeeklyMetricsPipeline = async () => {
    try {
      setLoading(true);
      setError(null);

      const [goalsQuery, quizzesQuery, progressQuery, bookingsQuery] = await Promise.all([
        supabase.from('weekly_goals').select('*').eq('student_email', user.email).eq('week_start_date', currentMondayStr),
        supabase.from('quiz_results').select('completed_at, subject').eq('student_email', user.email),
        supabase.from('student_progress').select('last_accessed, subject').eq('user_email', user.email),
        supabase.from('tutor_bookings').select('status, session_date').eq('student_email', user.email)
      ]);

      if (goalsQuery.error) throw goalsQuery.error;
      if (quizzesQuery.error) throw quizzesQuery.error;
      if (progressQuery.error) throw progressQuery.error;
      if (bookingsQuery.error) throw bookingsQuery.error;

      setGoals(goalsQuery.data || []);
      setQuizzes(quizzesQuery.data || []);
      setProgress(progressQuery.data || []);
      setBookings(bookingsQuery.data || []);
    } catch (err) {
      console.error('Goals dashboard pipeline crash:', err);
      setError(err.message || 'Failed to load weekly goals');
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoalSubmit = async (e) => {
    e.preventDefault();
    const targetNum = parseInt(form.target_value) || 0;
    if (targetNum < 1) {
      toast.error('Target must be at least 1');
      return;
    }

    try {
      setIsSubmitting(true);
      const goalTypeMeta = GOAL_TYPES.find(t => t.value === form.goal_type);
      const computedLabel = form.custom_label.trim() || 
        `${goalTypeMeta?.label}${form.subject !== 'All' ? ` (${form.subject})` : ''}`;

      const { data, error: insertError } = await supabase
        .from('weekly_goals')
        .insert([
          {
            student_email: user.email,
            goal_type: form.goal_type,
            subject: form.subject === 'All' ? '' : form.subject,
            target_value: targetNum,
            week_start_date: currentMondayStr,
            custom_label: computedLabel
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        setGoals(prev => [...prev, data]);
        setForm({ goal_type: 'quizzes_completed', subject: 'All', target_value: '3', custom_label: '' });
        setShowForm(false);
        toast.success('Goal added successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('weekly_goals')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setGoals(prev => prev.filter(g => g.id !== id));
      toast.success('Goal removed');
    } catch (err) {
      toast.error(err.message || 'Failed to delete goal');
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-md max-w-xl mx-auto bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading goals...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-md max-w-xl mx-auto bg-card">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-primary shrink-0" /> Weekly Goals
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              className="h-8 text-xs font-bold px-2.5" 
              onClick={() => setShowForm(prev => !prev)}
            >
              <Plus className="w-3.5 h-3.5" /> {showForm ? 'Cancel' : 'Add Goal'}
            </Button>
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setExpanded(prev => !prev)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mt-0.5">
          Week of {currentMondayStr}
        </p>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[11px] font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Goal Form */}
          {showForm && (
            <form onSubmit={handleAddGoalSubmit} className="bg-muted/30 border border-border rounded-xl p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Goal Type</Label>
                  <Select value={form.goal_type} onValueChange={v => setForm({ ...form, goal_type: v })}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Subject</Label>
                  <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All subjects</SelectItem>
                      {SUBJECT_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Target</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.target_value}
                    onChange={e => setForm({ ...form, target_value: e.target.value })}
                    className="text-xs h-8"
                    placeholder="e.g., 5"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Custom Label</Label>
                  <Input
                    value={form.custom_label}
                    onChange={e => setForm({ ...form, custom_label: e.target.value })}
                    className="text-xs h-8"
                    placeholder="Optional custom name"
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white text-xs h-8">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Goal
              </Button>
            </form>
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No goals set for this week. Click "Add Goal" to get started! 🎯
            </p>
          ) : (
            <div className="space-y-3">
              {goals.map(goal => {
                const goalType = GOAL_TYPES.find(t => t.value === goal.goal_type);
                const current = computeProgressValue(goal, quizzes, progress, bookings);
                const pct = Math.min(100, Math.round((current / goal.target_value) * 100));
                const done = pct >= 100;
                
                return (
                  <div key={goal.id} className={`rounded-xl border p-3 transition-all ${done ? 'bg-green-50 border-green-200 dark:bg-green-950/20' : 'bg-card border-border'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{goalType?.icon || '🎯'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{goal.custom_label}</p>
                          {goal.subject && <p className="text-xs text-muted-foreground">{goal.subject}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-bold ${done ? 'text-green-600' : 'text-foreground'}`}>
                          {current}/{goal.target_value}
                          <span className="font-normal text-muted-foreground ml-1">{goalType?.unit}</span>
                        </span>
                        {done && <span className="text-green-600 text-sm">✅</span>}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteGoal(goal.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={pct} className={`h-2 ${done ? '[&>div]:bg-green-500' : '[&>div]:bg-primary'}`} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {done ? '🎉 Goal complete!' : `${pct}% — ${goal.target_value - current} more to go`}
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

// Add PropTypes to the component
WeeklyGoals.propTypes = propTypes;
