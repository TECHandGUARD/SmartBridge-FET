import { tutorBookingSummary } from '@/lib/tutor-booking-finance';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp } from 'lucide-react';

// ============================================================
// Configuration (Soft-coded for future flexibility)
// ============================================================

const currency = import.meta.env.VITE_CURRENCY || 'ZAR';

// ============================================================
// Main Component
// ============================================================

export default function TutorEarningsTable({ tutors = [], bookings = [] }) {
  const earnings = useMemo(() => {
    if (!tutors.length || !bookings.length) return [];

    return tutors
      .map(tutor => ({...tutor, ...tutorBookingSummary(tutor, bookings)}))
      .filter(t => t.confirmedSessions > 0 || t.pendingCount > 0)
      .sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [tutors, bookings]);

  const grandTotal = earnings.reduce((s, t) => s + t.totalEarnings, 0);
  const recordedPayments = earnings.reduce((sum, tutor) => sum + tutor.receivedAmount, 0);
  const missingAmounts = earnings.reduce((sum, tutor) => sum + tutor.missingAmounts, 0);
  const totalPending = earnings.reduce((s, t) => s + t.pendingAmount, 0);

  if (!tutors.length || !bookings.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Tutor Session Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8 text-sm">
            No tutor data available. Please ensure tutors and bookings are loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-playfair flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Tutor Session Value
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                Confirmed / completed: <span className="font-bold">{currency} {grandTotal.toFixed(2)}</span>
              </span>
            </div>
            {totalPending > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-600">
                  Awaiting confirmation: <span className="font-bold">{currency} {totalPending.toFixed(2)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">Recorded payments on active bookings: {currency} {recordedPayments.toFixed(2)}. Session values are booked amounts, not tutor payouts. Sponsored funding is tracked separately and must be reconciled before settlement. Cancelled bookings are excluded.</p>
        {missingAmounts > 0 && <p role="status" className="mb-3 text-sm text-amber-700">{missingAmounts} booking(s) have no valid saved price. Their value is excluded until reviewed; current tutor rates are not substituted.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 pr-3">Tutor</th>
                <th className="text-left py-2 pr-3">Current rate/hr</th>
                <th className="text-left py-2 pr-3">Sessions</th>
                <th className="text-left py-2 pr-3">Hours</th>
                <th className="text-left py-2 pr-3">Session value ({currency})</th>
                <th className="text-left py-2">Awaiting confirmation</th>
              </tr>
            </thead>
            <tbody>
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                    No tutor bookings recorded yet.
                  </td>
                </tr>
              ) : (
                earnings.map((t, i) => (
                  <tr key={t.id || i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground'}`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium">{t.full_name || 'Unknown Tutor'}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.subjects?.slice(0, 2).join(', ') || 'No subjects'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {currency} {t.hourly_rate == null ? 'Not set' : Number(t.hourly_rate).toFixed(2) + '/hr'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="outline" className="text-xs">{t.confirmedSessions}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {t.totalHours.toFixed(1)}h
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="font-bold text-green-700">
                        {currency} {t.totalEarnings.toFixed(2)}
                      </span>
                      <p className="text-xs text-muted-foreground">Recorded payments: {currency} {t.receivedAmount.toFixed(2)}</p>
                      {t.sponsoredValue > 0 && <p className="text-xs text-muted-foreground">Sponsored confirmed / completed: {currency} {t.sponsoredValue.toFixed(2)} · settlement separate</p>}
                    </td>
                    <td className="py-2.5">
                      {t.pendingCount > 0 ? (
                        <span className="text-amber-600 text-xs">
                          {currency} {t.pendingAmount.toFixed(2)} ({t.pendingCount} pending)
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
