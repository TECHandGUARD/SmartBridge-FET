reset role;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email) values
('00000000-0000-4000-8000-000000009901','booking-student@example.invalid'),
('00000000-0000-4000-8000-000000009902','booking-tutor@example.invalid'),
('00000000-0000-4000-8000-000000009903','booking-parent@example.invalid'),
('00000000-0000-4000-8000-000000009904','booking-admin@example.invalid');
update public.users set role=case right(id::text,1) when '1' then 'student' when '2' then 'sace_tutor' when '3' then 'parent' else 'admin' end,is_active=true,onboarding_complete=true,is_verified=true where id::text like '%00000000990_';
insert into public.tutor_profiles(id,user_id,user_email,full_name,subjects,hourly_rate,is_verified,is_active,offers_free_intro)
values('00000000-0000-4000-8000-000000009905','00000000-0000-4000-8000-000000009902','booking-tutor@example.invalid','Booking Tutor',array['History'],150,true,true,true);
insert into public.parent_student_links(parent_id,student_id,status) values('00000000-0000-4000-8000-000000009903','00000000-0000-4000-8000-000000009901','approved');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
select public.create_booking('00000000-0000-4000-8000-000000009905','History',current_date+120,'10:00',1,'Paid booking','00000000-0000-4000-8000-000000009911',false);
select public.create_booking('00000000-0000-4000-8000-000000009905','History',current_date+121,'10:00',0.5,'Intro booking','00000000-0000-4000-8000-000000009912',true);
do $$begin
 begin perform public.create_booking_payment_order(auth.uid(),gen_random_uuid(),'test','yoco');raise exception 'Client made payment order';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009902","role":"authenticated"}',true);
do $$begin
 begin update public.tutor_bookings set status='confirmed' where client_request_id='00000000-0000-4000-8000-000000009911';raise exception 'Unpaid accepted';exception when raise_exception then if sqlerrm='Unpaid accepted' then raise;end if;end;
 perform public.arrange_introduction((select id from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009912'),'propose',current_date+121,'11:00');
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
do $$declare b public.tutor_bookings;begin
 b:=public.arrange_introduction((select id from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009912'),'accept_proposal');
 if b.status<>'confirmed' or b.time<>'11:00' or b.amount<>0 then raise exception 'Intro proposal not accepted';end if;
end $$;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare b public.tutor_bookings;o jsonb;begin
 select * into b from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009911';
 begin perform public.create_booking_payment_order('00000000-0000-4000-8000-000000009903',b.id,'test','yoco');raise exception 'Other payer hijacked booking';exception when raise_exception then if sqlerrm='Other payer hijacked booking' then raise;end if;end;
 o:=public.create_booking_payment_order(b.student_id,b.id,'test','yoco');
 if (o->>'amount_cents')::int<>15000 then raise exception 'Wrong server quote';end if;
 if public.create_booking_payment_order(b.student_id,b.id,'test','yoco')->>'id'<>o->>'id' then raise exception 'Duplicate order';end if;
 update public.payment_orders set checkout_id='booking-test-checkout' where id=(o->>'id')::uuid;
 begin perform public.fulfill_gateway_payment('booking-test-event','booking-test-checkout','booking-test-payment',1,'ZAR','test','yoco');raise exception 'Wrong amount accepted';exception when raise_exception then if sqlerrm='Wrong amount accepted' then raise;end if;end;
 perform public.fulfill_gateway_payment('booking-test-event','booking-test-checkout','booking-test-payment',15000,'ZAR','test','yoco');
 if not (public.fulfill_gateway_payment('booking-test-event','booking-test-checkout','booking-test-payment',15000,'ZAR','test','yoco')->>'duplicate')::boolean then raise exception 'Replay not idempotent';end if;
 select * into b from public.tutor_bookings where id=b.id;
 if b.payment_status<>'test_paid' or b.amount_paid<>0 or b.payout_status<>'not_due' then raise exception 'Test payment counted as cash';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009902","role":"authenticated"}',true);
update public.tutor_bookings set status='confirmed' where client_request_id='00000000-0000-4000-8000-000000009911';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009903","role":"authenticated"}',true);
select public.book_for_learner('00000000-0000-4000-8000-000000009901','00000000-0000-4000-8000-000000009905','History',current_date+122,'10:00',1,'Parent payment','00000000-0000-4000-8000-000000009913',false);
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare b public.tutor_bookings;o jsonb;begin
 select * into b from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009913';
 o:=public.create_booking_payment_order('00000000-0000-4000-8000-000000009903',b.id,'live','yoco');
 update public.payment_orders set checkout_id='booking-live-checkout' where id=(o->>'id')::uuid;
 perform public.fulfill_gateway_payment('booking-live-event','booking-live-checkout','booking-live-payment',15000,'ZAR','live','yoco');
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009902","role":"authenticated"}',true);
do $$declare b public.tutor_bookings;begin
 select * into b from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009913';
 perform public.cancel_booking(b.id,'The tutor cannot deliver this session.');
end $$;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare b public.tutor_bookings;o jsonb;begin
 select * into b from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000009913';
 o:=public.prepare_booking_refund('00000000-0000-4000-8000-000000009904',b.id);
 if o->>'refund_status'<>'requested' then raise exception 'Refund not claimed';end if;
 perform public.settle_booking_refund('booking-live-checkout','booking-refund',15000,'live','ZAR',false);
 if (select payment_status from public.tutor_bookings where id=b.id)<>'paid' then raise exception 'Pending refund marked settled';end if;
 perform public.settle_booking_refund('booking-live-checkout','booking-refund',15000,'live','ZAR',true);
 if (select payment_status from public.tutor_bookings where id=b.id)<>'refunded' then raise exception 'Refund not settled';end if;
 if exists(select 1 from public.subscriptions where user_id=b.student_id) then raise exception 'Booking activated subscription';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
select 'PASS: booking payment ownership, verified amounts, test/live separation, replay, introductory proposals, parent payer and refund settlement' result;
