import {Briefcase} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
// src/components/ui/calendar.jsx
import * as React from "react";
import {
  ChevronLeft, ChevronRight,
  Sparkles, Target, Clock, Trophy, BookOpen,
  CheckCircle
} from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  SHOW_OUTSIDE_DAYS: import.meta.env.VITE_CALENDAR_SHOW_OUTSIDE_DAYS !== "false",
  SHOW_WEEK_NUMBERS: import.meta.env.VITE_CALENDAR_SHOW_WEEK_NUMBERS === "true",
  FIRST_WEEKDAY: Number(import.meta.env.VITE_CALENDAR_FIRST_WEEKDAY) || 1,

  // ✨ NEW: Engagement Features
  ENABLE_STUDY_STREAK: import.meta.env.VITE_CALENDAR_ENABLE_STUDY_STREAK !== "false",
  ENABLE_DAILY_GOALS: import.meta.env.VITE_CALENDAR_ENABLE_DAILY_GOALS !== "false",
  ENABLE_SESSION_TRACKER: import.meta.env.VITE_CALENDAR_ENABLE_SESSION_TRACKER !== "false",
  ENABLE_ACHIEVEMENTS: import.meta.env.VITE_CALENDAR_ENABLE_ACHIEVEMENTS !== "false",

  // 💰 Tutor specific
  ENABLE_EARNINGS: import.meta.env.VITE_CALENDAR_ENABLE_EARNINGS !== "false",
  ENABLE_BOOKING_HEATMAP: import.meta.env.VITE_CALENDAR_ENABLE_BOOKING_HEATMAP !== "false",

  // Messages
  MESSAGES: {
    STUDENT_TITLE: import.meta.env.VITE_CALENDAR_STUDENT_TITLE || "📚 Your Study Journey",
    TUTOR_TITLE: import.meta.env.VITE_CALENDAR_TUTOR_TITLE || "💰 Your Teaching Dashboard",
    TODAY: import.meta.env.VITE_CALENDAR_TODAY || "✨ Today's Focus",
    STREAK: import.meta.env.VITE_CALENDAR_STREAK || "🔥 Study Streak",
    GOALS: import.meta.env.VITE_CALENDAR_GOALS || "🎯 Daily Goals",
    SESSIONS: import.meta.env.VITE_CALENDAR_SESSIONS || "📖 Sessions",
    EARNINGS: import.meta.env.VITE_CALENDAR_EARNINGS || "💰 Earnings",
    ACHIEVEMENTS: import.meta.env.VITE_CALENDAR_ACHIEVEMENTS || "🏆 Achievements",
  },
};

// ============================================================
// Sub-Components
// ============================================================

// ─── Streak Display ──────────────────────────────────────────

function StreakDisplay({ streak = 0 }) {
  const isOnStreak = streak > 0;
  const emojis = ['🔥', '⚡', '💪', '🚀', '🌟', '🏆', '👑'];
  const emoji = emojis[Math.min(streak, emojis.length - 1)];

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full",
      isOnStreak
        ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-200/50"
        : "bg-muted/30 border border-border/50"
    )}>
      <span className="text-lg">{isOnStreak ? emoji : '⏸️'}</span>
      <div>
        <p className="text-xs font-bold text-foreground">{streak} day{streak !== 1 ? 's' : ''}</p>
        <p className="text-[10px] text-muted-foreground">{isOnStreak ? 'Keep going!' : 'Start your streak'}</p>
      </div>
    </div>
  );
}

// ─── Goal Card ─────────────────────────────────────────────────

function GoalCard({ icon: Icon, label, current, target, color }) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = percentage >= 100;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", color)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        {isComplete && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isComplete ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-muted-foreground min-w-[32px] text-right">
          {current}/{target}
        </span>
      </div>
    </div>
  );
}

// ─── Session Time Slot ─────────────────────────────────────────

function SessionSlot({ time, subject, tutor, status }) {
  const statusColors = {
    confirmed: "border-green-200 bg-green-50/50",
    pending: "border-amber-200 bg-amber-50/50",
    completed: "border-blue-200 bg-blue-50/50",
    cancelled: "border-red-200 bg-red-50/50",
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg border text-xs",
      statusColors[status] || "border-border bg-muted/30"
    )}>
      <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="font-medium">{time}</span>
      <span className="text-muted-foreground">·</span>
      <span>{subject}</span>
      {tutor && (
        <>
          <span className="text-muted-foreground">·</span>
          <span className="text-primary font-medium">👨‍🏫 {tutor}</span>
        </>
      )}
      <div className="ml-auto">
        {status === 'confirmed' && <Badge className="bg-green-100 text-green-700 text-[10px]">Confirmed</Badge>}
        {status === 'pending' && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Pending</Badge>}
      </div>
    </div>
  );
}

// ─── Achievement Badge ────────────────────────────────────────

function AchievementBadge({ icon: Icon, label, unlocked, color }) {
  return (
    <div className={cn(
      "flex flex-col items-center p-2 rounded-xl transition-all",
      unlocked ? "opacity-100" : "opacity-30 grayscale"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center mb-1",
        unlocked ? color : "bg-muted"
      )}>
        <Icon className={cn("w-5 h-5", unlocked ? "text-white" : "text-muted-foreground")} />
      </div>
      <span className="text-[10px] text-center font-medium text-foreground">{label}</span>
      {unlocked && <Sparkles className="w-2.5 h-2.5 text-amber-400 mt-0.5" />}
    </div>
  );
}

// ============================================================
// Main Calendar Component
// ============================================================

/**
 * Enhanced Calendar – An engaging, feature-rich calendar for students and tutors.
 *
 * @param {Object} props
 * @param {string} props.userType - 'student' | 'tutor' | 'parent'
 * @param {number} props.studyStreak - Current study streak in days
 * @param {Array} props.dailyGoals - Array of daily goals { label, current, target, icon, color }
 * @param {Array} props.sessions - Array of sessions { time, subject, tutor, status }
 * @param {number} props.earnings - Total earnings (tutor only)
 * @param {Array} props.achievements - Array of achievements { icon, label, unlocked, color }
 * @param {Date} props.selected - Selected date
 * @param {function} props.onSelect - Callback when date is selected
 * @param {string} props.className - Additional CSS classes
 */
function Calendar({
  className,
  userType = 'student',
  studyStreak = 0,
  dailyGoals = [],
  sessions = [],
  earnings = 0,
  achievements = [],
  selected,
  onSelect,
  ...props
}) {
  const isStudent = userType === 'student';
  const isTutor = userType === 'tutor';
  const isParent = userType === 'parent';

  // ============================================================
  // Dynamic Content Based on User Type
  // ============================================================

  const renderHeader = () => {
    const title = isTutor ? CONFIG.MESSAGES.TUTOR_TITLE : CONFIG.MESSAGES.STUDENT_TITLE;
    const subtitle = isTutor
      ? `💰 R${earnings.toFixed(2)} this month · ${sessions.length} sessions`
      : `${studyStreak} day streak · ${dailyGoals.filter(g => g.current >= g.target).length}/${dailyGoals.length} goals met`;

    return (
      <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              {isTutor ? <Briefcase className="w-4 h-4 text-primary" /> : <BookOpen className="w-4 h-4 text-primary" />}
              {title}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          {isStudent && CONFIG.ENABLE_STUDY_STREAK && (
            <StreakDisplay streak={studyStreak} />
          )}
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    return (
      <div className="mt-4 space-y-3">
        {/* Daily Goals */}
        {isStudent && CONFIG.ENABLE_DAILY_GOALS && dailyGoals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" /> {CONFIG.MESSAGES.GOALS}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {dailyGoals.filter(g => g.current >= g.target).length}/{dailyGoals.length} complete
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {dailyGoals.map((goal, i) => (
                <GoalCard key={i} {...goal} />
              ))}
            </div>
          </div>
        )}

        {/* Sessions */}
        {sessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> {CONFIG.MESSAGES.SESSIONS}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {sessions.filter(s => s.status === 'confirmed').length} confirmed
              </span>
            </div>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {sessions.slice(0, 3).map((session, i) => (
                <SessionSlot key={i} {...session} />
              ))}
              {sessions.length > 3 && (
                <p className="text-[10px] text-muted-foreground text-center">+{sessions.length - 3} more sessions</p>
              )}
            </div>
          </div>
        )}

        {/* Achievements */}
        {isStudent && CONFIG.ENABLE_ACHIEVEMENTS && achievements.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" /> {CONFIG.MESSAGES.ACHIEVEMENTS}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {achievements.slice(0, 6).map((achievement, i) => (
                <AchievementBadge key={i} {...achievement} />
              ))}
              {achievements.length > 6 && (
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  +{achievements.length - 6}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className={cn(
      "bg-card border border-border rounded-2xl p-4 shadow-sm",
      "hover:shadow-md transition-shadow duration-300",
      className
    )}>
      {/* Header */}
      {renderHeader()}

      {/* Calendar */}
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        showOutsideDays={CONFIG.SHOW_OUTSIDE_DAYS}
        firstWeekday={CONFIG.FIRST_WEEKDAY}
        className="[&_.rdp-caption]:justify-center"
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4 w-full",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex justify-between",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
          row: "flex w-full mt-2 justify-between",
          cell: cn(
            "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
            "[&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
            "w-9 h-9"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 rounded-full"
          ),
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
          day_today: "bg-accent text-accent-foreground rounded-full ring-1 ring-primary/30",
          day_outside: "day-outside text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-50",
          day_hidden: "invisible",
          ...props.classNames,
        }}
        components={{
          IconLeft: ({ className, ...props }) => (
            <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
          ),
          IconRight: ({ className, ...props }) => (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
          ),
        }}
        {...props}
      />

      {/* Footer */}
      {renderFooter()}
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
