// A proposed introduction can be confirmed by the learner without a tutor-written URL.
export function bookingSessionLink(booking) {
  if (booking.status !== 'confirmed') return null;
  return booking.session_link || `/live-classroom/${encodeURIComponent(booking.id)}`;
}

export function hasBookingEnded(booking, now = Date.now()) {
  if (booking.end_time) return Date.parse(booking.end_time) <= now;

  // Older bookings store local South African time and a duration instead.
  const start = booking.start_time
    ? Date.parse(booking.start_time)
    : Date.parse(`${booking.date}T${booking.time}+02:00`);
  const duration = Number(booking.duration_hours ?? 1);
  return duration > 0 && Number.isFinite(duration) && start + duration * 3_600_000 <= now;
}
