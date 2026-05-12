import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, BookOpen, Star, Calendar, Trophy, Loader2, RefreshCw, Link2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

export default function ParentProgressDashboard({ user, userProfile, onUpdate }) {
  const [childEmail, setChildEmail] = useState(userProfile?.linked_student_email || '');
  const [linked, setLinked] = useState(userProfile?.linked_student_email || '');
  const [progress, setProgress] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (linked) loadChildData(linked);
  }, [linked]);

  const loadChildData = async (email) => {
    if (!email) return;
    setLoading(true);
    try {
      // Fetch student progress
      const { data: prog, error: progError } = await supabase
        .from('student_progress')
        .select('*')
        .eq('user_email', email);
      
      if (progError) console.error('Progress fetch error:', progError);
      
      // Fetch quiz results
      const { data: quiz, error: quizError } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_email', email)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (quizError) console.error('Quiz results fetch error:', quizError);
      
      // Fetch tutor bookings
      const { data: book, error: bookError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('student_email', email)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (bookError) console.error('Bookings fetch error:', bookError);
      
      setProgress(prog || []);
      setQuizResults(quiz || []);
      setBookings(book || []);
    } catch (error) {
      console.error('Error loading child data:', error);
      toast.error('Failed to load child progress data');
    } finally {
      setLoading(false);
    }
  };

  const saveLink = async () => {
    if (!childEmail.trim()) { toast.error('Enter your child\'s email.'); return; }
    setLinking(true);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ linked_student_email: childEmail.trim() })
        .eq('email', user.email);
      
      if (error) throw error;
      
      setLinked(childEmail.trim());
      toast.success('Child account linked!');
      
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error linking child:', error);
      toast.error('Failed to link child account');
    } finally {
      setLinking(false);
    }
  };

  // Prepare chart data
  const chartData = progress.map(p => ({
    subject: SUBJECTS.find(s => s.name === p.subject)?.icon + ' ' + (p.subject?.substring(0, 8) || p.subject),
    sessions: p.study_sessions || p.resources_accessed || 0,
  })).filter(d => d.sessions > 0);

  // Calculate average quiz score
  const avgQuizScore = quizResults.length > 0
    ? Math.round(quizResults.reduce((s, q) => s + (q.score ? (q.score / q.total_questions * 100) : 0), 0) / quizResults.length)
    : null;

  const totalStudySessions = progress.reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0);

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-ZA');
  };

  // Helper to calculate percentage
  const calculatePercentage = (score, total) => {
    if (!total || total === 0) return 0;
    return Math.round((score / total) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Link control */}
      {!linked ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              <p className="font-semibold">Link Your Child's Account</p>
            </div>
            <p className="text-sm text-muted-foreground">Enter your child's EduConnect email to see their full progress.</p>
            <div className="flex gap-2">
              <Input type="email" placeholder="child@example.com" value={childEmail} onChange={e => setChildEmail(e.target.value)} />
              <Button onClick={saveLink} disabled={linking} className="bg-primary gap-2 whitespace-nowrap">
                {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Link
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="bg-green-100 text-green-700 gap-1"><Link2 className="w-3 h-3" /> Linked: {linked}</Badge>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => loadChildData(linked)} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && linked && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Study Sessions', value: totalStudySessions, icon: BookOpen, color: 'bg-primary/10 text-primary' },
              { label: 'Subjects Active', value: progress.length, icon: TrendingUp, color: 'bg-blue-100 text-blue-700' },
              { label: 'Avg Quiz Score', value: avgQuizScore !== null ? `${avgQuizScore}%` : '—', icon: Trophy, color: 'bg-amber-100 text-amber-700' },
              { label: 'Tutor Sessions', value: bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length, icon: Calendar, color: 'bg-green-100 text-green-700' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-border">
                <CardContent className="pt-4 pb-3">
                  <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center mb-2`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="font-playfair font-bold text-xl">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Subject activity chart */}
          {chartData.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-playfair">Subject Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={`hsl(152, 60%, ${28 + i * 5}%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent quiz results */}
          {quizResults.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-playfair flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" /> Recent Quiz Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quizResults.slice(0, 6).map(q => {
                    const percentage = calculatePercentage(q.score, q.total_questions);
                    return (
                      <div key={q.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground text-xs">{q.quiz_id || q.subject_id || 'Quiz'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{q.score}/{q.total_questions}</span>
                          <Badge className={`text-xs ${percentage >= 70 ? 'bg-green-100 text-green-700' : percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {percentage}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent bookings */}
          {bookings.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-playfair flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Tutor Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bookings.slice(0, 5).map(b => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                      <div>
                        <span className="font-medium">{b.tutor_email?.split('@')[0] || 'Tutor'}</span>
                        <span className="text-muted-foreground"> · {b.booking_date} · {b.booking_time}</span>
                      </div>
                      <Badge className={`text-xs ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : b.status === 'completed' ? 'bg-blue-100 text-blue-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {b.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {progress.length === 0 && quizResults.length === 0 && bookings.length === 0 && (
            <Card className="border-border">
              <CardContent className="text-center py-10 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No activity yet</p>
                <p className="text-sm">Your child's study data will appear here once they start using EduConnect.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}