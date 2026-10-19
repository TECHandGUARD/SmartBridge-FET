-- A booking price is immutable; payment receipts and tutor payout are separate.
alter table public.payment_orders drop constraint payment_orders_product_check;
alter table public.payment_orders add constraint payment_orders_product_check check(product in ('student','parent','tutor_pro','booking'));
alter table public.payment_orders add column booking_id uuid references public.tutor_bookings(id), add column refund_status text not null default 'none' check(refund_status in ('none','requested','pending','refunded','failed')), add column refund_id text;
create unique index one_order_per_booking on public.payment_orders(booking_id) where booking_id is not null;
create policy "Administrators read payment orders" on public.payment_orders for select to authenticated using(smartbridge_private.is_admin(auth.uid()));
alter table public.tutor_bookings drop constraint tutor_bookings_payment_status_check;
alter table public.tutor_bookings add constraint tutor_bookings_payment_status_check check(payment_status in ('pending','paid','test_paid','refunded','failed','sponsored'));
alter table public.tutor_bookings add column payment_mode text check(payment_mode in ('test','live')),
 add column hold_expires_at timestamptz, add column platform_fee numeric not null default 0, add column tutor_net numeric not null default 0,
 add column payout_status text not null default 'not_due' check(payout_status in ('not_due','pending','paid','blocked')),
 add column payout_reference text, add column proposed_date date, add column proposed_time text, add column proposal_by uuid references public.users(id);
create or replace function smartbridge_private.create_booking(
  profile_id uuid, chosen_subject text, chosen_date date, chosen_time text,
  hours numeric, booking_message text, request_id uuid, free_intro boolean
) returns public.tutor_bookings language plpgsql security definer set search_path = '' as $$
declare
  student public.users; tutor public.tutor_profiles; booking public.tutor_bookings;
  begins timestamptz; finishes timestamptz; rate numeric; total numeric; learner uuid; fee numeric; pro boolean;
begin
  if auth.uid() is null or request_id is null then raise exception 'Sign in and provide a request ID'; end if;
  learner:=coalesce(nullif(current_setting('smartbridge.learner',true),'')::uuid,auth.uid());
  if learner<>auth.uid() and not smartbridge_private.has_parent_link(learner) then raise exception 'Approved parent link required';end if;
  select * into student from public.users where id=learner and role='student' and is_active=true and onboarding_complete=true;
  if not found then raise exception 'An active student account is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || request_id::text,0));
  select * into booking from public.tutor_bookings where student_id=learner and client_request_id=request_id;
  if found then return booking; end if;
  if hours is null or hours<0.5 or hours>4 or mod(hours,0.5)<>0 then raise exception 'Choose a duration between 30 minutes and four hours'; end if;
  if chosen_date is null or chosen_time is null or chosen_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Choose a valid date and time'; end if;
  if length(coalesce(booking_message,''))>2000 then raise exception 'Booking message is too long'; end if;
  select * into tutor from public.tutor_profiles where id=profile_id and is_verified=true and is_active=true for update;
  if not found or tutor.user_id=auth.uid() then raise exception 'Choose an approved tutor'; end if;
  if not exists(select 1 from public.users where id=tutor.user_id and is_active=true) then raise exception 'Tutor is unavailable'; end if;
  if not coalesce(chosen_subject=any(tutor.subjects),false) then raise exception 'Choose a subject offered by this tutor'; end if;
  if coalesce(free_intro,false) then
    if not tutor.offers_free_intro or hours<>0.5 then raise exception 'This tutor offers introductions only as a free 30-minute session'; end if;
    if exists(select 1 from public.tutor_bookings b where b.student_id=learner and b.tutor_id=tutor.user_id and b.is_intro and b.status<>'cancelled') then raise exception 'You have already requested an introduction with this tutor'; end if;
    total := 0;
  else
    rate := coalesce((tutor.subject_rates->>chosen_subject)::numeric,tutor.hourly_rate);
    if rate is null or rate<0 or rate::text in ('NaN','Infinity','-Infinity') then raise exception 'Tutor pricing is unavailable'; end if;
    total := round(rate*hours,2);
  end if;
  begins := (chosen_date + chosen_time::time) at time zone 'Africa/Johannesburg';
  finishes := begins + hours * interval '1 hour';
  if begins<=now() then raise exception 'Choose a future session'; end if;
  if exists(select 1 from public.tutor_bookings b where b.tutor_id=tutor.user_id and b.status in ('pending','confirmed') and (b.status='confirmed' or b.amount=0 or b.payment_status in ('paid','test_paid','sponsored') or b.hold_expires_at>now())
    and coalesce(b.start_time,(b.date+b.time::time) at time zone 'Africa/Johannesburg') < finishes+interval '15 minutes'
    and coalesce(b.end_time,((b.date+b.time::time) at time zone 'Africa/Johannesburg')+coalesce(b.duration_hours,1)*interval '1 hour') > begins-interval '15 minutes')
    then raise exception 'This session overlaps another booking. Choose another time'; end if;
  select coalesce(is_premium,false) into pro from public.users where id=tutor.user_id;
  fee:=case when pro then 0 else least(total,round(total*0.10+20,2)) end;
  insert into public.tutor_bookings(student_id,student_email,student_name,tutor_id,tutor_profile_id,tutor_email,tutor_name,
    subject,date,time,duration_hours,message,amount,status,payment_status,amount_paid,currency,start_time,end_time,client_request_id,created_by,is_intro,hold_expires_at,platform_fee,tutor_net)
  values(student.id,student.email,student.full_name,tutor.user_id,tutor.id,tutor.user_email,tutor.full_name,
    chosen_subject,chosen_date,chosen_time,hours,booking_message,total,'pending','pending',0,'ZAR',begins,finishes,request_id,auth.uid(),coalesce(free_intro,false),case when total>0 then now()+interval '30 minutes' end,fee,total-fee)
  returning * into booking;
  return booking;
end $$;

create function smartbridge_private.book_for_learner(learner_id uuid,profile_id uuid,chosen_subject text,chosen_date date,chosen_time text,hours numeric,booking_message text,request_id uuid,free_intro boolean)
returns public.tutor_bookings language plpgsql security definer set search_path='' as $$
declare b public.tutor_bookings;
begin
 if auth.uid() is null or not smartbridge_private.active_account() or not (learner_id=auth.uid() or smartbridge_private.has_parent_link(learner_id)) then raise exception 'Approved learner access required';end if;
 perform set_config('smartbridge.learner',learner_id::text,true);
 b:=smartbridge_private.create_booking(profile_id,chosen_subject,chosen_date,chosen_time,hours,booking_message,request_id,free_intro);
 perform set_config('smartbridge.learner','',true);
 return b;
end $$;
create function public.book_for_learner(learner_id uuid,profile_id uuid,chosen_subject text,chosen_date date,chosen_time text,hours numeric,booking_message text,request_id uuid,free_intro boolean)
returns public.tutor_bookings language sql security invoker set search_path='' as $$select smartbridge_private.book_for_learner($1,$2,$3,$4,$5,$6,$7,$8,$9)$$;
revoke all on function public.book_for_learner(uuid,uuid,text,date,text,numeric,text,uuid,boolean),smartbridge_private.book_for_learner(uuid,uuid,text,date,text,numeric,text,uuid,boolean) from public,anon;
grant execute on function public.book_for_learner(uuid,uuid,text,date,text,numeric,text,uuid,boolean),smartbridge_private.book_for_learner(uuid,uuid,text,date,text,numeric,text,uuid,boolean) to authenticated;

-- Service-only order creation; ownership and price are rechecked inside the database.
create function public.create_booking_payment_order(actor_id uuid,booking_key uuid,payment_mode text,provider_key text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare b public.tutor_bookings; o public.payment_orders;
begin
 select * into b from public.tutor_bookings where id=booking_key for update;
 if b.id is null or not (b.student_id=actor_id or b.created_by=actor_id) or not exists(select 1 from public.users where id=actor_id and is_active) then raise exception 'Booking access denied';end if;
 if b.created_by<>b.student_id and not exists(select 1 from public.parent_student_links where parent_id=actor_id and student_id=b.student_id and status='approved') then raise exception 'Approved parent link required';end if;
 select * into o from public.payment_orders where booking_id=b.id;
 if o.id is not null then
  if o.user_id<>actor_id or o.mode<>payment_mode or o.provider<>provider_key then raise exception 'Payment intent conflict';end if;
  if o.status='paid' then return to_jsonb(o);end if;
 end if;
 if b.status<>'pending' or b.amount<=0 or b.is_intro or b.sponsorship_allocation_id is not null or b.hold_expires_at is null or b.hold_expires_at<=now() then raise exception 'Booking is not payable or its reservation expired';end if;
 if o.id is null then
  insert into public.payment_orders(id,user_id,product,amount_cents,mode,provider,booking_id)
  values(gen_random_uuid(),actor_id,'booking',(b.amount*100)::integer,payment_mode,provider_key,b.id) returning * into o;
 end if;
 return to_jsonb(o);
end $$;
revoke all on function public.create_booking_payment_order(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.create_booking_payment_order(uuid,uuid,text,text) to service_role;

-- Retain the tested subscription fulfiller and dispatch booking receipts separately.
alter function public.fulfill_gateway_payment(text,text,text,integer,text,text,text) rename to fulfill_subscription_payment;
create function smartbridge_private.fulfill_booking_or_subscription(event_key text,checkout_key text,payment_key text,paid_amount integer,paid_currency text,paid_mode text,provider_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.payment_orders; b public.tutor_bookings; seen smartbridge_private.payment_events; a record;
begin
 select * into o from public.payment_orders where checkout_id=checkout_key and provider=provider_key for update;
 if o.id is null then raise exception 'Unknown checkout';end if;
 if o.product<>'booking' then return public.fulfill_subscription_payment(event_key,checkout_key,payment_key,paid_amount,paid_currency,paid_mode,provider_key);end if;
 if event_key is null or payment_key is null or paid_amount<>o.amount_cents or paid_currency<>o.currency or paid_mode<>o.mode then raise exception 'Payment mismatch';end if;
 select * into seen from smartbridge_private.payment_events where event_id=event_key;
 if seen.event_id is not null then
  if seen.order_id<>o.id or seen.payment_id<>payment_key then raise exception 'Event conflict';end if;
  return jsonb_build_object('success',true,'duplicate',true);
 end if;
 if o.status='paid' then
  if o.payment_id<>payment_key then raise exception 'Additional payment requires reconciliation';end if;
  insert into smartbridge_private.payment_events values(event_key,o.id,payment_key,now());
  return jsonb_build_object('success',true,'duplicate',true);
 end if;
 select * into b from public.tutor_bookings where id=o.booking_id for update;
 -- A late receipt is retained for reconciliation and never confirms a cancelled or expired slot.
 perform set_config('smartbridge.cancel_booking','true',true);
 update public.tutor_bookings set payment_status=case when paid_mode='test' then 'test_paid' else 'paid' end,payment_mode=paid_mode,
 amount_paid=case when paid_mode='live' then paid_amount::numeric/100 else 0 end,payment_reference=payment_key,payment_intent_id=checkout_key,
 payout_status=case when b.status='cancelled' or b.hold_expires_at<now() then 'blocked' else 'not_due' end,
 refund_eligibility=case when b.status='cancelled' or b.hold_expires_at<now() then 'full_booking_refund' else b.refund_eligibility end,
 refundable_amount=case when paid_mode='live' and (b.status='cancelled' or b.hold_expires_at<now()) then paid_amount::numeric/100 else 0 end,
 metadata=coalesce(b.metadata,'{}')||jsonb_build_object('late_payment',b.hold_expires_at<now()),updated_at=now() where id=b.id;
 perform set_config('smartbridge.cancel_booking','false',true);
 update public.payment_orders set status='paid',payment_id=payment_key,paid_at=now() where id=o.id;
 insert into smartbridge_private.payment_events values(event_key,o.id,payment_key,now());
 for a in select distinct id from public.users where id in (b.student_id,b.tutor_id,o.user_id) or (is_active and (role='admin' or is_super_admin)) loop
  perform smartbridge_private.queue_notification('payment:'||o.id||':'||a.id,a.id,null,'booking-payment','Tutoring payment verified',
   case when paid_mode='test' then 'TEST payment verified. No real money received. ' else 'Payment received and verified. ' end||'R'||(paid_amount::numeric/100)||' for '||b.subject||'. Tutor acceptance is separate. Reference: '||o.id,b.id);
 end loop;
 return jsonb_build_object('success',true,'duplicate',false,'booking_id',b.id,'mode',paid_mode);
end $$;
create function public.fulfill_gateway_payment(event_key text,checkout_key text,payment_key text,paid_amount integer,paid_currency text,paid_mode text,provider_key text) returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.fulfill_booking_or_subscription($1,$2,$3,$4,$5,$6,$7)$$;
revoke all on function smartbridge_private.fulfill_booking_or_subscription(text,text,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function smartbridge_private.fulfill_booking_or_subscription(text,text,text,integer,text,text,text) to service_role;
revoke all on function public.fulfill_gateway_payment(text,text,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_gateway_payment(text,text,text,integer,text,text,text) to service_role;

-- Block every direct-client acceptance path until its funding is verified.
create function smartbridge_private.booking_finance_boundary() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status='confirmed' and new.proposed_date is not null then raise exception 'Learner must accept the proposed time';end if;
 if new.status in ('confirmed','completed') and new.amount>0 and new.payment_status not in ('paid','test_paid','sponsored') then raise exception 'Payment must be verified before accepting this booking';end if;
 if new.status='confirmed' and new.payment_status in ('paid','test_paid') and coalesce((new.metadata->>'late_payment')::boolean,false) then raise exception 'Late payment requires refund or rescheduling by support';end if;
 if new.status='completed' and new.payment_status='paid' and old.status<>'completed' then new.payout_status:='pending';end if;
 if new.status='cancelled' then new.payout_status:='blocked';end if;
 return new;
end $$;
revoke all on function smartbridge_private.booking_finance_boundary() from public,anon,authenticated;
create trigger zz_booking_finance_boundary before update on public.tutor_bookings for each row execute function smartbridge_private.booking_finance_boundary();

-- Introductory scheduling is tutor-controlled; the learner accepts proposed times.
create function smartbridge_private.arrange_introduction(booking_key uuid,action text,new_date date default null,new_time text default null) returns public.tutor_bookings
language plpgsql security definer set search_path='' as $$
declare b public.tutor_bookings; begins timestamptz; a record;
begin
 if not smartbridge_private.active_account() then raise exception 'Active account required';end if;
 select * into b from public.tutor_bookings where id=booking_key for update;
 if b.id is null or not b.is_intro or b.amount<>0 or b.status<>'pending' then raise exception 'Pending introduction required';end if;
 if action='propose' then
  if auth.uid()<>b.tutor_id and not smartbridge_private.is_admin(auth.uid()) then raise exception 'Tutor or administrator required';end if;
 elsif action='accept_proposal' then
  if b.proposed_date is null or not (auth.uid() in (b.student_id,b.created_by)) or (auth.uid()<>b.student_id and not smartbridge_private.has_parent_link(b.student_id)) then raise exception 'Learner or approved parent required';end if;
  new_date:=b.proposed_date;new_time:=b.proposed_time;
 else raise exception 'Invalid introduction action';end if;
 if new_time is null or new_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or new_date is null then raise exception 'Choose a valid date and time';end if;
 begins:=(new_date+new_time::time) at time zone 'Africa/Johannesburg';
 if begins<=now() then raise exception 'Choose a future session';end if;
 perform 1 from public.tutor_profiles where id=b.tutor_profile_id for update;
 if exists(select 1 from public.tutor_bookings x where x.tutor_id=b.tutor_id and x.id<>b.id and x.status in ('pending','confirmed')
 and (x.status='confirmed' or x.amount=0 or x.payment_status in ('paid','test_paid','sponsored') or x.hold_expires_at>now())
 and x.start_time<begins+interval '45 minutes' and x.end_time>begins-interval '15 minutes') then raise exception 'This time overlaps another session';end if;
 perform set_config('smartbridge.cancel_booking','true',true);
 if action='propose' then
  update public.tutor_bookings set proposed_date=new_date,proposed_time=new_time,proposal_by=auth.uid() where id=b.id returning * into b;
 else
  update public.tutor_bookings set date=new_date,time=new_time,start_time=begins,end_time=begins+interval '30 minutes',status='confirmed',proposed_date=null,proposed_time=null,proposal_by=null where id=b.id returning * into b;
 end if;
 perform set_config('smartbridge.cancel_booking','false',true);
 for a in select distinct id from public.users where id in (b.student_id,b.tutor_id,b.created_by) loop
  perform smartbridge_private.queue_notification('intro:'||b.id||':'||action||':'||new_date||':'||new_time||':'||a.id,a.id,auth.uid(),'introduction-schedule','Free introduction schedule',
   case when action='propose' then 'A new time is proposed. Accept it in Bookings: ' else 'Your free introduction is confirmed: ' end||new_date||' '||new_time||' South Africa time.',b.id);
 end loop;
 return b;
end $$;
create function public.arrange_introduction(booking_key uuid,action text,new_date date default null,new_time text default null) returns public.tutor_bookings language sql security invoker set search_path='' as $$select smartbridge_private.arrange_introduction($1,$2,$3,$4)$$;
revoke all on function public.arrange_introduction(uuid,text,date,text),smartbridge_private.arrange_introduction(uuid,text,date,text) from public,anon;
grant execute on function public.arrange_introduction(uuid,text,date,text),smartbridge_private.arrange_introduction(uuid,text,date,text) to authenticated;

-- Do not send an unpaid request to a tutor as if it were ready to accept.
create or replace function smartbridge_private.booking_notifications() returns trigger language plpgsql security definer set search_path='' as $$
declare a record; label text;
begin
 if tg_op='INSERT' and new.amount>0 and new.sponsorship_allocation_id is null then return new;end if;
 if tg_op='UPDATE' and (new.status is not distinct from old.status or new.status not in ('confirmed','completed')) then return new;end if;
 label:=case when new.is_intro then 'Free introduction ' else 'Tutoring booking ' end||new.status;
 for a in select distinct id from public.users where id in (new.student_id,new.tutor_id,new.created_by) or (is_active and (role='admin' or is_super_admin)) loop
  perform smartbridge_private.queue_notification('booking:'||new.id||':'||new.status||':'||a.id,a.id,auth.uid(),'booking-'||new.status,label,
   'Your '||new.subject||' session is '||new.status||' for '||new.date||' at '||new.time||' (South Africa time). Payment and payout statuses are separate.',new.id);
 end loop;
 return new;
end $$;

-- Refund commands are checked separately from provider settlement.
create function public.prepare_booking_refund(actor_id uuid,booking_key uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.tutor_bookings;o public.payment_orders;
begin
 if not exists(select 1 from public.users where id=actor_id and is_active and (role='admin' or is_super_admin)) then raise exception 'Administrator required';end if;
 select * into b from public.tutor_bookings where id=booking_key for update;
 select * into o from public.payment_orders where booking_id=b.id for update;
 if b.id is null or o.id is null or o.status<>'paid' or b.status<>'cancelled' or o.provider<>'yoco' or b.payout_status='paid' then raise exception 'Cancelled, paid Yoco booking required';end if;
 if o.mode='live' and b.refund_eligibility<>'full_booking_refund' then raise exception 'Refund eligibility requires review';end if;
 if o.refund_status='none' then update public.payment_orders set refund_status='requested' where id=o.id returning * into o;end if;
 return to_jsonb(o);
end $$;
revoke all on function public.prepare_booking_refund(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_booking_refund(uuid,uuid) to service_role;
create function smartbridge_private.settle_booking_refund(checkout_key text,refund_key text,refund_amount integer,refund_mode text,refund_currency text,settled boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare o public.payment_orders;b public.tutor_bookings;a record;
begin
 select * into o from public.payment_orders where checkout_id=checkout_key and provider='yoco' and product='booking' for update;
 if o.id is null or o.status<>'paid' or o.amount_cents<>refund_amount or o.mode<>refund_mode or o.currency<>refund_currency or refund_key is null then raise exception 'Refund mismatch';end if;
 if o.refund_status='refunded' then return true;end if;
 select * into b from public.tutor_bookings where id=o.booking_id for update;
 if b.payout_status='paid' then raise exception 'Paid-out booking requires reconciliation';end if;
 update public.payment_orders set refund_status=case when settled then 'refunded' else 'pending' end,refund_id=refund_key where id=o.id;
 perform set_config('smartbridge.cancel_booking','true',true);
 update public.tutor_bookings set payment_status=case when settled then 'refunded' else payment_status end,payout_status='blocked',updated_at=now() where id=b.id;
 perform set_config('smartbridge.cancel_booking','false',true);
 for a in select distinct id from public.users where id in (b.student_id,b.tutor_id,o.user_id) or (is_active and (role='admin' or is_super_admin)) loop
  perform smartbridge_private.queue_notification('refund:'||o.id||':'||settled||':'||a.id,a.id,null,'booking-refund','Booking refund update',
   case when refund_mode='test' then 'TEST MODE. ' else '' end||case when settled then 'The provider confirmed the full booking refund.' else 'Refund requested; provider settlement is pending.' end,b.id);
 end loop;
 return true;
end $$;
create function public.settle_booking_refund(checkout_key text,refund_key text,refund_amount integer,refund_mode text,refund_currency text,settled boolean) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.settle_booking_refund($1,$2,$3,$4,$5,$6)$$;
revoke all on function public.settle_booking_refund(text,text,integer,text,text,boolean),smartbridge_private.settle_booking_refund(text,text,integer,text,text,boolean) from public,anon,authenticated;
grant execute on function public.settle_booking_refund(text,text,integer,text,text,boolean),smartbridge_private.settle_booking_refund(text,text,integer,text,text,boolean) to service_role;

create function smartbridge_private.record_tutor_payout(booking_key uuid,transfer_reference text) returns boolean language plpgsql security definer set search_path='' as $$
declare b public.tutor_bookings;
begin
 if not smartbridge_private.is_admin(auth.uid()) then raise exception 'Administrator required';end if;
 if length(trim(coalesce(transfer_reference,''))) not between 5 and 200 then raise exception 'Enter the verified bank transfer reference';end if;
 select * into b from public.tutor_bookings where id=booking_key for update;
 if b.id is null or b.status<>'completed' or b.payment_status<>'paid' or b.payment_mode<>'live' or b.payout_status<>'pending' or b.tutor_net<=0 then raise exception 'Only completed, paid live sessions are payable';end if;
 perform set_config('smartbridge.cancel_booking','true',true);
 update public.tutor_bookings set payout_status='paid',payout_reference=trim(transfer_reference),updated_at=now() where id=b.id;
 perform set_config('smartbridge.cancel_booking','false',true);
 perform smartbridge_private.queue_notification('payout:'||b.id,b.tutor_id,auth.uid(),'tutor-payout','Tutor payout recorded','The administrator recorded a verified payout of R'||b.tutor_net||'. Bank reference: '||trim(transfer_reference),b.id);
 return true;
end $$;
create function public.record_tutor_payout(booking_key uuid,transfer_reference text) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.record_tutor_payout($1,$2)$$;
revoke all on function public.record_tutor_payout(uuid,text),smartbridge_private.record_tutor_payout(uuid,text) from public,anon;
grant execute on function public.record_tutor_payout(uuid,text),smartbridge_private.record_tutor_payout(uuid,text) to authenticated;

-- Revocation is checked again when a parent cancels, rather than trusting old creation rights.
create or replace function smartbridge_private.cancel_booking(booking_id uuid,cancellation_message text) returns jsonb language plpgsql security definer set search_path='' as $$
declare booking public.tutor_bookings; eligible text; refundable numeric:=0; tutor_event uuid; student_event uuid; starts timestamptz;
begin
 if not smartbridge_private.active_account() then raise exception 'Active account required';end if;
 if length(trim(coalesce(cancellation_message,''))) not between 10 and 2000 then raise exception 'Write a cancellation message of 10 to 2000 characters';end if;
 select * into booking from public.tutor_bookings b where b.id=booking_id for update;
 if booking.id is null or not (auth.uid() in (booking.student_id,booking.tutor_id) or (auth.uid()=booking.created_by and smartbridge_private.has_parent_link(booking.student_id)) or smartbridge_private.is_admin(auth.uid())) then raise exception 'Booking access denied';end if;
 if booking.status='cancelled' then return to_jsonb(booking);end if;
 if booking.status not in ('pending','confirmed') then raise exception 'This booking cannot be cancelled';end if;
 starts:=(booking.date::text||' '||booking.time)::timestamp at time zone 'Africa/Johannesburg';
 eligible:=case when booking.payment_status<>'paid' then 'no_payment'
  when auth.uid()=booking.tutor_id or smartbridge_private.is_admin(auth.uid()) or starts>=now()+interval '24 hours' then 'full_booking_refund'
  else 'manual_statutory_review' end;
 if eligible='full_booking_refund' then refundable:=coalesce(booking.amount_paid,0);end if;
 -- Existing update protection is enforced for direct clients; this trusted operation has checked actor/row.
 perform set_config('smartbridge.cancel_booking','true',true);
 update public.tutor_bookings set status='cancelled',cancellation_reason=trim(cancellation_message),cancelled_at=now(),cancelled_by=auth.uid(),
 refund_eligibility=eligible,refundable_amount=refundable,updated_at=now() where id=booking_id returning * into booking;
 perform set_config('smartbridge.cancel_booking','false',true);
 tutor_event:=smartbridge_private.queue_notification('cancel:tutor:'||booking_id,booking.tutor_id,auth.uid(),'booking-cancelled','Tutoring booking cancelled',trim(cancellation_message),booking_id);
 student_event:=smartbridge_private.queue_notification('cancel:student:'||booking_id,booking.student_id,auth.uid(),'booking-cancelled','Tutoring booking cancelled',trim(cancellation_message),booking_id);
 return to_jsonb(booking)||jsonb_build_object('notification_ids',jsonb_build_array(tutor_event,student_event));
end;$$;

do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='subscription_prices') then alter publication supabase_realtime add table public.subscription_prices;end if;
end $$;
