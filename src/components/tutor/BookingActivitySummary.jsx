import {bookingActivitySummary} from '@/lib/payment-reporting';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
export default function BookingActivitySummary({bookings = [], recent = false}) {
  const activity = bookingActivitySummary(bookings);
  return <Card><CardHeader className="pb-2"><CardTitle className="text-lg">{recent ? 'Recent booking activity' : 'Booking activity'}</CardTitle></CardHeader><CardContent className="space-y-2">
    <p className="text-sm">{activity.total} bookings · {activity.confirmed} currently confirmed · {activity.completed} completed · {activity.cancelled} canceled</p>
    <p className="font-semibold">Test payments: R{activity.testPaymentValue.toFixed(2)} · {activity.testPayments} verified</p>
    <p className="text-sm">{activity.testRefunds} test refunds confirmed</p>
    <p className="text-xs text-muted-foreground">Test payment history includes canceled bookings. Test amounts are simulated and do not count as live receipts or payable earnings.{recent ? ' Shows the latest 200 bookings.' : ''}</p>
  </CardContent></Card>;
}
