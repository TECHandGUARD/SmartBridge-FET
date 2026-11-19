import WorkspaceHeader from '@/components/dashboard/WorkspaceHeader';
import MessagingInbox from '@/components/messaging/MessagingInbox';
import { CounselorSharing } from '@/components/counselor/CounselorAccess';
import useSubscriptionPrices from '@/hooks/useSubscriptionPrices';
import ReleaseGate from '@/components/operations/ReleaseGate';
import { useDashboardSection } from '@/lib/useDashboardSection';
import ParentChildLink from '@/components/parent/ParentChildLink';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Star, TrendingUp, ArrowRight, MessageCircle, Crown, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
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
import AIStudyPlanner from '@/components/student/AIStudyPlanner';
import WeeklyGoals from '@/components/student/WeeklyGoals';
import StudyGamification from '@/components/student/StudyGamification';
import InteractiveFlashcards from '@/components/student/InteractiveFlashcards';
import AIStudyAssistant from '@/components/student/AIStudyAssistant';
import StudentProgressDashboard from '@/components/student/StudentProgressDashboard';
import SyllabusTopicTracker from '@/components/student/SyllabusTopicTracker';
import ApplicationTracker from '@/components/opportunities/ApplicationTracker';
import CounselorChat from '@/components/counselor/CounselorChat';
import { AnnouncementBanner } from '@/components/admin/AnnouncementManager';

export default function StudentDashboard() {
  const { user } = useAuth() || {};
  const subscriptionPrices = useSubscriptionPrices();
  const studentPrice = subscriptionPrices.data?.find(item => item.product === 'student')?.amount_cents / 100;
  const priceLabel = Number.isFinite(studentPrice) ? `R${studentPrice}/month` : 'View current price';
  const { isPremium, isOnTrial, trialDaysLeft, loading: premLoading } = usePremiumAccess(user);
  const [resources, setResources] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [counselorInfo, setCounselorInfo] = useState(null);
  const [counselorChat, setCounselorChat] = useState(false);
  const [activeSection, toggleSection] = useDashboardSection('student');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Load resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (resourcesError) throw resourcesError;

      // Load tutors
      const { data: tutorsData, error: tutorsError } = await supabase
        .from('tutor_directory')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false })
        .limit(10);

      if (tutorsError) throw tutorsError;

      // Load announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('platform_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!announcementsError) {
        const filtered = (announcementsData || []).filter(a => {
          const aud = a.audience || [];
          return aud.includes('all') || aud.includes('student');
        });
        setAnnouncements(filtered);
      }

      // Load counselor info
      const { data: counselorData, error: counselorError } = await supabase
        .from('school_counselors')
        .select('*');

      if (!counselorError) {
        const mine = (counselorData || []).find(c => {
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

      setResources(resourcesData || []);
      setTutors(tutorsData || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      // Update user profile to mark as deleted
      const { error } = await supabase
        .from('users')
        .update({ role: 'deleted', updated_at: new Date().toISOString() })
        .eq('email', user.email);

      if (error) throw error;

      // Sign out
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Failed to delete account. Please contact support.');
      setDeletingAccount(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <GraduationCap className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Student Dashboard</h2>
          <p className="text-muted-foreground mb-6">Please sign in to access your student dashboard.</p>
          <Button onClick={() => window.location.href = '/login'} className="bg-primary">Sign In</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen min-w-0 bg-background py-4 sm:py-8">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-3 sm:px-6 lg:px-8">
        <CounselorSharing userId={user.id} />

        <WorkspaceHeader
          title={<>Welcome back, {user.full_name?.split(' ')[0] || 'Student'}!</>}
          description="Track your progress, plan your study time, and find learning resources."
          actions={<>
            {isPremium && !isOnTrial ? (
              <Badge className="bg-secondary/20 text-amber-700 border-amber-200 gap-1.5 px-3 py-1.5">
                <Star className="w-4 h-4 fill-current" /> Premium Member
              </Badge>
            ) : isOnTrial ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1.5 px-3 py-1.5">
                <Star className="w-4 h-4" /> Free Trial — {trialDaysLeft}d left
              </Badge>
            ) : (
              <Link to="/premium">
                <Button size="sm" className="gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Crown className="w-4 h-4" /> Upgrade — {priceLabel}
                </Button>
              </Link>
            )}
          </>}
        />

        <ParentChildLink user={user} />

        {/* Platform Announcements */}
        {announcements.length > 0 && (
          <div className="mb-5 space-y-2">
            {announcements.map(a => <AnnouncementBanner key={a.id} announcement={a} />)}
          </div>
        )}

        {/* Quick Nav */}
        <div data-tour="dashboard-navigation" className="mb-6">
          <StudentQuickActions onAction={toggleSection} activeSection={activeSection} />
        </div>

        {/* ===== SECTIONS ===== */}

        {/* My Subjects */}
        {activeSection === 'subjects' && (
          <div className="mb-6">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-playfair">My Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SUBJECTS.map((subject) => (
                    <Link key={subject.code} to={`/subjects/${subject.code}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                      <span className="text-xl">{subject.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{subject.category}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* My Progress */}
        {activeSection === 'progress' && (
          <div className="mb-6 space-y-4">
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
          <div className="mb-6 space-y-4">
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="AI Study Planner">
              <AIStudyPlanner user={user} />
            </DashboardPremiumGate>
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="AI Study Assistant">
              <AIStudyAssistant user={user} />
            </DashboardPremiumGate>
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Interactive Flashcards">
              <InteractiveFlashcards user={user} />
            </DashboardPremiumGate>
          </div>
        )}

        {/* Goals & Badges */}
        {activeSection === 'goals' && (
          <div className="mb-6 space-y-4">
            <WeeklyGoals user={user} />
            <div className="grid sm:grid-cols-2 gap-4">
              <MilestoneBadges user={user} />
              <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Study Gamification">
                <StudyGamification user={user} />
              </DashboardPremiumGate>
            </div>
          </div>
        )}

        {/* Science Lab — free for all */}
        {activeSection === 'simulations' && (
          <div className="mb-6">
            <SimulationLab isTutor={false} />
          </div>
        )}

        {/* Bookmarks */}
        {activeSection === 'bookmarks' && (
          <div className="mb-6">
            <ResourceBookmarks user={user} />
          </div>
        )}

        {/* Messages */}
        {activeSection === 'messages' && (
          <div className="mb-6 space-y-4">
            {/* Message Counselor */}
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

            <MessagingInbox user={user}/>
            <Link className="text-sm underline" to="/forum">Open the free community forum</Link>
          </div>
        )}

        {/* University Applications */}
        {activeSection === 'applications' && (
          <div className="mb-6">
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="University Application Tracker">
              <ApplicationTracker userEmail={user?.email} />
            </DashboardPremiumGate>
          </div>
        )}

        {/* Default overview when nothing selected */}
        {!activeSection && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Subjects', value: SUBJECTS.length, icon: BookOpen, color: 'bg-primary/10 text-primary' },
                { label: 'Grades', value: '10–12', icon: GraduationCap, color: 'bg-blue-100 text-blue-700' },
                { label: 'Recent resources', value: resources.length, icon: TrendingUp, color: 'bg-green-100 text-green-700' },
                { label: 'My Status', value: isPremium ? (isOnTrial ? 'Trial' : 'Premium') : 'Free', icon: Star, color: 'bg-amber-100 text-amber-700' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="border-border">
                  <CardContent className="pt-5 pb-4">
                    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}><Icon className="w-4 h-4" /></div>
                    <p className="font-playfair text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Resources */}
            <Card className="border-border">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
                <CardTitle className="font-playfair text-base">Recent Resources</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to="/resources-library">Browse resources</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {resources.length === 0 && <p className="text-sm text-muted-foreground">There are no recent resources to show.</p>}
                {resources.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <span className="text-base">{SUBJECTS.find(s => s.name === r.subject)?.icon || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.grade} • {r.type}</p>
                    </div>
                    {r.is_premium && !isPremium && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        )}
      </div>

      {/* Floating chats */}
      {counselorChat && counselorInfo && (
        <CounselorChat user={user} counselorEmail={counselorInfo.email} counselorName={counselorInfo.name}
          schoolName={counselorInfo.schoolName} onClose={() => setCounselorChat(false)} />
      )}
    </div>
  );
}
