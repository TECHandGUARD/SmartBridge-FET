import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Award } from 'lucide-react';

interface StudyStreakTrackerProps {
  streak: number;
}

interface MilestoneItem {
  days: number;
  label: string;
  emoji: string;
  colorClass: string;
}

const MILESTONES: MilestoneItem[] = [
  { days: 3,  label: 'Getting Started',  emoji: '🌱', colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { days: 7,  label: 'One Week Strong',  emoji: '⚡', colorClass: 'text-blue-600 bg-blue-50 border-blue-100' },
  { days: 14, label: 'Two Week Warrior', emoji: '🏆', colorClass: 'text-amber-700 bg-amber-50 border-amber-100' },
  { days: 30, label: 'Monthly Master',   emoji: '🌟', colorClass: 'text-purple-600 bg-purple-50 border-purple-100' },
  { days: 60, label: 'Champion Scholar', emoji: '👑', colorClass: 'text-rose-600 bg-rose-50 border-rose-100' },
];

function FlameIcon({ streak }: { streak: number }) {
  if (streak === 0) return <Flame className="w-8 h-8 text-slate-300" />;
  if (streak >= 30) return <Flame className="w-8 h-8 text-purple-500 drop-shadow-[0_0_12px_rgba(168,85,247,0.7)] animate-pulse" />;
  if (streak >= 14) return <Flame className="w-8 h-8 text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />;
  if (streak >= 7)  return <Flame className="w-8 h-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />;
  return <Flame className="w-8 h-8 text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]" />;
}

function WeekCalendarGrid({ streak }: { streak: number }) {
  // South African school week: Monday to Sunday
  const SA_WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Get current day index (0 = Sunday, 1 = Monday, etc.)
  const currentDay = new Date().getDay();
  // Map to Monday-first (0 = Monday, 6 = Sunday)
  const currentSaIndex = currentDay === 0 ? 6 : currentDay - 1;

  return (
    <div className="mt-4 pt-3 border-t border-border">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        📅 This Week's Activity
      </p>
      <div className="flex items-center justify-between gap-1">
        {SA_WEEK_DAYS.map((dayLabel, idx) => {
          // Calculate if this day was active within the streak
          const isDayActive = idx <= currentSaIndex && (currentSaIndex - idx) < streak;
          const isToday = idx === currentSaIndex;
          const isFuture = idx > currentSaIndex;

          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDayActive
                    ? 'bg-orange-500 text-white shadow-sm scale-105'
                    : isToday
                    ? 'bg-primary/20 text-primary border-2 border-primary font-bold'
                    : isFuture
                    ? 'bg-muted/30 text-muted-foreground border border-border'
                    : 'bg-muted text-muted-foreground border border-border opacity-50'
                }`}
                title={isDayActive ? `${dayLabel} - Studied` : isToday ? `${dayLabel} - Today` : `${dayLabel} - No activity`}
              >
                {isDayActive ? '🔥' : dayLabel.slice(0, 1)}
              </div>
              <span className="text-[9px] text-muted-foreground hidden sm:block">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StudyStreakTracker({ streak }: StudyStreakTrackerProps) {
  const nextMilestone = MILESTONES.find(m => m.days > streak);
  const daysToNext = nextMilestone ? nextMilestone.days - streak : null;
  const reachedMilestones = MILESTONES.filter(m => streak >= m.days);
  const latestMilestone = reachedMilestones[reachedMilestones.length - 1];

  // Clean border styling - no dynamic gradients
  const themeCardBorder = 
    streak >= 30 ? 'border-purple-300 bg-purple-50/30 dark:bg-purple-950/20' :
    streak >= 14 ? 'border-purple-200 bg-purple-50/20 dark:bg-purple-950/10' :
    streak >= 7  ? 'border-amber-200 bg-amber-50/20 dark:bg-amber-950/10' :
    streak >= 3  ? 'border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10' :
                   'border-border bg-card';

  return (
    <Card className={`shadow-md transition-all duration-300 overflow-hidden border ${themeCardBorder}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          
          {/* Flame Icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
            streak > 0 ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-800' : 'bg-muted/30 border-border'
          }`}>
            <FlameIcon streak={streak} />
          </div>

          {/* Stats Block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-foreground leading-none">{streak}</span>
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wide">
                {streak === 1 ? 'Day' : 'Days'}
              </span>
            </div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-0.5">
              Current Study Streak
            </h4>

            {/* Motivational Messages */}
            {streak === 0 && (
              <p className="text-[11px] text-muted-foreground font-medium mt-1">
                🔥 Access any resource today to start your streak!
              </p>
            )}
            
            {streak > 0 && streak < 3 && (
              <p className="text-[11px] text-orange-600 dark:text-orange-400 font-bold mt-1 animate-pulse">
                🚀 {3 - streak} more {3 - streak === 1 ? 'day' : 'days'} to your first milestone!
              </p>
            )}
            
            {latestMilestone && streak >= 3 && (
              <div className="mt-1.5">
                <Badge variant="outline" className={`text-[10px] font-bold py-0 px-2 gap-1 ${latestMilestone.colorClass}`}>
                  <span>{latestMilestone.emoji}</span>
                  <span>{latestMilestone.label}</span>
                  <Award className="w-3 h-3" />
                </Badge>
              </div>
            )}
            
            {daysToNext && streak >= 3 && streak < 60 && (
              <p className="text-[10px] font-medium text-muted-foreground mt-1.5">
                Next: <span className="font-bold text-foreground">{daysToNext}d</span> to {nextMilestone?.label} {nextMilestone?.emoji}
              </p>
            )}
          </div>
        </div>

        {/* Weekly Calendar Grid */}
        {streak > 0 && <WeekCalendarGrid streak={streak} />}

        {/* Milestone Track */}
        <div className="flex gap-1.5 mt-4 flex-wrap pt-3 border-t border-border">
          {MILESTONES.map(m => {
            const isEarned = streak >= m.days;
            return (
              <div
                key={m.days}
                title={m.label}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                  isEarned
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border opacity-60'
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.days}d</span>
              </div>
            );
          })}
        </div>
        
        {/* Extra encouragement for high streaks */}
        {streak >= 30 && (
          <div className="mt-3 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-center">
            <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
              🎉 Incredible dedication! {streak} day streak! You're an inspiration!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
