// src/pages/StudentDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap, BookOpen, Star, TrendingUp, ArrowRight,
  MessageCircle, Crown, Trash2, AlertTriangle, Loader2,
  Sparkles, Zap, Clock, Calendar, Award, Target,
  Brain, Users, FileText, BarChart3, Home,
  ChevronRight, Bell, Gift, Rocket, Trophy
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import StudentQuickActions from '@/components/student/StudentQuickActions';
import DashboardPremiumGate from '@/components/ui/DashboardPremiumGate';
import GradeProgressTracker from '@/components/student/GradeProgressTracker';
import StudyReminderManager from '@/components/student/StudyReminderManager';
import ProgressCharts from '@/components/student/ProgressCharts';
import SimulationLab from '@/components/simulations/SimulationLab';
import ResourceBookmarks from '@/components/student/ResourceBookmarks';
import MilestoneBadges from '@/components/student/MilestoneBadges';
import StudyHeatmap from '@/components/student/StudyHeatmap';
import LiveTutorChat from '@/components/tutor/LiveTutorChat';
import AIStudyPlanner from '@/components/student/AIStudyPlanner';
import WeeklyGoals from '@/components/student/WeeklyGoals';
import StudyGamification from '@/components/student/StudyGamification';
import InteractiveFlashcards from '@/components/student/InteractiveFlashcards';
import AIStudyAssistant from '@/components/student/AIStudyAssistant';
import StudentProgressDashboard from '@/components/student/StudentProgressDashboard';
import SyllabusTopicTracker from '@/components/student/SyllabusTopicTracker';
import DiscussionBoard from '@/components/discussion/DiscussionBoard';
import ApplicationTracker from '@/components/opportunities/ApplicationTracker';
import CounselorChat from '@/components/counselor/CounselorChat';
import { AnnouncementBanner } from '@/components/admin/AnnouncementManager';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // App name
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

  // Premium pricing
  STUDENT_PREMIUM_PRICE: Number(import.meta.env.VITE_STUDENT_PREMIUM_PRICE) || 20,
  PREMIUM_CURRENCY: import.meta.env.VITE_PREMIUM_CURRENCY || 'R',

  // Display limits
  RESOURCES_DISPLAY_LIMIT: Number(import.meta.env.VITE_STUDENT_RESOURCES_LIMIT) || 6,
  TUTORS_DISPLAY_LIMIT: Number(import.meta.env.VITE_STUDENT_TUTORS_LIMIT) || 10,

  // Feature flags
  ENABLE_ANNOUNCEMENTS: import.meta.env.VITE_ENABLE_STUDENT_ANNOUNCEMENTS !== 'false',
  ENABLE_QUICK_ACTIONS: import.meta.env.VITE_ENABLE_STUDENT_QUICK_ACTIONS !== 'false',
  ENABLE_REAL_TIME: import.meta.env.VITE_ENABLE_STUDENT_REAL_TIME !== 'false',

  // Messages
  MESSAGES: {
    WELCOME: import.meta.env.VITE_STUDENT_WELCOME_MSG || 'Your learning journey continues here.',
    NO_RESOURCES: import.meta.env.VITE_STUDENT_NO_RESOURCES_MSG || 'No resources available yet. Check back soon!',
    NO_TUTORS: import.meta.env.VITE_STUDENT_NO_TUTORS_MSG || 'No verified tutors available yet.',
    UPGRADE_TITLE: import.meta.env.VITE_STUDENT_UPGRADE_TITLE || 'Go Premium',
    UPGRADE_DESC: import.meta.env.VITE_STUDENT_UPGRADE_DESC || 'Unlock all resources, AI tools, past papers & more — {price}/month.',
    UPGRADE_BUTTON: import.meta.env.VITE_STUDENT_UPGRADE_BUTTON || 'Upgrade Now — {price}/month',
    UPGRADE_NOTE: import.meta.env.VITE_STUDENT_UPGRADE_NOTE || 'Use your email as payment reference. Activated within 60 min.',
    SIGN_IN_REQUIRED: import.meta.env.VITE_STUDENT_SIGN_IN_MSG || 'Please sign in to access your student dashboard.',
    LOAD_FAILED: import.meta.env.VITE_STUDENT_LOAD_FAILED_MSG || 'Failed to load dashboard data.',
    DELETE_CONFIRM: import.meta.env.VITE_STUDENT_DELETE_CONFIRM_MSG || 'This will permanently delete your student account and all your progress, bookmarks, and data. This action cannot be undone.',
  },
};

// ============================================================
// Sub-Components
// ============================================================

function StatCard({ label, value, icon: Icon, color, subtitle }) {
  return (
    <Card className="border-border hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <CardContent className="pt-5 pb-4">
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="font-playfair text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ResourceItem({ resource, isPremium }) {
  const subject = SUBJECTS.find(s => s.name === resource.subject);
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group">
      <span className="text-base group-hover:scale-110 transition-transform">{subject?.icon || '📄'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{resource.title}</p>
        <p className="text-xs text-muted-foreground">{resource.grade} • {resource.type}</p>
      </div>
      {resource.is_premium && !isPremium && (
        <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
      )}
      {resource.is_premium && isPremium && (
        <Badge className="bg-amber-100 text-amber-700 text-[10px] flex-shrink-0">
          <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Premium
        </Badge>
      )}
    </div>
  );
}

function TutorItem({ tutor, onChat }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors group">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 group-hover:scale-105 transition-transform">
        {tutor.full_name?.[0]?.toUpperCase() || 'T'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{tutor.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {tutor.subjects?.slice(0, 2).join(', ') || 'General'}
          {tutor.subjects?.length > 2 && ` +${tutor.subjects.length - 2}`}
        </p>
      </div>
      {tutor.is_verified && (
        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] flex-shrink-0">
          ✅ SACE
        </Badge>
      )}
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onChat({ email: tutor.user_email, name: tutor.full_name })}
      >
        <MessageCircle className="w-3.5 h-3.5" /> Chat
      </Button>
    </div>
  );
}

function PremiumUpsell({ price, currency }) {
  const formattedPrice = `${currency}${price}`;
  return (
    <div className="bg-gradient-to-br from-primary via-primary/90 to-green-dark rounded-2xl p-6 text-primary-foreground relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/5 rounded-full blur-2xl" />

      <div className="relative flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Crown className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="font-playfair font-bold text-xl mb-1">{CONFIG.MESSAGES.UPGRADE_TITLE}</p>
          <p className="text-sm text-primary-foreground/80 mb-4">
            {CONFIG.MESSAGES.UPGRADE_DESC.replace('{price}', formattedPrice)}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link to="/premium" className="flex-1">
              <Button size="sm" className="bg-white text-primary hover:bg-white/90 w-full font-semibold">
                {CONFIG.MESSAGES.UPGRADE_BUTTON.replace('{price}', formattedPrice)}
              </Button>
            </Link>
            <Link to="/premium" className="flex-1">
              <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full">
                Learn More
              </Button>
            </Link>
          </div>
          <p className="text-xs text-primary-foreground/60 mt-3">
            {CONFIG.MESSAGES.UPGRADE_NOTE}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function StudentDashboard() {
  const { user } = useOutletContext() || {};
  const { isPremium, isOnTrial, trialDaysLeft, loading: premLoading } = usePremiumAccess(user);
  const [resources, setResources] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [counselorInfo, setCounselorInfo] = useState(null);
  const [counselorChat, setCounselorChat] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ============================================================
  // Load Data
  // ============================================================

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        resourcesResult,
        tutorsResult,
        announcementsResult,
        counselorResult
      ] = await Promise.all([
        supabase
          .from('resources')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(CONFIG.RESOURCES_DISPLAY_LIMIT),

        supabase
          .from('tutor_profiles')
          .select('*')
          .eq('is_verified', true)
          .order('rating', { ascending: false })
          .limit(CONFIG.TUTORS_DISPLAY_LIMIT),

        supabase
          .from('platform_announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
          .from('school_counselors')
          .select('*')
      ]);

      if (resourcesResult.error) throw resourcesResult.error;
      if (tutorsResult.error) throw tutorsResult.error;

      setResources(resourcesResult.data || []);
      setTutors(tutorsResult.data || []);

      // Filter announcements
      if (!announcementsResult.error && announcementsResult.data) {
        const filtered = announcementsResult.data.filter(a => {
          const aud = a.audience || [];
          return aud.includes('all') || aud.includes('student');
        });
        setAnnouncements(filtered);
      }

      // Find counselor
      if (!counselorResult.error && counselorResult.data) {
        const mine = counselorResult.data.find(c => {
          const emails = c.student_emails || [];
          const schoolEmails = (c.schools || []).flatMap(s => s.student_emails || []);
          return emails.includes(user.email) || schoolEmails.includes(user.email);
        });
        if (mine) {
          const school = (mine.schools || []).find(s => (s.student_emails || []).includes(user.email));
          setCounselorInfo({
            email: mine.counselor_email,
            name: mine.counselor_email.split('@')[0],
            schoolName: school?.name || mine.school_name || 'School Counselor',
          });
        }
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(CONFIG.MESSAGES.LOAD_FAILED);
      toast.error(CONFIG.MESSAGES.LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadData();

    // Real-time subscription for tutor updates
    if (!CONFIG.ENABLE_REAL_TIME) return;

    const channel = supabase
      .channel('student-dashboard-tutors')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tutor_profiles' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // ============================================================
  // Handlers
  // ============================================================

  const toggleSection = useCallback((key) => {
    setActiveSection(prev => prev === key ? null : key);
  }, []);

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: 'deleted', updated_at: new Date().toISOString() })
        .eq('email', user.email);

      if (error) throw error;

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Failed to delete account. Please contact support.');
      setDeletingAccount(false);
    }
  };

  // ============================================================
  // Computed Values
  // ============================================================

  const subjectsCount = SUBJECTS.length;
  const formattedPrice = `${CONFIG.PREMIUM_CURRENCY}${CONFIG.STUDENT_PREMIUM_PRICE}`;

  // ============================================================
  // Access Control
  // ============================================================

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <GraduationCap className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Student Dashboard</h2>
          <p className="text-muted-foreground mb-6">{CONFIG.MESSAGES.SIGN_IN_REQUIRED}</p>
          <Button onClick={() => window.location.href = '/login'} className="bg-primary">Sign In</Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // Error State
  // ============================================================

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button onClick={loadData} variant="outline">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-playfair text-3xl font-bold text-foreground">
                Welcome back, {user.full_name?.split(' ')[0] || 'Student'}!
              </h1>
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-muted-foreground mt-1">
              {CONFIG.MESSAGES.WELCOME}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isPremium && !isOnTrial ? (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 gap-1.5 px-3 py-1.5">
                <Star className="w-4 h-4 fill-current" /> Premium Member
              </Badge>
            ) : isOnTrial ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 gap-1.5 px-3 py-1.5">
                <Clock className="w-4 h-4" /> Free Trial — {trialDaysLeft}d left
              </Badge>
            ) : (
              <Link to="/premium">
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-300">
                  <Crown className="w-4 h-4" /> Upgrade — {formattedPrice}/month
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Announcements */}
        {CONFIG.ENABLE_ANNOUNCEMENTS && announcements.length > 0 && (
          <div className="mb-5 space-y-2">
            {announcements.map(a => (
              <AnnouncementBanner key={a.id} announcement={a} />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {CONFIG.ENABLE_QUICK_ACTIONS && (
          <div className="mb-6">
            <StudentQuickActions onAction={toggleSection} activeSection={activeSection} />
          </div>
        )}

        {/* ===== SECTIONS ===== */}

        {/* My Subjects */}
        {activeSection === 'subjects' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-playfair flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" /> My Subjects
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{subjectsCount} subjects</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SUBJECTS.map((subject) => (
                    <Link
                      key={subject.code}
                      to={`/subjects/${subject.code}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-200 group hover:scale-[1.02]"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">{subject.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{subject.category}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* My Progress */}
        {activeSection === 'progress' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="grid sm:grid-cols-3 gap-4">
              <ProgressCharts user={user} />
              <GradeProgressTracker user={user} />
              <StudyReminderManager user={user} />
            </div>
            <StudentProgressDashboard user={user} />
            <SyllabusTopicTracker user={user} />
            <StudyHeatmap user={user} />
          </div>
        )}

        {/* AI Tools */}
        {activeSection === 'ai' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="AI Study Planner">
              <AIStudyPlanner user={user} />
            </DashboardPremiumGate>
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="AI Study Assistant">
              <AIStudyAssistant user={user} />
            </DashboardPremiumGate>
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Interactive Flashcards">
              <InteractiveFlashcards />
            </DashboardPremiumGate>
          </div>
        )}

        {/* Goals & Badges */}
        {activeSection === 'goals' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <WeeklyGoals user={user} />
            <div className="grid sm:grid-cols-2 gap-4">
              <MilestoneBadges user={user} />
              <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Study Gamification">
                <StudyGamification user={user} />
              </DashboardPremiumGate>
            </div>
          </div>
        )}

        {/* Simulations */}
        {activeSection === 'simulations' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <SimulationLab isTutor={false} />
          </div>
        )}

        {/* Bookmarks */}
        {activeSection === 'bookmarks' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <ResourceBookmarks user={user} />
          </div>
        )}

        {/* Messages */}
        {activeSection === 'messages' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {counselorInfo && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4 px-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                      {counselorInfo.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{counselorInfo.schoolName}</p>
                      <p className="text-xs text-muted-foreground">Your school counselor is available to chat</p>
                    </div>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => setCounselorChat(true)}>
                    <MessageCircle className="w-3.5 h-3.5" /> Message Counselor
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-playfair flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" /> Message a Tutor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tutors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {CONFIG.MESSAGES.NO_TUTORS}
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tutors.map(t => (
                      <TutorItem key={t.id} tutor={t} onChat={setActiveChat} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Discussion Board">
              <DiscussionBoard user={user} />
            </DashboardPremiumGate>
          </div>
        )}

        {/* Applications */}
        {activeSection === 'applications' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="University Application Tracker">
              <ApplicationTracker userEmail={user?.email} />
            </DashboardPremiumGate>
          </div>
        )}

        {/* ===== DEFAULT OVERVIEW ===== */}
        {!activeSection && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Subjects"
                value={subjectsCount}
                icon={BookOpen}
                color="bg-primary/10 text-primary"
                subtitle="CAPS Aligned"
              />
              <StatCard
                label="Grades"
                value="10–12"
                icon={GraduationCap}
                color="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                subtitle="FET Phase"
              />
              <StatCard
                label="Resources"
                value={resources.length}
                icon={TrendingUp}
                color="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                subtitle={resources.length > 0 ? 'Available now' : 'Coming soon'}
              />
              <StatCard
                label="Status"
                value={isPremium ? (isOnTrial ? 'Trial' : 'Premium') : 'Free'}
                icon={Star}
                color="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                subtitle={isPremium ? 'Active' : 'Upgrade available'}
              />
            </div>

            {/* Recent Resources */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-playfair flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Recent Resources
                  </CardTitle>
                  {resources.length > 0 && (
                    <Link to="/search" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                      View all <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {CONFIG.MESSAGES.NO_RESOURCES}
                  </p>
                ) : (
                  resources.slice(0, 5).map((r) => (
                    <ResourceItem key={r.id} resource={r} isPremium={isPremium} />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Premium Upsell */}
            {!isPremium && (
              <PremiumUpsell price={CONFIG.STUDENT_PREMIUM_PRICE} currency={CONFIG.PREMIUM_CURRENCY} />
            )}

            {/* Account Deletion */}
            <div className="border border-destructive/20 rounded-2xl p-5 bg-destructive/5">
              <p className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2" disabled={deletingAccount}>
                    <Trash2 className="w-4 h-4" /> Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {CONFIG.MESSAGES.DELETE_CONFIRM}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deletingAccount ? 'Deleting...' : 'Yes, delete my account'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chats */}
      {activeChat && (
        <LiveTutorChat
          user={user}
          tutorEmail={activeChat.email}
          tutorName={activeChat.name}
          onClose={() => setActiveChat(null)}
        />
      )}
      {counselorChat && counselorInfo && (
        <CounselorChat
          user={user}
          counselorEmail={counselorInfo.email}
          counselorName={counselorInfo.name}
          schoolName={counselorInfo.schoolName}
          onClose={() => setCounselorChat(false)}
        />
      )}
    </div>
  );
}
