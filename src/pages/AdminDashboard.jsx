import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, BarChart2, FileText, DollarSign, Activity,
  CheckCircle, XCircle, Shield, TrendingUp, BookOpen, Trophy, Mail,
  Send, Loader2, Settings, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import TutorEarningsTable from '@/components/admin/TutorEarningsTable';
import StudentLeaderboard from '@/components/admin/StudentLeaderboard';
import AutoParentReports from '@/components/admin/AutoParentReports';
import TutorVerificationHub from '@/components/admin/TutorVerificationHub';
import AutomatedBillingPayouts from '@/components/admin/AutomatedBillingPayouts';
import CAPSDocumentManager from '@/components/admin/CAPSDocumentManager';
import { Download as DownloadIcon } from 'lucide-react';

export default function AdminDashboard() {
  const { user, userProfile } = useOutletContext() || {};
  const [users, setUsers] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [resources, setResources] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const [bannerClicks, setBannerClicks] = useState([]);

  // Check if user is admin using userProfile.role
  const isAdmin = userProfile?.role === 'admin' || user?.email === 'aneleq@techandguard.co.za' || user?.email === 'aneleqamata95@gmail.com';

  useEffect(() => {
    if (!user || !isAdmin) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [usersRes, tutorsRes, resourcesRes, subscriptionsRes, bookingsRes, logsRes, bannerClicksRes] = await Promise.all([
          supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('tutor_profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('resources').select('*').order('created_at', { ascending: false }),
          supabase.from('subscriptions').select('*').eq('status', 'active'),
          supabase.from('tutor_bookings').select('*').order('created_at', { ascending: false }),
          supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('banner_clicks').select('*').order('clicked_at', { ascending: false }).limit(1000),
        ]);

        setUsers(usersRes.data || []);
        setTutors(tutorsRes.data || []);
        setResources(resourcesRes.data || []);
        setSubscriptions(subscriptionsRes.data || []);
        setBookings(bookingsRes.data || []);
        setLogs(logsRes.data || []);
        setBannerClicks(bannerClicksRes.data || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin]);

  // Admin access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">This area is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  // Approve resource
  const approveResource = async (r) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({ is_approved: true, is_rejected: false })
        .eq('id', r.id);
      
      if (error) throw error;
      
      setResources(prev => prev.map(x => x.id === r.id ? { ...x, is_approved: true, is_rejected: false } : x));
      
      // Log activity
      await supabase.from('activity_logs').insert({
        event_type: 'resource_approved',
        user_email: user.email,
        description: `Approved: "${r.title}"`
      }).catch(() => {});
      
      toast.success('Resource approved.');
    } catch (error) {
      toast.error('Failed to approve resource');
    }
  };

  // Reject resource
  const rejectResource = async (r) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({ is_approved: false, is_rejected: true })
        .eq('id', r.id);
      
      if (error) throw error;
      
      setResources(prev => prev.map(x => x.id === r.id ? { ...x, is_rejected: true } : x));
      
      await supabase.from('activity_logs').insert({
        event_type: 'resource_rejected',
        user_email: user.email,
        description: `Rejected: "${r.title}"`
      }).catch(() => {});
      
      toast.error('Resource rejected.');
    } catch (error) {
      toast.error('Failed to reject resource');
    }
  };

  // Send test email (Note: Supabase doesn't have built-in email sending)
  const sendTestEmail = async () => {
    if (!testEmailTarget.trim()) { toast.error('Enter an email address.'); return; }
    setTestEmailSending(true);
    const logEntry = { to: testEmailTarget, time: new Date().toLocaleTimeString('en-ZA'), status: 'sending' };
    setEmailLogs(prev => [logEntry, ...prev]);
    
    // For now, show a message that email sending needs to be configured
    setTimeout(() => {
      setEmailLogs(prev => prev.map((e, i) => i === 0 ? { ...e, status: '⚠️ Email service not configured. Use Resend or SendGrid.' } : e));
      toast.warning('Email service not configured. Please set up Resend or SendGrid.');
      setTestEmailSending(false);
    }, 1000);
  };

  const sendBothAdminTestEmails = async () => {
    setTestEmailSending(true);
    setTimeout(() => {
      toast.warning('Email service not configured. Please set up Resend or SendGrid.');
      setEmailLogs(prev => [{
        to: 'aneleq@techandguard.co.za, aneleqamata95@gmail.com',
        time: new Date().toLocaleTimeString('en-ZA'),
        status: '⚠️ Email service not configured'
      }, ...prev]);
      setTestEmailSending(false);
    }, 500);
  };

  // Calculate revenue
  const premiumRevenue = subscriptions.reduce((sum, s) => sum + (s.amount_paid || 50), 0);
  const bookingRevenue = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Tutor leaderboard
  const tutorLeaderboard = tutors.map(t => ({
    ...t,
    uploads: resources.filter(r => r.uploaded_by === t.id).length,
    bookingCount: bookings.filter(b => b.tutor_email === t.user_email).length,
  })).sort((a, b) => (b.uploads + b.bookingCount) - (a.uploads + a.bookingCount));

  const logIcon = (type) => {
    if (type === 'user_joined') return '🧑‍🎓';
    if (type === 'payment_made') return '💳';
    if (type === 'resource_uploaded') return '📄';
    if (type === 'booking_made') return '📅';
    if (type === 'resource_approved') return '✅';
    if (type === 'resource_rejected') return '❌';
    return '📌';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

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
            <p className="text-muted-foreground text-sm">EduConnect FET — Owner Control Panel</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-100 text-blue-700' },
            { label: 'Premium Subs', value: subscriptions.length, icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
            { label: 'Total Resources', value: resources.length, icon: BookOpen, color: 'bg-primary/10 text-primary' },
            { label: 'Revenue (ZAR)', value: `R${premiumRevenue + bookingRevenue}`, icon: DollarSign, color: 'bg-green-100 text-green-700' },
            { label: 'Banner Clicks', value: bannerClicks.length, icon: TrendingUp, color: 'bg-tech-guard-blue/20 text-tech-guard-blue' },
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

        <Tabs defaultValue="verification">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="verification" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Verification</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="tutors" className="gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> Tutor Analytics</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Earnings</TabsTrigger>
            <TabsTrigger value="payouts" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Payouts</TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1.5"><Trophy className="w-3.5 h-3.5" /> Leaderboard</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5"><Mail className="w-3.5 h-3.5" /> Parent Reports</TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Content</TabsTrigger>
            <TabsTrigger value="financial" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Financial</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Activity</TabsTrigger>
            <TabsTrigger value="caps" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> CAPS Docs</TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> System Test</TabsTrigger>
          </TabsList>

          {/* VERIFICATION HUB */}
          <TabsContent value="verification">
            <TutorVerificationHub />
          </TabsContent>

          {/* USERS */}
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
                              {sub?.status === 'active'
                                ? <Badge className="bg-amber-100 text-amber-700 text-xs">Premium</Badge>
                                : <Badge variant="secondary" className="text-xs">Free</Badge>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {users.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No users yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TUTOR ANALYTICS */}
          <TabsContent value="tutors">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-playfair">Tutor Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tutorLeaderboard.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                        {t.full_name?.[0] || 'T'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{t.full_name}</p>
                        <p className="text-xs text-muted-foreground">{t.qualifications?.slice(0, 30)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{t.uploads || 0} uploads</p>
                        <p className="text-xs text-muted-foreground">{t.bookingCount || 0} bookings</p>
                      </div>
                      {t.is_verified && <Badge className="bg-green-100 text-green-700 text-xs">Verified ✓</Badge>}
                    </div>
                  ))}
                  {tutorLeaderboard.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No tutors yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TUTOR EARNINGS */}
          <TabsContent value="earnings">
            <div className="space-y-4">
              <TutorEarningsTable tutors={tutors} bookings={bookings} />
              {/* Bulk Export */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-playfair text-base flex items-center justify-between">
                    Bulk Booking Export
                    <Button size="sm" className="bg-primary gap-1.5 text-xs" onClick={() => {
                      const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
                      const csv = [
                        ['Student', 'Tutor', 'Subject', 'Date', 'Time', 'Duration', 'Amount', 'Status'].join(','),
                        ...confirmed.map(b => [b.student_email, b.tutor_email, b.subject_id, b.booking_date, b.booking_time, b.duration, b.total_amount || 0, b.status].join(','))
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'bookings-export.csv'; a.click();
                    }}>
                      <DownloadIcon className="w-3.5 h-3.5" /> Export CSV
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Exports all confirmed & completed bookings with student, tutor, subject, date, amount data.</p>
                  <p className="text-sm font-medium mt-1">{bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length} bookings ready to export.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TUTOR PAYOUTS */}
          <TabsContent value="payouts">
            <AutomatedBillingPayouts />
          </TabsContent>

          {/* STUDENT LEADERBOARD */}
          <TabsContent value="leaderboard">
            <StudentLeaderboard />
          </TabsContent>

          {/* PARENT REPORTS */}
          <TabsContent value="reports">
            <AutoParentReports />
          </TabsContent>

          {/* CONTENT OVERSIGHT */}
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
                        <p className="text-xs text-muted-foreground">{r.grade}</p>
                      </div>
                      {r.is_approved && !r.is_rejected && <Badge className="bg-green-100 text-green-700 text-xs flex-shrink-0">Approved</Badge>}
                      {r.is_rejected && <Badge className="bg-red-100 text-red-700 text-xs flex-shrink-0">Rejected</Badge>}
                      {!r.is_approved && !r.is_rejected && <Badge variant="outline" className="text-xs flex-shrink-0">Pending</Badge>}
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs text-green-700 border-green-200 hover:bg-green-50" onClick={() => approveResource(r)}>
                          <CheckCircle className="w-3 h-3" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs text-red-700 border-red-200 hover:bg-red-50" onClick={() => rejectResource(r)}>
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {resources.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No resources uploaded yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FINANCIAL */}
          <TabsContent value="financial">
            <div className="grid sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-playfair text-lg">Premium Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-playfair text-4xl font-bold text-primary">R{premiumRevenue}</p>
                  <p className="text-sm text-muted-foreground mt-1">{subscriptions.length} active subscriptions (R20–R150/month)</p>
                  <div className="mt-4 space-y-2">
                    {subscriptions.slice(0, 8).map(s => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs truncate">{s.user_email}</span>
                        <span className="font-medium text-xs">R{s.amount_paid || '?'}</span>
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
                        <span className="text-muted-foreground text-xs truncate">{b.student_email}</span>
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

          {/* CAPS DOCUMENTS */}
          <TabsContent value="caps">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-playfair">CAPS Document Manager</CardTitle>
              </CardHeader>
              <CardContent>
                <CAPSDocumentManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* SYSTEM TEST */}
          <TabsContent value="system">
            <div className="space-y-4">
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="font-playfair flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" /> Email Notification System
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">⚠️ Supabase does not include built-in email sending. Configure Resend or SendGrid for email notifications.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="font-semibold text-amber-800 text-sm mb-1">⚠️ Email Service Not Configured</p>
                    <p className="text-xs text-amber-700">Supabase does not send emails automatically. To enable email notifications (admin alerts, booking reminders, password reset), please set up an external email service like Resend (free tier available).</p>
                    <p className="text-xs text-amber-600 mt-2">For now, please check the Admin Dashboard - Verification Hub manually to approve tutors.</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Send Test Email (Requires Resend/SendGrid)</p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Enter any email address..."
                        value={testEmailTarget}
                        onChange={e => setTestEmailTarget(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendTestEmail()}
                      />
                      <Button onClick={sendTestEmail} disabled={testEmailSending} variant="outline" className="gap-1.5 whitespace-nowrap">
                        {testEmailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send
                      </Button>
                    </div>
                  </div>

                  {emailLogs.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Email Log (this session)</p>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEmailLogs([])}>
                          <RefreshCw className="w-3 h-3" /> Clear
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {emailLogs.map((log, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                            <span className="text-muted-foreground truncate">{log.to}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-muted-foreground">{log.time}</span>
                              <span className={log.status.includes('✅') ? 'text-green-600 font-medium' : log.status.includes('❌') ? 'text-red-600' : 'text-amber-600'}>
                                {log.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-playfair text-base">Platform Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    ['Platform', 'EduConnect FET'],
                    ['Owner', 'Tech & GUARD Pty Ltd'],
                    ['Admin 1', 'aneleq@techandguard.co.za'],
                    ['Admin 2', 'aneleqamata95@gmail.com'],
                    ['Tutor Payout Day', 'Every Thursday'],
                    ['Commission (Standard)', '10% + R20 per booking'],
                    ['Commission (Pro)', 'R150/month, 0% commission'],
                    ['Student Premium', 'R20/month'],
                    ['Parent Premium', 'R50/month'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-right">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ACTIVITY LOGS */}
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
                        <span className="text-xl flex-shrink-0">{logIcon(log.event_type)}</span>
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
        </Tabs>
      </div>
    </div>
  );
}
