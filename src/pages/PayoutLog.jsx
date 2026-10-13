// src/pages/PayoutLog.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Search,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  FileText,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Currency
  CURRENCY: import.meta.env.VITE_PREMIUM_CURRENCY || 'R',

  // Date format
  DATE_LOCALE: import.meta.env.VITE_DATE_LOCALE || 'en-ZA',

  // Status styles (Tailwind classes)
  STATUS_STYLES: {
    paid: import.meta.env.VITE_PAYOUT_STATUS_PAID_STYLE || 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400',
    pending: import.meta.env.VITE_PAYOUT_STATUS_PENDING_STYLE || 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400',
    failed: import.meta.env.VITE_PAYOUT_STATUS_FAILED_STYLE || 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400',
    cancelled: import.meta.env.VITE_PAYOUT_STATUS_CANCELLED_STYLE || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  },

  // Status labels
  STATUS_LABELS: {
    paid: import.meta.env.VITE_PAYOUT_STATUS_PAID_LABEL || 'Paid',
    pending: import.meta.env.VITE_PAYOUT_STATUS_PENDING_LABEL || 'Pending',
    failed: import.meta.env.VITE_PAYOUT_STATUS_FAILED_LABEL || 'Failed',
    cancelled: import.meta.env.VITE_PAYOUT_STATUS_CANCELLED_LABEL || 'Cancelled',
  },

  // Status icons
  STATUS_ICONS: {
    paid: CheckCircle,
    pending: Clock,
    failed: XCircle,
    cancelled: HelpCircle,
  },

  // Feature flags
  ENABLE_EXPORT: import.meta.env.VITE_PAYOUT_ENABLE_EXPORT !== 'false',
  ENABLE_REFRESH: import.meta.env.VITE_PAYOUT_ENABLE_REFRESH !== 'false',
  ENABLE_REAL_TIME: import.meta.env.VITE_PAYOUT_ENABLE_REAL_TIME !== 'false',

  // Pagination
  ITEMS_PER_PAGE: Number(import.meta.env.VITE_PAYOUT_ITEMS_PER_PAGE) || 50,

  // Messages
  MESSAGES: {
    LOAD_FAILED: import.meta.env.VITE_PAYOUT_LOAD_FAILED_MSG || 'Failed to load payout data. Please try again.',
    NO_PAYOUTS: import.meta.env.VITE_PAYOUT_NO_PAYOUTS_MSG || 'No payouts found.',
    EXPORT_SUCCESS: import.meta.env.VITE_PAYOUT_EXPORT_SUCCESS_MSG || 'Payout data exported successfully!',
    EXPORT_FAILED: import.meta.env.VITE_PAYOUT_EXPORT_FAILED_MSG || 'Failed to export payout data.',
    REFRESH_SUCCESS: import.meta.env.VITE_PAYOUT_REFRESH_SUCCESS_MSG || 'Payout data refreshed!',
    TOTAL_PAID_LABEL: import.meta.env.VITE_PAYOUT_TOTAL_PAID_LABEL || 'Total Paid',
    TOTAL_PENDING_LABEL: import.meta.env.VITE_PAYOUT_TOTAL_PENDING_LABEL || 'Total Pending',
    TOTAL_FAILED_LABEL: import.meta.env.VITE_PAYOUT_TOTAL_FAILED_LABEL || 'Total Failed',
    AVERAGE_PAYOUT_LABEL: import.meta.env.VITE_PAYOUT_AVERAGE_LABEL || 'Average Payout',
  },
};

// ============================================================
// Sub-Components
// ============================================================

function StatCard({ label, value, icon: Icon, color, subtitle, trend = undefined }) {
  return (
    <Card className="border-border hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
            <Icon className="w-4 h-4" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="font-playfair text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const styles = CONFIG.STATUS_STYLES[status] || CONFIG.STATUS_STYLES.pending;
  const label = CONFIG.STATUS_LABELS[status] || status;
  const Icon = CONFIG.STATUS_ICONS[status] || HelpCircle;

  return (
    <Badge className={`${styles} gap-1.5 px-2.5 py-1 font-medium text-xs`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function PayoutLog() {
  // ---------- State ----------
  const [payouts, setPayouts] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [averagePayout, setAveragePayout] = useState(0);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // ============================================================
  // Data Loading
  // ============================================================

  const fetchPayouts = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tutor_payouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(CONFIG.ITEMS_PER_PAGE);

      if (fetchError) throw fetchError;

      const payoutsData = data || [];
      setPayouts(payoutsData);
      calculateStats(payoutsData);
      applyFilters(payoutsData);

      if (silent && !CONFIG.ENABLE_REAL_TIME) {
        toast.success(CONFIG.MESSAGES.REFRESH_SUCCESS);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
      setError(CONFIG.MESSAGES.LOAD_FAILED);
      if (!silent) {
        toast.error(CONFIG.MESSAGES.LOAD_FAILED);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();

    // Real-time subscription
    if (!CONFIG.ENABLE_REAL_TIME) return;

    const channel = supabase
      .channel('payout-log-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tutor_payouts' },
        () => fetchPayouts(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPayouts]);

  // ============================================================
  // Calculations
  // ============================================================

  const calculateStats = useCallback((data) => {
    const paid = data
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pending = data
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const failed = data
      .filter((p) => p.status === 'failed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const paidCount = data.filter((p) => p.status === 'paid').length;
    const avg = paidCount > 0 ? paid / paidCount : 0;

    setTotalAmount(paid);
    setTotalPending(pending);
    setTotalFailed(failed);
    setAveragePayout(avg);
  }, []);

  const applyFilters = useCallback((data) => {
    let filtered = data || [];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.tutor_name?.toLowerCase().includes(term) ||
          p.booking_reference?.toLowerCase().includes(term) ||
          p.tutor_email?.toLowerCase().includes(term) ||
          p.notes?.toLowerCase().includes(term)
      );
    }

    setFilteredPayouts(filtered);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    applyFilters(payouts);
  }, [searchTerm, statusFilter, payouts, applyFilters]);

  // ============================================================
  // Handlers
  // ============================================================

  const handleRefresh = useCallback(() => {
    fetchPayouts(true);
  }, [fetchPayouts]);

  const handleExportCSV = useCallback(() => {
    if (filteredPayouts.length === 0) {
      toast.info(CONFIG.MESSAGES.NO_PAYOUTS);
      return;
    }

    try {
      const headers = [
        'Booking Reference',
        'Tutor Name',
        'Tutor Email',
        'Amount',
        'Status',
        'Payout Date',
        'Payment Method',
        'Notes'
      ];

      const rows = filteredPayouts.map((p) => [
        p.booking_reference || 'N/A',
        p.tutor_name || 'N/A',
        p.tutor_email || 'N/A',
        p.amount || 0,
        p.status || 'pending',
        p.payout_date ? new Date(p.payout_date).toLocaleDateString(CONFIG.DATE_LOCALE) : 'N/A',
        p.payment_method || 'N/A',
        p.notes || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((r) => r.join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payout-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(CONFIG.MESSAGES.EXPORT_SUCCESS);
    } catch (err) {
      console.error('Export error:', err);
      toast.error(CONFIG.MESSAGES.EXPORT_FAILED);
    }
  }, [filteredPayouts]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  // ============================================================
  // Computed Values
  // ============================================================

  const hasFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ============================================================
  // Error State
  // ============================================================

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button onClick={() => fetchPayouts(false)} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-playfair text-3xl font-bold">Tutor Payout Log</h1>
            <p className="text-muted-foreground text-sm">
              Track all payments made to tutors
              <span className="ml-2 text-xs text-muted-foreground/60">
                ({filteredPayouts.length} records shown)
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {CONFIG.ENABLE_REFRESH && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            )}
            {CONFIG.ENABLE_EXPORT && filteredPayouts.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label={CONFIG.MESSAGES.TOTAL_PAID_LABEL}
            value={`${CONFIG.CURRENCY}${totalAmount.toFixed(2)}`}
            icon={DollarSign}
            color="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
            subtitle={`${payouts.filter(p => p.status === 'paid').length} payouts`}
          />
          <StatCard
            label={CONFIG.MESSAGES.TOTAL_PENDING_LABEL}
            value={`${CONFIG.CURRENCY}${totalPending.toFixed(2)}`}
            icon={Clock}
            color="bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400"
            subtitle={`${payouts.filter(p => p.status === 'pending').length} pending`}
          />
          <StatCard
            label={CONFIG.MESSAGES.TOTAL_FAILED_LABEL}
            value={`${CONFIG.CURRENCY}${totalFailed.toFixed(2)}`}
            icon={XCircle}
            color="bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
            subtitle={`${payouts.filter(p => p.status === 'failed').length} failed`}
          />
          <StatCard
            label={CONFIG.MESSAGES.AVERAGE_PAYOUT_LABEL}
            value={`${CONFIG.CURRENCY}${averagePayout.toFixed(2)}`}
            icon={TrendingUp}
            color="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
            subtitle={`${payouts.filter(p => p.status === 'paid').length} paid`}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by tutor name, email, or booking ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  aria-label="Search payouts"
                />
              </div>
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payouts Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-playfair text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Payouts ({filteredPayouts.length})
              </CardTitle>
              {filteredPayouts.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {CONFIG.CURRENCY}{filteredPayouts.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)} total
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredPayouts.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-muted-foreground">{CONFIG.MESSAGES.NO_PAYOUTS}</p>
                {hasFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-3"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-3 px-4 font-semibold">Booking Ref</th>
                      <th className="text-left py-3 px-4 font-semibold">Tutor</th>
                      <th className="text-left py-3 px-4 font-semibold hidden sm:table-cell">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold hidden md:table-cell">Date</th>
                      <th className="text-left py-3 px-4 font-semibold hidden lg:table-cell">Method</th>
                      <th className="text-left py-3 px-4 font-semibold text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.map((payout) => {
                      const isExpanded = expandedRows.has(payout.id);
                      return (
                        <React.Fragment key={payout.id}>
                          <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-mono text-xs">
                              {payout.booking_reference || '—'}
                            </td>
                            <td className="py-3 px-4 font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                                  {payout.tutor_name?.[0]?.toUpperCase() || 'T'}
                                </div>
                                {payout.tutor_name || '—'}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground hidden sm:table-cell">
                              {payout.tutor_email || '—'}
                            </td>
                            <td className="py-3 px-4 font-bold text-primary">
                              {CONFIG.CURRENCY}{(payout.amount || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={payout.status} />
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">
                              {payout.payout_date
                                ? new Date(payout.payout_date).toLocaleDateString(CONFIG.DATE_LOCALE, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : '—'}
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground hidden lg:table-cell">
                              {payout.payment_method || '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleRow(payout.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="px-4 py-3 bg-muted/20 border-b border-border/50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <p className="text-muted-foreground">Payout Reference</p>
                                    <p className="font-mono font-medium">{payout.payout_reference || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Net Amount</p>
                                    <p className="font-semibold">{CONFIG.CURRENCY}{(payout.net_amount || payout.amount || 0).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Fee</p>
                                    <p className="font-medium">{CONFIG.CURRENCY}{(payout.fee_amount || 0).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Batch ID</p>
                                    <p className="font-mono font-medium">{payout.batch_id || '—'}</p>
                                  </div>
                                  {payout.notes && (
                                    <div className="sm:col-span-2">
                                      <p className="text-muted-foreground">Notes</p>
                                      <p className="font-medium">{payout.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
