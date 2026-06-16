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
    if (!user?.id) return;
    verifyAdminCredentials();
  }, [user]);

  // SECURE POLICY: Check admin status from database profile records
  const verifyAdminCredentials = async () => {
    try {
      setLoading(true);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role_tier, is_super_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (profile && (profile.role_tier === 'Admin' || profile.is_super_admin)) {
        setIsAdminAuthorized(true);
        await compileSystemTelemetryMetrics();
      } else {
        setIsAdminAuthorized(false);
      }
    } catch (err) {
      console.error('Security evaluation pipeline crash:', err);
      setIsAdminAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const compileSystemTelemetryMetrics = async () => {
    try {
      // Execute optimized record counting operations straight from PostgreSQL index trees
      const [usersCount, tutorsCount, bookingsQuery, subsQuery] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role_tier', 'Tutor'),
        supabase.from('tutor_bookings').select('amount, status'),
        supabase.from('subscriptions').select('plan_tier, status')
      ]);

      const totalUsers = usersCount.count || 0;
      const activeTutors = tutorsCount.count || 0;
      
      const totalBookings = bookingsQuery.data?.length || 0;
      const activeSubsCount = subsQuery.data?.filter(s => s.status === 'active' && s.plan_tier === 'premium').length || 0;
      
      // Calculate dynamic R20 subscription matrix weights
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

      // Call secure Supabase Edge Function routing logic
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans select-none antialiased space-y-5">
      
      {/* Dashboard Section Title Panel Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Master Administration Panel</h2>
            <p className="text-xs text-slate-400">Institutional campus oversight & telemetry array</p>
          </div>
        </div>
        <Button size="sm" onClick={compileSystemTelemetryMetrics} className="h-8 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:text-blue-600 shadow-sm gap-1" variant="outline">
          <RefreshCw className="w-3.5 h-3.5" /> Re-sync Logs
        </Button>
      </div>

      {/* Numerical Counter Metric Card Trays Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Learners</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">{metrics.totalUsers}</p>
        </Card>
        <Card className="bg-white border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified Instructors</span>
            <BookOpen className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">{metrics.activeTutors}</p>
        </Card>
        <Card className="bg-white border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Subscription Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">R {metrics.premiumRevenue}</p>
        </Card>
        <Card className="bg-white border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings Executed</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">{metrics.totalBookings}</p>
        </Card>
      </div>

      {/* Main Structural Multifaceted Operations Management Tabs Layout Ribbon */}
      <Tabs defaultValue="users" className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="users" className="text-xs font-bold gap-1 data-[state=active]:bg-white data-[state=active]:text-blue-600">
            <Users className="w-3.5 h-3.5" /> Users Vault
          </TabsTrigger>
          <TabsTrigger value="verification" className="text-xs font-bold gap-1 data-[state=active]:bg-white data-[state=active]:text-blue-600">
            <Shield className="w-3.5 h-3.5" /> SACE Audit
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs font-bold gap-1 data-[state=active]:bg-white data-[state=active]:text-blue-600">
            <Database className="w-3.5 h-3.5" /> Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="financial" className="text-xs font-bold gap-1 data-[state=active]:bg-white data-[state=active]:text-blue-600">
            <DollarSign className="w-3.5 h-3.5" /> Financial Matrix
          </TabsTrigger>
          <TabsTrigger value="communications" className="text-xs font-bold gap-1 data-[state=active]:bg-white data-[state=active]:text-blue-600">
            <Mail className="w-3.5 h-3.5" /> Communications
          </TabsTrigger>
          <TabsTrigger value="flags" className="text-xs font-bold gap-1 data-[state=active]:bg-white data-[state=active]:text-blue-600">
            <TrendingUp className="w-3.5 h-3.5" /> Gating Flags
          </TabsTrigger>
        </TabsList>

        {/* Tab Content 1: User Analytics Viewer */}
        <TabsContent value="users" className="space-y-4">
          <UserRegistrationsPanel />
          <AdminUserViewer />
        </TabsContent>

        {/* Tab Content 2: SACE Educator Verification Hubs */}
        <TabsContent value="verification">
          <TutorVerificationHub />
          <DocumentVerificationPanel />
        </TabsContent>

        {/* Tab Content 3: Curriculum Repository & Resource Approvals Panel */}
        <TabsContent value="knowledge" className="space-y-4">
          <KnowledgeBaseManager />
          <ResourceRatingsPanel />
          <ContentModerationPanel />
          <CAPSDocumentManager />
          <OpportunitiesContentReview />
        </TabsContent>

        {/* Tab Content 4: Financial Transactions Billing & Ledger Logs */}
        <TabsContent value="financial" className="space-y-4">
          <AutomatedBillingPayouts />
          <TutorEarningsTable />
          <StudentLeaderboard />
          <AutoParentReports />
        </TabsContent>

        {/* Tab Content 5: System Communication Routers & Broadcast Alerts */}
        <TabsContent value="communications" className="space-y-4">
          <AnnouncementManager />
          
          {/* Communication Mail Router Integrations Diagnostic Tester Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" /> Mail Router Diagnostic Console
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  type="email" 
                  placeholder="admin@school.co.za" 
                  value={testEmailTarget} 
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  className="h-9 text-xs border-slate-200"
                />
                <Button 
                  onClick={handleSendTelemetryTestEmail} 
                  disabled={testEmailSending} 
                  className="h-9 px-4 gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                >
                  {testEmailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Dispatch
                </Button>
              </div>
              {emailLogs.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto border-t border-slate-100 pt-2">
                  {emailLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-600 truncate max-w-32">{log.to}</span>
                      <span className="text-slate-400">{log.time}</span>
                      <span className={`font-bold ${log.status.includes('✅') ? 'text-emerald-600' : log.status.includes('❌') ? 'text-red-500' : 'text-amber-500'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content 6: Feature flags & System Environment Toggles */}
        <TabsContent value="flags" className="space-y-4">
          <FeatureFlagPanel />
          <SystemConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}