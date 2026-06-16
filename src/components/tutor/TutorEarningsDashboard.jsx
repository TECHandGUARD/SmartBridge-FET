import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, TrendingUp, Calendar, Download, Info, Loader2, AlertCircle, Banknote, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Configuration - from system_config table in production
const PLATFORM_FEE_PERCENT = 0.10; // 10%
const VAT_PERCENT = 0.15; // 15% VAT on platform fee
const MIN_PAYOUT_THRESHOLD = 500; // R500 minimum payout

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

export default function TutorEarningsDashboard({ user, onRequestPayout }) {
  const [bookings, setBookings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [bankDetails, setBankDetails] = useState(null);
  const [period, setPeriod] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: '', account_number: '', account_holder: '', branch_code: ''
  });

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
    } catch (err) {
      console.error('Failed to fetch earnings data:', err);
      setError('Unable to load earnings data. Please try again later.');
      toast.error('Failed to load earnings data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          branch_code: bankForm.branch_code,
          updated_at: new Date().toISOString()
        })
        .eq('user_email', user.email);
      
      if (error) throw error;
      
      setBankDetails(bankForm);
      setShowBankModal(false);
      toast.success('Bank details saved successfully');
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
    
    const pendingAmount = completed.reduce((s, b) => s + (b.amount || 0), 0) - 
                          payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    
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
          tutor_name: user.full_name,
          amount: pendingAmount,
          status: 'pending',
          booking_reference: `PAYOUT_${Date.now()}`,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast.success(`Payout request submitted for R${pendingAmount}. Admin will process within 3-5 business days.`);
      if (onRequestPayout) onRequestPayout();
      loadData(); // Refresh data
    } catch (err) {
      console.error('Error requesting payout:', err);
      toast.error('Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

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
  const totalEarned = completed.reduce((s, b) => s + (b.amount || 0), 0);
  const totalHours = completed.reduce((s, b) => s + (b.duration_hours || 0), 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const paidPayouts = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const uniqueStudents = [...new Set(completed.map(b => b.student_email))].length;
  const pendingAmount = totalEarned - paidPayouts;

  // Calculate average rating
  const averageRating = useMemo(() => {
    const ratings = completed
      .filter(b => typeof b.rating === 'number' && b.rating > 0)
      .map(b => b.rating);
    if (ratings.length === 0) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
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
      if (!map[key]) map[key] = { sessions: 0, revenue: 0, hours: 0 };
      map[key].sessions++;
      map[key].revenue += (b.amount || 0);
      map[key].hours += (b.duration_hours || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .map(([key, val]) => {
        const [y, m] = key.split('-');
        return { label: `${MONTHS[parseInt(m) - 1]} ${y}`, ...val };
      });
  }, [completed]);

  // Chart data for line chart
  const chartData = monthlyData.slice().reverse().map(m => ({
    month: m.label,
    earnings: m.revenue,
    sessions: m.sessions
  }));

  // Subject distribution data for pie chart
  const subjectData = useMemo(() => {
    const map = {};
    completed.forEach(b => {
      if (b.subject) {
        map[b.subject] = (map[b.subject] || 0) + 1;
      }
    });
    const colors = ['#16a34a', '#2563eb', '#9333ea', '#ea580c', '#0891b2', '#dc2626'];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [completed]);

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
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Earnings & Analytics
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36 h-8 text-xs">
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
            <Button size="sm" className="bg-primary gap-1.5 h-8" onClick={requestPayout} disabled={requestingPayout}>
              {requestingPayout ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
              Request Payout
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xs text-green-600 font-medium">Total Earned</p>
            <p className="font-playfair text-xl font-bold text-green-700">R{totalEarned.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">Sessions</p>
            <p className="font-playfair text-xl font-bold text-blue-700">{completed.length}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <p className="text-xs text-purple-600 font-medium">Hours</p>
            <p className="font-playfair text-xl font-bold text-purple-700">{totalHours}h</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-600 font-medium">Students</p>
            <p className="font-playfair text-xl font-bold text-amber-700">{uniqueStudents}</p>
          </div>
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-center">
            <p className="text-xs text-pink-600 font-medium">Rating</p>
            <p className="font-playfair text-xl font-bold text-pink-700">
              {averageRating ? `${averageRating} ⭐` : '—'}
            </p>
          </div>
        </div>

        {/* Earnings Chart */}
        {chartData.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Earnings Trend
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`R${value.toLocaleString()}`, 'Earnings']} />
                <Area type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" fill="url(#earningsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subject Distribution Pie Chart */}
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Fee Breakdown */}
        {totalEarned > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Fee Breakdown
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Gross Earnings:</span>
                <span className="font-semibold">R{totalEarned.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600">
                <span>Platform Fee ({PLATFORM_FEE_PERCENT * 100}%):</span>
                <span>- R{feeBreakdown.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600">
                <span>VAT ({VAT_PERCENT * 100}% on fee):</span>
                <span>- R{feeBreakdown.vatOnFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-blue-200 pt-1 mt-1 flex justify-between font-bold">
                <span>Net Earnings:</span>
                <span className="text-green-700">R{feeBreakdown.netEarnings.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payout Summary */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" /> Payout Summary
          </p>
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
                <p className="font-semibold text-sm">R{pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {pendingAmount > 0 && pendingAmount < MIN_PAYOUT_THRESHOLD && (
            <div className="text-[10px] text-amber-600 mb-2">
              ⚠️ Pending payout below R{MIN_PAYOUT_THRESHOLD}. Will process once threshold is reached.
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-xs font-semibold text-amber-800">Next Payout: {getNextPayoutDate()}</p>
            </div>
            <p className="text-[10px] text-amber-700 mt-1">
              Payouts processed weekly. Minimum: R{MIN_PAYOUT_THRESHOLD} | Cut-off: Wednesday 12:00
            </p>
          </div>
        </div>

        {/* Monthly Breakdown */}
        {monthlyData.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" /> Monthly Breakdown
            </p>
            <div className="space-y-1.5">
              {monthlyData.map((m, idx) => {
                const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
                const barWidth = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={m.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                    <span className="text-xs font-medium w-20">{m.label}</span>
                    <div className="flex-1 bg-border rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, barWidth)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-20 text-right">R{m.revenue.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground w-14 text-right">{m.sessions} sess.</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Payouts */}
        {payouts.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Recent Payouts</p>
            <div className="space-y-1.5">
              {payouts.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 text-sm">
                  <Badge className={`text-xs ${
                    p.status === 'paid' ? 'bg-green-100 text-green-700' :
                    p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
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

        {/* Empty State */}
        {completed.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No completed sessions yet.</p>
            <p className="text-sm mt-1">Complete tutoring sessions to see your earnings.</p>
          </div>
        )}
      </CardContent>

      {/* Bank Details Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-playfair text-xl font-bold">Bank Details</h3>
            <p className="text-xs text-muted-foreground">Add your bank details to receive payouts</p>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Bank Name *</Label>
                <Input value={bankForm.bank_name} onChange={e => setBankForm({...bankForm, bank_name: e.target.value})} placeholder="e.g. Standard Bank" />
              </div>
              <div>
                <Label className="text-xs">Account Holder Name *</Label>
                <Input value={bankForm.account_holder} onChange={e => setBankForm({...bankForm, account_holder: e.target.value})} placeholder="As per bank account" />
              </div>
              <div>
                <Label className="text-xs">Account Number *</Label>
                <Input type="number" value={bankForm.account_number} onChange={e => setBankForm({...bankForm, account_number: e.target.value})} placeholder="Your bank account number" />
              </div>
              <div>
                <Label className="text-xs">Branch Code</Label>
                <Input value={bankForm.branch_code} onChange={e => setBankForm({...bankForm, branch_code: e.target.value})} placeholder="e.g. 051001" />
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button onClick={saveBankDetails} className="flex-1">Save Details</Button>
              <Button variant="outline" onClick={() => setShowBankModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}