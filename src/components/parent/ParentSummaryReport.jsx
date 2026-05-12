import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart2, Search, TrendingUp, BookOpen, Bell } from 'lucide-react';

export default function ParentSummaryReport({ user, userProfile }) {
  const [email, setEmail] = useState('');
  const [searched, setSearched] = useState('');
  const [progress, setProgress] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-populate with linked child email if available
  useEffect(() => {
    if (userProfile?.linked_student_email && !email) {
      setEmail(userProfile.linked_student_email);
      // Auto-search if we have a linked email
      if (userProfile.linked_student_email) {
        performSearch(userProfile.linked_student_email);
      }
    }
  }, [userProfile]);

  const performSearch = async (searchEmail) => {
    if (!searchEmail?.trim()) return;
    setLoading(true);
    
    try {
      // Fetch student progress
      const { data: progData, error: progError } = await supabase
        .from('student_progress')
        .select('*')
        .eq('user_email', searchEmail.trim());
      
      if (progError) console.error('Progress fetch error:', progError);
      
      // Fetch study reminders
      const { data: remData, error: remError } = await supabase
        .from('study_reminders')
        .select('*')
        .eq('user_email', searchEmail.trim())
        .eq('is_active', true);
      
      if (remError) console.error('Reminders fetch error:', remError);
      
      setProgress(progData || []);
      setReminders(remData || []);
      setSearched(searchEmail.trim());
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(email);
  };

  const totalSessions = progress.reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0);
  const topSubject = [...progress].sort((a, b) => (b.study_sessions || b.resources_accessed || 0) - (a.study_sessions || a.resources_accessed || 0))[0];

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
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading} className="bg-primary shrink-0">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {searched && !loading && (
          progress.length === 0 && reminders.length === 0 ? (
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

              {/* Per subject */}
              {progress.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subject Activity</p>
                  <div className="space-y-2">
                    {progress.map(p => {
                      const sub = SUBJECTS.find(s => s.name === p.subject);
                      const sessions = p.study_sessions || p.resources_accessed || 0;
                      const pct = Math.min(100, sessions * 10);
                      return (
                        <div key={p.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5">
                              {sub?.icon || '📚'} <span className="font-medium">{p.subject}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge className="text-xs bg-muted text-muted-foreground">{p.grade}</Badge>
                              <span className="text-xs text-muted-foreground">{sessions} sessions</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          {p.last_access && (
                            <p className="text-xs text-muted-foreground">Last studied: {new Date(p.last_access).toLocaleDateString()}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reminders */}
              {reminders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Bell className="w-3 h-3" /> Active Study Reminders
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {reminders.map(r => (
                      <Badge key={r.id} variant="secondary" className="text-xs gap-1">
                        {SUBJECTS.find(s => s.name === r.subject)?.icon} {r.subject}
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