import { supabase } from './supabaseClient';
import { withTimeout } from './auth-utils';

// Both booking screens use this one contract. Keep the same request ID on retry.
export async function createBooking(tutor, form, requestId) {
  const { data, error } = await withTimeout(supabase.rpc('create_booking', {
    profile_id: tutor.id, chosen_subject: form.subject, chosen_date: form.date,
    chosen_time: form.time, hours: Number(form.duration_hours),
    booking_message: form.message?.trim() || '', request_id: requestId,
  }));
  if (error) throw error;
  return data;
}
