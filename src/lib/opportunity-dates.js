/** Calendar dates are compared in South Africa, including the whole closing day. */
export function southAfricanDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function opportunityStatus(item, today = southAfricanDate()) {
  const opens = item.metadata?.opens_on;
  if (item.deadline && item.deadline < today) return 'Closed';
  if (opens && opens > today) return 'Opening soon';
  if (!item.deadline) return 'Dates unconfirmed';
  return 'Open';
}
export function formatOpportunityDate(date) {
  if (!date) return 'Not published';
  return new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00+02:00`));
}
