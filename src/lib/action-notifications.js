import { supabase } from './supabaseClient';

// Provider acceptance is distinct from inbox delivery. The DB outbox survives failed attempts.
export async function dispatchNotifications(eventIds) {
  if (!eventIds?.length) return { status: 'none' };
  try {
  const { data, error } = await supabase.functions.invoke('dispatch-notifications', { body: { event_ids: eventIds } });
  if (error || data?.failed) return { status: 'queued', message: 'Action saved. Email is queued and needs retry.' };
  return { status: data?.accepted ? 'accepted' : 'queued' };
  } catch { return { status: 'queued', message: 'Action saved. Email is queued and needs retry.' }; }
}
export async function approveAccount(userId, role) {
  const { data, error } = await supabase.rpc('approve_account', { target_id: userId, approved_role: role });
  if (error) throw error;
  const email = await dispatchNotifications([data.notification_id]);
  return { ...data, email };
}
export async function dispatchBookingNotifications(bookingId) {
  const { data, error } = await supabase.rpc('action_notification_ids', { action_booking: bookingId });
  if (error) return { status: 'queued' };
  return dispatchNotifications(data);
}
