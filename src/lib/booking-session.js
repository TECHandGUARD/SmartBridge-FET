// A proposed introduction can be confirmed by the learner without a tutor-written URL.
export function bookingSessionLink(booking) {
  if (booking.status !== 'confirmed') return null;
  return booking.session_link || `/live-classroom/${encodeURIComponent(booking.id)}`;
}
