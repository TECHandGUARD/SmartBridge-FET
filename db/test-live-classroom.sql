-- Uses the accounts/bookings from test-booking-checkout.sql; all fixtures roll back.
reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('smartbridge.cancel_booking','true',true);
update public.tutor_bookings set start_time=now()+interval '5 minutes',end_time=now()+interval '35 minutes'
where client_request_id='00000000-0000-4000-8000-000000009912';
select set_config('smartbridge.cancel_booking','false',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009902","role":"authenticated"}',true);
do $$declare b uuid;begin
 select id into b from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009912';
 if not public.can_join_live_classroom(b) then raise exception 'Tutor cannot join free introduction';end if;
 insert into public.classroom_signals(booking_id,sender_id,recipient_id,kind,payload) values(b,auth.uid(),'00000000-0000-4000-8000-000000009901','ready','{"session_id":"test"}');
 begin
 insert into public.classroom_signals(booking_id,sender_id,recipient_id,kind) values(b,auth.uid(),'00000000-0000-4000-8000-000000009903','ready');
 raise exception 'Signal sent to unbooked parent';
 exception when insufficient_privilege then null;end;
 begin
 insert into public.classroom_signals(booking_id,sender_id,recipient_id,kind) values(b,'00000000-0000-4000-8000-000000009901',auth.uid(),'ready');
 raise exception 'Sender identity forged';
 exception when insufficient_privilege then null;end;
 if exists(select 1 from public.classroom_signals where booking_id=b) then raise exception 'Sender read peer-addressed signals';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
do $$declare b uuid;begin
 select id into b from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009912';
 if not public.can_join_live_classroom(b) then raise exception 'Learner cannot join free introduction';end if;
 if (select count(*) from public.classroom_signals where booking_id=b)<>1 then raise exception 'Learner did not receive signal';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009903","role":"authenticated"}',true);
do $$declare b uuid;begin
 select id into b from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009912';
 if b is null or public.can_join_live_classroom(b) then raise exception 'Parent creator joined a learner-only classroom';end if;
 if exists(select 1 from public.classroom_signals where booking_id=b) then raise exception 'Parent read classroom signals';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('smartbridge.cancel_booking','true',true);
update public.tutor_bookings set start_time=now()+interval '21 minutes',end_time=now()+interval '51 minutes' where client_request_id='00000000-0000-4000-8000-000000009912';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
do $$begin
 if public.can_join_live_classroom((select id from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009912')) then raise exception 'Too-early access allowed';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.tutor_bookings set start_time=now()-interval '61 minutes',end_time=now()-interval '31 minutes' where client_request_id='00000000-0000-4000-8000-000000009912';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
do $$begin
 if public.can_join_live_classroom((select id from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009912')) then raise exception 'Expired access allowed';end if;
 if exists(select 1 from public.classroom_signals) then raise exception 'Expired signals readable';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.tutor_bookings set start_time=now(),end_time=now()+interval '30 minutes',status='cancelled' where client_request_id='00000000-0000-4000-8000-000000009912';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
do $$begin
 if public.can_join_live_classroom((select id from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009912')) then raise exception 'Cancelled booking access allowed';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('smartbridge.cancel_booking','false',true);
select 'PASS: real SQL classroom access, recipient RLS, sender spoofing, guardian exclusion and time/cancellation boundaries' result;
