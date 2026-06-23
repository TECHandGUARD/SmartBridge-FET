// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, FileText, DollarSign, Activity, Shield, TrendingUp,
  BookOpen, Mail, Send, Loader2, RefreshCw, Star, Megaphone, Database, Cpu,
  BarChart2, Trophy, UserCheck, GraduationCap, ToggleLeft, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

// Sub-Panel Component Imports (these should already be using Supabase)
import TutorEarningsTable from '@/components/admin/TutorEarningsTable';
import StudentLeaderboard from '@/components/admin/StudentLeaderboard';
import AutoParentReports from '@/components/admin/AutoParentReports';
import TutorVerificationHub from '@/components/admin/TutorVerificationHub';
import AutomatedBillingPayouts from '@/components/admin/AutomatedBillingPayouts';
import CAPSDocumentManager from '@/components/admin/CAPSDocumentManager';
import ResourceRatingsPanel from '@/components/admin/ResourceRatingsPanel';
import OpportunitiesContentReview from '@/components/admin/OpportunitiesContentReview';
import DocumentVerificationPanel from '@/components/admin/DocumentVerificationPanel';
import UserRegistrationsPanel from '@/components/admin/UserRegistrationsPanel';
import AdminUserViewer from '@/components/admin/AdminUserViewer';
import FeatureFlagPanel from '@/components/admin/FeatureFlagPanel';
import ContentModerationPanel from '@/components/admin/ContentModerationPanel';
import AnnouncementManager from '@/components/admin/AnnouncementManager';
import KnowledgeBaseManager from '@/components/admin/KnowledgeBaseManager';
import SystemConfigPanel from '@/components/admin/SystemConfigPanel';

// ✅ Hardcoded admin emails
const ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  
  // ---------- State ----------
  const [users, setUsers] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [resources, setResources] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [bannerClicks, setBannerClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Email test state
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);

  // ---------- Load all data ----------
  useEffect(() => {
    if (!user?.email) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch users from user_profiles
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setUsers(usersData || []);

      // Fetch tutors from tutor_profiles
      const { data: tutorsData } = await supabase
        .from('tutor_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setTutors(tutorsData || []);

      // Fetch resources
      const { data: resourcesData } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setResources(resourcesData || []);

      // Fetch subscriptions
      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .limit(200);
      setSubscriptions(subsData || []);

      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from('tutor_bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setBookings(bookingsData || []);

      // Fetch activity logs
      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setLogs(logsData || []);

      // Fetch banner clicks
      const { data: bannerData } = await supabase
        .from('banner_clicks')
        .select('*')
        .order('clicked_at', { ascending: false })
        .limit(1000);
      setBannerClicks(bannerData || []);

    } catch (err) {
      console.error('Error loading admin data:', err);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Helper functions ----------
  const premiumRevenue = subscriptions
    .filter(s => s.plan_type === 'premium' || s.plan === 'premium')
    .reduce((sum, s) => sum + (s.amount_paid || 20), 0);

  const bookingRevenue = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.total_amount || b.amount || 0), 0);

  const totalRevenue = premiumRevenue + bookingRevenue;

  const tutorLeaderboard = tutors.map(t => ({
    ...t,
    uploads: resources.filter(r => r.tutor_email === t.user_email).length,
    bookingCount: bookings.filter(b => b.tutor_email === t.user_email).length,
  })).sort((a, b) => (b.uploads + b.bookingCount) - (a.uploads + a.bookingCount));

  // ---------- Email test ----------
  const sendTestEmail = async () => {
    if (!testEmailTarget.trim()) {
      toast.error('Enter an email address.');
      return;
    }
    setTestEmailSending(true);
    const logEntry = { to: testEmailTarget, time: new Date().toLocaleTimeString('en-ZA'), status: 'sending' };
    setEmailLogs(prev => [logEntry, ...prev]);

    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmailTarget,
          subject: '✅ SmartBridge FET — Email System Test',
          text: `This is a test email from the SmartBridge FET Admin Dashboard.\n\nIf you received this, the email notification system is working correctly.\n\nTime: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} SAST\n\n— SmartBridge FET System\n   Tech & GUARD Pty Ltd`,
          from_name: 'SmartBridge FET'
        }
      });

      if (error) throw error;
      setEmailLogs(prev => prev.map((e, i) => i === 0 ? { ...e, status: 'sent ✅' } : e));
      toast.success(`Test email sent to ${testEmailTarget}`);
      setTestEmailTarget('');
    } catch (err) {
      setEmailLogs(prev => prev.map((e, i) => i === 0 ? { ...e, status: `failed ❌: ${err.message}` } : e));
      toast.error(`Failed: ${err.message}`);
    } finally {
      setTestEmailSending(false);
    }
  };

  const sendBothAdminTestEmails = async () => {
    setTestEmailSending(true);
    const adminEmails = ['aneleq@techandguard.co.za', 'aneleqamata95@gmail.com'];
    try {
      await Promise.all(adminEmails.map(email =>
        supabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject: '🔔 SmartBridge FET — Admin Notification Test',
            text: `This is a test of the admin notification system.\n\nYou are receiving this because you are a Super Admin on SmartBridge FET.\n\nWhen a new tutor registers, you will receive an email like this with their credentials and a link to verify them.\n\nSystem: ONLINE ✅\nTime: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} SAST\n\n— SmartBridge FET Admin System`,
            from_name: 'SmartBridge FET'
          }
        })
      ));
      toast.success('Test emails sent to both admin addresses!');
      setEmailLogs(prev => [
        { to: adminEmails.join(' & '), time: new Date().toLocaleTimeString('en-ZA'), status: 'sent ✅' },
        ...prev
      ]);
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setTestEmailSending(false);
    }
  };

  // ---------- Loading & Access Control ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not admin or super admin, show access denied
  const isSuperAdmin = ADMIN_EMAILS.includes(user?.email) || user?.is_super_admin === true;
  if (!isSuperAdmin && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">This area is restricted to administrators only.</p>
          {user && <p className="text-xs text-muted-foreground mt-2">Your role: {user.role || 'none'}</p>}
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-playfair text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">SmartBridge FET — Owner Control Panel</p>
          </div>
          <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={loadDashboardData}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-100 text-blue-700' },
            { label: 'Premium Subs', value: subscriptions.filter(s => s.status === 'active').length, icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
            { label: 'Total Resources', value: resources.length, icon: BookOpen, color: 'bg-primary/10 text-primary' },
            { label: 'Revenue (ZAR)', value: `R${totalRevenue}`, icon: DollarSign, color: 'bg-green-100 text-green-700' },
            { label: 'Banner Clicks', value: bannerClicks.length, icon: TrendingUp, color: 'bg-tech-guard-blue/20 text-tech-guard-blue' }
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

        {/* Tabs */}
        <Tabs defaultValue="registrations">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="registrations" className="gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Registrations</TabsTrigger>
            <TabsTrigger value="verification" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Tutor Verification</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="tutors" className="gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> Tutor Analytics</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Earnings</TabsTrigger>
            <TabsTrigger value="payouts" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Payouts</TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1.5"><Trophy className="w-3.5 h-3.5" /> Leaderboard</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5"><Mail className="w-3.5 h-3.5" /> Parent Reports</TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Content</TabsTrigger>
            <TabsTrigger value="financial" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Financial</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Activity</TabsTrigger>
            <TabsTrigger value="ratings" className="gap-1.5"><Star className="w-3.5 h-3.5" /> Ratings</TabsTrigger>
            <TabsTrigger value="caps" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> CAPS Docs</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Doc Verification</TabsTrigger>
            <TabsTrigger value="opportunities" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Opportunities</TabsTrigger>
            <TabsTrigger value="user-viewer" className="gap-1.5"><UserCheck className="w-3.5 h-3.5" /> User Viewer</TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1.5"><Database className="w-3.5 h-3.5" /> Knowledge Base</TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Announcements</TabsTrigger>
            <TabsTrigger value="moderation" className="gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Moderation</TabsTrigger>
            <TabsTrigger value="feature-flags" className="gap-1.5"><ToggleLeft className="w-3.5 h-3.5" /> Feature Flags</TabsTrigger>
            <TabsTrigger value="ai-config" className="gap-1.5"><Cpu className="w-3.5 h-3.5" /> AI Config</TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> System Test</TabsTrigger>
          </TabsList>

          {/* ---- Tabs Content ---- */}
          <TabsContent value="registrations">
            <UserRegistrationsPanel />
          </TabsContent>

          <TabsContent value="verification">
            <TutorVerificationHub />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-playfair">Registered Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="text-left py-2 pr-4">Name</th>
                        <th className="text-left py-2 pr-4">Email</th>
                        <th className="text-left py-2 pr-4">Role</th>
                        <th className="text-left py-2">Subscription</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => {
                        const sub = subscriptions.find(s => s.user_email === u.email);
                        return (
                          <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 pr-4 font-medium">{u.full_name || '—'}</td>
                            <td className="py-2.5 pr-4 text-muted-foreground text-xs">{u.email}</td>
                            <td className="py-2.5 pr-4">
                              <Badge variant="outline" className="text-xs capitalize">{u.role || 'user'}</Badge>
                            </td>
                            <td className="py-2.5">
                              {sub && sub.status === 'active' ?
                                <Badge className="bg-amber-100 text-amber-700 text-xs">Premium</Badge> :
                                <Badge variant="secondary" className="text-xs">Free</Badge>
                              }
                            </td>
                          </tr>
                        );
                      })}
                      {users.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-muted-foreground">No users found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tutors">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-playfair">Tutor Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                {tutorLeaderboard.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No tutors yet.</p>
                ) : (
                  <div className="space-y-3">
                    {tutorLeaderboard.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                          {t.full_name?.[0] || 'T'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{t.full_name}</p>
                          <p className="text-xs text-muted-foreground">{t.subjects?.slice(0, 2).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{t.uploads} uploads</p>
                          <p className="text-xs text-muted-foreground">{t.bookingCount} bookings</p>
                        </div>
                        {t.is_verified && <Badge className="bg-green-100 text-green-700 text-xs">SACE ✓</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <div className="space-y-4">
              <TutorEarningsTable tutors={tutors} bookings={bookings} />
            </div>
          </TabsContent>

          <TabsContent value="payouts">
            <AutomatedBillingPayouts />
          </TabsContent>

          <TabsContent value="leaderboard">
            <StudentLeaderboard />
          </TabsContent>

          <TabsContent value="reports">
            <AutoParentReports />
          </TabsContent>

          <TabsContent value="content">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-playfair">Study Materials ({resources.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {resources.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.subject} • {r.grade} • {r.type}</p>
                      </div>
                      {r.is_approved && !r.is_rejected && <Badge className="bg-green-100 text-green-700 text-xs flex-shrink-0">Approved</Badge>}
                      {r.is_rejected && <Badge className="bg-red-100 text-red-700 text-xs flex-shrink-0">Rejected</Badge>}
                      {!r.is_approved && !r.is_rejected && <Badge variant="outline" className="text-xs flex-shrink-0">Pending</Badge>}
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs text-green-700 border-green-200 hover:bg-green-50" onClick={() => { /* approve logic */ }}>Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs text-red-700 border-red-200 hover:bg-red-50" onClick={() => { /* reject logic */ }}>Reject</Button>
                      </div>
                    </div>
                  ))}
                  {resources.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No resources uploaded yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <div className="grid sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-playfair text-lg">Premium Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-playfair text-4xl font-bold text-primary">R{premiumRevenue}</p>
                  <p className="text-sm text-muted-foreground mt-1">{subscriptions.filter(s => s.status === 'active').length} active subscriptions</p>
                  <div className="mt-4 space-y-2">
                    {subscriptions.filter(s => s.status === 'active').slice(0, 8).map(s => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs truncate">{s.user_email}</span>
                        <span className="font-medium text-xs">R{s.amount_paid || '?'} • {s.end_date}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-playfair text-lg">Tutor Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-playfair text-4xl font-bold text-primary">R{bookingRevenue}</p>
                  <p className="text-sm text-muted-foreground mt-1">{bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length} confirmed sessions</p>
                  <div className="mt-4 space-y-2">
                    {bookings.slice(0, 8).map(b => (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs truncate">{b.student_email} → {b.tutor_email}</span>
                        <Badge className={`text-xs ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : b.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                          {b.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-playfair">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                        <span className="text-xl flex-shrink-0">{log.event_type === 'user_joined' ? '🧑‍🎓' : log.event_type === 'payment_made' ? '💳' : log.event_type === 'resource_uploaded' ? '📄' : '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{log.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.user_email} • {log.created_at ? new Date(log.created_at).toLocaleString('en-ZA') : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Remaining tabs – use the same pattern */}
          <TabsContent value="ratings">
            <ResourceRatingsPanel />
          </TabsContent>

          <TabsContent value="caps">
            <CAPSDocumentManager />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentVerificationPanel />
          </TabsContent>

          <TabsContent value="opportunities">
            <OpportunitiesContentReview />
          </TabsContent>

          <TabsContent value="user-viewer">
            <AdminUserViewer users={users} subscriptions={subscriptions} />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeBaseManager user={user} />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementManager />
          </TabsContent>

          <TabsContent value="moderation">
            <ContentModerationPanel />
          </TabsContent>

          <TabsContent value="feature-flags">
            <FeatureFlagPanel />
          </TabsContent>

          <TabsContent value="ai-config">
            <SystemConfigPanel />
          </TabsContent>

          <TabsContent value="system">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="font-playfair flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" /> Email Notification System
                </CardTitle>
                <p className="text-sm text-muted-foreground">Test the email delivery system.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Test Both Admin Addresses</p>
                  <Button onClick={sendBothAdminTestEmails} disabled={testEmailSending} className="bg-primary gap-2">
                    {testEmailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Test to Both Admins
                  </Button>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium mb-2">Send Test to Any Email</p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter any email address..."
                      value={testEmailTarget}
                      onChange={(e) => setTestEmailTarget(e.target.value)}
                    />
                    <Button onClick={sendTestEmail} disabled={testEmailSending} variant="outline" className="gap-1.5">
                      {testEmailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send
                    </Button>
                  </div>
                </div>
                {emailLogs.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Email Log</p>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEmailLogs([])}>
                        <RefreshCw className="w-3 h-3" /> Clear
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {emailLogs.map((log, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                          <span className="text-muted-foreground truncate">{log.to}</span>
                          <span className={log.status.includes('✅') ? 'text-green-600 font-medium' : log.status.includes('❌') ? 'text-red-600' : 'text-amber-600'}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}v
