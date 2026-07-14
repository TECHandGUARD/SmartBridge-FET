import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, CheckCircle, Clock, Send, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for future flexibility)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const currency = import.meta.env.VITE_CURRENCY || 'ZAR';
const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

// ============================================================
// Main Component
// ============================================================

export default function TutorPayoutDashboard() {
  const [bookings, setBookings] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, t] = await Promise.all([
        supabase.from('tutor_bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('tutor_profiles').select('*').order('created_at', { ascending: false }),
      ]);
      
      setBookings(b.data || []);
      setTutors(t.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed');

  // Group by tutor and calculate earnings
  const payoutRows = tutors
    .map(tutor => {
      const tutorBookings = completedBookings.filter(b => b.tutor_email === tutor.user_email);
      const grossRevenue = tutorBookings.reduce((s, b) => s + (b.amount || b.total_amount || 0), 0);
      const isPro = tutor.is_premium;
      const commission = isPro ? 0 : (grossRevenue * 0.10 + tutorBookings.length * 20);
      const netPayout = Math.max(0, grossRevenue - commission);
      return { ...tutor, bookingCount: tutorBookings.length, grossRevenue, commission, netPayout, isPro };
    })
    .filter(t => t.bookingCount > 0)
    .sort((a, b) => b.netPayout - a.netPayout);

  const totalGross = payoutRows.reduce((s, t) => s + t.grossRevenue, 0);
  const totalCommission = payoutRows.reduce((s, t) => s + t.commission, 0);
  const totalPayout = payoutRows.reduce((s, t) => s + t.netPayout, 0);

  const sendPayoutEmail = async (tutor) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: tutor.user_email,
          subject: `💰 ${appName} — Payout Notification (Thursday)`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0F766E, #0d9488); padding: 20px; border-radius: 10px 10px 0 0; color: white;">
                <h2 style="margin: 0;">💰 Payout Notification</h2>
              </div>
              <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
                <p>Hi <strong>${tutor.full_name}</strong>,</p>
                <p>Your payout for this week's sessions is scheduled for Thursday.</p>
                
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #0F766E;">
                  <h3 style="margin-top: 0; color: #166534;">📊 Summary</h3>
                  <p style="margin: 5px 0;">• Confirmed sessions: <strong>${tutor.bookingCount}</strong></p>
                  <p style="margin: 5px 0;">• Gross earnings: <strong>${currency} ${tutor.grossRevenue}</strong></p>
                  <p style="margin: 5px 0;">• Platform fee: <strong>${currency} ${tutor.commission.toFixed(2)}</strong></p>
                  <p style="margin: 10px 0 0 0; font-size: 18px;"><strong>✅ Net payout: ${currency} ${tutor.netPayout.toFixed(2)}</strong></p>
                </div>
                
                <p>Payments are processed every Thursday to your registered banking details.</p>
                
                <p>If you have not yet submitted your banking details, please contact <a href="mailto:aneleq@techandguard.co.za" style="color: #0F766E;">aneleq@techandguard.co.za</a> urgently.</p>
                
                <hr style="margin: 20px 0; border-color: #e5e7eb;">
                
                <p style="font-size: 11px; color: #999; text-align: center;">
                  — ${appName} / Tech &amp; GUARD Pty Ltd<br>
                  <a href="${appUrl}" style="color: #0F766E;">${appUrl}</a>
                </p>
              </div>
            </div>
          `,
        },
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error sending payout email:', error);
      return { success: false, error };
    }
  };

  const handleNotifyPayout = async (tutor) => {
    setPaying(tutor.id);
    try {
      const result = await sendPayoutEmail(tutor);
      if (result.success) {
        toast.success(`Payout notification sent to ${tutor.full_name}`);
      } else {
        throw new Error('Email sending failed');
      }
    } catch (error) {
      console.error('Error sending payout email:', error);
      toast.error(`Failed to send email to ${tutor.full_name}`);
    } finally {
      setPaying(null);
    }
  };

  const notifyAllTutors = async () => {
    let successCount = 0;
    let failCount = 0;
    for (const tutor of payoutRows) {
      setPaying(tutor.id);
      try {
        const result = await sendPayoutEmail(tutor);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error('Error sending payout email:', error);
        failCount++;
      }
      setPaying(null);
    }
    if (failCount > 0) {
      toast.warning(`✅ ${successCount} tutors notified, ❌ ${failCount} failed`);
    } else {
      toast.success(`✅ All ${successCount} tutors notified successfully!`);
    }
  };

  const exportPayoutCSV = () => {
    const csv = [
      ['Tutor Name', 'Email', 'Plan', 'Sessions', 'Gross (R)', 'Commission (R)', 'Net Payout (R)'].join(','),
      ...payoutRows.map(t => [
        t.full_name, t.user_email, t.isPro ? 'Pro' : 'Standard', 
        t.bookingCount, t.grossRevenue, t.commission.toFixed(2), t.netPayout.toFixed(2)
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `payouts-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const isThursday = new Date().getDay() === 4;
  const nextThursday = (() => {
    const d = new Date();
    const daysUntil = (4 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntil);
    return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  })();

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Thursday payout banner */}
      {isThursday ? (
        <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">🎉 Today is Payout Thursday!</p>
            <p className="text-xs text-green-700">Process all tutor payouts now and click "Notify All" to send email confirmations.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-800">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Next payout day: <strong>{nextThursday}</strong>. Payouts are processed every Thursday by Tech &amp; GUARD Pty Ltd.</span>
        </div>
      )}
      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Gross Revenue', value: `${currency} ${totalGross}`, color: 'bg-blue-100 text-blue-700' },
          { label: 'Platform Commission', value: `${currency} ${totalCommission.toFixed(2)}`, color: 'bg-amber-100 text-amber-700' },
          { label: 'Total Tutor Payouts', value: `${currency} ${totalPayout.toFixed(2)}`, color: 'bg-green-100 text-green-700' },
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
              <DollarSign className="w-4 h-4 text-primary" /> Thursday Payout Schedule
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={exportPayoutCSV}>
                <Download className="w-3 h-3" /> Export CSV
              </Button>
              <Button size="sm" className="h-7 px-3 gap-1 text-xs bg-primary" onClick={notifyAllTutors} disabled={payoutRows.length === 0}>
                <Send className="w-3 h-3" /> Notify All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payoutRows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No completed bookings to pay out yet.</p>
          ) : (
            <div className="space-y-2">
              {payoutRows.map(tutor => (
                <div key={tutor.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {tutor.full_name?.[0] || 'T'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{tutor.full_name}</p>
                      <Badge className={tutor.isPro ? 'bg-primary/10 text-primary text-xs' : 'bg-muted text-muted-foreground text-xs'}>
                        {tutor.isPro ? 'Pro (0%)' : 'Standard (10%+R20)'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tutor.bookingCount} sessions · Gross: {currency} {tutor.grossRevenue} · Fee: {currency} {tutor.commission.toFixed(0)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-green-700 text-sm">{currency} {tutor.netPayout.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">net payout</p>
                  </div>
                  <Button size="sm" variant="outline"
                    className="h-7 px-2 gap-1 text-xs flex-shrink-0"
                    disabled={paying === tutor.id}
                    onClick={() => handleNotifyPayout(tutor)}>
                    {paying === tutor.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Notify
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Payouts processed every Thursday by Tech &amp; GUARD Pty Ltd. Commission: Standard = 10% + R20/session. Pro = 0%.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
