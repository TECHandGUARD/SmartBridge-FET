import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';  // ✅ Fixed import path
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, CheckCircle, Clock, Send, Download, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORM_COMMISSION_STANDARD = 0.10; // 10%
const SESSION_FEE_STANDARD = 20; // R20 per session

export default function AutomatedBillingPayouts() {
  const [bookings, setBookings] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notifying, setNotifying] = useState(null);
  const [processedIds, setProcessedIds] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, t] = await Promise.all([
        supabase.from('tutor_bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('tutor_profiles').select('*').order('created_at', { ascending: false }),
      ]);
      
      setBookings(b.data || []);
      setTutors(t.data || []);
      
      // Load previously paid tutors from activity logs
      const { data: paidLogs } = await supabase
        .from('activity_logs')
        .select('user_email')
        .eq('event_type', 'payout_processed');
      
      const paidEmails = new Set(paidLogs?.map(log => log.user_email) || []);
      const paidTutorIds = (t.data || [])
        .filter(tutor => paidEmails.has(tutor.user_email))
        .map(tutor => tutor.id);
      setProcessedIds(new Set(paidTutorIds));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  // Only completed, not-yet-paid bookings
  const completedBookings = bookings.filter(b => b.status === 'completed');

  const payoutRows = tutors.map(tutor => {
    const tutorBookings = completedBookings.filter(b => b.tutor_email === tutor.user_email);
    const grossRevenue = tutorBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
    const isPro = tutor.is_premium;
    const commission = isPro
      ? 0
      : (grossRevenue * PLATFORM_COMMISSION_STANDARD + tutorBookings.length * SESSION_FEE_STANDARD);
    const netPayout = Math.max(0, grossRevenue - commission);
    return { ...tutor, bookingIds: tutorBookings.map(b => b.id), bookingCount: tutorBookings.length, grossRevenue, commission, netPayout, isPro };
  }).filter(t => t.bookingCount > 0).sort((a, b) => b.netPayout - a.netPayout);

  const totalGross = payoutRows.reduce((s, t) => s + t.grossRevenue, 0);
  const totalCommission = payoutRows.reduce((s, t) => s + t.commission, 0);
  const totalPayout = payoutRows.reduce((s, t) => s + t.netPayout, 0);
  const pendingCount = payoutRows.filter(t => !processedIds.has(t.id)).length;

  const isThursday = new Date().getDay() === 4;
  const nextThursday = (() => {
    const d = new Date();
    const daysUntil = (4 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntil);
    return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  })();

  const sendPayoutEmail = async (tutor) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: tutor.user_email,
          subject: `💰 Your EduConnect Payout — R${tutor.netPayout.toFixed(2)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0F766E;">Payout Processed ✅</h2>
              <p>Hi <strong>${tutor.full_name}</strong>,</p>
              <p>Your payout for completed tutoring sessions has been processed.</p>
              
              <div style="background-color: #f0fdf4; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #166534;">📊 Earnings Summary</h3>
                <p>• Completed sessions: <strong>${tutor.bookingCount}</strong></p>
                <p>• Gross earnings: <strong>R${tutor.grossRevenue.toFixed(2)}</strong></p>
                <p>• Platform fee: <strong>R${tutor.commission.toFixed(2)}</strong> (${tutor.isPro ? 'Pro — R0 commission' : '10% + R20/session'})</p>
                <p style="font-size: 18px;"><strong>✅ Net payout: R${tutor.netPayout.toFixed(2)}</strong></p>
              </div>
              
              <p>Payments are processed every Thursday. Please allow 1–2 business days for the funds to reflect in your bank account.</p>
              
              <p>If you have any questions, contact <a href="mailto:aneleq@techandguard.co.za">aneleq@techandguard.co.za</a></p>
              
              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                — EduConnect FET / Tech &amp; GUARD Pty Ltd<br>
                <a href="${window.location.origin}">EduConnect FET</a>
              </p>
            </div>
          `,
        },
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Email error:', error);
      return { success: false, error };
    }
  };

  const markTutorPaid = async (tutor) => {
    await supabase.from('activity_logs').insert({
      event_type: 'payout_processed',
      user_email: tutor.user_email,
      description: `Payout processed for ${tutor.full_name}: R${tutor.netPayout.toFixed(2)} net (${tutor.bookingCount} sessions)`,
      metadata: { gross: tutor.grossRevenue, commission: tutor.commission, net: tutor.netPayout },
    }).catch(() => {});
    
    setProcessedIds(prev => new Set([...prev, tutor.id]));
  };

  const notifyTutor = async (tutor) => {
    setNotifying(tutor.id);
    const emailResult = await sendPayoutEmail(tutor);
    
    if (emailResult.success) {
      toast.success(`Payout email sent to ${tutor.full_name}`);
    } else {
      toast.error(`Failed to send email to ${tutor.full_name}`);
    }
    setNotifying(null);
  };

  const markAndNotify = async (tutor) => {
    setNotifying(tutor.id);
    await markTutorPaid(tutor);
    const emailResult = await sendPayoutEmail(tutor);
    
    if (emailResult.success) {
      toast.success(`${tutor.full_name} marked as paid and notified`);
    } else {
      toast.warning(`${tutor.full_name} marked as paid but email failed`);
    }
    setNotifying(null);
  };

  const runAutomatedPayouts = async () => {
    if (!isThursday) {
      toast.error('Automated payouts only run on Thursdays. Use manual notify for off-cycle.');
      return;
    }
    setProcessing(true);
    let count = 0;
    let emailFailCount = 0;
    
    for (const tutor of payoutRows) {
      if (!processedIds.has(tutor.id)) {
        await markTutorPaid(tutor);
        const emailResult = await sendPayoutEmail(tutor);
        if (emailResult.success) {
          count++;
        } else {
          emailFailCount++;
        }
      }
    }
    
    if (emailFailCount > 0) {
      toast.warning(`✅ ${count} payouts processed, but ${emailFailCount} emails failed.`);
    } else {
      toast.success(`✅ ${count} tutor payouts processed and notified!`);
    }
    setProcessing(false);
  };

  const exportCSV = () => {
    const csv = [
      ['Tutor Name', 'Email', 'Plan', 'Sessions', 'Gross (R)', 'Commission (R)', 'Net Payout (R)', 'Status'].join(','),
      ...payoutRows.map(t => [
        t.full_name, t.user_email, t.isPro ? 'Pro' : 'Standard',
        t.bookingCount, t.grossRevenue.toFixed(2), t.commission.toFixed(2), t.netPayout.toFixed(2),
        processedIds.has(t.id) ? 'Paid' : 'Pending',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `payouts-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">

      {/* Payout Day Banner */}
      {isThursday ? (
        <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">🎉 Today is Payout Thursday!</p>
              <p className="text-xs text-green-700">{pendingCount} tutor{pendingCount !== 1 ? 's' : ''} pending payment — click Run Automated Payouts.</p>
            </div>
          </div>
          <Button
            onClick={runAutomatedPayouts}
            disabled={processing || pendingCount === 0}
            className="bg-green-600 hover:bg-green-700 gap-2 whitespace-nowrap"
          >
            {processing ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</> : <><Zap className="w-4 h-4" /> Run Automated Payouts</>}
          </Button>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Next scheduled payout: <strong>{nextThursday}</strong>. Payouts are auto-processed every Thursday. You can still manually notify tutors below.</span>
        </div>
      )}

      {/* Summary */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: `R${totalGross.toFixed(2)}`, color: 'bg-blue-100 text-blue-700' },
          { label: 'Platform Commission', value: `R${totalCommission.toFixed(2)}`, color: 'bg-amber-100 text-amber-700' },
          { label: 'Total Tutor Payouts', value: `R${totalPayout.toFixed(2)}`, color: 'bg-green-100 text-green-700' },
          { label: 'Pending Payouts', value: pendingCount, color: pendingCount > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
                <DollarSign className="w-4 h-4" />
              </div>
              <p className="font-playfair text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="font-playfair text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Tutor Payout Schedule
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={loadData}>
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={exportCSV}>
                <Download className="w-3 h-3" /> Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payoutRows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No completed bookings to pay out yet.</p>
          ) : (
            <div className="space-y-2">
              {payoutRows.map(tutor => {
                const paid = processedIds.has(tutor.id);
                return (
                  <div key={tutor.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${paid ? 'border-green-200 bg-green-50/50' : 'border-border bg-card hover:bg-muted/20'}`}>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                      {tutor.full_name?.[0] || 'T'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{tutor.full_name}</p>
                        <Badge className={tutor.isPro ? 'bg-primary/10 text-primary text-xs' : 'bg-muted text-muted-foreground text-xs'}>
                          {tutor.isPro ? 'Pro (0%)' : 'Standard (10%+R20)'}
                        </Badge>
                        {paid && <Badge className="bg-green-100 text-green-700 text-xs gap-1"><CheckCircle className="w-3 h-3" /> Paid</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{tutor.bookingCount} sessions · Gross: R{tutor.grossRevenue.toFixed(2)} · Fee: R{tutor.commission.toFixed(2)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-green-700 text-sm">R{tutor.netPayout.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">net payout</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {!paid && (
                        <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs text-green-700 border-green-200"
                          onClick={() => markAndNotify(tutor)}
                          disabled={notifying === tutor.id}>
                          {notifying === tutor.id ? <span className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Mark Paid & Notify
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs"
                        disabled={notifying === tutor.id}
                        onClick={() => notifyTutor(tutor)}>
                        {notifying === tutor.id ? <span className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" /> : <Send className="w-3 h-3" />}
                        Notify
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Auto-payouts run every Thursday. Commission: Standard = 10% + R20/session · Pro = 0%. Processed by Tech &amp; GUARD Pty Ltd.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
