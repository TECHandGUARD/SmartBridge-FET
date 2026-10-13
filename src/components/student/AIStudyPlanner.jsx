import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, Trash2, Loader2, Calendar, Clock, Brain, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string.isRequired,
    id: PropTypes.string
  }).isRequired
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const GRADE_OPTIONS = ['Grade 10', 'Grade 11', 'Grade 12'];
const dayColors = {
  Monday: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300',
  Tuesday: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300',
  Wednesday: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300',
  Thursday: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300',
  Friday: 'bg-pink-50 border-pink-200 text-pink-800 dark:bg-pink-950/30 dark:border-pink-800 dark:text-pink-300',
  Saturday: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300',
  Sunday: 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/30 dark:border-teal-800 dark:text-teal-300'
};
const daysUntil = dateStr => Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
const priorityColor = p => {
  if (p === 'High') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800';
  if (p === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';
  return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800';
};
export default function AIStudyPlanner({
  user
}) {
  const [exams, setExams] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [termDatesContext, setTermDatesContext] = useState('');
  const [error, setError] = useState(null);
  const [newExam, setNewExam] = useState({
    subject: '',
    grade: 'Grade 12',
    exam_date: '',
    exam_type: 'Test',
    notes: ''
  });
  const loadData = useCallback(async () => {
    if (!user?.email) return;
    setError(null);
    try {
      const {
        data: examsData,
        error: examsError
      } = await supabase.from('exam_schedule').select('*').eq('student_email', user.email).order('exam_date', {
        ascending: true
      });
      if (examsError) throw examsError;
      setExams(examsData || []);
      const {
        data: configData,
        error: configError
      } = await supabase.from('system_configuration').select('*').eq('is_active', true).eq('key', 'academic_term_dates');
      if (!configError && configData && configData.length > 0 && configData[0].value?.text) {
        setTermDatesContext(configData[0].value.text);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load exam data');
      toast.error('Failed to load exam data');
    }
  }, [user?.email]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const addExam = async () => {
    if (!newExam.subject || !newExam.exam_date) {
      toast.error('Please select a subject and exam date.');
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.from('exam_schedule').insert({
        student_email: user.email,
        student_id: user.id || null,
        subject: newExam.subject,
        grade: newExam.grade,
        exam_date: newExam.exam_date,
        exam_type: newExam.exam_type,
        notes: newExam.notes || null,
        created_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      setExams(prev => [...prev, data].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()));
      setNewExam({
        subject: '',
        grade: 'Grade 12',
        exam_date: '',
        exam_type: 'Test',
        notes: ''
      });
      setShowAddExam(false);
      toast.success('Exam added!');
      await Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'exam_added',
        user_email: user.email,
        user_id: user.id || null,
        description: `Added exam: ${newExam.subject} on ${newExam.exam_date}`,
        metadata: {
          subject: newExam.subject,
          grade: newExam.grade,
          exam_type: newExam.exam_type,
          exam_date: newExam.exam_date
        }
      })).catch(() => {});
    } catch (err) {
      console.error('Error adding exam:', err);
      toast.error(`Failed to add: ${err.message}`);
    }
  };
  const removeExam = async id => {
    const removed=exams.find(exam=>exam.id===id);
    try {
      const {
        error
      } = await supabase.from('exam_schedule').delete().eq('id', id);
      if (error) throw error;
      setExams(prev => prev.filter(e => e.id !== id));
      toast.success('Exam removed');
      if (removed) {
        await Promise.resolve(supabase.from('activity_log').insert({
          event_type: 'exam_removed',
          user_email: user.email,
          user_id: user.id || null,
          description: `Removed exam: ${removed.subject}`,
          metadata: {
            subject: removed.subject,
            exam_date: removed.exam_date
          }
        })).catch(() => {});
      }
    } catch (err) {
      console.error('Error removing exam:', err);
      toast.error(`Failed to remove: ${err.message}`);
    }
  };
  const generateSchedule = async () => {
    if (exams.length === 0) {
      toast.error('Please add at least one upcoming exam first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const examList = exams.map(e => `• ${e.subject} (${e.grade}) — ${e.exam_type} on ${e.exam_date}${e.notes ? ` [${e.notes}]` : ''}`).join('\n');
      const termContext = termDatesContext ? `\n\nSouth African Academic Calendar Context:\n${termDatesContext}\n` : '';
      const sanitizedExamList = examList.slice(0, 3000);
      const {
        data,
        error: invokeError
      } = await supabase.functions.invoke('invoke-llm', {
        body: {
          prompt: `You are an expert study coach for South African Grade 10-12 students (CAPS curriculum).
Today is ${today}. The student has these upcoming exams:

${sanitizedExamList}
${termContext}
Create a practical weekly study schedule for the NEXT 7 DAYS starting from today.
Allocate study time based on exam proximity (closer exams get more time), subject difficulty, and balanced study.
Align study blocks with the current academic term if term context is provided above.
Include short breaks. Limit to 3-4 study blocks per day (each 45-60 min). Allow at least 1 rest day or light day.

Respond with a structured JSON study plan.`,
          task: 'study-plan'
        }
      });
      if (invokeError) throw invokeError;
      setSchedule(data);
      toast.success('Study schedule generated!');
      await Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'study_schedule_generated',
        user_email: user.email,
        user_id: user.id || null,
        description: `Generated study schedule for ${exams.length} exams`,
        metadata: {
          exam_count: exams.length,
          subjects: exams.map(e => e.subject)
        }
      })).catch(() => {});
    } catch (err) {
      console.error('Generation error:', err);
      setError('Failed to generate schedule. Please try again.');
      toast.error('Failed to generate schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const priorityColor = p => {
    if (p === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (p === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };
  const daysUntil = dateStr => Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> AI Study Planner
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add your upcoming exams and let AI create a personalised study schedule.
        </p>
      </CardHeader>

      {expanded && <CardContent className="space-y-4">
          {}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 dark:bg-red-950/20 dark:border-red-800">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>}

          {}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Upcoming Exams / Tests</p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddExam(!showAddExam)}>
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>

            {}
            {showAddExam && <div className="bg-muted/40 rounded-xl p-3 mb-3 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Subject *</Label>
                    <Select value={newExam.subject} onValueChange={v => setNewExam({
                ...newExam,
                subject: v
              })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Grade *</Label>
                    <Select value={newExam.grade} onValueChange={v => setNewExam({
                ...newExam,
                grade: v
              })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Exam Date *</Label>
                    <Input type="date" className="h-8 text-xs" value={newExam.exam_date} onChange={e => setNewExam({
                ...newExam,
                exam_date: e.target.value
              })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={newExam.exam_type} onValueChange={v => setNewExam({
                ...newExam,
                exam_type: v
              })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Test', 'Mid-Year Exam', 'Trial Exam', 'Final Exam', 'Assignment', 'Oral'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Notes (optional)</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. Chapters 4-6 only" value={newExam.notes} onChange={e => setNewExam({
                ...newExam,
                notes: e.target.value
              })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs bg-primary" onClick={addExam}>Add Exam</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAddExam(false)}>Cancel</Button>
                </div>
              </div>}

            {}
            {exams.length === 0 ? <p className="text-xs text-muted-foreground text-center py-3">No exams added yet. Add your upcoming exams to generate a study plan.</p> : <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {exams.map(exam => {
            const days = daysUntil(exam.exam_date);
            return <div key={exam.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold">{exam.subject}</span>
                      <span className="text-muted-foreground">— {exam.exam_type}</span>
                      <span className="text-muted-foreground">{exam.exam_date}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 ml-auto ${days <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300' : days <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300'}`}>
                        {days <= 0 ? 'Today!' : `${days}d`}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeExam(exam.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>;
          })}
              </div>}
          </div>

          {}
          <Button onClick={generateSchedule} disabled={loading || exams.length === 0} className="w-full gap-2 bg-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating your personalised plan...' : 'Generate AI Study Schedule'}
          </Button>

          {}
          {schedule && <div className="space-y-4 pt-2">
              {schedule.summary && <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-foreground leading-relaxed dark:bg-primary/10">
                  <p className="font-semibold text-primary mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> AI Recommendation
                  </p>
                  {schedule.summary}
                </div>}
              <div className="grid sm:grid-cols-2 gap-3">
                {schedule.weekly_plan?.map(day => <div key={day.day} className={`rounded-xl border p-3 ${dayColors[day.day] || 'bg-muted/40 border-border'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{day.day}</p>
                      <div className="flex items-center gap-1 text-xs opacity-70">
                        <Clock className="w-3 h-3" /> {day.total_hours}h
                      </div>
                    </div>
                    {day.sessions?.length === 0 ? <p className="text-xs opacity-60">Rest day — recharge!</p> : <div className="space-y-1.5">
                        {day.sessions?.map((s, i) => <div key={i} className="bg-white/60 dark:bg-slate-800/60 rounded-lg px-2 py-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{s.subject}</span>
                              <Badge className={`text-[10px] px-1.5 py-0 ${priorityColor(s.priority)}`}>{s.priority}</Badge>
                            </div>
                            <p className="opacity-70">{s.time} · {s.duration_min} min</p>
                            {s.focus && <p className="opacity-60 italic">{s.focus}</p>}
                          </div>)}
                      </div>}
                  </div>)}
              </div>
              {schedule.tips?.length > 0 && <div className="bg-muted/50 rounded-xl p-3 dark:bg-muted/20">
                  <p className="text-xs font-semibold mb-2">💡 Study Tips</p>
                  <ul className="space-y-1">
                    {schedule.tips.map((tip, i) => <li key={i} className="text-xs text-muted-foreground">• {tip}</li>)}
                  </ul>
                </div>}
            </div>}
        </CardContent>}
    </Card>;
}
AIStudyPlanner.propTypes = propTypes;
