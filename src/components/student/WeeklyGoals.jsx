import {Badge} from '@/components/ui/badge';
import { useCallback } from 'react';
import { getWeekStartDateString, computeProgressValue } from '@/lib/weekly-goals';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Target, Plus, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const UserProps = {
  email: PropTypes.string.isRequired,
  id: PropTypes.string
};
const propTypes = {
  user: PropTypes.shape(UserProps).isRequired
};
const GOAL_TYPES = [{
  value: 'quizzes_completed',
  label: 'Quizzes Completed',
  unit: 'quizzes',
  icon: '🧩'
}, {
  value: 'study_sessions',
  label: 'Study Sessions',
  unit: 'sessions',
  icon: '📚'
}, {
  value: 'subjects_studied',
  label: 'Subjects Studied',
  unit: 'subjects',
  icon: '🌟'
}, {
  value: 'tutoring_sessions',
  label: 'Tutoring Sessions',
  unit: 'sessions',
  icon: '👨‍🏫'
}];
const SUBJECT_OPTIONS = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 'Economics', 'History', 'Geography', 'Business Studies'];
export default function WeeklyGoals({
  user
}) {
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
    target: '3',
    label: ''
  });
  const currentMondayStr = getWeekStartDateString();
  const fetchWeeklyMetricsPipeline = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [goalsQuery, quizzesQuery, progressQuery, bookingsQuery] = await Promise.all([supabase.from('weekly_goals').select('*').eq('student_email', user.email).eq('week_start', currentMondayStr), supabase.from('quiz_results').select('completed_at, subject').eq('student_email', user.email), supabase.from('study_sessions').select('date, subject').eq('student_id', user.id), supabase.from('tutor_bookings').select('status, date, subject').eq('student_email', user.email)]);
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
  }, [user?.email, currentMondayStr]);
  useEffect(() => {
    fetchWeeklyMetricsPipeline();
  }, [fetchWeeklyMetricsPipeline]);
  const handleAddGoalSubmit = async e => {
    e.preventDefault();
    const targetNum = parseInt(form.target) || 0;
    if (targetNum < 1) {
      toast.error('Target must be at least 1');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const goalTypeMeta = GOAL_TYPES.find(t => t.value === form.goal_type);
      const computedLabel = form.label.trim() || `${goalTypeMeta?.label}${form.subject !== 'All' ? ` (${form.subject})` : ''}`;
      const {
        data,
        error: insertError
      } = await supabase.from('weekly_goals').insert([{
        student_email: user.email,
        student_id: user.id,
        goal_type: form.goal_type,
        subject: form.subject === 'All' ? '' : form.subject,
        target: targetNum,
        week_start: currentMondayStr,
        label: computedLabel
      }]).select().single();
      if (insertError) throw insertError;
      if (data) {
        setGoals(prev => [...prev, data]);
        setForm({
          goal_type: 'quizzes_completed',
          subject: 'All',
          target: '3',
          label: ''
        });
        setShowForm(false);
        toast.success('Goal added successfully! 🎯');
        await Promise.resolve(supabase.from('activity_log').insert({
          event_type: 'weekly_goal_created',
          user_email: user.email,
          user_id: user.id || null,
          description: `Created weekly goal: ${computedLabel}`,
          metadata: {
            goal_type: form.goal_type,
            subject: form.subject,
            target: targetNum,
            week_start: currentMondayStr
          }
        })).catch(() => {});
      }
    } catch (err) {
      console.error('Error adding goal:', err);
      setError(err.message || 'Failed to add goal');
      toast.error(err.message || 'Failed to add goal');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDeleteGoal = async id => {
    const goalToDelete = goals.find(g => g.id === id);
    try {
      const {
        error: deleteError
      } = await supabase.from('weekly_goals').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setGoals(prev => prev.filter(g => g.id !== id));
      toast.success('Goal removed');
      if (goalToDelete) {
        await Promise.resolve(supabase.from('activity_log').insert({
          event_type: 'weekly_goal_deleted',
          user_email: user.email,
          user_id: user.id || null,
          description: `Deleted weekly goal: ${goalToDelete.custom_label}`,
          metadata: {
            goal_type: goalToDelete.goal_type,
            subject: goalToDelete.subject,
            target: goalToDelete.target_value
          }
        })).catch(() => {});
      }
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast.error(err.message || 'Failed to delete goal');
    }
  };
  if (loading) {
    return <Card className="border-border shadow-md max-w-xl mx-auto bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading goals...</span>
        </CardContent>
      </Card>;
  }
  return <Card className="border-border shadow-md max-w-xl mx-auto bg-card">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-primary shrink-0" /> Weekly Goals
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Tracked
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs font-bold px-2.5" onClick={() => setShowForm(prev => !prev)}>
              <Plus className="w-3.5 h-3.5" /> {showForm ? 'Cancel' : 'Add Goal'}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(prev => !prev)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mt-0.5">
          Week of {currentMondayStr}
        </p>
      </CardHeader>

      {expanded && <CardContent className="space-y-4 pt-4">
          {}
          {error && <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] font-medium flex items-center gap-2 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
              <button onClick={fetchWeeklyMetricsPipeline} className="ml-auto text-primary hover:underline font-medium text-xs">
                Retry
              </button>
            </div>}

          {}
          {showForm && <form onSubmit={handleAddGoalSubmit} className="bg-muted/30 border border-border rounded-xl p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    Goal Type *
                  </Label>
                  <Select value={form.goal_type} onValueChange={v => setForm({
              ...form,
              goal_type: v
            })}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    Subject
                  </Label>
                  <Select value={form.subject} onValueChange={v => setForm({
              ...form,
              subject: v
            })}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_OPTIONS.map(s => <SelectItem key={s} value={s}>
                          {s === 'All' ? '📚 All subjects' : s}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Target</Label>
                  <Input type="number" min={1} value={form.target} onChange={e => setForm({
              ...form,
              target: e.target.value
            })} className="text-xs h-8" placeholder="e.g., 5" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Custom Label</Label>
                  <Input value={form.label} onChange={e => setForm({
              ...form,
              label: e.target.value
            })} className="text-xs h-8" placeholder="Optional custom name" />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground text-xs h-8">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {isSubmitting ? 'Saving...' : 'Save Goal'}
              </Button>
            </form>}

          {}
          {goals.length === 0 ? <div className="text-center py-6 border border-dashed border-border rounded-xl bg-muted/20">
              <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-xs text-muted-foreground">
                No goals set for this week. Click <span className="font-bold">"Add Goal"</span> to get started! 🎯
              </p>
            </div> : <div className="space-y-3">
              {goals.map(goal => {
          const goalType = GOAL_TYPES.find(t => t.value === goal.goal_type);
          const current = computeProgressValue(goal, quizzes, progress, bookings);
          const pct = Math.min(100, Math.round(current / goal.target * 100));
          const done = pct >= 100;
          return <div key={goal.id} className={`rounded-xl border p-3 transition-all ${done ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-card border-border'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{goalType?.icon || '🎯'}</span>
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
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleDeleteGoal(goal.id)} title="Delete goal">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={pct} className={`h-2 ${done ? '[&>div]:bg-green-500' : '[&>div]:bg-primary'}`} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {done ? '🎉 Goal complete!' : `${pct}% — ${goal.target - current} more to go`}
                    </p>
                  </div>;
        })}
            </div>}
        </CardContent>}
    </Card>;
}
WeeklyGoals.propTypes = propTypes;
