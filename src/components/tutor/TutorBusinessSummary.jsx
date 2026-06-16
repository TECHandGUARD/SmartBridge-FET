import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart2, BookOpen, Clock, Users, DollarSign, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function TrendIcon({ pct }) {
  if (pct > 5) return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
  if (pct < -5) return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default function TutorBusinessSummary({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    const loadBookings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tutor_bookings')
          .select('*')
          .eq('tutor_email', user.email)
          .order('date', { ascending: false })
          .limit(200);
        
        if (error) throw error;
        setBookings(data || []);
      } catch (err) {
        console.error('Error loading bookings:', err);
        toast.error('Failed to load booking data');
      } finally {
        setLoading(false);
      }
    };
    
    loadBookings();
  }, [user?.email]);

  const completed = useMemo(() => bookings.filter(b => b.status === 'completed'), [bookings]);

  // --- Earnings trend: last 6 months ---
  const earningsTrend = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${MONTHS[d.getMonth()]}`,
        revenue: 0,
        sessions: 0,
      });
    }
    completed.forEach(b => {
      const d = new Date(b.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = months.find(m => m.key === key);
      if (entry) {
        entry.revenue += (b.amount || 0);
        entry.sessions++;
      }
    });
    return months;
  }, [completed]);

  // Month-over-month change
  const currentMonth = earningsTrend[5]?.revenue || 0;
  const prevMonth = earningsTrend[4]?.revenue || 0;
  const momPct = prevMonth === 0
    ? (currentMonth > 0 ? 100 : 0)
    : Math.round(((currentMonth - prevMonth) / prevMonth) * 100);

  // Year-over-year change
  const yoy = useMemo(() => {
    const now = new Date();
    const currentYearTotal = completed.filter(b => 
      new Date(b.date).getFullYear() === now.getFullYear()
    ).reduce((s, b) => s + (b.amount || 0), 0);
    
    const lastYearTotal = completed.filter(b => 
      new Date(b.date).getFullYear() === now.getFullYear() - 1
    ).reduce((s, b) => s + (b.amount || 0), 0);
    
    if (lastYearTotal === 0) return null;
    return {
      pct: Math.round(((currentYearTotal - lastYearTotal) / lastYearTotal) * 100),
      currentYearTotal,
      lastYearTotal
    };
  }, [completed]);

  // Average session value
  const avgSessionValue = useMemo(() => {
    if (completed.length === 0) return 0;
    const total = completed.reduce((s, b) => s + (b.amount || 0), 0);
    return total / completed.length;
  }, [completed]);

  // Customer LTV and repeat rate
  const customerLTV = useMemo(() => {
    const studentMap = {};
    completed.forEach(b => {
      if (!studentMap[b.student_email]) {
        studentMap[b.student_email] = { sessions: 0, revenue: 0, firstSeen: b.date };
      }
      studentMap[b.student_email].sessions++;
      studentMap[b.student_email].revenue += (b.amount || 0);
    });
    
    const values = Object.values(studentMap);
    const avgLTV = values.length > 0 ? values.reduce((s, v) => s + v.revenue, 0) / values.length : 0;
    const repeatRate = values.length > 0 ? (values.filter(v => v.sessions > 1).length / values.length) * 100 : 0;
    
    return { avgLTV: Math.round(avgLTV), repeatRate: Math.round(repeatRate) };
  }, [completed]);

  // Peak hours analysis
  const peakHours = useMemo(() => {
    const hourMap = {};
    completed.forEach(b => {
      const hour = new Date(b.date).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
    if (!peakHour || completed.length === 0) return null;
    
    const hourNum = parseInt(peakHour[0]);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    
    return {
      hour: `${displayHour} ${ampm}`,
      count: peakHour[1],
      percent: Math.round((peakHour[1] / completed.length) * 100)
    };
  }, [completed]);

  // Subject demand
  const subjectDemand = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!b.subject) return;
      if (!map[b.subject]) map[b.subject] = { total: 0, thisMonth: 0 };
      map[b.subject].total++;
      const d = new Date(b.date);
      const now = new Date();
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        map[b.subject].thisMonth++;
      }
    });
    return Object.entries(map)
      .map(([subject, data]) => ({ subject, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [bookings]);

  const maxDemand = subjectDemand[0]?.total || 1;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow text-xs">
        <p className="font-semibold mb-0.5">{label}</p>
        <p className="text-primary">R{payload[0]?.value?.toLocaleString() || 0}</p>
        <p className="text-muted-foreground">{payload[1]?.value || 0} sessions</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
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
      </div>
    );
  }

  // Empty state
  if (bookings.length === 0) {
    return (
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">No booking data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete your first tutoring session to see business insights
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
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4 mb-6">
      {/* Earnings Trend Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" /> Monthly Earnings Trend
            </CardTitle>
            <div className="flex gap-2">
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                momPct > 5 ? 'bg-green-100 text-green-700' :
                momPct < -5 ? 'bg-red-100 text-red-600' :
                'bg-muted text-muted-foreground'
              }`}>
                <TrendIcon pct={momPct} />
                {momPct > 0 ? '+' : ''}{momPct}% vs last month
              </div>
              {yoy && (
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  yoy.pct > 5 ? 'bg-green-100 text-green-700' :
                  yoy.pct < -5 ? 'bg-red-100 text-red-600' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <TrendIcon pct={yoy.pct} />
                  {yoy.pct > 0 ? '+' : ''}{yoy.pct}% YoY
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">This month: <span className="font-semibold text-foreground">R{currentMonth.toLocaleString()}</span></p>
        </CardHeader>
        <CardContent className="pt-1 pb-3">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={earningsTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `R${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#earningsGrad)"
                dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="hsl(var(--secondary))"
                strokeWidth={1.5}
                fill="transparent"
                strokeDasharray="4 2"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-4">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-4 h-0.5 bg-primary rounded" /> Revenue
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-4 border-t border-dashed border-secondary" /> Sessions
              </span>
            </div>
            <div className="flex gap-2">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 text-center">
                <p className="text-[9px] text-indigo-600 font-medium">Avg Session</p>
                <p className="text-xs font-bold text-indigo-700">R{avgSessionValue.toFixed(0)}</p>
              </div>
              {peakHours && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg px-2 py-1 text-center">
                  <p className="text-[9px] text-cyan-600 font-medium">Peak Time</p>
                  <p className="text-xs font-bold text-cyan-700">{peakHours.hour}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Demand */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Subject Demand
            </CardTitle>
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-2 py-1">
              <p className="text-[9px] text-teal-600 font-medium">Customer LTV</p>
              <p className="text-xs font-bold text-teal-700">R{customerLTV.avgLTV}</p>
              <p className="text-[8px] text-teal-600">{customerLTV.repeatRate}% repeat rate</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Which subjects students book most</p>
        </CardHeader>
        <CardContent className="pt-1 pb-3 space-y-3">
          {subjectDemand.map((item, i) => (
            <div key={item.subject} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {i === 0 && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] px-1 py-0">🔥 Top</Badge>}
                  <span className="font-medium">{item.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.thisMonth > 0 && (
                    <span className="text-[10px] text-green-600 font-medium">{item.thisMonth} this month</span>
                  )}
                  <span className="text-muted-foreground">{item.total} total</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    i === 0 ? 'bg-primary' :
                    i === 1 ? 'bg-primary/75' :
                    i === 2 ? 'bg-primary/55' :
                    'bg-primary/35'
                  }`}
                  style={{ width: `${(item.total / maxDemand) * 100}%` }}
                />
              </div>
            </div>
          ))}
          
          {subjectDemand.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No subject data yet.</p>
          )}
          
          {/* Business tips based on data */}
          {customerLTV.repeatRate < 30 && customerLTV.repeatRate > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
              <p className="text-[10px] text-amber-700">
                💡 Tip: Your repeat rate is {customerLTV.repeatRate}%. Offering package discounts could increase student retention.
              </p>
            </div>
          )}
          
          {peakHours && peakHours.percent > 40 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
              <p className="text-[10px] text-blue-700">
                💡 Tip: {peakHours.percent}% of your sessions are at {peakHours.hour}. Consider adjusting your availability to match demand.
              </p>
            </div>
          )}
          
          {subjectDemand.length > 0 && subjectDemand[0].thisMonth > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
              <p className="text-[10px] text-green-700">
                🎯 Opportunity: {subjectDemand[0].subject} is your top subject with {subjectDemand[0].thisMonth} sessions this month. Create specialized resources to attract more students.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}