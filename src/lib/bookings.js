import { bookingEstimate } from './tutor-pricing';
import { supabase } from './supabaseClient';
import { withTimeout } from './auth-utils';
import { invokePayment } from './payment-api';
import { dispatchNotifications, dispatchBookingNotifications } from './action-notifications';

// Both booking screens use this one contract. Keep the same request ID on retry.
export async function createBooking(tutor, form, requestId) {
  const estimated = bookingEstimate(tutor, form);
  if (estimated === null) throw new Error('Tutor price is unavailable.');
  const sponsored = form.sponsorship_allocation_id && !form.is_intro && estimated>0;
  const { data, error } = await withTimeout(supabase.rpc(sponsored ? 'create_sponsored_booking' : form.learner_id ? 'book_for_learner' : 'create_booking', {
    ...(form.learner_id && !sponsored ? {learner_id: form.learner_id} : {}),
    ...(sponsored ? {allocation: form.sponsorship_allocation_id} : {}),
    profile_id: tutor.id, chosen_subject: form.subject, chosen_date: form.date,
    chosen_time: form.time, hours: Number(form.duration_hours),
    booking_message: form.message?.trim() || '', request_id: requestId,
    ...(!sponsored ? { free_intro: !!form.is_intro } : {}),
  }));
  if (error) throw error;
  if (Number(data.amount) > 0 && !sponsored) { const redirecting = await payForBooking(data); return {...data,redirecting}; }
  await dispatchBookingNotifications(data.id);
  return data;
}

export async function cancelBooking(id, message) {
  const { data, error } = await withTimeout(supabase.rpc('cancel_booking', { booking_id: id, cancellation_message: message }));
  if (error) throw error;
  const email = await dispatchNotifications(data.notification_ids || []);
  return { ...data, email };
}

export async function payForBooking(booking) {
  const {data:availability,error:gatewayError}=await invokePayment(supabase,'payment-gateways',{});
  if(gatewayError) throw new Error('Payment options could not load. Your reservation is saved in Bookings; retry payment there.');
  const gateway=availability?.gateways?.find(item=>item.enabled && item.ready)?.provider;
  if(!availability?.checkout_active || !gateway) throw new Error('Online checkout is unavailable. Your reservation is awaiting payment in Bookings.');
  const {data,error}=await invokePayment(supabase,'create-checkout',{product:'booking',booking_id:booking.id,request_id:booking.id,gateway},{timeout:30000});
  if(error) {
    let detail;try {detail=await error.context?.json();}catch { /* Keep a useful retry message. */ }
    throw new Error(detail?.error || 'Checkout could not open. Your reservation is saved in Bookings; retry payment there.');
  }
  if(data?.status==='paid') { await dispatchBookingNotifications(booking.id); return false; }
  if(data?.amount_cents!==Math.round(Number(booking.amount)*100)) throw new Error('The booking amount does not match checkout. Refresh Bookings before paying.');
  const url=new URL(data.redirect_url);
  if(url.protocol!=='https:' || url.username || url.password || !(gateway==='yoco'?['c.yoco.com','pay.yoco.com']:['checkout.paystack.com']).includes(url.hostname)) throw new Error('Invalid payment redirect');
  window.location.assign(url.href);
  return true;
}
export async function arrangeIntroduction(bookingId, action, date=null, time=null) {
  const {data,error}=await supabase.rpc('arrange_introduction',{booking_key:bookingId,action,new_date:date,new_time:time});
  if(error)throw error;
  await dispatchBookingNotifications(bookingId);
  return data;
}
