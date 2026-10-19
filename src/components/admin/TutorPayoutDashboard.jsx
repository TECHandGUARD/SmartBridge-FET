import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {dispatchBookingNotifications} from '@/lib/action-notifications';
import BookingPaymentStatus from '@/components/tutor/BookingPaymentStatus';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'sonner';
export default function TutorPayoutDashboard(){
 const [bookings,setBookings]=useState([]),[orders,setOrders]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(''),[references,setReferences]=useState({});
 const load=useCallback(async()=>{
  const [b,o]=await Promise.all([supabase.from('tutor_bookings').select('*').order('created_at',{ascending:false}).limit(200),supabase.from('payment_orders').select('*').eq('product','booking').order('created_at',{ascending:false}).limit(200)]);
  if(b.error||o.error){setError('Payment records could not load.');return;}
  setBookings(b.data||[]);setOrders(o.data||[]);setError('');
 },[]);
 useEffect(()=>{load();const timer=setInterval(load,15000);return()=>clearInterval(timer);},[load]);
 const refund=async booking=>{
  setBusy(booking.id);
  try{const {data,error}=await supabase.functions.invoke('create-checkout',{body:{action:'refund_booking',booking_id:booking.id}});if(error)throw error;toast.success(data.status==='refunded'?'Provider confirmed refund.':'Refund requested; provider settlement pending.');await dispatchBookingNotifications(booking.id);await load();}
  catch{toast.error('Refund could not be completed. Refresh and check the provider status before retrying.');}finally{setBusy('');}
 };
 const payout=async booking=>{
  setBusy(booking.id);
  try{const {error}=await supabase.rpc('record_tutor_payout',{booking_key:booking.id,transfer_reference:references[booking.id]});if(error)throw error;toast.success('Verified transfer recorded.');await dispatchBookingNotifications(booking.id);await load();}
  catch(error){toast.error(error.message||'Could not record payout.');}finally{setBusy('');}
 };
 return <div className="space-y-4"><h2 className="text-xl font-bold">Booking payments & tutor payouts</h2><p className="text-sm text-muted-foreground">Payment receipts, tutor acceptance and tutor transfers are tracked separately. Test payments never count as money received or payable earnings.</p><Button variant="outline" onClick={load}>Refresh records</Button>{error&&<p role="alert">{error}</p>}{!bookings.length&&!error&&<p>No bookings yet.</p>}{bookings.map(b=>{const o=orders.find(order=>order.booking_id===b.id);return <article key={b.id} className="border rounded-xl p-4 space-y-3"><p className="font-semibold">{b.subject} · {b.student_name||b.student_email} → {b.tutor_name||b.tutor_email}</p><p className="text-sm">{b.date} at {b.time} · R{Number(b.amount||0).toFixed(2)}</p><BookingPaymentStatus booking={b}/><p className="text-sm">Fee snapshot: R{Number(b.platform_fee||0).toFixed(2)} · Tutor net: R{Number(b.tutor_net||0).toFixed(2)}</p>{o&&<p className="text-xs break-all">{o.provider} · {o.mode} · Order {o.id} · Receipt {o.payment_id||'Not received'} · Refund {o.mode==='test'?'Not applicable — test payment':o.refund_status}</p>}{o?.mode==='test'&&<p className="text-sm text-muted-foreground">Yoco refunds require a payment made in live mode. This test payment moved no real money and cannot be refunded. Its verified test receipt is kept for your records.</p>}{b.status==='cancelled'&&o?.mode==='live'&&o?.status==='paid'&&!['refunded','pending'].includes(o.refund_status)&&<Button disabled={busy===b.id} onClick={()=>refund(b)}>Refund full {o.mode==='test'?'test ':''}booking payment</Button>}{b.status==='completed'&&b.payment_status==='paid'&&b.payment_mode==='live'&&b.payout_status==='pending'&&<div className="space-y-2"><label className="text-sm">Verified bank transfer reference<Input value={references[b.id]||''} onChange={e=>setReferences(v=>({...v,[b.id]:e.target.value}))}/></label><Button disabled={busy===b.id||!references[b.id]?.trim()} onClick={()=>payout(b)}>Record completed tutor transfer</Button><p className="text-xs">Use after confirming the transfer with your bank. This records the payment; it does not send funds.</p></div>}</article>})}</div>;
}
