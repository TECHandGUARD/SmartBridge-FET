import SponsorshipPanel from '@/components/admin/SponsorshipPanel';
import LegalDocumentsPanel from '@/components/admin/LegalDocumentsPanel';
import SubscriptionPricingPanel from '@/components/admin/SubscriptionPricingPanel';
import StudyModerationPanel from '@/components/admin/StudyModerationPanel';
import OperationsPanel from '@/components/admin/OperationsPanel';
import PaymentGatewayPanel from '@/components/admin/PaymentGatewayPanel';
import UniversityDirectoryAdmin from '@/components/admin/UniversityDirectoryAdmin';
import {getAdminNotificationEmails} from '@/lib/admin-notifications';
import {createClientReporter} from '@/lib/monitoring';
// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Settings, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',

// ✅ PAGINATION CONFIGURATION FOR 200,000+ USERS
  PAGINATION: {
    DEFAULT_PAGE_SIZE: Number(import.meta.env.VITE_ADMIN_PAGE_SIZE) || 50,
    MAX_PAGE_SIZE: Number(import.meta.env.VITE_ADMIN_MAX_PAGE_SIZE) || 100,
    ENABLE_VIRTUAL_SCROLL: import.meta.env.VITE_ENABLE_VIRTUAL_SCROLL !== 'false',
  },

  // ✅ DATA LOADING STRATEGY
  DATA_LOADING: {
    INITIAL_LOAD: Number(import.meta.env.VITE_ADMIN_INITIAL_LOAD) || 50,
    BATCH_SIZE: Number(import.meta.env.VITE_ADMIN_BATCH_SIZE) || 100,
    MAX_TOTAL: Number(import.meta.env.VITE_ADMIN_MAX_TOTAL) || 10000,
  },

  MESSAGES: {
    LOADING: import.meta.env.VITE_ADMIN_LOADING_MSG || 'Loading dashboard...',
    ACCESS_DENIED: import.meta.env.VITE_ADMIN_ACCESS_DENIED_MSG || 'Access Denied',
    ACCESS_DENIED_DESC: import.meta.env.VITE_ADMIN_ACCESS_DENIED_DESC || 'This area is restricted to administrators only.',
    REFRESH: import.meta.env.VITE_ADMIN_REFRESH_BTN || 'Refresh',
    REFRESHING: import.meta.env.VITE_ADMIN_REFRESHING_BTN || 'Refreshing...',
    NO_DATA: import.meta.env.VITE_ADMIN_NO_DATA_MSG || 'No data found.',
    ERROR_LOADING: import.meta.env.VITE_ADMIN_ERROR_LOADING || 'Failed to load dashboard data',
    COMPONENT_ERROR: import.meta.env.VITE_ADMIN_COMPONENT_ERROR || 'Failed to load this panel. Please try again.',
    LOADING_MORE: import.meta.env.VITE_ADMIN_LOADING_MORE || 'Loading more...',
    NO_MORE: import.meta.env.VITE_ADMIN_NO_MORE || 'No more records to load.',
  },

  FEATURES: {
    ENABLE_REAL_TIME: import.meta.env.VITE_ADMIN_ENABLE_REAL_TIME !== 'false',
    ENABLE_POLLING: import.meta.env.VITE_ADMIN_ENABLE_POLLING !== 'false',
    ENABLE_EMAIL_TEST: import.meta.env.VITE_ADMIN_ENABLE_EMAIL_TEST !== 'false',
    ENABLE_EXPORT: import.meta.env.VITE_ADMIN_ENABLE_EXPORT !== 'false',
    ENABLE_PAGINATION: import.meta.env.VITE_ADMIN_ENABLE_PAGINATION !== 'false',
  },

  REALTIME: {
    DEBOUNCE_DELAY: Number(import.meta.env.VITE_ADMIN_DEBOUNCE_DELAY) || 3000,
    POLLING_INTERVAL: Number(import.meta.env.VITE_ADMIN_POLLING_INTERVAL) || 300000,
  },

  CURRENCY: import.meta.env.VITE_PREMIUM_CURRENCY || 'R',
};

// ============================================================
// 🛡️ Error Boundary for Subcomponents
// ============================================================

class SubComponentErrorBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){createClientReporter(supabase)('render_error');}
  render(){
    if(this.state.failed) return <Card role="alert"><CardContent className="py-6"><p>{CONFIG.MESSAGES.COMPONENT_ERROR}</p><Button type="button" onClick={()=>this.setState({failed:false})}>Retry</Button></CardContent></Card>;
    return this.props.children;
  }
}

function SafeSubComponent({ children }) {
  return (
    <SubComponentErrorBoundary>
      {children}
    </SubComponentErrorBoundary>
  );
}

// ============================================================
// 📊 Paginated Users Table Component
// ============================================================

function PaginatedUsersTable({ users, totalCount, loading, onLoadMore, hasMore }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    return users.filter(u =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="font-playfair">
            Registered Users ({totalCount.toLocaleString()})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs h-8 text-xs"
            />
            <Badge variant="outline" className="text-xs">
              Showing {users.length} of {totalCount.toLocaleString()}
            </Badge>
          </div>
        </div>
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
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-4 font-medium">{u.full_name || '—'}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground text-xs">{u.email}</td>
                  <td className="py-2.5 pr-4">
                    <Badge variant="outline" className="text-xs capitalize">{u.role || 'user'}</Badge>
                  </td>
                  <td className="py-2.5">
                    {u.is_premium ? (
                      <Badge className="bg-amber-100 text-amber-700 text-xs gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" /> Premium
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Free</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">{CONFIG.MESSAGES.NO_DATA}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Button */}
        {hasMore && !searchTerm && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {CONFIG.MESSAGES.LOADING_MORE}
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5" />
                  Load More Users
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Sub-Panel Component Imports
// ============================================================

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
import AssessmentModerationPanel from '@/components/admin/AssessmentModerationPanel';
import AnnouncementManager from '@/components/admin/AnnouncementManager';
import KnowledgeBaseManager from '@/components/admin/KnowledgeBaseManager';
import SystemConfigPanel from '@/components/admin/SystemConfigPanel';

// ============================================================
// Main Component
// ============================================================

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();

  // ---------- State ----------
  const [users, setUsers] = useState([]);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [usersPage, setUsersPage] = useState(0);

  const [tutors, setTutors] = useState([]);
  const [resources, setResources] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [bannerClicks, setBannerClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Email test state
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);

  // ---------- Architectural Guard Rails ----------
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ---------- Load User Count (for pagination) ----------
  const loadUserCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      if (isMountedRef.current) {
        setTotalUserCount(count || 0);
      }
    } catch (err) {
      console.error('Error loading user count:', err);
    }
  }, []);

  // ---------- Load Dashboard Data (Paginated) ----------
  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (!user?.email) return;

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManualRefresh) {
      setRefreshing(true);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const PAGE_SIZE = CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;

    try {
      // 1. Load User Count (once)
      if (totalUserCount === 0) {
        await loadUserCount();
      }

      // 2. Load First Batch of Users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (usersError) throw usersError;

      setUsers(usersData || []);
      setHasMoreUsers((usersData?.length || 0) >= PAGE_SIZE);
      setUsersPage(1);

      // 3. Load Other Data (limited counts)
      const [
        { data: tutorsData, error: tutorsError },
        { data: resourcesData, error: resourcesError },
        { data: subsData, error: subsError },
        { data: bookingsData, error: bookingsError },
        { data: logsData, error: logsError },
        { data: bannerData, error: bannerError }
      ] = await Promise.all([
        supabase.from('tutor_profiles').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('resources').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('subscriptions').select('*').eq('status', 'active').limit(200),
        supabase.from('tutor_bookings').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('banner_clicks').select('*').order('click_timestamp', { ascending: false }).limit(1000)
      ]);

      if (isMountedRef.current) {
        setTutors(tutorsData || []);
        setResources(resourcesData || []);
        setSubscriptions(subsData || []);
        setBookings(bookingsData || []);
        setLogs(logsData || []);
        setBannerClicks(bannerData || []);
      }

    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Error loading admin data:', err);
        toast.error(CONFIG.MESSAGES.ERROR_LOADING + ': ' + err.message);
      }
    } finally {
      if (isMountedRef.current) {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.email, totalUserCount, loadUserCount]);

  // ---------- Load More Users (Pagination) ----------
  const loadMoreUsers = useCallback(async () => {
    if (loadingMore || !hasMoreUsers) return;

    setLoadingMore(true);
    const PAGE_SIZE = CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
    const start = users.length;
    const end = start + PAGE_SIZE - 1;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      if (isMountedRef.current) {
        setUsers(prev => [...prev, ...(data || [])]);
        setHasMoreUsers((data?.length || 0) >= PAGE_SIZE);
        setUsersPage(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error loading more users:', err);
      toast.error('Failed to load more users');
    } finally {
      if (isMountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [users.length, hasMoreUsers, loadingMore]);

  // ---------- Real-time Subscriptions (Debounced) ----------
  useEffect(() => {
    isMountedRef.current = true;

    if (!user?.email) {
      setLoading(false);
      return;
    }

    // Initial load
    loadDashboardData(false);

    const handleRealtimeUpdate = () => {
      if (!CONFIG.FEATURES.ENABLE_REAL_TIME) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      debounceTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && !isFetchingRef.current) {
          loadDashboardData(false);
        }
        debounceTimerRef.current = null;
      }, CONFIG.REALTIME.DEBOUNCE_DELAY);
    };

    const channels = [
      supabase
        .channel('admin-resources')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, handleRealtimeUpdate)
        .subscribe(),

      supabase
        .channel('admin-bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tutor_bookings' }, handleRealtimeUpdate)
        .subscribe(),

      supabase
        .channel('admin-users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, handleRealtimeUpdate)
        .subscribe()
    ];

    let fallbackInterval = null;
    if (CONFIG.FEATURES.ENABLE_POLLING) {
      fallbackInterval = setInterval(() => {
        if (isMountedRef.current && !isFetchingRef.current) {
          loadDashboardData(false);
        }
      }, CONFIG.REALTIME.POLLING_INTERVAL);
    }

    return () => {
      isMountedRef.current = false;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      channels.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      });
    };
  }, [user?.email, loadDashboardData]);

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
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return;

    try {
      const { error } = await supabase
        .from('resources')
        .update({
          is_approved: false,
          is_rejected: true,
          rejected_at: new Date().toISOString(),
          rejected_by: user?.email,
          rejection_reason: reason || 'Not specified'
        })
        .eq('id', resource.id);

      if (error) throw error;

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
    if (!CONFIG.FEATURES.ENABLE_EMAIL_TEST) {
      toast.info('Email testing is disabled.');
      return;
    }

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
          subject: `✅ ${CONFIG.APP_NAME} — Email System Test`,
          text: `This is a test email from the ${CONFIG.APP_NAME} Admin Dashboard.\n\nIf you received this, the email notification system is working correctly.\n\nTime: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} SAST\n\n— ${CONFIG.APP_NAME} System`,
          from_name: CONFIG.APP_NAME
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
    if (!CONFIG.FEATURES.ENABLE_EMAIL_TEST) {
      toast.info('Email testing is disabled.');
      return;
    }

    setTestEmailSending(true);
    try {
      const adminEmails = await getAdminNotificationEmails(supabase);
      await Promise.all(adminEmails.map(async email => {
        const {error} = await supabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject: `🔔 ${CONFIG.APP_NAME} — Admin Notification Test`,
            text: `This is a test of the admin notification system.\n\nYou are receiving this because you are a Super Admin on ${CONFIG.APP_NAME}.\n\nSystem: ONLINE ✅\nTime: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} SAST\n\n— ${CONFIG.APP_NAME} Admin System`,
            from_name: CONFIG.APP_NAME
          }
        });
        if(error) throw error;
      }));

      toast.success('Test emails sent to all admin addresses!');
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

  // ---------- Export Bookings ----------
  const exportBookingsCSV = () => {
    if (!CONFIG.FEATURES.ENABLE_EXPORT) {
      toast.info('Export is disabled.');
      return;
    }

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

  // ---------- Metrics Calculations ----------
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

  // ---------- Access Control Check ----------
  const isSuperAdmin = user?.is_super_admin === true;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">{CONFIG.MESSAGES.LOADING}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">{CONFIG.MESSAGES.ACCESS_DENIED}</h2>
          <p className="text-muted-foreground">{CONFIG.MESSAGES.ACCESS_DENIED_DESC}</p>
          {user && <p className="text-xs text-muted-foreground mt-2">Your role: {user.role || 'none'}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-playfair text-3xl font-bold">{CONFIG.APP_NAME}</h1>
            <p className="text-muted-foreground text-sm">Owner Control Panel — {totalUserCount.toLocaleString()} users</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto gap-1.5"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? CONFIG.MESSAGES.REFRESHING : CONFIG.MESSAGES.REFRESH}
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Users', value: totalUserCount.toLocaleString(), icon: Users, color: 'bg-blue-100 text-blue-700' },
            { label: 'Premium Subs', value: subscriptions.filter(s => s.status === 'active').length, icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
            { label: 'Total Resources', value: resources.length, icon: BookOpen, color: 'bg-primary/10 text-primary' },
            { label: `Revenue (${CONFIG.CURRENCY})`, value: `${CONFIG.CURRENCY}${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-green-100 text-green-700' },
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

        {/* Tabs Grid Navigation */}
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
            <TabsTrigger value="sponsorship">Sponsored tutoring</TabsTrigger>
            <TabsTrigger value="subscription-pricing">Subscription Prices</TabsTrigger>
            <TabsTrigger value="legal-documents">Legal documents</TabsTrigger>
            <TabsTrigger value="payment-gateways">Payment Gateways</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="study-moderation">Study moderation</TabsTrigger>
            <TabsTrigger value="assessment-moderation">Assessment approvals</TabsTrigger>
            <TabsTrigger value="university-directory">Universities</TabsTrigger>
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

          {/* ============================================================
              TAB CONTENT WITH ERROR BOUNDARIES
              ============================================================ */}

          <TabsContent value="registrations">
            <SafeSubComponent>
              <UserRegistrationsPanel />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="verification">
            <SafeSubComponent>
              <TutorVerificationHub />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="users">
            <SafeSubComponent>
              <PaginatedUsersTable
                users={users}
                totalCount={totalUserCount}
                loading={loadingMore}
                onLoadMore={loadMoreUsers}
                hasMore={hasMoreUsers}
              />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="tutors">
            <SafeSubComponent>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-playfair">Tutor Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  {tutorLeaderboard.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">{CONFIG.MESSAGES.NO_DATA}</p>
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
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="earnings">
            <SafeSubComponent>
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
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="payouts">
            <SafeSubComponent>
              <AutomatedBillingPayouts />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="leaderboard">
            <SafeSubComponent>
              <StudentLeaderboard />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="reports">
            <SafeSubComponent>
              <AutoParentReports />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="content">
            <SafeSubComponent>
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
                      <p className="text-center text-muted-foreground py-8 text-sm">{CONFIG.MESSAGES.NO_DATA}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="sponsorship"><SafeSubComponent><SponsorshipPanel /></SafeSubComponent></TabsContent>
          <TabsContent value="subscription-pricing"><SafeSubComponent><SubscriptionPricingPanel /></SafeSubComponent></TabsContent>
          <TabsContent value="legal-documents"><SafeSubComponent><LegalDocumentsPanel /></SafeSubComponent></TabsContent>
          <TabsContent value="payment-gateways"><SafeSubComponent><PaymentGatewayPanel /></SafeSubComponent></TabsContent>
          <TabsContent value="study-moderation"><SafeSubComponent><StudyModerationPanel /></SafeSubComponent></TabsContent>
          <TabsContent value="operations"><SafeSubComponent><OperationsPanel /></SafeSubComponent></TabsContent>
          <TabsContent value="university-directory"><SafeSubComponent><UniversityDirectoryAdmin /></SafeSubComponent></TabsContent>
          <TabsContent value="financial">
            <SafeSubComponent>
              <div className="grid sm:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-playfair text-lg">Premium Subscriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-playfair text-4xl font-bold text-primary">{CONFIG.CURRENCY}{premiumRevenue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {subscriptions.filter(s => s.status === 'active').length} active subscriptions
                    </p>
                    <div className="mt-4 space-y-2">
                      {subscriptions.filter(s => s.status === 'active').slice(0, 8).map(s => (
                        <div key={s.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground text-xs truncate">{s.user_email}</span>
                          <span className="font-medium text-xs">{CONFIG.CURRENCY}{s.amount_paid || '?'} • {s.end_date}</span>
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
                    <p className="font-playfair text-4xl font-bold text-primary">{CONFIG.CURRENCY}{bookingRevenue.toFixed(2)}</p>
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
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="activity">
            <SafeSubComponent>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-playfair">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {logs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">{CONFIG.MESSAGES.NO_DATA}</p>
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
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="ratings">
            <SafeSubComponent>
              <ResourceRatingsPanel />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="caps">
            <SafeSubComponent>
              <CAPSDocumentManager />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="documents">
            <SafeSubComponent>
              <DocumentVerificationPanel />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="opportunities">
            <SafeSubComponent>
              <OpportunitiesContentReview />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="user-viewer">
            <SafeSubComponent>
              <AdminUserViewer users={users} subscriptions={subscriptions} />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="knowledge">
            <SafeSubComponent>
              <KnowledgeBaseManager user={user} />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="announcements">
            <SafeSubComponent>
              <AnnouncementManager />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="assessment-moderation">
            <SafeSubComponent><AssessmentModerationPanel /></SafeSubComponent>
          </TabsContent>

          <TabsContent value="moderation">
            <SafeSubComponent>
              <ContentModerationPanel />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="feature-flags">
            <SafeSubComponent>
              <FeatureFlagPanel />
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="ai-config">
            <SafeSubComponent>
              <Card>
                <CardHeader>
                  <CardTitle className="font-playfair flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-primary" />
                    AI Model Configurations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Configure global AI endpoints and context windows.</p>
                </CardContent>
              </Card>
            </SafeSubComponent>
          </TabsContent>

          <TabsContent value="system">
            <SafeSubComponent>
              <div className="space-y-6">
                <SystemConfigPanel />

                <Card>
                  <CardHeader>
                    <CardTitle className="font-playfair">Email Gateway Integration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="test@example.com"
                        value={testEmailTarget}
                        onChange={(e) => setTestEmailTarget(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button onClick={sendTestEmail} disabled={testEmailSending} className="gap-1.5">
                        {testEmailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send Test
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={sendBothAdminTestEmails} disabled={testEmailSending} className="gap-1.5">
                        Send to Super Admins
                      </Button>
                    </div>

                    <div className="rounded-xl border border-border p-4 bg-muted/30">
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Test Logs</h4>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {emailLogs.map((log, i) => (
                          <div key={i} className="text-xs flex justify-between items-center border-b border-border/40 pb-1">
                            <span className="font-mono text-muted-foreground">To: {log.to}</span>
                            <span className="text-[10px] text-muted-foreground">{log.time}</span>
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">{log.status}</Badge>
                          </div>
                        ))}
                        {emailLogs.length === 0 && <p className="text-xs text-muted-foreground italic">No logs yet.</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SafeSubComponent>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
