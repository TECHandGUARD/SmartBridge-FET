import { Button } from '@/components/ui/button';
import { Clock, Users, DollarSign, Shield, AlertCircle, Sparkles, Target, Zap, RefreshCw, Download } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart2, BookOpen, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const PLATFORM_FEE_PERCENT = 0.10;
const VAT_PERCENT = 0.15;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#2563eb', '#16a34a', '#d97706', '#ea580c', '#7c3aed', '#db2777', '#059669', '#4f46e5', '#0891b2', '#84cc16'];
function TrendIcon({
  pct
}) {
  if (pct > 5) return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
  if (pct < -5) return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}
function getNetEarnings(amount) {
  if (!amount) return 0;
  const fee = amount * PLATFORM_FEE_PERCENT;
  const vatAmount = fee * VAT_PERCENT;
  return amount - fee - vatAmount;
}
function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  trend = undefined,
  color,
  loading = false
}) {
  if (loading) {
    return <div className="bg-muted/30 rounded-xl p-3 animate-pulse">
        <div className="h-4 w-20 bg-muted rounded mb-2" />
        <div className="h-6 w-16 bg-muted rounded" />
      </div>;
  }
  return <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-6 h-6 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      {trend !== undefined && trend !== null && <div className={`flex items-center gap-0.5 text-[10px] font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
          <TrendIcon pct={trend} />
          {trend > 0 ? '+' : ''}{trend}%
        </div>}
    </div>;
}
export default function TutorBusinessSummary({
  user
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('6m');
  const [viewType, setViewType] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const loadBookings = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {
        data,
        error: queryError
      } = await supabase.from('tutor_bookings').select('*').eq('tutor_email', user.email).order('date', {
        ascending: false
      }).limit(500);
      if (queryError) throw queryError;
      setBookings(data || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Failed to load booking data');
      toast.error('Failed to load booking data');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);
  useEffect(() => {
    loadBookings();
    if (!user?.email) return;
    const channel = supabase.channel('tutor_business_summary').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tutor_bookings',
      filter: `tutor_email=eq.${user.email}`
    }, () => {
      loadBookings();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, loadBookings]);
  const completed = useMemo(() => bookings.filter(b => b.status === 'completed'), [bookings]);
  const pending = useMemo(() => bookings.filter(b => b.status === 'pending'), [bookings]);
  const cancelled = useMemo(() => bookings.filter(b => b.status === 'cancelled'), [bookings]);
  const getMonthsToShow = useCallback(() => {
    switch (timeRange) {
      case '3m':
        return 3;
      case '12m':
        return 12;
      default:
        return 6;
    }
  }, [timeRange]);
  const earningsTrend = useMemo(() => {
    const monthsToShow = getMonthsToShow();
    const now = new Date();
    const months = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        revenue: 0,
        netRevenue: 0,
        sessions: 0,
        students: new Set()
      });
    }
    completed.forEach(b => {
      const d = new Date(b.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = months.find(m => m.key === key);
      if (entry) {
        const amount = b.amount || 0;
        entry.revenue += amount;
        entry.netRevenue += getNetEarnings(amount);
        entry.sessions++;
        if (b.student_email) entry.students.add(b.student_email);
      }
    });
    return months.map(m => ({
      ...m,
      students: m.students.size
    }));
  }, [completed, getMonthsToShow]);
  const currentMonth = earningsTrend[earningsTrend.length - 1]?.revenue || 0;
  const prevMonth = earningsTrend[earningsTrend.length - 2]?.revenue || 0;
  const momPct = prevMonth === 0 ? currentMonth > 0 ? 100 : 0 : Math.round((currentMonth - prevMonth) / prevMonth * 100);
  const yoy = useMemo(() => {
    const now = new Date();
    const currentYearTotal = completed.filter(b => new Date(b.date).getFullYear() === now.getFullYear()).reduce((s, b) => s + (b.amount || 0), 0);
    const lastYearTotal = completed.filter(b => new Date(b.date).getFullYear() === now.getFullYear() - 1).reduce((s, b) => s + (b.amount || 0), 0);
    if (lastYearTotal === 0) return null;
    return {
      pct: Math.round((currentYearTotal - lastYearTotal) / lastYearTotal * 100),
      currentYearTotal,
      lastYearTotal
    };
  }, [completed]);
  const totalRevenue = completed.reduce((s, b) => s + (b.amount || 0), 0);
  const netRevenue = completed.reduce((s, b) => s + getNetEarnings(b.amount || 0), 0);
  const avgSessionValue = completed.length > 0 ? totalRevenue / completed.length : 0;
  const totalSessions = completed.length;
  const uniqueStudents = new Set(completed.map(b => b.student_email)).size;
  const pendingCount = pending.length;
  const cancellationRate = bookings.length > 0 ? Math.round(cancelled.length / bookings.length * 100) : 0;
  const customerLTV = useMemo(() => {
    const studentMap = {};
    completed.forEach(b => {
      if (!studentMap[b.student_email]) {
        studentMap[b.student_email] = {
          sessions: 0,
          revenue: 0,
          firstSeen: b.date
        };
      }
      studentMap[b.student_email].sessions++;
      studentMap[b.student_email].revenue += b.amount || 0;
    });
    const values = Object.values(studentMap);
    const avgLTV = values.length > 0 ? values.reduce((s, v) => s + v.revenue, 0) / values.length : 0;
    const repeatRate = values.length > 0 ? values.filter(v => v.sessions > 1).length / values.length * 100 : 0;
    return {
      avgLTV: Math.round(avgLTV),
      repeatRate: Math.round(repeatRate)
    };
  }, [completed]);
  const peakHours = useMemo(() => {
    const hourMap = {};
    completed.forEach(b => {
      if (!b.time) return;
      const hour = parseInt(b.time.split(':')[0]);
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
    if (!peakHour || completed.length === 0) return null;
    const hourNum = parseInt(peakHour[0]);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return {
      hour: `${displayHour}:00 ${ampm}`,
      count: peakHour[1],
      percent: Math.round(peakHour[1] / completed.length * 100)
    };
  }, [completed]);
  const subjectDemand = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!b.subject) return;
      if (!map[b.subject]) map[b.subject] = {
        total: 0,
        completed: 0,
        revenue: 0
      };
      map[b.subject].total++;
      if (b.status === 'completed') {
        map[b.subject].completed++;
        map[b.subject].revenue += b.amount || 0;
      }
    });
    return Object.entries(map).map(([subject, data]) => ({
      subject,
      ...data,
      completionRate: data.total > 0 ? Math.round(data.completed / data.total * 100) : 0
    })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [bookings]);
  const forecast = useMemo(() => {
    if (earningsTrend.length < 3) return null;
    const recent = earningsTrend.slice(-3);
    const avgRevenue = recent.reduce((s, m) => s + m.revenue, 0) / recent.length;
    const trend = (earningsTrend[earningsTrend.length - 1].revenue - earningsTrend[earningsTrend.length - 3].revenue) / 2;
    return {
      nextMonthRevenue: Math.max(0, Math.round(avgRevenue + trend)),
      growthRate: trend / (avgRevenue || 1)
    };
  }, [earningsTrend]);
  const maxDemand = subjectDemand[0]?.total || 1;
  const CustomTooltip = ({
    active = false,
    payload = [],
    label = null
  }) => {
    if (!active || !payload?.length) return null;
    return <div className="bg-card border border-border rounded-lg px-3 py-2 shadow text-xs">
        <p className="font-semibold mb-0.5">{label}</p>
        <p className="text-primary">R{payload[0]?.value?.toLocaleString() || 0}</p>
        <p className="text-muted-foreground">{payload[1]?.value || 0} sessions</p>
      </div>;
  };
  if (loading) {
    return <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card className="border-border">
          <CardContent className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>;
  }
  if (bookings.length === 0) {
    return <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No booking data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete your first tutoring session to see business insights
            </p>
            <p className="text-xs text-muted-foreground mt-2 text-primary">
              💡 Tip: Share your profile link with students to get more bookings
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">Subject demand will appear here</p>
            <p className="text-xs text-muted-foreground mt-1">
              As you complete sessions, we'll show which subjects are most popular
            </p>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="space-y-4 mb-6">

      {}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-playfair text-lg font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> Business Summary
          </h3>
          <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-500" /> Private
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex border rounded-lg overflow-hidden">
            {['3m', '6m', '12m'].map(range => <button key={range} onClick={() => setTimeRange(range)} className={`px-2 py-1 text-[10px] font-medium transition-colors ${timeRange === range ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                {range === '3m' ? '3M' : range === '6m' ? '6M' : '1Y'}
              </button>)}
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={loadBookings} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
          const headers = ['Subject', 'Student', 'Date', 'Time', 'Amount', 'Status'];
          const rows = bookings.map(b => [b.subject || '', b.student_email || '', b.date || '', b.time || '', b.amount || 0, b.status || '']);
          const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
          const blob = new Blob([csv], {
            type: 'text/csv'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `business-summary-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Export complete!');
        }}>
            <Download className="w-3 h-3" /> Export
          </Button>
        </div>
      </div>

      {}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
          <button onClick={loadBookings} className="ml-auto text-primary hover:underline font-medium">
            Retry
          </button>
        </div>}

      {}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={DollarSign} label="Revenue" value={`R${totalRevenue.toLocaleString()}`} sub={`Net: R${netRevenue.toLocaleString()}`} trend={momPct} color="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300" />
        <MetricCard icon={Users} label="Students" value={uniqueStudents} sub={`Avg LTV: R${customerLTV.avgLTV}`} color="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" />
        <MetricCard icon={Clock} label="Sessions" value={totalSessions} sub={`Avg: R${avgSessionValue.toFixed(0)}`} color="bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300" />
        <MetricCard icon={TrendingUp} label="Repeat Rate" value={`${customerLTV.repeatRate}%`} sub={`${pendingCount} pending`} color="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" />
      </div>

      {}
      <div className="grid sm:grid-cols-2 gap-4">

        {}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> Monthly Earnings
              </CardTitle>
              <div className="flex gap-2">
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${momPct > 5 ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300' : momPct < -5 ? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}>
                  <TrendIcon pct={momPct} />
                  {momPct > 0 ? '+' : ''}{momPct}% MoM
                </div>
                {yoy && yoy.pct !== 0 && <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${yoy.pct > 5 ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300' : yoy.pct < -5 ? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}>
                    <TrendIcon pct={yoy.pct} />
                    {yoy.pct > 0 ? '+' : ''}{yoy.pct}% YoY
                  </div>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This month: <span className="font-semibold text-foreground">R{currentMonth.toLocaleString()}</span>
              {forecast && <span className="ml-2 text-green-600">
                  ↑ Forecast: R{forecast.nextMonthRevenue.toLocaleString()}
                </span>}
            </p>
          </CardHeader>
          <CardContent className="pt-1 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={earningsTrend} margin={{
              top: 4,
              right: 4,
              left: -20,
              bottom: 0
            }}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{
                fontSize: 9
              }} tickLine={false} axisLine={false} />
                <YAxis tick={{
                fontSize: 9
              }} tickLine={false} axisLine={false} tickFormatter={v => `R${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#earningsGrad)" dot={{
                r: 3,
                fill: 'hsl(var(--primary))',
                strokeWidth: 0
              }} activeDot={{
                r: 5
              }} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between items-center mt-2">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-4 h-0.5 bg-primary rounded" /> Revenue
              </span>
              {peakHours && <span className="text-[10px] text-muted-foreground">
                  Peak: <span className="font-medium text-foreground">{peakHours.hour}</span> ({peakHours.percent}% of sessions)
                </span>}
            </div>
          </CardContent>
        </Card>

        {}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Subject Demand
              </CardTitle>
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-2 py-1 text-center dark:bg-teal-950/20 dark:border-teal-800">
                <p className="text-[8px] text-teal-600 font-medium dark:text-teal-400">Avg LTV</p>
                <p className="text-xs font-bold text-teal-700 dark:text-teal-300">R{customerLTV.avgLTV}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Most booked subjects</p>
          </CardHeader>
          <CardContent className="pt-1 pb-3 space-y-3">
            {subjectDemand.map((item, i) => <div key={item.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {i === 0 && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] px-1 py-0 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">🔥 Top</Badge>}
                    <span className="font-medium">{item.subject}</span>
                    <Badge variant="outline" className="text-[8px] px-1">
                      {item.completionRate}% complete
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.completed > 0 && <span className="text-[10px] text-green-600 font-medium dark:text-green-400">{item.completed} done</span>}
                    <span className="text-muted-foreground">{item.total} total</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-primary/75' : i === 2 ? 'bg-primary/55' : 'bg-primary/35'}`} style={{
                width: `${item.total / maxDemand * 100}%`
              }} />
                </div>
              </div>)}
          </CardContent>
        </Card>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {customerLTV.repeatRate < 30 && customerLTV.repeatRate > 0 && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 dark:bg-amber-950/20 dark:border-amber-800">
            <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Retention Opportunity
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Your repeat rate is {customerLTV.repeatRate}%. Offer package discounts to increase retention.
            </p>
          </div>}

        {peakHours && peakHours.percent > 40 && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-950/20 dark:border-blue-800">
            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
              <Target className="w-3 h-3" /> Peak Time Strategy
            </p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">
              {peakHours.percent}% of sessions at {peakHours.hour}. Adjust availability to match demand.
            </p>
          </div>}

        {subjectDemand.length > 0 && subjectDemand[0].completed > 0 && <div className="bg-green-50 border border-green-200 rounded-lg p-3 dark:bg-green-950/20 dark:border-green-800">
            <p className="text-[10px] text-green-700 dark:text-green-300 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" /> Growth Opportunity
            </p>
            <p className="text-[10px] text-green-600 dark:text-green-400">
              {subjectDemand[0].subject} is your top subject. Create specialized resources to attract more students.
            </p>
          </div>}

        {forecast && forecast.growthRate > 0 && <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 dark:bg-purple-950/20 dark:border-purple-800">
            <p className="text-[10px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Growth Forecast
            </p>
            <p className="text-[10px] text-purple-600 dark:text-purple-400">
              Projected revenue: R{forecast.nextMonthRevenue.toLocaleString()} next month ↑
            </p>
          </div>}
      </div>
    </div>;
}
