import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen, ArrowRight, Star, GraduationCap, Users,
  Bell, TrendingUp, Calendar, FileText, Video, ClipboardList,
  MessageSquare, Briefcase, Award, ChevronRight
} from 'lucide-react';
import PremiumBanner from './PremiumBanner';
import PremiumBadge from '@/components/ui/PremiumBadge';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import TrialBanner from '@/components/ui/TrialBanner';
import { toast } from 'sonner';

// Role-specific nav tiles — only what's relevant
const ROLE_CONFIG = {
  student: {
    greeting: (name) => `Welcome back, ${name?.split(' ')[0] || 'Student'} 👋`,
    subtitle: "Here's what's waiting for you today.",
    color: 'from-primary/10 to-primary/5',
    accentColor: 'text-primary',
    bgAccent: 'bg-primary/10',
    quickLinks: [
      { label: 'My Subjects', path: '/subjects', icon: BookOpen, desc: 'CAPS-aligned content' },
      { label: 'Practice Quizzes', path: '/quiz', icon: ClipboardList, desc: 'Test your knowledge' },
      { label: 'Find a Tutor', path: '/tutors', icon: Users, desc: 'Book 1-on-1 sessions' },
      { label: 'Video Lessons', path: '/videos', icon: Video, desc: 'Watch & learn' },
      { label: 'Study Rooms', path: '/study-rooms', icon: MessageSquare, desc: 'Collaborate with peers' },
      { label: 'Bursaries', path: '/bursaries', icon: Award, desc: 'Find funding' },
      { label: 'Opportunities', path: '/opportunities', icon: Briefcase, desc: 'Universities & more' },
      { label: 'Forum', path: '/forum', icon: MessageSquare, desc: 'Ask & discuss' },
    ],
    dashboardPath: '/student-dashboard',
    dashboardLabel: 'Student Dashboard',
    showPremium: true,
  },
  parent: {
    greeting: (name) => `Hello, ${name?.split(' ')[0] || 'Parent'} 👋`,
    subtitle: "Stay on top of your child's academic journey.",
    color: 'from-amber-50 to-orange-50',
    accentColor: 'text-amber-700',
    bgAccent: 'bg-amber-100',
    quickLinks: [
      { label: 'Progress Report', path: '/parent-dashboard', icon: TrendingUp, desc: "Child's performance" },
      { label: 'Bookings', path: '/bookings', icon: Calendar, desc: 'Tutor sessions' },
      { label: 'Find a Tutor', path: '/tutors', icon: Users, desc: 'Browse verified tutors' },
      { label: 'Bursaries', path: '/bursaries', icon: Award, desc: 'Funding opportunities' },
      { label: 'Opportunities', path: '/opportunities', icon: Briefcase, desc: 'Universities & courses' },
      { label: 'CAPS Documents', path: '/resources-library', icon: FileText, desc: 'Official curriculum docs' },
    ],
    dashboardPath: '/parent-dashboard',
    dashboardLabel: 'Parent Dashboard',
    showPremium: true,
  },
  sace_tutor: {
    greeting: (name) => `Welcome, ${name?.split(' ')[0] || 'Tutor'} 👋`,
    subtitle: 'Manage your sessions, resources, and students.',
    color: 'from-blue-50 to-indigo-50',
    accentColor: 'text-blue-700',
    bgAccent: 'bg-blue-100',
    quickLinks: [
      { label: 'My Bookings', path: '/bookings', icon: Calendar, desc: 'Upcoming sessions' },
      { label: 'Resources', path: '/search', icon: BookOpen, desc: 'Upload & manage' },
      { label: 'Video Lessons', path: '/videos', icon: Video, desc: 'Your uploaded videos' },
      { label: 'Study Rooms', path: '/study-rooms', icon: MessageSquare, desc: 'Host study sessions' },
      { label: 'Forum', path: '/forum', icon: MessageSquare, desc: 'Support students' },
      { label: 'CAPS Docs', path: '/resources-library', icon: FileText, desc: 'Curriculum reference' },
    ],
    dashboardPath: '/tutor-dashboard',
    dashboardLabel: 'Tutor Dashboard',
    showPremium: true,
  },
  student_tutor: {
    greeting: (name) => `Welcome, ${name?.split(' ')[0] || 'Tutor'} 👋`,
    subtitle: 'Manage your sessions, resources, and students.',
    color: 'from-blue-50 to-indigo-50',
    accentColor: 'text-blue-700',
    bgAccent: 'bg-blue-100',
    quickLinks: [
      { label: 'My Bookings', path: '/bookings', icon: Calendar, desc: 'Upcoming sessions' },
      { label: 'Resources', path: '/search', icon: BookOpen, desc: 'Upload & manage' },
      { label: 'Video Lessons', path: '/videos', icon: Video, desc: 'Your uploaded videos' },
      { label: 'Study Rooms', path: '/study-rooms', icon: MessageSquare, desc: 'Host study sessions' },
      { label: 'Forum', path: '/forum', icon: MessageSquare, desc: 'Support students' },
      { label: 'CAPS Docs', path: '/resources-library', icon: FileText, desc: 'Curriculum reference' },
    ],
    dashboardPath: '/tutor-dashboard',
    dashboardLabel: 'Tutor Dashboard',
    showPremium: true,
  },
  admin: {
    greeting: (name) => `Admin Panel — ${name?.split(' ')[0] || 'Admin'} ⚙️`,
    subtitle: 'Full access to all platform features and dashboards.',
    color: 'from-slate-50 to-gray-50',
    accentColor: 'text-slate-700',
    bgAccent: 'bg-slate-100',
    quickLinks: [
      { label: 'Admin Dashboard', path: '/admin', icon: GraduationCap, desc: 'Full control panel' },
      { label: 'CAPS Admin', path: '/caps-admin', icon: BookOpen, desc: 'Manage CAPS content' },
      { label: 'Payout Log', path: '/payout-log', icon: TrendingUp, desc: 'Tutor payouts' },
      { label: 'Forum', path: '/forum', icon: MessageSquare, desc: 'Moderate discussions' },
      { label: 'Student Dashboard', path: '/student-dashboard', icon: GraduationCap, desc: 'View student portal' },
      { label: 'Parent Dashboard', path: '/parent-dashboard', icon: Users, desc: 'View parent portal' },
      { label: 'Tutor Dashboard', path: '/tutor-dashboard', icon: Users, desc: 'View tutor portal' },
      { label: 'Counselor', path: '/counselor', icon: Briefcase, desc: 'School counselor panel' },
      { label: 'Subjects', path: '/subjects', icon: BookOpen, desc: 'Browse subjects' },
      { label: 'Resources', path: '/search', icon: FileText, desc: 'Search resources' },
      { label: 'Tutors', path: '/tutors', icon: Users, desc: 'Browse tutors' },
      { label: 'Videos', path: '/videos', icon: Video, desc: 'Video lessons' },
      { label: 'Practice Quiz', path: '/quiz', icon: ClipboardList, desc: 'Quizzes' },
      { label: 'Study Rooms', path: '/study-rooms', icon: MessageSquare, desc: 'Group study' },
      { label: 'Bursaries', path: '/bursaries', icon: Award, desc: 'Funding opportunities' },
      { label: 'Opportunities', path: '/opportunities', icon: Briefcase, desc: 'Universities & more' },
    ],
    dashboardPath: '/admin',
    dashboardLabel: 'Admin Dashboard',
    showPremium: false,
  },
};

export default function PersonalizedHome({ user }) {
  const [recentResources, setRecentResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isPremium, isOnTrial, trialDaysLeft } = usePremiumAccess(user);
  const isTutor = user?.role === 'sace_tutor' || user?.role === 'student_tutor';
  const userSubjects = isTutor ? (user?.subjects || []) : (user?.subjects || []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load recent approved resources
      let query = supabase
        .from('resources')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(6);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter by user's subjects if they have any set
      let filtered = data || [];
      if (userSubjects.length > 0) {
        filtered = filtered.filter(r => userSubjects.includes(r.subject));
      }
      setRecentResources(filtered.slice(0, 4));
    } catch (err) {
      console.error('Error loading resources:', err);
      // Don't show toast for this - it's not critical for the user
    } finally {
      setLoading(false);
    }
  }, [userSubjects]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const role = user?.role || 'user';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG['student'];

  return (
    <div className="min-h-screen bg-background">
      {isOnTrial && <TrialBanner trialDaysLeft={trialDaysLeft} />}
      {/* Welcome Banner */}
      <section className={`bg-gradient-to-br ${config.color} border-b border-border px-4 sm:px-6 lg:px-8 py-10`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-foreground mb-1">
              {config.greeting(user?.full_name)}
            </h1>
            <p className="text-muted-foreground">{config.subtitle}</p>
            {isPremium && isOnTrial && (
              <Badge className="mt-2 bg-amber-100 text-amber-700 border-amber-300">
                <Star className="w-3 h-3 mr-1 fill-current" /> Free Trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
              </Badge>
            )}
            {isPremium && !isOnTrial && (
              <Badge className="mt-2 bg-secondary/20 text-amber-700 border-amber-300">
                <Star className="w-3 h-3 mr-1" /> Premium Member
              </Badge>
            )}
          </div>
          <Link to={config.dashboardPath}>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shrink-0">
              {config.dashboardLabel} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Quick Access Grid */}
        <section>
          <h2 className="font-playfair text-xl font-bold text-foreground mb-5">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {config.quickLinks.map(({ label, path, icon: Icon, desc }) => (
              <Link
                key={path + label}
                to={path}
                className="group flex flex-col gap-2 bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className={`w-9 h-9 rounded-lg ${config.bgAccent} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${config.accentColor}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors self-end mt-auto" />
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Resources (subject-filtered) */}
        {!loading && recentResources.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-playfair text-xl font-bold text-foreground">
                {userSubjects.length > 0 ? 'Resources for Your Subjects' : 'Recent Resources'}
              </h2>
              <Link to="/search" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentResources.map((res) => (
                <div
                  key={res.id}
                  className="relative bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{res.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{res.subject} • {res.grade}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">{res.type}</Badge>
                    </div>
                  </div>
                  {res.is_premium && !isPremium ? (
                    <div className="mt-3">
                      <PremiumBadge variant="lock" />
                    </div>
                  ) : res.resource_url ? (
                    <a
                      href={res.resource_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Download <ArrowRight className="w-3 h-3" />
                    </a>
                  ) : null}
                  {res.is_premium && (
                    <div className="absolute top-3 right-3">
                      <PremiumBadge variant="badge" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Premium Upsell — only for non-premium, non-admin */}
        {!isPremium && config.showPremium && (
          <PremiumBanner />
        )}
      </div>
    </div>
  );
}