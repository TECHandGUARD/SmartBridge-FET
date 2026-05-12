import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { toast } from 'sonner';

// ─── Badge definitions ────────────────────────────────────────────────────────
// check receives: { prog, quizzes, bookings, streak }
const ALL_BADGES = [
  // Study sessions
  { id: 'first_session',  emoji: '🎯', label: 'First Step',       desc: 'Logged your first study session',    category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0) >= 1 },
  { id: 'five_sessions',  emoji: '📚', label: 'Bookworm',         desc: 'Completed 5 study sessions',         category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0) >= 5 },
  { id: 'ten_sessions',   emoji: '🔟', label: 'Study Machine',    desc: 'Completed 10 study sessions',        category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0) >= 10 },
  { id: 'dedicated',      emoji: '💪', label: 'Dedicated',        desc: 'Completed 20+ study sessions',       category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0) >= 20 },
  { id: 'bookworm50',     emoji: '📖', label: 'Scholar',          desc: 'Completed 50+ study sessions',       category: 'Study',   check: ({ prog }) => prog.reduce((s, p) => s + (p.study_sessions || p.resources_accessed || 0), 0) >= 50 },
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
  // Streaks
  { id: 'streak3',        emoji: '🔥', label: '3-Day Streak',     desc: 'Studied 3 days in a row',            category: 'Streaks', check: ({ streak }) => streak >= 3 },
  { id: 'streak7',        emoji: '⚡', label: 'Week Warrior',     desc: 'Studied 7 days in a row',            category: 'Streaks', check: ({ streak }) => streak >= 7 },
  { id: 'streak14',       emoji: '🌙', label: 'Fortnight Focus',  desc: 'Studied 14 days in a row',           category: 'Streaks', check: ({ streak }) => streak >= 14 },
  { id: 'streak30',       emoji: '👑', label: 'Monthly Master',   desc: 'Studied 30 days in a row',           category: 'Streaks', check: ({ streak }) => streak >= 30 },
];

const CATEGORY_COLORS = {
  Study:    { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-500', dot: 'bg-blue-400' },
  Quizzes:  { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', badge: 'bg-purple-500', dot: 'bg-purple-400' },
  Tutoring: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', badge: 'bg-green-600', dot: 'bg-green-400' },
  Streaks:  { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-500', dot: 'bg-orange-400' },
};

function BadgeCard({ badge, earned }) {
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
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-400" title="Earned" />
      )}
      <div className="text-2xl mb-1">{badge.emoji}</div>
      <p className="text-xs font-semibold leading-tight">{badge.label}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{badge.desc}</p>
    </div>
  );
}

export default function MilestoneBadges({ user }) {
  const [earned, setEarned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch student progress
        const { data: prog, error: progError } = await supabase
          .from('student_progress')
          .select('*')
          .eq('user_email', user.email);
        
        if (progError) throw progError;
        
        // Fetch quiz results
        const { data: quizzes, error: quizError } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_email', user.email);
        
        if (quizError) throw quizError;
        
        // Fetch tutor bookings
        const { data: bookings, error: bookError } = await supabase
          .from('tutor_bookings')
          .select('*')
          .eq('student_email', user.email);
        
        if (bookError) throw bookError;
        
        // Compute streak from StudentProgress last_access dates
        const dates = (prog || [])
          .filter(p => p.last_access)
          .map(p => p.last_access)
          .sort()
          .reverse();
        let streak = 0;
        if (dates.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          if (dates[0] === today) {
            streak = 1;
            for (let i = 1; i < dates.length; i++) {
              const diff = (new Date(dates[i - 1]) - new Date(dates[i])) / 86400000;
              if (diff === 1) streak++;
              else break;
            }
          }
        }

        const ctx = { prog: prog || [], quizzes: quizzes || [], bookings: bookings || [], streak };
        const newBadges = ALL_BADGES.filter(b => b.check(ctx)).map(b => b.id);
        setEarned(newBadges);

        // Persist newly earned badges in user_profiles table
        const { data: userProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('badges')
          .eq('email', user.email)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        
        const currentBadges = userProfile?.badges || [];
        const toAdd = newBadges.filter(b => !currentBadges.includes(b));
        
        if (toAdd.length > 0) {
          await supabase
            .from('user_profiles')
            .update({ badges: [...currentBadges, ...toAdd] })
            .eq('email', user.email);
          
          toAdd.forEach(b => {
            const badge = ALL_BADGES.find(x => x.id === b);
            if (badge) toast.success(`🏅 Badge earned: ${badge.emoji} ${badge.label}!`);
          });
        }
      } catch (error) {
        console.error('Error fetching badge data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const earnedSet = new Set(earned);
  const categories = ['All', 'Study', 'Quizzes', 'Tutoring', 'Streaks'];
  const filtered = activeCategory === 'All' ? ALL_BADGES : ALL_BADGES.filter(b => b.category === activeCategory);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> Milestone Badges
          </CardTitle>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
            {earned.length}/{ALL_BADGES.length} earned
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
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map(badge => (
              <BadgeCard key={badge.id} badge={badge} earned={earnedSet.has(badge.id)} />
            ))}
          </div>
        )}
        {!loading && earned.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Complete activities to earn your first badge! 🚀
          </p>
        )}
      </CardContent>
    </Card>
  );
}