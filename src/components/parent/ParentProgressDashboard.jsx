import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, BookOpen, Star, Calendar, Trophy, Loader2, RefreshCw, Link2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

export default function ParentProgressDashboard({ user, onLinked }) {
  const [childEmail, setChildEmail] = useState(user?.linked_student_email || '');
  const [linked, setLinked] = useState(user?.linked_student_email || '');
  const [progress, setProgress] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  const loadChildData = useCallback(async (email) => {
    if (!email) return;
    
    setLoading(true);
    try {
      // Load student progress
      const { data: prog, error: progError } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_email', email);
      
      if (progError) throw progError;
      
      // Load quiz results
      const { data: quiz, error: quizError } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('student_email', email)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (quizError) throw quizError;
      
      // Load tutor bookings
      const { data: book, error: bookError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('student_email', email)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (bookError) throw bookError;
      
      setProgress(prog || []);
      setQuizResults(quiz || []);
      setBookings(book || []);
    } catch (err) {
      console.error('Error loading child data:', err);
      toast.error('Failed to load child progress data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (linked) loadChildData(linked);
  }, [linked, loadChildData]);

  const saveLink = async () => {
    if (!childEmail.trim()) {
      toast.error('Enter your child\'s email.');
      return;
    }
    
    setLinking(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          linked_student_email: childEmail.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);
      
      if (error) throw error;
      
      setLinked(childEmail.trim());
      toast.success('Child account linked!');
      if (onLinked) onLinked();
    } catch (err) {
      console.error('Link error:', err);
      toast.error(`Failed to link account: ${err.message}`);
    } finally {
      setLinking(false);
    }
  };

  const chartData = progress.map(p => ({
    subject: SUBJECTS.find(s => s.name === p.subject)?.icon + ' ' + (p.subject?.substring(0, 8) || p.subject),
    sessions: p.study_sessions || 0,
  })).filter(d => d.sessions > 0);

  const avgQuizScore = quizResults.length > 0
    ? Math.round(quizResults.reduce((s, q) => s + (q.percentage || 0), 0) / quizResults.length)
    : null;

  const totalStudySessions = progress.reduce((s, p) => s + (p.study_sessions || 0), 0);

  // Subject mastery: combine quiz scores + resource access into a 0-100 mastery score per subject
  const masteryData = progress.map(p => {
    const subjectQuizzes = quizResults.filter(q => q.subject === p.subject);
    const avgScore = subjectQuizzes.length > 0
      ? Math.round(subjectQuizzes.reduce((s, q) => s + (q.percentage || 0), 0) / subjectQuizzes.length)
      : 0;
    const accessScore = Math.min((p.study_sessions || 0) * 10, 50); // up to 50 pts from resources
    const quizScore = Math.round(avgScore * 0.5); // up to 50 pts from quizzes
    const mastery = Math.min(accessScore + quizScore, 100);
    return {
      subject: (SUBJECTS.find(s => s.name === p.subject)?.icon || '') + ' ' + (p.subject?.substring(0, 10) || p.subject),
      mastery,
      quizAvg: avgScore,
      resources: p.study_sessions || 0,
    };
  }).filter(d => d.mastery > 0);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const monthYear = now.toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
    let y = 20;

    // Header
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('SmartBridge FET — Monthly Progress Report', 14, y); y += 8;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Student: ${linked}`, 14, y); y += 5;
    doc.text(`Report Period: ${monthYear}`, 14, y); y += 5;
    doc.text(`Generated: ${now.toLocaleDateString('en-ZA')}`, 14, y); y += 10;
    doc.setDrawColor(200); doc.line(14, y, 196, y); y += 8;

    // Summary stats
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Summary', 14, y); y += 7;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Total Study Sessions: ${totalStudySessions}`, 14, y); y += 5;
    doc.text(`Active Subjects: ${progress.length}`, 14, y); y += 5;
    doc.text(`Average Quiz Score: ${avgQuizScore !== null ? avgQuizScore + '%' : 'N/A'}`, 14, y); y += 5;
    doc.text(`Tutor Sessions: ${bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length}`, 14, y); y += 10;
    doc.setDrawColor(200); doc.line(14, y, 196, y); y += 8;

    // Subject progress
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Subject Progress', 14, y); y += 7;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');

    progress.forEach(p => {
      if (y > 260) { doc.addPage(); y = 20; }
      const subjectQuizzes = quizResults.filter(q => q.subject === p.subject);
      const avgScore = subjectQuizzes.length > 0
        ? Math.round(subjectQuizzes.reduce((s, q) => s + (q.percentage || 0), 0) / subjectQuizzes.length)
        : null;
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.subject} (${p.grade})`, 14, y); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text(`  Study Sessions: ${p.study_sessions || 0}`, 14, y); y += 4;
      if (avgScore !== null) { doc.text(`  Quiz Average: ${avgScore}%`, 14, y); y += 4; }
      if (p.last_accessed) { doc.text(`  Last Studied: ${p.last_accessed}`, 14, y); y += 4; }
      doc.setTextColor(0);
      y += 3;
    });

    if (progress.length === 0) { doc.text('No subject progress recorded yet.', 14, y); y += 8; }

    // Recent quiz results
    if (quizResults.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setDrawColor(200); doc.line(14, y, 196, y); y += 8;
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
      doc.text('Recent Quiz Results', 14, y); y += 7;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      quizResults.slice(0, 10).forEach(q => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${q.quiz_title || q.subject}: ${q.score}/${q.total_questions} — ${Math.round(q.percentage || 0)}%`, 14, y); y += 5;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`SmartBridge FET • Tech & GUARD Pty Ltd • Page ${i} of ${pageCount}`, 14, 290);
    }

    doc.save(`SmartBridge-Progress-${linked}-${monthYear.replace(' ', '-')}.pdf`);
  };

  // Quiz score trend over time (last 10 results, sorted oldest first)
  const quizTrend = [...quizResults]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-10)
    .map((q, i) => ({
      attempt: `#${i + 1}`,
      score: Math.round(q.percentage || 0),
      subject: q.subject,
    }));

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
            <p className="text-sm text-muted-foreground">Enter your child's SmartBridge FET email to see their full progress.</p>
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => loadChildData(linked)} disabled={loading}>
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1 bg-primary" onClick={downloadPDF} disabled={loading || progress.length === 0}>
              <Download className="w-3 h-3" /> Download PDF
            </Button>
          </div>
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

          {/* Subject Mastery Radar */}
          {masteryData.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-playfair flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Subject Mastery
                </CardTitle>
                <p className="text-xs text-muted-foreground">Mastery score (0–100) based on quiz performance + study sessions per subject.</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={masteryData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Mastery" dataKey="mastery" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Mastery']} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {masteryData.map(d => (
                    <div key={d.subject} className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium truncate">{d.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${d.mastery}%` }} />
                        </div>
                        <span className="text-xs font-bold text-primary">{d.mastery}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quiz Score Trend */}
          {quizTrend.length > 1 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-playfair flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Quiz Score Trend
                </CardTitle>
                <p className="text-xs text-muted-foreground">Last {quizTrend.length} quiz results over time.</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={quizTrend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="attempt" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v, n, p) => [`${v}%`, p.payload.subject || 'Score']} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                  </LineChart>
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
                  {quizResults.slice(0, 6).map(q => (
                    <div key={q.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground text-xs">{q.quiz_title || q.subject}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{q.score}/{q.total_questions}</span>
                        <Badge className={`text-xs ${(q.percentage || 0) >= 70 ? 'bg-green-100 text-green-700' : (q.percentage || 0) >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {Math.round(q.percentage || 0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
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
                        <span className="font-medium">{b.tutor_name}</span>
                        <span className="text-muted-foreground"> · {b.subject} · {b.date}</span>
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
                <p className="text-sm">Your child's study data will appear here once they start using SmartBridge FET.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
