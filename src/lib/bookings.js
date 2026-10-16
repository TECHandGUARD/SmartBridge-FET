import { supabase } from './supabaseClient';
import { withTimeout } from './auth-utils';
import { dispatchNotifications, dispatchBookingNotifications } from './action-notifications';

// Both booking screens use this one contract. Keep the same request ID on retry.
export async function createBooking(tutor, form, requestId) {
  const { data, error } = await withTimeout(supabase.rpc('create_booking', {
    profile_id: tutor.id, chosen_subject: form.subject, chosen_date: form.date,
    chosen_time: form.time, hours: Number(form.duration_hours),
    booking_message: form.message?.trim() || '', request_id: requestId,
    ...(form.is_intro ? { free_intro: true } : {}),
  }));
  if (error) throw error;
  await dispatchBookingNotifications(data.id);
  return data;
}

export async function cancelBooking(id, message) {
  const { data, error } = await withTimeout(supabase.rpc('cancel_booking', { booking_id: id, cancellation_message: message }));
  if (error) throw error;
  const email = await dispatchNotifications(data.notification_ids || []);
  return { ...data, email };
}
