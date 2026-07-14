import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wallet, TrendingUp, Calendar, Download, Info, Loader2, AlertCircle, 
  Banknote, FileText, Shield, Sparkles, Target, Zap, Crown,
  TrendingDown, Minus, Eye, Share2, Bell, RefreshCw, CheckCircle, Clock, Users, Star
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const PLATFORM_FEE_PERCENT = 0.10;
const VAT_PERCENT = 0.15;
const MIN_PAYOUT_THRESHOLD = 500;
const COLORS = ['#2563eb', '#16a34a', '#d97706', '#ea580c', '#7c3aed', '#db2777', '#059669', '#4f46e5', '#0891b2', '#84cc16'];

// ============================================================
// Constants
// ============================================================

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getNextPayoutDate() {
  const today = new Date();
  const daysUntilThursday = (4 - today.getDay() + 7) % 7 || 7;
  const nextThursday = new Date(today);
  nextThursday.setDate(today.getDate() + daysUntilThursday);
  return nextThursday.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function TrendIcon({ pct }) {
  if (pct > 5) return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
  if (pct < -5) return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({ label, value, icon: Icon, color, sub, trend, loading }) {
  if (loading) {
    return (
      <div className="bg-muted/30 rounded-xl p-3 animate-pulse">
        <div className="h-3 w-16 bg-muted rounded mb-2" />
        <div className="h-6 w-12 bg-muted rounded" />
      </div>
    );
  }
  
  return (
    <div className={`border rounded-xl p-3 text-center ${color}`}>
      <div className="flex items-center justify-center gap-1 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <p className="text-[10px] font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center justify-center gap-0.5 text-[10px] font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
          <TrendIcon pct={trend} />
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function TutorEarningsDashboard({ user, onRequestPayout }) {
  const [bookings, setBookings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [bankDetails, setBankDetails] = useState(null);
  const [period, setPeriod] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [viewMode, setViewMode] = useState('overview'); // overview, detailed, forecast
  
  const [bankForm, setBankForm] = useState({
    bank_name: '', account_number: '', account_holder: '', branch_code: ''
  });

  // ============================================================
  // Load Data with Real-time
  // ============================================================

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Load bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_email', user.email)
        .order('date', { ascending: false });
      
      if (bookingsError) throw bookingsError;
      
      // Load payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('tutor_payouts')
        .select('*')
        .eq('tutor_email', user.email)
        .order('created_at', { ascending: false });
      
      if (payoutsError) throw payoutsError;
      
      // Load bank details from tutor_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('tutor_profiles')
        .select('bank_name, account_number, account_holder, branch_code')
        .eq('user_email', user.email)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading bank details:', profileError);
      }
      
      setBookings(bookingsData || []);
      setPayouts(payoutsData || []);
      
      if (profileData) {
        setBankDetails(profileData);
        setBankForm({
          bank_name: profileData.bank_name || '',
          account_number: profileData.account_number || '',
          account_holder: profileData.account_holder || '',
          branch_code: profileData.branch_code || ''
        });
      }
      
      setLastRefresh(new Date());
      
      // Log activity for POPIA compliance
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'earnings_dashboard_viewed',
          user_email: user.email,
          user_id: user.id || null,
          description: 'Viewed earnings dashboard',
          metadata: {
            total_bookings: bookingsData?.length || 0,
            period: period
          }
        })
        .catch(() => {});
      
    } catch (err) {
      console.error('Failed to fetch earnings data:', err);
      setError('Unable to load earnings data. Please try again later.');
      toast.error('Failed to load earnings data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;
    
    const channel = supabase
      .channel('tutor_earnings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tutor_bookings',
          filter: `tutor_email=eq.${user.email}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, loadData]);

  // ============================================================
  // Analytics Calculations
  // ============================================================

  const filteredBookings = useMemo(() => {
    if (period === 'all') return bookings;
    const now = new Date();
    const start = new Date();
    
    if (period === 'month') {
      start.setMonth(now.getMonth() - 1);
    } else if (period === 'quarter') {
      start.setMonth(now.getMonth() - 3);
    } else if (period === 'year') {
      start.setFullYear(now.getFullYear() - 1);
    }
    start.setHours(0, 0, 0, 0);
    
    return bookings.filter(b => new Date(b.date) >= start);
  }, [bookings, period]);

  const completed = filteredBookings.filter(b => b.status === 'completed');
  const pending = filteredBookings.filter(b => b.status === 'pending');
  const cancelled = filteredBookings.filter(b => b.status === 'cancelled');

  const totalEarned = completed.reduce((s, b) => s + (b.amount || 0), 0);
  const totalHours = completed.reduce((s, b) => s + (b.duration_hours || 0), 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const paidPayouts = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const uniqueStudents = [...new Set(completed.map(b => b.student_email))].length;
  const pendingAmount = totalEarned - paidPayouts;
  const completionRate = filteredBookings.length > 0 
    ? Math.round((completed.length / filteredBookings.length) * 100) 
    : 0;
  const cancellationRate = filteredBookings.length > 0 
    ? Math.round((cancelled.length / filteredBookings.length) * 100) 
    : 0;

  // Average rating
  const averageRating = useMemo(() => {
    const ratings = completed
      .filter(b => typeof b.rating === 'number' && b.rating > 0)
      .map(b => b.rating);
    if (ratings.length === 0) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  }, [completed]);

  // Month-over-month change
  const momChange = useMemo(() => {
    const sorted = [...completed].sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date();
    const currentMonth = sorted.filter(b => 
      new Date(b.date).getMonth() === now.getMonth() && 
      new Date(b.date).getFullYear() === now.getFullYear()
    ).reduce((s, b) => s + (b.amount || 0), 0);
    
    const lastMonth = sorted.filter(b => {
      const d = new Date(b.date);
      return d.getMonth() === now.getMonth() - 1 && 
             d.getFullYear() === now.getFullYear();
    }).reduce((s, b) => s + (b.amount || 0), 0);
    
    if (lastMonth === 0) return null;
    return Math.round(((currentMonth - lastMonth) / lastMonth) * 100);
  }, [completed]);

  // Fee breakdown
  const feeBreakdown = useMemo(() => {
    const platformFee = totalEarned * PLATFORM_FEE_PERCENT;
    const vatOnFee = platformFee * VAT_PERCENT;
    const netEarnings = totalEarned - platformFee - vatOnFee;
    return { platformFee, vatOnFee, netEarnings };
  }, [totalEarned]);

  // Monthly breakdown for chart
  const monthlyData = useMemo(() => {
    const map = {};
    completed.forEach(b => {
      const d = new Date(b.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { sessions: 0, revenue: 0, hours: 0, students: new Set() };
      map[key].sessions++;
      map[key].revenue += (b.amount || 0);
      map[key].hours += (b.duration_hours || 0);
      if (b.student_email) map[key].students.add(b.student_email);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .map(([key, val]) => {
        const [y, m] = key.split('-');
        return { 
          label: `${MONTHS[parseInt(m) - 1]} ${y}`, 
          ...val, 
          students: val.students.size 
        };
      });
  }, [completed]);

  // Chart data
  const chartData = monthlyData.slice().reverse().map(m => ({
    month: m.label,
    earnings: m.revenue,
    sessions: m.sessions,
    students: m.students
  }));

  // Subject distribution
  const subjectData = useMemo(() => {
    const map = {};
    completed.forEach(b => {
      if (b.subject) {
        const key = b.subject;
        if (!map[key]) map[key] = { count: 0, revenue: 0 };
        map[key].count++;
        map[key].revenue += (b.amount || 0);
      }
    });
    return Object.entries(map)
      .map(([name, data]) => ({ 
        name, 
        value: data.count, 
        revenue: data.revenue,
        color: COLORS[Object.keys(map).indexOf(name) % COLORS.length] 
      }))
      .sort((a, b) => b.value - a.value);
  }, [completed]);

  // Forecast
  const forecast = useMemo(() => {
    if (monthlyData.length < 3) return null;
    
    const recent = monthlyData.slice(0, 3);
    const avgRevenue = recent.reduce((s, m) => s + m.revenue, 0) / recent.length;
    const trend = (recent[0]?.revenue - recent[2]?.revenue) / 2 || 0;
    
    return {
      nextMonthRevenue: Math.max(0, Math.round(avgRevenue + trend)),
      growthRate: trend / (avgRevenue || 1),
      projectedAnnual: Math.round((avgRevenue + trend) * 12)
    };
  }, [monthlyData]);

  // ============================================================
  // Actions
  // ============================================================

  const saveBankDetails = async () => {
    if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_holder) {
      toast.error('Please fill in all required bank fields');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tutor_profiles')
        .update({
          bank_name: bankForm.bank_name,
          account_number: bankForm.account_number,
          account_holder: bankForm.account_holder,
          branch_code: bankForm.branch_code || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_email', user.email);
      
      if (error) throw error;
      
      setBankDetails(bankForm);
      setShowBankModal(false);
      toast.success('Bank details saved successfully');
      
      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'bank_details_updated',
          user_email: user.email,
          user_id: user.id || null,
          description: 'Updated bank details for payouts'
        })
        .catch(() => {});
      
    } catch (err) {
      console.error('Error saving bank details:', err);
      toast.error('Failed to save bank details');
    }
  };

  const requestPayout = async () => {
    if (!bankDetails?.account_number) {
      toast.error('Please add your bank details before requesting a payout');
      setShowBankModal(true);
      return;
    }
    
    if (pendingAmount < MIN_PAYOUT_THRESHOLD) {
      toast.error(`Minimum payout amount is R${MIN_PAYOUT_THRESHOLD}. Current pending: R${pendingAmount}`);
      return;
    }
    
    setRequestingPayout(true);
    
    try {
      const { error } = await supabase
        .from('tutor_payouts')
        .insert({
          tutor_email: user.email,
          tutor_name: user.full_name || user.email,
          amount: pendingAmount,
          status: 'pending',
          booking_reference: `PAYOUT_${Date.now()}`,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast.success(`Payout request submitted for R${pendingAmount}. Admin will process within 3-5 business days.`);
      if (onRequestPayout) onRequestPayout();
      loadData();
      
      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'payout_requested',
          user_email: user.email,
          user_id: user.id || null,
          description: `Requested payout of R${pendingAmount}`,
          metadata: {
            amount: pendingAmount
          }
        })
        .catch(() => {});
      
    } catch (err) {
      console.error('Error requesting payout:', err);
      toast.error('Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  const exportEarningsCSV = () => {
    if (bookings.length === 0) {
      toast.info('No data to export');
      return;
    }

    try {
      const headers = ['Date', 'Student', 'Subject', 'Duration (hrs)', 'Amount (R)', 'Status', 'Rating'];
      const rows = bookings.map(b => [
        b.date,
        b.student_email,
        b.subject || 'N/A',
        b.duration_hours || 1,
        b.amount || 0,
        b.status,
        b.rating || 'N/A'
      ]);

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `earnings-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Earnings exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export data');
    }
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Earnings Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Error State
  // ============================================================

  if (error) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Earnings Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-playfair flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> Earnings Dashboard
            </CardTitle>
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Private
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportEarningsCSV} className="gap-1.5 h-8" disabled={bookings.length === 0}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" variant="outline" onClick={loadData} className="gap-1.5 h-8" disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" className="bg-primary gap-1.5 h-8" onClick={requestPayout} disabled={requestingPayout || pendingAmount < MIN_PAYOUT_THRESHOLD}>
              {requestingPayout ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
              Request Payout
            </Button>
          </div>
        </div>
        
        {/* Quick Stats Row */}
        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
          <span>Last refreshed: {lastRefresh.toLocaleTimeString('en-ZA')}</span>
          <span>•</span>
          <span className={pendingAmount >= MIN_PAYOUT_THRESHOLD ? 'text-green-600 font-medium' : ''}>
            Pending: R{pendingAmount.toLocaleString()}
          </span>
          {pendingAmount >= MIN_PAYOUT_THRESHOLD && (
            <Badge className="bg-green-100 text-green-700 text-[9px] animate-pulse dark:bg-green-950/30 dark:text-green-300">
              Ready for payout
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard 
            label="Total Earned" 
            value={`R${totalEarned.toLocaleString()}`}
            icon={Wallet}
            color="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
            sub={`Net: R${feeBreakdown.netEarnings.toLocaleString()}`}
            trend={momChange}
          />
          <StatCard 
            label="Sessions" 
            value={completed.length}
            icon={TrendingUp}
            color="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
            sub={`${completionRate}% completion`}
          />
          <StatCard 
            label="Hours" 
            value={`${totalHours}h`}
            icon={Clock}
            color="bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800"
          />
          <StatCard 
            label="Students" 
            value={uniqueStudents}
            icon={Users}
            color="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
          />
          <StatCard 
            label="Rating" 
            value={averageRating ? `${averageRating}⭐` : '—'}
            icon={Star}
            color="bg-pink-50 border-pink-200 dark:bg-pink-950/20 dark:border-pink-800"
            sub={averageRating ? `${completed.filter(b => b.rating).length} reviews` : 'No reviews yet'}
          />
        </div>

        {/* Earnings Chart */}
        {chartData.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Earnings Trend
              {forecast && (
                <span className="ml-2 text-green-600 font-medium">
                  ↑ Forecast: R{forecast.nextMonthRevenue.toLocaleString()} next month
                </span>
              )}
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'earnings') return [`R${value.toLocaleString()}`, 'Earnings'];
                    if (name === 'sessions') return [value, 'Sessions'];
                    if (name === 'students') return [value, 'Students'];
                    return [value, name];
                  }}
                />
                <Area type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" fill="url(#earningsGradient)" strokeWidth={2} />
                <Line type="monotone" dataKey="sessions" stroke="hsl(var(--secondary))" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 justify-end">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-4 h-0.5 bg-primary rounded" /> Revenue
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-4 border-t border-dashed border-secondary" /> Sessions
              </span>
            </div>
          </div>
        )}

        {/* Subject Distribution */}
        {subjectData.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Earnings by Subject
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={subjectData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {subjectData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => {
                  const data = props?.payload;
                  return [`${value} sessions · R${data?.revenue?.toLocaleString() || 0}`, data?.name];
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Fee Breakdown */}
        {totalEarned > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 dark:bg-blue-950/20 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Fee Breakdown
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">Gross Earnings:</span>
                <span className="font-semibold">R{totalEarned.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                <span>Platform Fee ({PLATFORM_FEE_PERCENT * 100}%):</span>
                <span>- R{feeBreakdown.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                <span>VAT ({VAT_PERCENT * 100}% on fee):</span>
                <span>- R{feeBreakdown.vatOnFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-blue-200 dark:border-blue-800 pt-1 mt-1 flex justify-between font-bold">
                <span>Net Earnings:</span>
                <span className="text-green-700 dark:text-green-400">R{feeBreakdown.netEarnings.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payout Summary */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border dark:bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Payout Summary
            </p>
            <Badge className="text-[10px] bg-primary/10 text-primary">
              Next payout: {getNextPayoutDate()}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Paid Out</p>
                <p className="font-semibold text-sm">R{paidPayouts.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className={`font-semibold text-sm ${pendingAmount >= MIN_PAYOUT_THRESHOLD ? 'text-green-600' : 'text-amber-600'}`}>
                  R{pendingAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {pendingAmount > 0 && pendingAmount < MIN_PAYOUT_THRESHOLD && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">
              ⚠️ Pending payout below R{MIN_PAYOUT_THRESHOLD}. Will process once threshold is reached.
            </div>
          )}

          {pendingAmount >= MIN_PAYOUT_THRESHOLD && (
            <div className="text-[10px] text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Ready for payout! Click "Request Payout" above.
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 dark:bg-amber-950/20 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Next Payout: {getNextPayoutDate()}</p>
            </div>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
              Payouts processed weekly. Minimum: R{MIN_PAYOUT_THRESHOLD} | Cut-off: Wednesday 12:00
            </p>
          </div>
        </div>

        {/* Recent Payouts */}
        {payouts.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Recent Payouts</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {payouts.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 text-sm dark:bg-muted/20">
                  <Badge className={`text-xs ${
                    p.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300' :
                    p.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-green-300' :
                    'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                  }`}>
                    {p.status}
                  </Badge>
                  <span className="flex-1 text-xs">{p.booking_reference || '—'}</span>
                  <span className="font-semibold text-xs">R{p.amount.toLocaleString()}</span>
                  {p.payout_date && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(p.payout_date).toLocaleDateString('en-ZA')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
