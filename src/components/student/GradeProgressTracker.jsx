import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Plus, BookOpen, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];
export default function GradeProgressTracker({
  user
}) {
  const logRequest = useRef(null);
  const [progress, setProgress] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    subject: '',
    grade: 'Grade 10'
  });
  const loadProgress = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {
        data,
        error
      } = await supabase.from('study_progress').select('*').eq('student_id', user.id);
      if (error) throw error;
      setProgress(data || []);
    } catch (err) {
      console.error('Error loading progress:', err);
      setError('Failed to load progress data');
      toast.error('Failed to load progress');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);
  const save = async () => {
    if (saving) return;
    if (!form.subject) {
      toast.error('Please select a subject');
      return;
    }
    if (!user?.email) {
      toast.error('You must be logged in to track progress');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fingerprint = JSON.stringify([form.subject, form.grade]);
      if (logRequest.current?.fingerprint !== fingerprint) logRequest.current = {
        fingerprint,
        id: crypto.randomUUID()
      };
      const {
        error
      } = await supabase.rpc('log_study_session', {
        chosen_subject: form.subject,
        chosen_grade: form.grade,
        request_id: logRequest.current.id
      });
      if (error) throw error;
      logRequest.current = null;
      await loadProgress();
      setShowForm(false);
      setForm({
        subject: '',
        grade: 'Grade 10'
      });
      toast.success('Study session logged! 🎉');
    } catch (err) {
      console.error('Error saving progress:', err);
      setError(err.message);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  const gradeColor = grade => {
    if (grade === 'Grade 12') return 'bg-primary/10 text-primary dark:bg-primary/20';
    if (grade === 'Grade 11') return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300';
    return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300';
  };
  if (loading) {
    return <Card className="border-border">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>;
  }
  return <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> My Progress
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" /> Track
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {progress.length} subject{progress.length !== 1 ? 's' : ''} tracked
        </p>
      </CardHeader>

      <CardContent>
        {}
        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 dark:bg-red-950/20 dark:border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>}

        {}
        {showForm && <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Subject *</label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({
            ...f,
            subject: v
          }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.icon} {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Grade *</label>
              <Select value={form.grade} onValueChange={v => setForm(f => ({
            ...f,
            grade: v
          }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="w-full bg-primary" onClick={save} disabled={saving || !form.subject}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {saving ? 'Saving...' : 'Log Study Session'}
            </Button>
          </div>}

        {}
        {progress.length === 0 ? <div className="text-center py-8">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">No progress tracked yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Track" to log your first study session!</p>
          </div> : <div className="space-y-3">
            {progress.map(p => {
          const sub = SUBJECTS.find(s => s.name === p.subject);
          const sessions = p.resources_accessed || 0;
          const pct = Math.min(100, sessions * 10);
          return <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      {sub?.icon || '📚'} {p.subject}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${gradeColor(p.grade)}`}>{p.grade}</Badge>
                      <span className="text-xs text-muted-foreground">{sessions} session{sessions !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{
                width: `${pct}%`
              }} />
                  </div>
                  {}
                  {p.last_accessed && <p className="text-[10px] text-muted-foreground">
                      Last studied: {new Date(p.last_accessed).toLocaleDateString('en-ZA')}
                    </p>}
                </div>;
        })}
          </div>}
      </CardContent>
    </Card>;
}
