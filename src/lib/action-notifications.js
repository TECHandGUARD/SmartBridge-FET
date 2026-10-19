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

export async function dispatchMeetingNotifications(meetingId) {
  try {
    const { data, error } = await supabase.rpc('meeting_notification_ids', { meeting_key: meetingId });
    if (error) return { status: 'queued' };
    const results=[];
    for (let i=0;i<(data?.length||0);i+=10) results.push(await dispatchNotifications(data.slice(i,i+10)));
    return { status: results.some(result=>result.status==='queued')?'queued':results.some(result=>result.status==='accepted')?'accepted':'none' };
  } catch { return { status: 'queued' }; }
}
