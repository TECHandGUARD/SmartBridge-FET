import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart2, Search, TrendingUp, BookOpen, Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentSummaryReport() {
  const [email, setEmail] = useState('');
  const [searched, setSearched] = useState('');
  const [progress, setProgress] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!email.trim()) {
      toast.error('Please enter a student email');
      return;
    }
    
    setLoading(true);
    try {
      // Load student progress
      const { data: prog, error: progError } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_email', email.trim());
      
      if (progError) throw progError;
      
      // Load study reminders
      const { data: rems, error: remsError } = await supabase
        .from('study_reminders')
        .select('*')
        .eq('student_email', email.trim())
        .eq('is_active', true);
      
      if (remsError) throw remsError;
      
      setProgress(prog || []);
      setReminders(rems || []);
      setSearched(email.trim());
      
      if ((prog || []).length === 0) {
        toast.info('No progress data found for this student');
      }
    } catch (err) {
      console.error('Error searching:', err);
      toast.error(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalSessions = progress.reduce((s, p) => s + (p.study_sessions || 0), 0);
  const topSubject = [...progress].sort((a, b) => (b.study_sessions || 0) - (a.study_sessions || 0))[0];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-playfair flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" /> Child Progress Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Enter child's email address..."
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={loading} className="bg-primary shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {searched && !loading && (
          progress.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No progress data found for this student yet.</p>
          ) : (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="font-playfair text-2xl font-bold text-primary">{progress.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Subjects</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="font-playfair text-2xl font-bold text-blue-700">{totalSessions}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sessions</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="font-playfair text-2xl font-bold text-amber-700">{reminders.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Reminders</p>
                </div>
              </div>

              {/* Top subject highlight */}
              {topSubject && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-700 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Most Studied Subject
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {topSubject.subject} — {topSubject.study_sessions} sessions
                  </p>
                </div>
              )}

              {/* Per subject */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subject Activity</p>
                <div className="space-y-2">
                  {progress.map(p => {
                    const sub = SUBJECTS.find(s => s.name === p.subject);
                    const pct = Math.min(100, (p.study_sessions || 0) * 10);
                    return (
                      <div key={p.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            {sub?.icon || '📚'} <span className="font-medium">{p.subject}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs bg-muted text-muted-foreground">{p.grade || 'N/A'}</Badge>
                            <span className="text-xs text-muted-foreground">{p.study_sessions} sessions</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        {p.last_accessed && (
                          <p className="text-xs text-muted-foreground">Last studied: {p.last_accessed}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reminders */}
              {reminders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Bell className="w-3 h-3" /> Active Study Reminders
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {reminders.map(r => (
                      <Badge key={r.id} variant="secondary" className="text-xs gap-1">
                        {SUBJECTS.find(s => s.name === r.subject)?.icon} {r.subject} — {r.day_of_week} {r.time}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
