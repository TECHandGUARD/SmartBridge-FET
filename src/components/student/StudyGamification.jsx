import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Loader2, AlertCircle, Award, Target, Star } from 'lucide-react';
import { toast } from 'sonner';

// PropTypes definitions instead of TypeScript interfaces
const UserProps = {
  email: PropTypes.string.isRequired
};

// PropTypes for component props
const propTypes = {
  user: PropTypes.shape(UserProps).isRequired
};

const BADGES = [
  { id: 'first_quiz', label: 'First Quiz', icon: '🎯', desc: 'Completed your first quiz', colorClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'streak_3', label: '3-Day Streak', icon: '🔥', desc: 'Studied 3 days in a row', colorClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'streak_7', label: 'Week Warrior', icon: '⚡', desc: 'Studied 7 days in a row', colorClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'quiz_master', label: 'Quiz Master', icon: '🏆', desc: 'Scored 80%+ on 5 quizzes', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'top_scorer', label: 'Top Scorer', icon: '⭐', desc: 'Scored 100% on any quiz', colorClass: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { id: 'bookworm', label: 'Bookworm', icon: '📚', desc: 'Accessed 10+ resources', colorClass: 'bg-green-50 text-green-700 border-green-200' },
];

export default function StudyGamification({ user }) {
  const [quizResults, setQuizResults] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    fetchAndProcessGamificationMetrics();
  }, [user?.email]);

  const fetchAndProcessGamificationMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [quizQuery, progressQuery] = await Promise.all([
        supabase.from('quiz_results').select('percentage, score').eq('student_email', user.email),
        supabase.from('student_progress').select('study_sessions, last_access').eq('user_email', user.email)
      ]);

      if (quizQuery.error) throw quizQuery.error;
      if (progressQuery.error) throw progressQuery.error;

      const qr = quizQuery.data || [];
      const prog = progressQuery.data || [];

      setQuizResults(qr);

      // Calculate earned badges
      const badges = [];
      if (qr.length >= 1) badges.push('first_quiz');
      if (qr.some(q => q.percentage >= 100)) badges.push('top_scorer');
      if (qr.filter(q => q.percentage >= 80).length >= 5) badges.push('quiz_master');
      
      const totalAccess = prog.reduce((s, p) => s + (p.study_sessions || 0), 0);
      if (totalAccess >= 10) badges.push('bookworm');

      // Streak calculation
      const rawDates = prog
        .filter(p => p.last_access)
        .map(p => p.last_access.split('T')[0]);
      
      const uniqueSortedDates = [...new Set(rawDates)].sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );

      let streak = 0;
      if (uniqueSortedDates.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (uniqueSortedDates[0] === todayStr || uniqueSortedDates[0] === yesterdayStr) {
          streak = 1;
          for (let i = 1; i < uniqueSortedDates.length; i++) {
            const prevTime = new Date(uniqueSortedDates[i - 1]).getTime();
            const currTime = new Date(uniqueSortedDates[i]).getTime();
            const dayDifference = (prevTime - currTime) / 86400000;

            if (dayDifference === 1) {
              streak++;
            } else if (dayDifference > 1) {
              break;
            }
          }
        }
      }

      if (streak >= 3) badges.push('streak_3');
      if (streak >= 7) badges.push('streak_7');

      setEarnedBadges(badges);
    } catch (err) {
      console.error('Gamification tracking failure:', err);
      setError(err.message || 'Failed to pull player reward data.');
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = (quizResults.length * 10) +
    (quizResults.reduce((s, q) => s + (q.score || 0), 0)) +
    (earnedBadges.length * 50);

  const level = Math.floor(totalPoints / 100) + 1;
  const progressToNext = totalPoints % 100;

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Loading achievements...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-md max-w-sm mx-auto bg-card">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500 shrink-0" /> Study Achievements
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {error && (
          <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[11px] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Level + Points */}
        <div className="bg-gradient-to-r from-primary/5 to-amber-500/10 border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Level {level}</p>
              <p className="text-2xl font-black text-foreground leading-none mt-0.5">{totalPoints} <span className="text-xs font-bold text-muted-foreground uppercase">XP</span></p>
            </div>
            <div className="flex items-center gap-1.5 bg-card px-2 py-1 rounded-lg border border-border">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-extrabold text-xs text-foreground">{quizResults.length} Quizzes</span>
            </div>
          </div>
          
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="bg-primary rounded-full h-2 transition-all duration-500" style={{ width: `${progressToNext}%` }} />
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground mt-1.5">
            {100 - progressToNext} XP to Level {level + 1}
          </p>
        </div>

        {/* Badges Grid */}
        <div>
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Unlocked Badges</p>
          <div className="grid grid-cols-3 gap-2">
            {BADGES.map(badge => {
              const earned = earnedBadges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  title={badge.desc}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-300 ${
                    earned 
                      ? `${badge.colorClass} shadow-sm` 
                      : 'bg-muted/30 border-border opacity-40 grayscale'
                  }`}
                >
                  <span className="text-xl mb-1 select-none">{badge.icon}</span>
                  <p className="text-[9px] font-bold leading-tight uppercase tracking-tight truncate w-full">{badge.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2.5 border-t border-border">
          <div className="bg-muted/30 rounded-xl p-2">
            <p className="font-black text-foreground text-sm">{quizResults.length}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Quizzes</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-2">
            <p className="font-black text-foreground text-sm">{earnedBadges.length}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Badges</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-2">
            <p className="font-black text-foreground text-sm">Lv.{level}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Rank</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add PropTypes to the component
StudyGamification.propTypes = propTypes;
