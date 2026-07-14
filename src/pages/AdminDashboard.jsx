// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
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
  BarChart2, Trophy, UserCheck, GraduationCap, ToggleLeft, ShieldCheck,
  Settings, CheckCircle, XCircle, ExternalLink, Clock, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// Sub-Panel Component Imports
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

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const SUPER_ADMIN_EMAILS = [
  import.meta.env.VITE_ADMIN_EMAIL_1 || 'aneleqamata95@gmail.com',
  import.meta.env.VITE_ADMIN_EMAIL_2 || 'aneleq@techandguard.co.za'
];

// ============================================================
// Main Component
// ============================================================

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // ---------- State ----------
  const [users, setUsers] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [resources, setResources] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [bannerClicks, setBannerClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Email test state
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);

  // ---------- Load Dashboard Data ----------
  const loadDashboardData = useCallback(async () => {
    if (!user?.email) return;
    setRefreshing(true);
    
    try {
      // ✅ FIXED: users table (not user_profiles)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch tutors from tutor_profiles
      const { data: tutorsData, error: tutorsError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (tutorsError) throw tutorsError;
      setTutors(tutorsData || []);

      // Fetch resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (resourcesError) throw resourcesError;
      setResources(resourcesData || []);

      // Fetch subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .limit(200);
      
      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      // ✅ FIXED: activity_log (not activity_logs)
      const { data: logsData, error: logsError } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (logsError) throw logsError;
      setLogs(logsData || []);

      // ✅ FIXED: banner_clicks with click_timestamp
      const { data: bannerData, error: bannerError } = await supabase
        .from('banner_clicks')
        .select('*')
        .order('click_timestamp', { ascending: false })
        .limit(1000);
      
      if (bannerError) throw bannerError;
      setBannerClicks(bannerData || []);

    } catch (err) {
      console.error('Error loading admin data:', err);
      toast.error('Failed to load admin data: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email]);

  // ---------- Real-time Subscriptions ----------
  useEffect(() => {
    loadDashboardData();

    // Subscribe to real-time changes
    const channels = [
      supabase
        .channel('admin-resources')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'resources' },
          () => loadDashboardData()
        )
        .subscribe(),
      
      supabase
        .channel('admin-bookings')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'tutor_bookings' },
          () => loadDashboardData()
        )
        .subscribe(),
      
      // ✅ FIXED: users (not user_profiles)
      supabase
        .channel('admin-users')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          () => loadDashboardData()
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [loadDashboardData]);

  // ---------- Resource Approval/Rejection ----------
  const handleApproveResource = async (resource) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({ 
          is_approved: true, 
          is_rejected: false,
          approved_at: new Date().toISOString(),
          approved_by: user?.email
        })
        .eq('id', resource.id);

      if (error) throw error;

      // ✅ FIXED: activity_log (not activity_logs)
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'resource_approved',
          user_email: user?.email,
          description: `Approved: "${resource.title}" by ${user?.email}`
        });

      setResources(prev => 
        prev.map(r => r.id === resource.id ? { ...r, is_approved: true, is_rejected: false } : r)
      );
      
      toast.success(`✅ "${resource.title}" approved`);
    } catch (err) {
      console.error('Error approving resource:', err);
      toast.error('Failed to approve resource');
    }
  };

  const handleRejectResource = async (resource) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({ 
          is_approved: false, 
          is_rejected: true,
          rejected_at: new Date().toISOString(),
          rejected_by: user?.email,
          rejection_reason: prompt('Please provide a reason for rejection:') || 'Not specified'
        })
        .eq('id', resource.id);

      if (error) throw error;

      // ✅ FIXED: activity_log (not activity_logs)
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'resource_rejected',
          user_email: user?.email,
          description: `Rejected: "${resource.title}" by ${user?.email}`
        });

      setResources(prev => 
        prev.map(r => r.id === resource.id ? { ...r, is_approved: false, is_rejected: true } : r)
      );
      
      toast.warning(`❌ "${resource.title}" rejected`);
    } catch (err) {
      console.error('Error rejecting resource:', err);
      toast.error('Failed to reject resource');
    }
  };

  // ---------- Email Test ----------
  const sendTestEmail = async () => {
    if (!testEmailTarget.trim()) {
      toast.error('Enter an email address.');
      return;
    }
    
    setTestEmailSending(true);
    const logEntry = { 
      to: testEmailTarget, 
      time: new Date().toLocaleTimeString('en-ZA'), 
      status: 'sending' 
    };
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
      
      setEmailLogs(prev => prev.map((e, i) => 
        i === 0 ? { ...e, status: 'sent ✅' } : e
      ));
      
      toast.success(`Test email sent to ${testEmailTarget}`);
      setTestEmailTarget('');
    } catch (err) {
      setEmailLogs(prev => prev.map((e, i) => 
        i === 0 ? { ...e, status: `failed ❌: ${err.message}` } : e
      ));
      toast.error(`Failed: ${err.message}`);
    } finally {
      setTestEmailSending(false);
    }
  };

  const sendBothAdminTestEmails = async () => {
    setTestEmailSending(true);
    try {
      await Promise.all(SUPER_ADMIN_EMAILS.map(email =>
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
        { to: SUPER_ADMIN_EMAILS.join(' & '), time: new Date().toLocaleTimeString('en-ZA'), status: 'sent ✅' },
        ...prev
      ]);
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setTestEmailSending(false);
    }
  };

  // ---------- Export Bookings ----------
  const exportBookingsCSV = () => {
    const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    
    if (confirmed.length === 0) {
      toast.info('No confirmed bookings to export');
      return;
    }

    const headers = ['Student', 'Tutor', 'Subject', 'Date', 'Time', 'Hours', 'Amount', 'Status'];
    const rows = confirmed.map(b => [
      b.student_email,
      b.tutor_name || b.tutor_email,
      b.subject,
      b.date,
      b.time,
      b.duration_hours || 1,
      b.total_amount || b.amount || 0,
      b.status
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${confirmed.length} bookings`);
  };

  // ---------- Calculations ----------
  const premiumRevenue = subscriptions
    .filter(s => s.plan === 'premium' || s.plan_type === 'premium')
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

  // ---------- Loading & Access Control ----------
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user?.email) || user?.is_super_admin === true;
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <Button 
            size="sm" 
            variant="outline" 
            className="ml-auto gap-1.5"
            onClick={loadDashboardData}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> 
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-100 text-blue-700' },
            { label: 'Premium Subs', value: subscriptions.filter(s => s.status === 'active').length, icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
            { label: 'Total Resources', value: resources.length, icon: BookOpen, color: 'bg-primary/10 text-primary' },
            { label: 'Revenue (ZAR)', value: `R${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-green-100 text-green-700' },
            { label: 'Banner Clicks', value: bannerClicks.length, icon: TrendingUp, color: 'bg-purple-100 text-purple-700' }
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
                                <Badge className="bg-amber-100 text-amber-700 text-xs gap-1">
                                  <Star className="w-2.5 h-2.5 fill-current" /> Premium
                                </Badge> :
                                <Badge variant="secondary" className="text-xs">Free</Badge>
                              }
                            </td>
                          </tr>
                        );
                      })}
                      {users.length === 0 && (
                        <tr><td colSpan="4" className="text-center py-8 text-muted-foreground">No users found.</td></tr>
                      )}
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
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-amber-400 text-white' : 
                          i === 1 ? 'bg-gray-300 text-gray-700' : 
                          i === 2 ? 'bg-orange-300 text-white' : 
                          'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </span>
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
                        {t.is_verified && (
                          <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                            <CheckCircle className="w-3 h-3" /> SACE ✓
                          </Badge>
                        )}
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
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-playfair text-base flex items-center justify-between">
                    Bulk Booking Export
                    <Button size="sm" className="bg-primary gap-1.5 text-xs" onClick={exportBookingsCSV}>
                      <FileText className="w-3.5 h-3.5" /> Export CSV
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Exports all confirmed & completed bookings with student, tutor, subject, date, amount data.
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length} bookings ready to export.
                  </p>
                </CardContent>
              </Card>
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
                      <div className="flex-shrink-0">
                        {r.is_approved && !r.is_rejected && (
                          <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                            <CheckCircle className="w-3 h-3" /> Approved
                          </Badge>
                        )}
                        {r.is_rejected && (
                          <Badge className="bg-red-100 text-red-700 text-xs gap-1">
                            <XCircle className="w-3 h-3" /> Rejected
                          </Badge>
                        )}
                        {!r.is_approved && !r.is_rejected && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2 gap-1 text-xs text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => handleApproveResource(r)}
                          disabled={r.is_approved}
                        >
                          <CheckCircle className="w-3 h-3" /> Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2 gap-1 text-xs text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => handleRejectResource(r)}
                          disabled={r.is_rejected}
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {resources.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">No resources uploaded yet.</p>
                  )}
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
                  <p className="font-playfair text-4xl font-bold text-primary">R{premiumRevenue.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {subscriptions.filter(s => s.status === 'active').length} active subscriptions
                  </p>
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
                  <p className="font-playfair text-4xl font-bold text-primary">R{bookingRevenue.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length} confirmed sessions
                  </p>
                  <div className="mt-4 space-y-2">
                    {bookings.slice(0, 8).map(b => (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs truncate">{b.student_email} → {b.tutor_email}</span>
                        <Badge className={`text-xs ${
                          b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                          b.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                          'bg-muted text-muted-foreground'
                        }`}>
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
                        <span className="text-xl flex-shrink-0">
                          {log.event_type === 'user_joined' ? '🧑‍🎓' : 
                           log.event_type === 'payment_made' ? '💳' : 
                           log.event_type === 'resource_uploaded' ? '📄' : 
                           log.event_type === 'resource_approved' ? '✅' :
                           log.event_type === 'resource_rejected' ? '❌' : '📌'}
                        </span>
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

          {/* Remaining tabs */}
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
            <Opportunities
