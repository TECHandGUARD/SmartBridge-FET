// src/pages/ParentDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, BookOpen, TrendingUp, Star, ArrowRight, Crown, 
  Loader2, UserPlus, BarChart3, FileText, Calendar, 
  Clock, Award, Shield, ChevronRight, Sparkles, Zap,
  Heart, GraduationCap, Mail, Bell, Settings, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import ParentQuickActions from '@/components/parent/ParentQuickActions';
import DashboardPremiumGate from '@/components/ui/DashboardPremiumGate';
import ParentSummaryReport from '@/components/parent/ParentSummaryReport';
import WeeklyEmailReport from '@/components/parent/WeeklyEmailReport';
import ParentChildLink from '@/components/parent/ParentChildLink';
import ParentProgressDashboard from '@/components/parent/ParentProgressDashboard';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // App name
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

  // Premium pricing
  PARENT_PREMIUM_PRICE: Number(import.meta.env.VITE_PARENT_PREMIUM_PRICE) || 50,
  PREMIUM_CURRENCY: import.meta.env.VITE_PREMIUM_CURRENCY || 'R',

  // Yoco link
  YOCO_PARENT_LINK: import.meta.env.VITE_YOCO_PARENT_LINK || 'https://pay.yoco.com/r/4jppyY',

  // Display limits
  TUTORS_DISPLAY_LIMIT: Number(import.meta.env.VITE_TUTORS_DISPLAY_LIMIT) || 4,

  // Feature flags
  ENABLE_QUICK_ACTIONS: import.meta.env.VITE_ENABLE_PARENT_QUICK_ACTIONS !== 'false',
  ENABLE_REAL_TIME: import.meta.env.VITE_ENABLE_PARENT_REAL_TIME !== 'false',

  // Messages
  MESSAGES: {
    WELCOME: import.meta.env.VITE_PARENT_WELCOME_MSG || 'Monitor your child\'s academic progress and connect with tutors.',
    NO_TUTORS: import.meta.env.VITE_PARENT_NO_TUTORS_MSG || 'No verified tutors available yet. Check back soon!',
    UPGRADE_TITLE: import.meta.env.VITE_PARENT_UPGRADE_TITLE || 'Premium for Your Child',
    UPGRADE_DESC: import.meta.env.VITE_PARENT_UPGRADE_DESC || 'Give your child access to all premium study materials, past papers, AI tools and tutor notes — {price}/month.',
    UPGRADE_BUTTON: import.meta.env.VITE_PARENT_UPGRADE_BUTTON || 'Upgrade to Parent Premium — {price}/month',
    UPGRADE_NOTE: import.meta.env.VITE_PARENT_UPGRADE_NOTE || 'Use your email as reference. Activated by Admin within 60 min.',
    SIGN_IN_REQUIRED: import.meta.env.VITE_PARENT_SIGN_IN_MSG || 'Please sign in to access the parent dashboard.',
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

function TutorCard({ tutor }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-200 group">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 group-hover:scale-105 transition-transform">
        {tutor.full_name?.[0]?.toUpperCase() || 'T'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold group-hover:text-primary transition-colors">{tutor.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {tutor.subjects?.slice(0, 2).join(', ') || 'General Tutoring'}
          {tutor.subjects?.length > 2 && ` +${tutor.subjects.length - 2} more`}
        </p>
      </div>
      {tutor.is_verified && (
        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex-shrink-0 gap-1">
          <Shield className="w-2.5 h-2.5" /> SACE
        </Badge>
      )}
      {tutor.rating > 0 && (
        <Badge variant="outline" className="text-xs flex-shrink-0 gap-0.5">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          {tutor.rating.toFixed(1)}
        </Badge>
      )}
    </div>
  );
}

function PremiumCard({ price, link, title, description, buttonText, note }) {
  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50/30 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-orange-400/10 rounded-full blur-2xl" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <p className="font-playfair font-bold text-lg text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{price}/month</p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full text-white shadow-md hover:shadow-lg transition-all duration-300">
              <Sparkles className="w-4 h-4 mr-2" />
              {buttonText}
            </Button>
          </a>
          <Link to="/premium" className="flex-1">
            <Button variant="outline" className="w-full">
              Learn More
            </Button>
          </Link>
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          {note}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function ParentDashboard() {
  const { user } = useOutletContext() || {};
  const { isPremium, isOnTrial, trialDaysLeft, loading: premLoading } = usePremiumAccess(user);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [childCount, setChildCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);

  // ============================================================
  // Data Loading
  // ============================================================

  const loadDashboardData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load tutors
      const { data: tutorsData, error: tutorsError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false })
        .limit(CONFIG.TUTORS_DISPLAY_LIMIT);

      if (tutorsError) throw tutorsError;
      setTutors(tutorsData || []);

      // Load linked children count
      const { count: childCountData, error: childError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('linked_student_email', user.email);

      if (!childError) {
        setChildCount(childCountData || 0);
      }

      // Load recent activity (bookings from linked children)
      const { data: activityData, error: activityError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('student_email', user.email)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!activityError) {
        setRecentActivity(activityData || []);
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadDashboardData();

    // Real-time subscription for tutor updates
    if (!CONFIG.ENABLE_REAL_TIME) return;

    const channel = supabase
      .channel('parent-dashboard-tutors')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tutor_profiles' },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  // ============================================================
  // Handlers
  // ============================================================

  const toggleSection = useCallback((key) => {
    setActiveSection(prev => prev === key ? null : key);
  }, []);

  // ============================================================
  // Computed Values
  // ============================================================

  const formattedPrice = `${CONFIG.PREMIUM_CURRENCY}${CONFIG.PARENT_PREMIUM_PRICE}`;
  const subjectsCount = SUBJECTS.length;

  // ============================================================
  // Access Control
  // ============================================================

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <Users className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Parent Dashboard</h2>
          <p className="text-muted-foreground mb-6">{CONFIG.MESSAGES.SIGN_IN_REQUIRED}</p>
          <Button onClick={() => window.location.href = '/login'} className="bg-primary">Sign In</Button>
        </div>
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
                Parent Dashboard
              </h1>
              <span className="text-2xl">👨‍👩‍👧</span>
            </div>
            <p className="text-muted-foreground mt-1">
              {CONFIG.MESSAGES.WELCOME}
            </p>
            {childCount > 0 && (
              <p className="text-xs text-primary font-medium mt-1">
                👨‍👩‍👧 Monitoring {childCount} child{childCount !== 1 ? 'ren' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isPremium && !isOnTrial ? (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5 px-3 py-1.5 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                <Star className="w-4 h-4 fill-current" /> Premium Member
              </Badge>
            ) : isOnTrial ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1.5 px-3 py-1.5 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                <Clock className="w-4 h-4" /> Free Trial — {trialDaysLeft}d left
              </Badge>
            ) : (
              <Link to="/premium">
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-300">
                  <Crown className="w-4 h-4" /> Upgrade — {formattedPrice}/month
                </Button>
              </Link>
            )}
            {recentActivity.length > 0 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Bell className="w-3 h-3" /> {recentActivity.length} updates
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Nav */}
        {CONFIG.ENABLE_QUICK_ACTIONS && (
          <div className="mb-6">
            <ParentQuickActions onAction={toggleSection} activeSection={activeSection} />
          </div>
        )}

        {/* ===== SECTIONS ===== */}

        {/* Link Child */}
        {activeSection === 'child' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <ParentChildLink user={user} />
          </div>
        )}

        {/* Progress */}
        {activeSection === 'progress' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Child Progress Dashboard">
              <ParentProgressDashboard user={user} />
            </DashboardPremiumGate>
          </div>
        )}

        {/* Subjects */}
        {activeSection === 'subjects' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-playfair flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  CAPS Subjects Overview
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {subjectsCount} subjects aligned with the South African CAPS curriculum
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {SUBJECTS.map((s) => (
                    <Link key={s.code} to={`/subjects/${s.code}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-all duration-200 group">
                      <span className="text-lg group-hover:scale-110 transition-transform">{s.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.category}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">Gr 10–12</Badge>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Find Tutors */}
        {activeSection === 'tutors' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-playfair flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Top Tutors
                  </CardTitle>
                  <Link to="/tutors" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
                  ))
                ) : tutors.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                    <p className="text-sm text-muted-foreground">{CONFIG.MESSAGES.NO_TUTORS}</p>
                  </div>
                ) : (
                  tutors.map((tutor) => (
                    <TutorCard key={tutor.id} tutor={tutor} />
                  ))
                )}
                <Link to="/tutors">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2 hover:bg-primary/5 transition-colors">
                    Find a Tutor <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reports */}
        {activeSection === 'reports' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Summary Report & Weekly Email">
              <div className="grid sm:grid-cols-2 gap-4">
                <ParentSummaryReport />
                <WeeklyEmailReport parentUser={user} />
              </div>
            </DashboardPremiumGate>
          </div>
        )}

        {/* Premium */}
        {activeSection === 'premium' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300 max-w-lg mx-auto">
            <PremiumCard
              price={formattedPrice}
              link={CONFIG.YOCO_PARENT_LINK}
              title={CONFIG.MESSAGES.UPGRADE_TITLE}
              description={CONFIG.MESSAGES.UPGRADE_DESC.replace('{price}', formattedPrice)}
              buttonText={CONFIG.MESSAGES.UPGRADE_BUTTON.replace('{price}', formattedPrice)}
              note={CONFIG.MESSAGES.UPGRADE_NOTE}
            />
          </div>
        )}

        {/* ===== DEFAULT OVERVIEW ===== */}
        {!activeSection && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard 
                label="Subjects Available" 
                value={subjectsCount} 
                icon={BookOpen} 
                color="bg-primary/10 text-primary"
                subtitle="CAPS Aligned"
              />
              <StatCard 
                label="Verified Tutors" 
                value={tutors.length > 0 ? `${tutors.length}+` : '0'} 
                icon={Users} 
                color="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                subtitle={tutors.length > 0 ? 'Available now' : 'Coming soon'}
              />
              <StatCard 
                label="Grades Covered" 
                value="10–12" 
                icon={TrendingUp} 
                color="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                subtitle="FET Phase"
              />
              <StatCard 
                label="Linked Children" 
                value={childCount} 
                icon={UserPlus} 
                color="bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400"
                subtitle={childCount > 0 ? 'Active monitoring' : 'Add your child'}
              />
            </div>

            {/* Quick Link Child */}
            <ParentChildLink user={user} />

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-playfair flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentActivity.slice(0, 3).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs flex-shrink-0">
                        {activity.tutor_name?.[0] || 'B'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {activity.tutor_name} — {activity.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleDateString('en-ZA')}
                        </p>
                      </div>
                      <Badge className={`text-xs ${
                        activity.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        activity.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Premium Upsell */}
            {!isPremium && (
              <PremiumCard
                price={formattedPrice}
                link={CONFIG.YOCO_PARENT_LINK}
                title={CONFIG.MESSAGES.UPGRADE_TITLE}
                description={CONFIG.MESSAGES.UPGRADE_DESC.replace('{price}', formattedPrice)}
                buttonText={CONFIG.MESSAGES.UPGRADE_BUTTON.replace('{price}', formattedPrice)}
                note={CONFIG.MESSAGES.UPGRADE_NOTE}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
