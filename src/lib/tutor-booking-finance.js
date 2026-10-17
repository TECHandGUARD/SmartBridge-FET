// Report the immutable booking price, never today's tutor rate. Keep sums in cents.
function cents(value) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}
export function tutorBookingSummary(tutor, bookings) {
  const own = bookings.filter(booking =>
    tutor.user_id && booking.tutor_id ? tutor.user_id === booking.tutor_id :
      !!tutor.user_email && tutor.user_email === booking.tutor_email
  ).filter(booking => ['pending', 'confirmed', 'completed'].includes(booking.status));
  const committed = own.filter(booking => booking.status !== 'pending');
  const pending = own.filter(booking => booking.status === 'pending');
  const sum = (rows, field = 'amount') => rows.reduce((total, booking) => total + (cents(booking[field]) ?? 0), 0) / 100;
  const sponsored = committed.filter(booking => !!booking.sponsorship_allocation_id || booking.payment_status === 'sponsored');
  const received = own.filter(booking => booking.payment_status === 'paid' && !booking.sponsorship_allocation_id);
  return {
    confirmedSessions: committed.length,
    totalHours: committed.reduce((total, booking) => total + (Number.isFinite(Number(booking.duration_hours)) && Number(booking.duration_hours) > 0 ? Number(booking.duration_hours) : 0), 0),
    totalEarnings: sum(committed), // Legacy component name; represents session value, not settled earnings.
    pendingAmount: sum(pending),
    pendingCount: pending.length,
    receivedAmount: sum(received, 'amount_paid'),
    sponsoredValue: sum(sponsored),
    missingAmounts: own.filter(booking => cents(booking.amount) === null).length,
  };
}
