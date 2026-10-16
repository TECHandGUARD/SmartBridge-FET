// A retry of the same intent reuses its ID; editing the intent starts a new request.
export function bookingRequest(previous, tutor, form) {
  const fingerprint = JSON.stringify([tutor.id, form.subject, form.date, form.time, Number(form.duration_hours), form.message?.trim() || '', !!form.is_intro]);
  return previous?.fingerprint === fingerprint ? previous : { fingerprint, id: crypto.randomUUID() };
}
