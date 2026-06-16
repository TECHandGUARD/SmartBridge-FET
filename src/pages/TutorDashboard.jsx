import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, CheckCircle, FileText, Star, Trash2, Upload, ShieldCheck, Loader2 } from 'lucide-react';
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

export default function TutorDashboard() {
  const { user } = useOutletContext() || {};
  const { isPremium, isOnTrial, trialDaysLeft, loading: premLoading } = usePremiumAccess(user);
  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Load announcements
      const { data: announcementData, error: announcementError } = await supabase
        .from('platform_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!announcementError) {
        const filtered = (announcementData || []).filter(a => {
          const aud = a.audience || [];
          return aud.includes('all') || aud.includes('tutor');
        });
        setAnnouncements(filtered);
      }
      
      // Load tutor profile
      const { data: profileData, error: profileError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_email', user.email)
        .maybeSingle();
      
      if (profileError) throw profileError;
      setProfile(profileData);
      
      // Load resources
      const { data: resourceData, error: resourceError } = await supabase
        .from('resources')
        .select('*')
        .eq('tutor_email', user.email)
        .order('created_at', { ascending: false });
      
      if (resourceError) throw resourceError;
      setResources(resourceData || []);
      
    } catch (err) {
      console.error('Error loading tutor dashboard:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Set up real-time subscription for resources
  useEffect(() => {
    loadData();
    
    if (!user?.email) return;
    
    const channel = supabase
      .channel('tutor_resources')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resources',
          filter: `tutor_email=eq.${user.email}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setResources(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setResources(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
          } else if (payload.eventType === 'DELETE') {
            setResources(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, loadData]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource deleted.');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete resource.');
    }
  };

  const toggleSection = (key) => {
    setActiveSection(prev => prev === key ? null : key);
  };

  // ---- Access Control Screens ----
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Tutor Dashboard</h2>
          <p className="text-muted-foreground mb-6">Please sign in to access your tutor dashboard.</p>
          <Button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })} className="bg-primary">Sign In</Button>
        </div>
      </div>
    );
  }

  const authorizedRoles = ['tutor', 'sace_tutor', 'student_tutor', 'admin'];
  if (user.role === 'tutor_pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="font-playfair text-2xl font-bold mb-2">Application Submitted</h2>
          <p className="text-muted-foreground mb-3">Your tutor profile is currently under review by our admin team. You'll receive an email once verified.</p>
          <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl p-3">⏳ Verification typically takes <strong>1–2 business days</strong>.</p>
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
          <p className="text-muted-foreground mb-4">This area is for verified tutors only.</p>
          <Button onClick={() => window.location.href = '/'} variant="outline">Return Home</Button>
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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-foreground">
              Welcome back, {user.full_name?.split(' ')[0] || 'Tutor'} 👋
            </h1>
            <p className="text-muted-foreground mt-1">Your professional tutoring workspace — everything in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Verification Badge - Different for SACE vs Student Tutors */}
            {profile?.is_verified && (
              profile?.sace_number ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> SACE Verified
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Admin Verified
                </Badge>
              )
            )}
            {isPremium && !isOnTrial ? (
              <Badge className="bg-secondary/20 text-amber-700 border-amber-200 gap-1.5">
                <Star className="w-3.5 h-3.5 fill-current" /> Pro Member
              </Badge>
            ) : isOnTrial ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1.5">
                <Star className="w-3.5 h-3.5" /> Free Trial — {trialDaysLeft}d left
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Platform Announcements */}
        {announcements.length > 0 && (
          <div className="mb-5 space-y-2">
            {announcements.map(a => <AnnouncementBanner key={a.id} announcement={a} />)}
          </div>
        )}

        {/* Navigation Hub — sticky */}
        <div className="mb-6">
          <TutorQuickActions onAction={toggleSection} activeSection={activeSection} />
        </div>

        {/* ===== SECTIONS — only active section is shown ===== */}

        {/* Upload Resource (template system) */}
        {activeSection === 'upload' && (
          <div className="mb-6 space-y-4">
            <ResourceTemplateUploader
              user={user}
              onUploaded={loadData}
            />
            <ResourcesList resources={resources} onDelete={handleDelete} />
          </div>
        )}

        {/* Set Availability */}
        {activeSection === 'availability' && (
          <div className="mb-6 space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TutorAvailabilityManager user={user} />
              <MeetingLinks user={user} />
              <TutorVerificationBadge user={user} profile={profile} onProfileUpdate={setProfile} />
            </div>
            <BookingCalendar user={user} />
          </div>
        )}

        {/* My Students */}
        {activeSection === 'students' && (
          <div className="mb-6 space-y-4">
            <TutorStudentProgressChart user={user} />
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Student CRM">
              <StudentCRM user={user} />
            </DashboardPremiumGate>
          </div>
        )}

        {/* View Earnings */}
        {activeSection === 'earnings' && (
          <div className="mb-6 space-y-4">
            <TutorBusinessSummary user={user} />
            <DashboardPremiumGate isPremium={isPremium} isLoading={premLoading} featureName="Earnings Dashboard">
              <TutorEarningsDashboard user={user} />
            </DashboardPremiumGate>
          </div>
        )}

        {/* Messages */}
        {activeSection === 'messages' && (
          <div className="mb-6">
            <ChatInbox user={user} />
          </div>
        )}

        {/* Booking Requests */}
        {activeSection === 'bookings' && (
          <div className="mb-6">
            <BookingRequests user={user} />
          </div>
        )}

        {/* My Reviews + Profile Editor */}
        {activeSection === 'reviews' && (
          <div className="mb-6 space-y-4">
            <TutorReviews tutorEmail={user?.email} />
            {profile && <TutorProfileEditor profile={profile} user={user} onProfileUpdate={setProfile} />}
          </div>
        )}

        {/* Live Sessions */}
        {activeSection === 'sessions' && (
          <div className="mb-6 space-y-4">
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

        {/* Default overview when nothing is selected */}
        {!activeSection && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Uploads', value: resources.length },
                { label: 'Premium Resources', value: resources.filter(r => r.is_premium).length },
                { label: 'Free Resources', value: resources.filter(r => !r.is_premium).length },
                { label: 'Total Downloads', value: resources.reduce((sum, r) => sum + (Number(r.download_count) || 0), 0) },
              ].map(({ label, value }) => (
                <Card key={label} className="border-border">
                  <CardContent className="pt-5 pb-4 text-center">
                    <p className="font-playfair text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Upcoming Sessions */}
            <UpcomingSessionsWidget user={user} />

            {/* Tutor Pro upsell */}
            {profile && !profile.is_premium && (
              <div className="bg-gradient-to-r from-primary/10 to-green-dark/10 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-playfair font-bold text-lg text-foreground">Go Tutor Pro — R150/month</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Eliminate the 10% platform commission on all your bookings. Featured listing + advanced analytics.</p>
                  <p className="text-xs text-muted-foreground mt-1">Use your email as reference on Yoco. Activated by Admin within 60 min.</p>
                </div>
                <a href="https://pay.yoco.com/r/78MMPk" target="_blank" rel="noopener noreferrer">
                  <Button className="bg-primary gap-2 whitespace-nowrap">
                    <Star className="w-4 h-4 fill-current" /> Upgrade to Pro
                  </Button>
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sub-component: Resources List ----
function ResourcesList({ resources, onDelete }) {
  if (resources.length === 0) return null;
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-playfair">My Uploaded Resources ({resources.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {resources.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors">
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{r.title}</p>
                  {r.is_premium && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
                      <Star className="w-3 h-3 fill-current" /> Premium
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{r.subject} • {r.grade} • {r.type}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {r.file_url && (
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-primary text-xs h-8">View</Button>
                  </a>
                )}
                <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => onDelete(r.id)}>
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