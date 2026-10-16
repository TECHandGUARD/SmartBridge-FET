// Empty prices are unavailable; zero is an intentional free session.
export function parseTutorRate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (!['string', 'number'].includes(typeof value)) return NaN;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 && Math.abs(price * 100 - Math.round(price * 100)) < 0.000001 ? price : NaN;
}
export function tutorRate(tutor, subject) {
  const override = tutor?.subject_rates?.[subject];
  return parseTutorRate(override ?? tutor?.hourly_rate ?? tutor?.session_price_per_hour);
}
export function rateLabel(rate) {
  return rate === null || !Number.isFinite(rate) ? 'Rate not set' : rate === 0 ? 'Free' : `R${rate.toFixed(2)}/hr`;
}
export function bookingEstimate(tutor, form) {
  if (form.is_intro && tutor?.offers_free_intro) return 0;
  const rate = tutorRate(tutor, form.subject);
  return rate === null || !Number.isFinite(rate) ? null : Math.round(rate * Number(form.duration_hours) * 100) / 100;
}
