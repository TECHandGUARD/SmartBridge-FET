import { Badge } from '@/components/ui/badge';
export function bookingFundingReady(booking) {
  return Number(booking.amount) === 0 || ['paid', 'test_paid', 'sponsored'].includes(booking.payment_status);
}
export default function BookingPaymentStatus({ booking }) {
  const text = booking.is_intro ? 'Free introduction · tutor approval required' : Number(booking.amount) === 0 ? 'Free session' : ({paid:'Paid · verified',test_paid:'TEST payment verified · no real money',sponsored:'Sponsored',refunded:'Refunded',failed:'Payment failed'})[booking.payment_status] || (booking.hold_expires_at && new Date(booking.hold_expires_at) <= new Date() ? 'Payment reservation expired' : 'Awaiting payment');
  return <div className="space-y-1 text-xs"><Badge variant="outline">{text}</Badge>{booking.amount > 0 && <p>Booking acceptance: {booking.status}. Tutor payout: {booking.payment_mode === 'test' ? 'Not applicable in test mode' : booking.payout_status || 'Not due'}.</p>}{booking.refund_eligibility && booking.refund_eligibility !== 'no_payment' && <p>Refund: {booking.payment_status === 'refunded' ? 'Verified' : 'Review or settlement pending'}.</p>}</div>;
}
