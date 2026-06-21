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
  BookOpen, Mail, Send, Loader2, RefreshCw, Star, Megaphone, Database, Cpu
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

// ✅ Hardcoded admin emails as fallback
const ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // Asynchronous Database Metric Counters States
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeTutors: 0,
    premiumRevenue: 0,
    totalBookings: 0
  });

  const [loading, setLoading] = useState(true);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);

  useEffect(() => {
    if (!user?.email) return;
    verifyAdminCredentials();
  }, [user]);

  // SECURE POLICY: Check admin status from database profile records
  const verifyAdminCredentials = async () => {
    try {
      setLoading(true);
      
      // ✅ FIX: Use user_profiles table, query by email, use 'role' column
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, is_super_admin')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        // Fallback: check hardcoded admin emails
        if (ADMIN_EMAILS.includes(user.email)) {
          setIsAdminAuthorized(true);
          await compileSystemTelemetryMetrics();
          setLoading(false);
          return;
        }
        setIsAdminAuthorized(false);
        setLoading(false);
        return;
      }

      // Check if user is admin via database or hardcoded list
      const isAdmin = ADMIN_EMAILS.includes(user.email) ||
                      profile?.role === 'admin' ||
                      profile?.is_super_admin === true;

      if (isAdmin) {
        setIsAdminAuthorized(true);
        await compileSystemTelemetryMetrics();
      } else {
        setIsAdminAuthorized(false);
      }
    } catch (err) {
      console.error('Security evaluation pipeline crash:', err);
      // Fallback: hardcoded admin check
      if (ADMIN_EMAILS.includes(user?.email)) {
        setIsAdminAuthorized(true);
        await compileSystemTelemetryMetrics();
      } else {
        setIsAdminAuthorized(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const compileSystemTelemetryMetrics = async () => {
    try {
      // ✅ FIX: Use user_profiles for user counts
      const [usersCount, tutorsCount, bookingsQuery, subsQuery] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'tutor'),
        supabase.from('tutor_bookings').select('amount, status'),
        supabase.from('subscriptions').select('plan_tier, status')
      ]);

      const totalUsers = usersCount.count || 0;
      const activeTutors = tutorsCount.count || 0;
      const totalBookings = bookingsQuery.data?.length || 0;
      const activeSubsCount = subsQuery.data?.filter(s => s.status === 'active' && s.plan_tier === 'premium').length || 0;
      const premiumRevenue = activeSubsCount * 20;

      setMetrics({ totalUsers, activeTutors, premiumRevenue, totalBookings });
    } catch (err) {
      console.error('Metrics collation engine exception:', err);
    }
  };

  const handleSendTelemetryTestEmail = async () => {
    if (!testEmailTarget.trim()) {
      toast.error('Please specify a destination user email address account.');
      return;
    }
    try {
      setTestEmailSending(true);
      const newLog = { to: testEmailTarget, time: new Date().toLocaleTimeString('en-ZA'), status: 'Processing...' };
      setEmailLogs(prev => [newLog, ...prev]);

      const { error } = await supabase.functions.invoke('send-system-email', {
        body: { 
          to: testEmailTarget.trim(), 
          subject: '✅ SmartBridge FET — Edge Communication Test',
          message: 'System notifications online. Telemetry records bound successfully.'
        }
      });

      if (error) throw error;

      setEmailLogs(prev => prev.map((e, idx) => idx === 0 ? { ...e, status: 'Delivered ✅' } : e));
      toast.success('Transactional mail dispatched successfully.');
      setTestEmailTarget('');
    } catch (err) {
      setEmailLogs(prev => prev.map((e, idx) => idx === 0 ? { ...e, status: 'Failed ❌' } : e));
      toast.error(err.message || 'Mail router delivery failure exception.');
    } finally {
      setTestEmailSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-2 select-none">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Initializing Master Terminal...</span>
      </div>
    );
  }

  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 select-none">
        <Card className="max-w-sm w-full border-slate-200 shadow-xl bg-white text-center p-6 space-y-4">
          <Shield className="w-12 h-12 text-red-500 mx-auto stroke-[1.5]" />
          <div>
            <h3 className="text-base font-bold text-slate-800">Access Request Denied</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Your profile parameters do not match verified credentials necessary to mount administrative console routers.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Rest of the component (JSX) unchanged – keep your existing return statement
  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans select-none antialiased space-y-5">
      {/* ... your existing JSX ... */}
    </div>
  );
}
