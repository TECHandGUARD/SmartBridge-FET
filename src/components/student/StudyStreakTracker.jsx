import { Card, CardContent } from '@/components/ui/card';
import { Flame, Trophy, Star, Zap } from 'lucide-react';

const MILESTONES = [
  { days: 3,  label: 'Getting Started',  icon: '🌱', color: 'text-green-600'  },
  { days: 7,  label: 'One Week Strong',  icon: '⚡', color: 'text-blue-600'   },
  { days: 14, label: 'Two Week Warrior', icon: '🏆', color: 'text-yellow-600' },
  { days: 30, label: 'Monthly Master',   icon: '🌟', color: 'text-purple-600' },
];

function FlameIcon({ streak }) {
  if (streak === 0) return <Flame className="w-8 h-8 text-muted-foreground/40" />;
  if (streak >= 14) return <Flame className="w-8 h-8 text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]" />;
  if (streak >= 7)  return <Flame className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.7)]"  />;
  return <Flame className="w-8 h-8 text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]" />;
}

function StreakDots({ streak }) {
  // Show last 7 days as dots
  const dots = Array.from({ length: 7 }, (_, i) => i < Math.min(streak, 7));
  return (
    <div className="flex items-center gap-1.5 mt-3">
      {dots.map((active, i) => (
        <div
          key={i}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
            active
              ? 'bg-orange-500 text-white shadow-sm shadow-orange-300 scale-110'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {active ? '🔥' : '○'}
        </div>
      ))}
      {streak > 7 && (
        <span className="text-xs text-muted-foreground font-medium ml-1">+{streak - 7} more</span>
      )}
    </div>
  );
}

export default function StudyStreakTracker({ streak }) {
  const nextMilestone = MILESTONES.find(m => m.days > streak);
  const daysToNext = nextMilestone ? nextMilestone.days - streak : null;
  const reachedMilestones = MILESTONES.filter(m => streak >= m.days);
  const latestMilestone = reachedMilestones[reachedMilestones.length - 1];

  const bgGradient =
    streak >= 14 ? 'from-purple-50 to-card dark:from-purple-950/20' :
    streak >= 7  ? 'from-yellow-50 to-card dark:from-yellow-950/20' :
    streak >= 3  ? 'from-orange-50 to-card dark:from-orange-950/20' :
                   'from-muted/30 to-card';

  return (
    <Card className={`border-border bg-gradient-to-br ${bgGradient}`}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          {/* Flame icon */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
            streak > 0 ? 'bg-orange-100 dark:bg-orange-950/40' : 'bg-muted'
          }`}>
            <FlameIcon streak={streak} />
          </div>

          {/* Text block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-playfair text-4xl font-bold leading-none">{streak}</span>
              <span className="text-sm text-muted-foreground font-medium">
                {streak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <p className="text-sm font-semibold mt-0.5">Study Streak</p>

            {streak === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Access a resource today to start your streak!</p>
            )}
            {streak > 0 && streak < 3 && (
              <p className="text-xs text-orange-600 font-medium mt-1">🚀 {3 - streak} more {3 - streak === 1 ? 'day' : 'days'} to your first milestone!</p>
            )}
            {latestMilestone && (
              <p className={`text-xs font-semibold mt-1 ${latestMilestone.color}`}>
                {latestMilestone.icon} {latestMilestone.label}
              </p>
            )}
            {daysToNext && streak >= 3 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {daysToNext} {daysToNext === 1 ? 'day' : 'days'} to <strong>{nextMilestone.label}</strong> {nextMilestone.icon}
              </p>
            )}
          </div>
        </div>

        {/* 7-day dot row */}
        {streak > 0 && <StreakDots streak={streak} />}

        {/* Milestone badges */}
        {MILESTONES.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {MILESTONES.map(m => {
              const earned = streak >= m.days;
              return (
                <div
                  key={m.days}
                  title={m.label}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    earned
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/50 text-muted-foreground border-border opacity-60'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.days}d</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}