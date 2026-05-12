import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp } from 'lucide-react';

export default function TutorEarningsTable({ tutors, bookings }) {
  const earnings = useMemo(() => {
    return tutors.map(tutor => {
      const tutorBookings = bookings.filter(b =>
        b.tutor_email === tutor.user_email &&
        (b.status === 'confirmed' || b.status === 'completed')
      );
      const totalHours = tutorBookings.reduce((s, b) => s + (b.duration_hours || 1), 0);
      const totalEarnings = tutorBookings.reduce((s, b) => {
        const earned = b.amount || (tutor.hourly_rate || 0) * (b.duration_hours || 1);
        return s + earned;
      }, 0);
      const pendingBookings = bookings.filter(b => b.tutor_email === tutor.user_email && b.status === 'pending');
      const pendingAmount = pendingBookings.reduce((s, b) => s + ((tutor.hourly_rate || 0) * (b.duration_hours || 1)), 0);
      return {
        ...tutor,
        confirmedSessions: tutorBookings.length,
        totalHours,
        totalEarnings,
        pendingAmount,
        pendingCount: pendingBookings.length,
      };
    }).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [tutors, bookings]);

  const grandTotal = earnings.reduce((s, t) => s + t.totalEarnings, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-playfair flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Tutor Earnings Tracker
          </CardTitle>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">Total Paid Out: <span className="font-bold">R{grandTotal.toFixed(0)}</span></span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 pr-3">Tutor</th>
                <th className="text-left py-2 pr-3">Rate/hr</th>
                <th className="text-left py-2 pr-3">Sessions</th>
                <th className="text-left py-2 pr-3">Hours</th>
                <th className="text-left py-2 pr-3">Earned (ZAR)</th>
                <th className="text-left py-2">Pending</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((t, i) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                      <div>
                        <p className="font-medium">{t.full_name}</p>
                        <p className="text-xs text-muted-foreground">{t.subjects?.slice(0, 2).join(', ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">R{t.hourly_rate || 0}/hr</td>
                  <td className="py-2.5 pr-3">
                    <Badge variant="outline" className="text-xs">{t.confirmedSessions}</Badge>
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{t.totalHours}h</td>
                  <td className="py-2.5 pr-3">
                    <span className="font-bold text-green-700">R{t.totalEarnings.toFixed(0)}</span>
                  </td>
                  <td className="py-2.5">
                    {t.pendingCount > 0 ? (
                      <span className="text-amber-600 text-xs">R{t.pendingAmount.toFixed(0)} ({t.pendingCount} pending)</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {earnings.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No tutor bookings recorded yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}