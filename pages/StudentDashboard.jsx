import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { useOutletContext } from 'react-router-dom';
import { SUBJECTS } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Star, TrendingUp, ArrowRight, Lock, MessageCircle } from 'lucide-react';
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

export default function StudentDashboard() {
  const { user, userProfile } = useOutletContext() || {};
  const [resources, setResources] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch recent resources
        const { data: resourcesData } = await supabase
          .from('resources')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(6);

        setResources(resourcesData || []);

        // Fetch user's subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_email', user.email)
          .eq('status', 'active')
          .maybeSingle();

        setSubscription(subData);

        // Fetch verified tutors
        const { data: tutorsData } = await supabase
          .from('tutor_profiles')
          .select('*')
          .eq('is_verified', true)
          .order('rating', { ascending: false })
          .limit(10);

        setTutors(tutorsData || []);
      } catch (error) {
        console.error('Error fetching student dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const isPremium = subscription?.status === 'active';
  const userFullName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0];

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
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-foreground">
              Welcome back, {userFullName?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">Your learning journey continues here.</p>
          </div>
          {isPremium ? (
            <Badge className="bg-secondary/20 text-amber-700 border-amber-200 gap-1.5 px-3 py-1.5 text-sm">
              <Star className="w-4 h-4 fill-current" /> Premium Member
            </Badge>
          ) : (
            <a href="https://pay.yoco.com/r/2A55BY" target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Star className="w-4 h-4" /> Upgrade — R20/month
              </Button>
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Subjects Available', value: '11', icon: BookOpen, color: 'bg-primary/10 text-primary' },
            { label: 'Grades', value: '10–12', icon: GraduationCap, color: 'bg-blue-100 text-blue-700' },
            { label: 'Resources', value: resources.length, icon: TrendingUp, color: 'bg-green-100 text-green-700' },
            { label: 'My Status', value: isPremium ? 'Premium' : 'Free', icon: Star, color: 'bg-amber-100 text-amber-700' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border">
              <CardContent className="pt-5 pb-4">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="font-playfair text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* My Subjects */}
          <div className="lg:col-span-2">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-playfair">My Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {SUBJECTS.map((subject) => (
                    <Link
                      key={subject.code}
                      to={`/subjects/${subject.code}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <span className="text-xl">{subject.icon}</span>
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

          {/* Progress Charts + Streak */}
          <div className="lg:col-span-3 grid sm:grid-cols-3 gap-6">
            <div className="sm:col-span-1">
              <ProgressCharts user={user} />
            </div>
            <div className="sm:col-span-1">
              <GradeProgressTracker user={user} />
            </div>
            <div className="sm:col-span-1">
              <StudyReminderManager user={user} />
            </div>
            <div className="sm:col-span-1">
              <ResourceBookmarks user={user} />
            </div>
            <div className="sm:col-span-1">
              <MilestoneBadges user={user} />
            </div>
            <div className="sm:col-span-1">
              <StudyGamification user={user} />
            </div>
          </div>

          {/* Progress Dashboard */}
          <div className="lg:col-span-3">
            <StudentProgressDashboard user={user} />
          </div>

          {/* CAPS Topic Mastery Tracker */}
          <div className="lg:col-span-3">
            <SyllabusTopicTracker user={user} />
          </div>

          {/* Study Heatmap */}
          <div className="lg:col-span-3">
            <StudyHeatmap user={user} />
          </div>

          {/* Weekly Goals */}
          <div className="lg:col-span-3">
            <WeeklyGoals user={user} />
          </div>

          {/* AI Study Planner */}
          <div className="lg:col-span-3">
            <AIStudyPlanner user={user} />
          </div>

          {/* Interactive Flashcards */}
          <div className="lg:col-span-3">
            <InteractiveFlashcards />
          </div>

          {/* AI Study Assistant */}
          <div className="lg:col-span-3">
            <AIStudyAssistant user={user} />
          </div>

          {/* Discussion Board */}
          <div className="lg:col-span-3">
            <DiscussionBoard user={user} />
          </div>

          {/* Message a Tutor */}
          <div className="lg:col-span-3">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-playfair flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" /> Message a Tutor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tutors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No verified tutors available yet.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tutors.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {t.full_name?.[0] || 'T'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{t.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.qualifications?.slice(0, 30) || 'General'}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1 flex-shrink-0" onClick={() => setActiveChat({ email: t.user_email, name: t.full_name })}>
                          <MessageCircle className="w-3.5 h-3.5" /> Chat
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Science Simulation Lab */}
          <div className="lg:col-span-3 mb-2">
            <SimulationLab isTutor={false} />
          </div>

          {/* Recent Resources & Premium */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-playfair">Recent Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No resources uploaded yet</p>
                ) : (
                  resources.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <span className="text-base">{SUBJECTS.find(s => s.name === r.subject)?.icon || '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.grade}</p>
                      </div>
                      {r.is_premium && !isPremium && <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {!isPremium && (
              <div className="bg-gradient-to-br from-primary to-green-dark rounded-2xl p-5 text-primary-foreground">
                <Star className="w-6 h-6 fill-secondary text-secondary mb-2" />
                <p className="font-playfair font-bold text-lg mb-1">Go Premium</p>
                <p className="text-sm text-primary-foreground/80 mb-3">Unlock all resources, past papers & more for R20/month.</p>
                <a href="https://pay.yoco.com/r/2A55BY" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full">
                    Upgrade Now — R20/month
                  </Button>
                </a>
                <p className="text-xs text-primary-foreground/60 mt-2">Use your email as payment reference. Activated within 60 min.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating chat window */}
      {activeChat && (
        <LiveTutorChat
          user={user}
          tutorEmail={activeChat.email}
          tutorName={activeChat.name}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
}