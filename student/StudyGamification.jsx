import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Star, Zap, BookOpen, Target } from 'lucide-react';
import { toast } from 'sonner';

const BADGES = [
  { id: 'first_quiz', label: 'First Quiz', icon: '🎯', desc: 'Completed your first quiz', color: 'bg-blue-100 text-blue-700' },
  { id: 'streak_3', label: '3-Day Streak', icon: '🔥', desc: 'Studied 3 days in a row', color: 'bg-orange-100 text-orange-700' },
  { id: 'streak_7', label: 'Week Warrior', icon: '⚡', desc: 'Studied 7 days in a row', color: 'bg-purple-100 text-purple-700' },
  { id: 'quiz_master', label: 'Quiz Master', icon: '🏆', desc: 'Scored 80%+ on 5 quizzes', color: 'bg-amber-100 text-amber-700' },
  { id: 'top_scorer', label: 'Top Scorer', icon: '⭐', desc: 'Scored 100% on any quiz', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'bookworm', label: 'Bookworm', icon: '📚', desc: 'Accessed 10+ resources', color: 'bg-green-100 text-green-700' },
];

export default function StudyGamification({ user }) {
  const [quizResults, setQuizResults] = useState([]);
  const [progress, setProgress] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch quiz results
        const { data: qr, error: qrError } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_email', user.email);
        
        if (qrError) throw qrError;
        
        // Fetch student progress
        const { data: prog, error: progError } = await supabase
          .from('student_progress')
          .select('*')
          .eq('user_email', user.email);
        
        if (progError) throw progError;
        
        setQuizResults(qr || []);
        setProgress(prog || []);
        
        // Compute earned badges
        const badges = [];
        if ((qr || []).length >= 1) badges.push('first_quiz');
        if ((qr || []).some(q => q.percentage >= 100 || (q.score === q.total_questions))) badges.push('top_scorer');
        if ((qr || []).filter(q => q.percentage >= 80 || (q.score / q.total_questions * 100) >= 80).length >= 5) badges.push('quiz_master');
        
        const totalAccess = (prog || []).reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0);
        if (totalAccess >= 10) badges.push('bookworm');
        
        // Streak logic: check last_access dates
        const dates = (prog || [])
          .filter(p => p.last_access)
          .map(p => p.last_access)
          .sort()
          .reverse();
        const uniqueDates = [...new Set(dates)];
        let streak = 0;
        let checkDate = new Date();
        for (const d of uniqueDates) {
          const diff = Math.round((checkDate - new Date(d)) / (1000 * 60 * 60 * 24));
          if (diff <= 1) { 
            streak++; 
            checkDate = new Date(d); 
          } else break;
        }
        if (streak >= 3) badges.push('streak_3');
        if (streak >= 7) badges.push('streak_7');
        
        setEarnedBadges(badges);
      } catch (error) {
        console.error('Error fetching gamification data:', error);
        toast.error('Failed to load achievements');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user?.email]);

  // Points calculation
  const totalPoints = (quizResults.length * 10) +
    (quizResults.reduce((s, q) => s + (q.score || 0), 0)) +
    (earnedBadges.length * 50);

  const level = Math.floor(totalPoints / 100) + 1;
  const progressToNext = totalPoints % 100;

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Study Achievements
          </CardTitle>
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
        <CardTitle className="font-playfair text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Study Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level + Points */}
        <div className="bg-gradient-to-r from-primary/10 to-amber-500/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground">Level {level}</p>
              <p className="font-playfair font-bold text-xl">{totalPoints} XP</p>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-sm">{quizResults.length} quizzes</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${progressToNext}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{100 - progressToNext} XP to Level {level + 1}</p>
        </div>

        {/* Badges grid */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Badges</p>
          <div className="grid grid-cols-3 gap-2">
            {BADGES.map(badge => {
              const earned = earnedBadges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  title={badge.desc}
                  className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${earned ? badge.color + ' border-current/20' : 'bg-muted/30 border-border opacity-40 grayscale'}`}
                >
                  <span className="text-xl mb-1">{badge.icon}</span>
                  <p className="text-[10px] font-semibold leading-tight">{badge.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="font-bold text-sm">{quizResults.length}</p>
            <p className="text-[10px] text-muted-foreground">Quizzes</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="font-bold text-sm">{earnedBadges.length}</p>
            <p className="text-[10px] text-muted-foreground">Badges</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="font-bold text-sm">Lv.{level}</p>
            <p className="text-[10px] text-muted-foreground">Level</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}