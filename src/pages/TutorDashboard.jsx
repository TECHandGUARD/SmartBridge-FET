// src/pages/TutorDashboard.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookOpen, CheckCircle, FileText, Star, Trash2, Upload, ShieldCheck, Loader2,
  Users, TrendingUp, DollarSign, Calendar, Clock, MessageCircle,
  Award, Sparkles, Zap, Crown, Bell, Settings, HelpCircle,
  BarChart3, Briefcase, GraduationCap, Target, Rocket, Gift, AlertTriangle
} from 'lucide-react';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import DashboardPremiumGate from '@/components/ui/DashboardPremiumGate';
import { toast } from 'sonner';

import TutorQuickActions from '@/components/tutor/TutorQuickActions';
import UpcomingSessionsWidget from '@/components/tutor/UpcomingSessionsWidget';
import ResourceTemplateUploader from '@/components/tutor/ResourceTemplateUploader';
import TutorAvailabilityManager from '@/components/tutor/TutorAvailabilityManager';
import BookingCalendar from '@/components/tutor/BookingCalendar';
import MeetingLinks from '@/components/tutor/MeetingLinks';
import StudentCRM from '@/components/tutor/StudentCRM';
import TutorStudentProgressChart from '@/components/tutor/TutorStudentProgressChart';
import TutorEarningsDashboard from '@/components/tutor/TutorEarningsDashboard';
import TutorBusinessSummary from '@/components/tutor/TutorBusinessSummary';
import ChatInbox from '@/components/tutor/ChatInbox';
import BookingRequests from '@/components/tutor/BookingRequests';
import TutorReviews from '@/components/tutor/TutorReviews';
import TutorProfileEditor from '@/components/tutor/TutorProfileEditor';
import TutorVerificationBadge from '@/components/tutor/TutorVerificationBadge';
import SimulationLab from '@/components/simulations/SimulationLab';
import QuizBuilder from '@/components/quiz/QuizBuilder';
import LessonPlanner from '@/components/tutor/LessonPlanner';
import { AnnouncementBanner } from '@/components/admin/AnnouncementManager';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================
const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  TUTOR_PRO_PRICE: Number(import.meta.env.VITE_TUTOR_PRO_PRICE) || 150,
  PREMIUM_CURRENCY: import.meta.env.VITE_PREMIUM_CURRENCY || 'R',
  COMMISSION_PERCENTAGE: Number(import.meta.env.VITE_TUTOR_COMMISSION_PERCENTAGE) || 10,
  COMMISSION_FLAT_FEE: Number(import.meta.env.VITE_TUTOR_COMMISSION_FLAT_FEE) || 20,
  YOCO_TUTOR_PRO_LINK: import.meta.env.VITE_YOCO_TUTOR_PRO_LINK || 'https://pay.yoco.com/r/78MMPk',
  PAYOUT_DAY: import.meta.env.VITE_PAYOUT_DAY || 'Thursday',
  
  // ✅ NEW: Real-time & Debounce Settings
  DEBOUNCE_DELAY: Number(import.meta.env.VITE_TUTOR_DEBOUNCE_DELAY) || 2000,
  POLLING_INTERVAL: Number(import.meta.env.VITE_TUTOR_POLLING_INTERVAL) || 300000,
  
  // Feature flags
  ENABLE_REAL_TIME: import.meta.env.VITE_ENABLE_TUTOR_REAL_TIME !== 'false',
  ENABLE_ANNOUNCEMENTS: import.meta.env.VITE_ENABLE_TUTOR_ANNOUNCEMENTS !== 'false',
  ENABLE_POLLING: import.meta.env.VITE_TUTOR_ENABLE_POLLING !== 'false',
  ENABLE_LOGGING: import.meta.env.VITE_TUTOR_ENABLE_LOGGING !== 'false',
  
  MESSAGES: {
    WELCOME: import.meta.env.VITE_TUTOR_WELCOME_MSG || 'Your professional tutoring workspace — everything in one place.',
    NO_RESOURCES: import.meta.env.VITE_TUTOR_NO_RESOURCES_MSG || 'No resources uploaded yet. Start sharing your knowledge!',
    PENDING_VERIFICATION: import.meta.env.VITE_TUTOR_PENDING_VERIFICATION_MSG || 'Your tutor profile is currently under review by our admin team. You\'ll receive an email once verified.',
    VERIFICATION_TIMING: import.meta.env.VITE_TUTOR_VERIFICATION_TIMING_MSG || 'Verification typically takes 1–2 business days.',
    SIGN_IN_REQUIRED: import.meta.env.VITE_TUTOR_SIGN_IN_MSG || 'Please sign in to access your tutor dashboard.',
    ACCESS_DENIED: import.meta.env.VITE_TUTOR_ACCESS_DENIED_MSG || 'This area is for verified tutors only.',
    UPGRADE_TITLE: import.meta.env.VITE_TUTOR_UPGRADE_TITLE || 'Go Tutor Pro — {price}/month',
    UPGRADE_DESC: import.meta.env.VITE_TUTOR_UPGRADE_DESC || 'Eliminate the {commission}% platform commission on all your bookings. Featured listing + advanced analytics.',
    UPGRADE_NOTE: import.meta.env.VITE_TUTOR_UPGRADE_NOTE || 'Use your email as reference on Yoco. Activated by Admin within 60 min.',
    LOAD_FAILED: import.meta.env.VITE_TUTOR_LOAD_FAILED_MSG || 'Failed to load dashboard data.',
    LOADING: import.meta.env.VITE_TUTOR_LOADING_MSG || 'Loading your dashboard...',
    REFRESH: import.meta.env.VITE_TUTOR_REFRESH_BTN || 'Refresh',
    REFRESHING: import.meta.env.VITE_TUTOR_REFRESHING_BTN || 'Refreshing...',
    RESOURCE_DELETED: import.meta.env.VITE_TUTOR_RESOURCE_DELETED_MSG || 'Resource deleted.',
    RESOURCE_DELETE_ERROR: import.meta.env.VITE_TUTOR_RESOURCE_DELETE_ERROR_MSG || 'Failed to delete resource.',
    RESOURCE_UPLOADED: import.meta.env.VITE_TUTOR_RESOURCE_UPLOADED_MSG || '📄 New resource uploaded successfully!',
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

function ResourcesList({ resources, onDelete }) {
  if (resources.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="text-center py-8">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">{CONFIG.MESSAGES.NO_RESOURCES}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-playfair flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          My Uploaded Resources ({resources.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {resources.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors group">
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">{r.title}</p>
                  {r.is_premium && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
                      <Star className="w-3 h-3 fill-current" /> Premium
                    </Badge>
                  )}
                  {r.is_featured && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                      <Sparkles className="w-2.5 h-2.5" /> Featured
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{r.subject} • {r.grade} • {r.type}</p>
                {r.download_count > 0 && (
                  <p className="text-[10px] text-muted-foreground">📥 {r.download_count} downloads</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {r.file_url && (
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-primary text-xs h-8">View</Button>
                  </a>
                )}
                <Button size="sm" variant="ghost" className="text-destructive h-8 hover:bg-destructive/10" onClick={() => onDelete(r.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UpgradeCard({ price, currency, commission, link }) {
  const formattedPrice = `${currency}${price}`;

  return (
    <div className="bg-gradient-to-r from-primary/10 to-green-dark/10 border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-playfair font-bold text-lg text-foreground">
            {CONFIG.MESSAGES.UPGRADE_TITLE.replace('{price}', formattedPrice)}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {CONFIG.MESSAGES.UPGRADE_DESC.replace('{commission}', commission)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {CONFIG.MESSAGES.UPGRADE_NOTE}
          </p>
        </div>
        <a href={link} target="_blank" rel="noopener noreferrer">
          <Button className="bg-primary gap-2 whitespace-nowrap hover:shadow-lg transition-all duration-300">
            <Star className="w-4 h-4 fill-current" /> Upgrade to Pro
          </Button>
        </a>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function TutorDashboard() {
  const { user } = useOutletContext() || {};
  const { isPremium, isOnTrial, trialDaysLeft, loading: premLoading } = usePremiumAccess(user);
  
  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // 🛡️ Guard Rails for Infinite Loop Protection
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ============================================================
  // Load Data (with AbortController & Mount Protection)
  // ============================================================
  const loadData = useCallback(async (targetEmail, isManualRefresh = false) => {
    if (!targetEmail || isFetchingRef.current) return;

    // If it's a manual refresh, set refreshing state
    if (isManualRefresh) {
      setRefreshing(true);
    }

    isFetchingRef.current = true;
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // 1. Load announcements
      let fetchedAnnouncements = [];
      if (CONFIG.ENABLE_ANNOUNCEMENTS) {
        const { data: announcementData, error: announcementError } = await supabase
          .from('platform_announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!announcementError && announcementData) {
          fetchedAnnouncements = announcementData.filter(a => {
            const aud = a.audience || [];
            return aud.includes('all') || aud.includes('tutor');
          });
        }
      }

      // 2. Load tutor profile
      const profileQuery = supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_email', targetEmail)
        .maybeSingle();

      // 3. Load resources
      const resourcesQuery = supabase
        .from('resources')
        .select('*')
        .eq('tutor_email', targetEmail)
        .order('created_at', { ascending: false });

      const [profileRes, resourcesRes] = await Promise.all([profileQuery, resourcesQuery]);

      if (profileRes.error) throw profileRes.error;
      if (resourcesRes.error) throw resourcesRes.error;

      if (isMountedRef.current) {
        setAnnouncements(fetchedAnnouncements);
        setProfile(profileRes.data);
        setResources(resourcesRes.data || []);
      }

    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Error loading tutor dashboard:', err);
        setError(CONFIG.MESSAGES.LOAD_FAILED);
        toast.error(CONFIG.MESSAGES.LOAD_FAILED);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  }, []);

  // ============================================================
  // Effects & Real-time Subscriptions (with Debouncing)
  // ============================================================
  useEffect(() => {
    isMountedRef.current = true;

    if (user?.email) {
      // Initial load
      loadData(user.email);

      if (!CONFIG.ENABLE_REAL_TIME) return;

      // ✅ FIXED: Debounced handler to prevent infinite loops
      const handleRealtimeChange = (payload) => {
        // Clear any pending debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        
        // Set a new debounce timer
        debounceTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && !isFetchingRef.current) {
            // Handle the specific change
            if (payload.eventType === 'INSERT') {
              setResources(prev => [payload.new, ...prev]);
              toast.info(CONFIG.MESSAGES.RESOURCE_UPLOADED);
            } else if (payload.eventType === 'UPDATE') {
              setResources(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
            } else if (payload.eventType === 'DELETE') {
              setResources(prev => prev.filter(r => r.id !== payload.old.id));
            } else {
              // For other changes, reload full data
              loadData(user.email);
            }
          }
          debounceTimerRef.current = null;
        }, CONFIG.DEBOUNCE_DELAY);
      };

      const channel = supabase
        .channel(`tutor_resources_${user.email}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'resources',
            filter: `tutor_email=eq.${user.email}`,
          },
          handleRealtimeChange
        )
        .subscribe();

      // Polling fallback (every 5 minutes)
      let pollingFallback = null;
      if (CONFIG.ENABLE_POLLING) {
        pollingFallback = setInterval(() => {
          if (isMountedRef.current && !isFetchingRef.current) {
            loadData(user.email);
          }
        }, CONFIG.POLLING_INTERVAL);
      }

      return () => {
        isMountedRef.current = false;
        
        // Clear debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        
        if (pollingFallback) {
          clearInterval(pollingFallback);
        }
        
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          // Channel already removed
        }
      };
    }
  }, [user?.email, loadData]);

  // ============================================================
  // Handlers
  // ============================================================
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setResources(prev => prev.filter(r => r.id !== id));
      toast.success(CONFIG.MESSAGES.RESOURCE_DELETED);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(CONFIG.MESSAGES.RESOURCE_DELETE_ERROR);
    }
  };

  const toggleSection = useCallback((key) => {
    setActiveSection(prev => prev === key ? null : key);
  }, []);

  // ============================================================
  // Access Control & Layout States
  // ============================================================
  const authorizedRoles = useMemo(() => ['tutor', 'sace_tutor', 'student_tutor', 'admin'], []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Tutor Dashboard</h2>
          <p className="text-muted-foreground mb-6">{CONFIG.MESSAGES.SIGN_IN_REQUIRED}</p>
          <Button onClick={() => window.location.href = '/login'} className="bg-primary">Sign In</Button>
        </div>
      </div>
    );
  }

  if (user.role === 'tutor_pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="font-playfair text-2xl font-bold mb-2">Application Submitted</h2>
          <p className="text-muted-foreground mb-3">{CONFIG.MESSAGES.PENDING_VERIFICATION}</p>
          <p className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            ⏳ {CONFIG.MESSAGES.VERIFICATION_TIMING}
          </p>
        </div>
      </div>
    );
  }

  if (!authorizedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <BookOpen className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">{CONFIG.MESSAGES.ACCESS_DENIED}</p>
          <Button onClick={() => window.location.href = '/'} variant="outline">Return Home</Button>
        </div>
      </div>
    );
  }

  if (loading && resources.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">{CONFIG.MESSAGES.LOADING}</p>
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
            <Button onClick={() => loadData(user.email, true)} variant="outline">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // Computed Values
  // ============================================================
  const totalDownloads = resources.reduce((sum, r) => sum + (Number(r.download_count) || 0), 0);
  const premiumResources = resources.filter(r => r.is_premium).length;
  const freeResources = resources.filter(r => !r.is_premium).length;
  const isVerified = profile?.is_verified || false;
  const hasSace = profile?.sace_number || false;
  const formattedPrice = `${CONFIG.PREMIUM_CURRENCY}${CONFIG.TUTOR_PRO_PRICE}`;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header with Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-playfair text-3xl font-bold text-foreground">
                Welcome back, {user.full_name?.split(' ')[0] || 'Tutor'}!
              </h1>
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-muted-foreground mt-1">{CONFIG.MESSAGES.WELCOME}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => loadData(user.email, true)} 
              disabled={refreshing}
              className="gap-1.5"
            >
              <Loader2 className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? CONFIG.MESSAGES.REFRESHING : CONFIG.MESSAGES.REFRESH}
            </Button>
            {isVerified && (
              hasSace ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> SACE Verified
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Admin Verified
                </Badge>
              )
            )}
            {isPremium && !isOnTrial ? (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 gap-1.5">
                <Star className="w-3.5 h-3.5 fill-current" /> Pro Member
              </Badge>
            ) : isOnTrial ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 gap-1.5">
                <Star className="w-3.5 h-3.5" /> Free Trial — {trialDaysLeft}d left
              </Badge>
            ) : null}
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
        <div className="mb-6">
          <TutorQuickActions onAction={toggleSection} activeSection={activeSection} />
        </div>

        {/* ===== SECTIONS CONTENT ===== */}
        {activeSection === 'upload' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <ResourceTemplateUploader user={user} onUploaded={() => loadData(user.email)} />
            <ResourcesList resources={resources} onDelete={handleDelete} />
          </div>
        )}

        {activeSection === 'availability' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TutorAvailabilityManager user={user} />
              <MeetingLinks user={user} />
              <TutorVerificationBadge user={user} profile={profile} onProfileUpdate={setProfile} />
            </div>
            <BookingCalendar user={user} />
          </div>
        )}

        {activeSection === 'students' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <TutorStudentProgressChart user={user} />
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Student CRM">
              <StudentCRM user={user} />
            </DashboardPremiumGate>
          </div>
        )}

        {activeSection === 'earnings' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <TutorBusinessSummary user={user} />
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Earnings Dashboard">
              <TutorEarningsDashboard user={user} />
            </DashboardPremiumGate>
          </div>
        )}

        {activeSection === 'messages' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <ChatInbox user={user} />
          </div>
        )}

        {activeSection === 'bookings' && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <BookingRequests user={user} />
          </div>
        )}

        {activeSection === 'reviews' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <TutorReviews tutorEmail={user?.email} />
            {profile && <TutorProfileEditor profile={profile} user={user} onProfileUpdate={setProfile} />}
          </div>
        )}

        {activeSection === 'sessions' && (
          <div className="mb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <UpcomingSessionsWidget user={user} />
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Lesson Planner">
              <LessonPlanner user={user} />
            </DashboardPremiumGate>
            <SimulationLab isTutor={true} />
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Quiz Builder">
              <QuizBuilder user={user} />
            </DashboardPremiumGate>
          </div>
        )}

        {/* ===== DEFAULT OVERVIEW ===== */}
        {!activeSection && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Uploads" value={resources.length} icon={Upload} color="bg-primary/10 text-primary" subtitle={resources.length > 0 ? 'Resources shared' : 'Start uploading'} />
              <StatCard label="Premium Resources" value={premiumResources} icon={Star} color="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" subtitle={`${premiumResources} of ${resources.length}`} />
              <StatCard label="Free Resources" value={freeResources} icon={BookOpen} color="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" subtitle={`${freeResources} available`} />
              <StatCard label="Total Downloads" value={totalDownloads} icon={TrendingUp} color="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" subtitle={`${totalDownloads} total`} />
            </div>

            <UpcomingSessionsWidget user={user} />

            {profile && !profile.is_premium && (
              <UpgradeCard price={CONFIG.TUTOR_PRO_PRICE} currency={CONFIG.PREMIUM_CURRENCY} commission={CONFIG.COMMISSION_PERCENTAGE} link={CONFIG.YOCO_TUTOR_PRO_LINK} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
