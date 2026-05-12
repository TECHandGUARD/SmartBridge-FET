import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function GradeProgressTracker({ user }) {
  const [progress, setProgress] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', grade: 'Grade 10' });

  // Fetch progress from Supabase
  useEffect(() => {
    if (!user?.email) return;
    
    const fetchProgress = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('student_progress')
          .select('*')
          .eq('user_email', user.email);
        
        if (error) throw error;
        setProgress(data || []);
      } catch (error) {
        console.error('Error fetching progress:', error);
        toast.error('Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProgress();
  }, [user]);

  const save = async () => {
    if (!form.subject) {
      toast.error('Please select a subject');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const existing = progress.find(p => p.subject === form.subject && p.grade === form.grade);
    
    try {
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('student_progress')
          .update({
            study_sessions: (existing.study_sessions || existing.resources_accessed || 0) + 1,
            last_access: today,
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('student_progress')
          .insert({
            user_email: user.email,
            subject: form.subject,
            grade: form.grade,
            study_sessions: 1,
            last_access: today,
          });
        
        if (error) throw error;
      }
      
      // Refresh data
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .eq('user_email', user.email);
      
      if (error) throw error;
      setProgress(data || []);
      setShowForm(false);
      setForm({ subject: '', grade: 'Grade 10' });
      toast.success('Study session logged!');
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to log session');
    }
  };

  const gradeColor = (grade) => {
    if (grade === 'Grade 12') return 'bg-primary/10 text-primary';
    if (grade === 'Grade 11') return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="pt-6 pb-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> My Progress
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" /> Track
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-3">
            <Select value={form.subject} onValueChange={(v) => setForm(f => ({ ...f, subject: v }))}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.icon} {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.grade} onValueChange={(v) => setForm(f => ({ ...f, grade: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Grade 10','Grade 11','Grade 12'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="w-full bg-primary" onClick={save}>Log Study Session</Button>
          </div>
        )}

        {progress.length === 0 ? (
          <div className="text-center py-6">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No progress tracked yet. Start logging!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {progress.map((p) => {
              const sub = SUBJECTS.find(s => s.name === p.subject);
              const sessions = p.study_sessions || p.resources_accessed || 0;
              const pct = Math.min(100, sessions * 10);
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      {sub?.icon || '📚'} {p.subject}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${gradeColor(p.grade)}`}>{p.grade}</Badge>
                      <span className="text-xs text-muted-foreground">{sessions} sessions</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}