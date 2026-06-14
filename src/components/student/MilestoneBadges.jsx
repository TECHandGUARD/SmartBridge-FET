import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UserProps {
  id: string;
  email: string;
  full_name?: string;
  badges?: string[];
}

interface BadgeContext {
  prog: any[];
  quizzes: any[];
  bookings: any[];
  streak: number;
}

interface BadgeItem {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  category: 'Study' | 'Quizzes' | 'Tutoring' | 'Streaks';
  check: (ctx: BadgeContext) => boolean;
}

// ─── Badge definitions with fixed field names ────────────────────────────────
const ALL_BADGES: BadgeItem[] = [
  // Study sessions
  { id: 'first_session',  emoji: '🎯', label: 'First Step',       desc: 'Logged your first study session',    category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || 0), 0) >= 1 },
  { id: 'five_sessions',  emoji: '📚', label: 'Bookworm',         desc: 'Completed 5 study sessions',         category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || 0), 0) >= 5 },
  { id: 'ten_sessions',   emoji: '🔟', label: 'Study Machine',    desc: 'Completed 10 study sessions',        category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || 0), 0) >= 10 },
  { id: 'dedicated',      emoji: '💪', label: 'Dedicated',        desc: 'Completed 20+ study sessions',       category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || 0), 0) >= 20 },
  { id: 'bookworm50',     emoji: '📖', label: 'Scholar',          desc: 'Completed 50+ study sessions',       category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || 0), 0) >= 50 },
  // Subjects
  { id: 'multi_subject',  emoji: '🌟', label: 'Multi-Subject',    desc: 'Studied 3 or more subjects',         category: 'Study',   check: ({ prog }) => prog.length >= 3 },
  { id: 'all_rounder',    emoji: '🎓', label: 'All-Rounder',      desc: 'Studied 5+ different subjects',      category: 'Study',   check: ({ prog }) => prog.length >= 5 },
  { id: 'grade12_hero',   emoji: '🏆', label: 'Grade 12 Hero',    desc: 'Studying a Grade 12 subject',        category: 'Study',   check: ({ prog }) => prog.some(p => p.grade === 'Grade 12') },
  // Quizzes
  { id: 'first_quiz',     emoji: '🧩', label: 'Quiz Starter',     desc: 'Completed your first quiz',          category: 'Quizzes', check: ({ quizzes }) => quizzes.length >= 1 },
  { id: 'five_quizzes',   emoji: '🎮', label: 'Quiz Enthusiast',  desc: 'Finished 5 quizzes',                 category: 'Quizzes', check: ({ quizzes }) => quizzes.length >= 5 },
  { id: 'ten_quizzes',    emoji: '🧠', label: 'Quiz Master',      desc: 'Finished 10 quizzes',                category: 'Quizzes', check: ({ quizzes }) => quizzes.length >= 10 },
  { id: 'perfect_score',  emoji: '💯', label: 'Perfect Score',    desc: 'Scored 100% on a quiz',              category: 'Quizzes', check: ({ quizzes }) => quizzes.some(q => q.percentage === 100) },
  { id: 'high_scorer',    emoji: '⭐', label: 'High Achiever',    desc: 'Scored 80%+ on 3 quizzes',           category: 'Quizzes', check: ({ quizzes }) => quizzes.filter(q => (q.percentage || 0) >= 80).length >= 3 },
  // Tutoring
  { id: 'first_booking',  emoji: '🤝', label: 'Connected',        desc: 'Booked your first tutoring session', category: 'Tutoring', check: ({ bookings }) => bookings.length >= 1 },
  { id: 'three_sessions', emoji: '👨‍🏫', label: 'Tutor Regular',   desc: 'Attended 3 tutoring sessions',       category: 'Tutoring', check: ({ bookings }) => bookings.filter(b => b.status === 'completed').length >= 3 },
  { id: 'five_bookings',  emoji: '🌈', label: 'Tutor Champion',   desc: 'Completed 5 tutoring sessions',      category: 'Tutoring', check: ({ bookings }) => bookings.filter(b => b.status === 'completed').length >= 5 },
  // Streaks - FIXED: Uses proper Date arithmetic with .getTime()
  { id: 'streak3',        emoji: '🔥', label: '3-Day Streak',     desc: 'Studied 3 days in a row',            category: 'Streaks', check: ({ streak }) => streak >= 3 },
  { id: 'streak7',        emoji: '⚡', label: 'Week Warrior',     desc: 'Studied 7 days in a row',            category: 'Streaks', check: ({ streak }) => streak >= 7 },
  { id: 'streak14',       emoji: '🌙', label: 'Fortnight Focus',  desc: 'Studied 14 days in a row',           category: 'Streaks', check: ({ streak }) => streak >= 14 },
  { id: 'streak30',       emoji: '👑', label: 'Monthly Master',   desc: 'Studied 30 days in a row',           category: 'Streaks', check: ({ streak }) => streak >= 30 },
];

const CATEGORY_COLORS = {
  Study:    { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
  Quizzes:  { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800' },
  Tutoring: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800' },
  Streaks:  { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800' },
};

function BadgeCard({ badge, earned }: { badge: BadgeItem; earned: boolean }) {
  const colors = CATEGORY_COLORS[badge.category];
  return (
    <div
      className={`relative p-3 rounded-xl border transition-all ${
        earned
          ? `${colors.bg} ${colors.border}`
          : 'bg-muted/20 border-border opacity-40 grayscale'
      }`}
    >
      {earned && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Earned" />
      )}
      <div className="text-2xl mb-1">{badge.emoji}</div>
      <p className="text-xs font-semibold leading-tight">{badge.label}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{badge.desc}</p>
    </div>
  );
}

export default function MilestoneBadges({ user }: { user: UserProps }) {
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const fetchAndProcessMilestones = useCallback(async () => {
    if (!user?.email) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch student progress
      const { data: prog, error: progError } = await supabase
        .from('student_progress')
        .select('study_sessions, grade, last_access')
        .eq('user_email', user.email);

      if (progError) throw progError;

      // Fetch quiz results
      const { data: quizzes, error: quizError } = await supabase
        .from('quiz_results')
        .select('percentage')
        .eq('student_email', user.email);

      if (quizError) throw quizError;

      // Fetch tutor bookings
      const { data: bookings, error: bookingError } = await supabase
        .from('tutor_bookings')
        .select('status')
        .eq('student_email', user.email);

      if (bookingError) throw bookingError;

      // FIXED: Proper streak calculation with Date.getTime() and day deduplication
      const rawDates = (prog || [])
        .filter(p => p.last_access)
        .map(p => p.last_access.split('T')[0]); // Get just YYYY-MM-DD

      // Deduplicate dates (multiple sessions on same day count as 1 for streak)
      const uniqueSortedDates = [...new Set(rawDates)].sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      );

      let streak = 0;
      if (uniqueSortedDates.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Check if user studied today or yesterday
        if (uniqueSortedDates[0] === todayStr || uniqueSortedDates[0] === yesterdayStr) {
          streak = 1;
          for (let i = 1; i < uniqueSortedDates.length; i++) {
            const dateCurrent = new Date(uniqueSortedDates[i - 1]).getTime();
            const datePrevious = new Date(uniqueSortedDates[i]).getTime();
            const dayDiff = (dateCurrent - datePrevious) / 86400000;

            if (dayDiff === 1) {
              streak++;
            } else if (dayDiff > 1) {
              break; // Streak broken
            }
          }
        }
      }

      const ctx: BadgeContext = { 
        prog: prog || [], 
        quizzes: quizzes || [], 
        bookings: bookings || [], 
        streak 
      };
      
      const calculatedBadgeIds = ALL_BADGES.filter(b => b.check(ctx)).map(b => b.id);
      setEarnedBadges(calculatedBadgeIds);

      // Persist new badges to user profile
      const currentBadges = user.badges || [];
      const newlyEarned = calculatedBadgeIds.filter(b => !currentBadges.includes(b));

      if (newlyEarned.length > 0) {
        const updatedBadges = [...currentBadges, ...newlyEarned];
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            badges: updatedBadges,
            updated_at: new Date().toISOString()
          })
          .eq('email', user.email);

        if (updateError) throw updateError;

        // Show toast notifications for newly earned badges
        newlyEarned.forEach(badgeId => {
          const matchedBadge = ALL_BADGES.find(b => b.id === badgeId);
          if (matchedBadge) {
            toast.success(`🏅 Badge Earned: ${matchedBadge.emoji} ${matchedBadge.label}!`);
          }
        });
      }
    } catch (err: any) {
      console.error('Error processing badges:', err);
      setError(err.message || 'Failed to load badges');
      toast.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.badges]);

  useEffect(() => {
    fetchAndProcessMilestones();
  }, [fetchAndProcessMilestones]);

  const categories = ['All', 'Study', 'Quizzes', 'Tutoring', 'Streaks'];
  const filteredBadges = activeCategory === 'All' 
    ? ALL_BADGES 
    : ALL_BADGES.filter(b => b.category === activeCategory);
  
  const totalEarnedCount = earnedBadges.length;
  const earnedSet = new Set(earnedBadges);

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAndProcessMilestones}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> Milestone Badges
          </CardTitle>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
            {totalEarnedCount}/{ALL_BADGES.length} earned
          </Badge>
        </div>
        
        {/* Category filter tabs */}
        <div className="flex gap-1.5 flex-wrap mt-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {cat}
              {cat !== 'All' && (
                <span className="ml-1 opacity-70">
                  ({ALL_BADGES.filter(b => b.category === cat && earnedSet.has(b.id)).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {filteredBadges.map(badge => (
            <BadgeCard key={badge.id} badge={badge} earned={earnedSet.has(badge.id)} />
          ))}
        </div>
        {totalEarnedCount === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Complete activities to earn your first badge! 🚀
          </p>
        )}
      </CardContent>
    </Card>
  );
}
