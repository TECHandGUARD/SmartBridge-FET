-- Run after all four migrations and the existing core fixtures; always roll back.
reset role;
select set_config('request.jwt.claims','{}',true);
-- Core fixtures create student 101 and other account 104.
update public.users set is_active=true,role='student' where id='00000000-0000-4000-8000-000000000104';
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare result jsonb; sub uuid; first_end date; begin
 for counter in 1..10 loop
  if not public.consume_api_quota('00000000-0000-4000-8000-000000000101','ai') then raise exception 'Early quota rejection'; end if;
 end loop;
 if public.consume_api_quota('00000000-0000-4000-8000-000000000101','ai') then raise exception 'Quota was bypassed'; end if;
 result:=public.create_payment_order('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000501','student',2000,'test');
 if (result->>'amount_cents')::int<>2000 then raise exception 'Wrong order amount'; end if;
 perform public.create_payment_order('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000501','student',2000,'test');
 begin perform public.create_payment_order('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000501','student',2000,'test'); raise exception 'Intent ownership bypass';
 exception when raise_exception then if sqlerrm='Intent ownership bypass' then raise; end if; end;
 update public.payment_orders set checkout_id='test-checkout' where id='00000000-0000-4000-8000-000000000501';
 perform public.fulfill_yoco_payment('event-test','test-checkout','payment-test',2000,'ZAR','test');
 if exists(select 1 from public.subscriptions where user_id='00000000-0000-4000-8000-000000000101' and metadata->>'provider'='yoco') then raise exception 'Test payment granted access'; end if;
 perform public.create_payment_order('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000502','student',2000,'live');
 update public.payment_orders set checkout_id='live-checkout' where id='00000000-0000-4000-8000-000000000502';
 begin perform public.fulfill_yoco_payment('wrong-amount','live-checkout','payment-live',1,'ZAR','live'); raise exception 'Amount bypass';
 exception when raise_exception then if sqlerrm='Amount bypass' then raise; end if; end;
 perform public.fulfill_yoco_payment('event-live','live-checkout','payment-live',2000,'ZAR','live');
 select subscription_id into sub from public.payment_orders where checkout_id='live-checkout';
 select end_date into first_end from public.subscriptions where id=sub;
 if sub is null or not exists(select 1 from public.users where id='00000000-0000-4000-8000-000000000101' and is_premium=true) then raise exception 'Live payment did not activate'; end if;
 result:=public.fulfill_yoco_payment('event-live','live-checkout','payment-live',2000,'ZAR','live');
 if not (result->>'duplicate')::boolean then raise exception 'Event replay not deduplicated'; end if;
 perform public.fulfill_yoco_payment('event-live-retry','live-checkout','payment-live',2000,'ZAR','live');
 if (select end_date from public.subscriptions where id=sub)<>first_end then raise exception 'Retry extended subscription'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000104","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.payment_orders) then raise exception 'Foreign order read'; end if;
 begin perform public.consume_api_quota('00000000-0000-4000-8000-000000000104','ai'); raise exception 'Quota RPC public'; exception when insufficient_privilege then null; end;
 begin perform public.fulfill_yoco_payment('forged','live-checkout','forged',2000,'ZAR','live'); raise exception 'Fulfillment RPC public'; exception when insufficient_privilege then null; end;
 begin insert into public.payment_orders(id,user_id,product,amount_cents,mode) values(gen_random_uuid(),auth.uid(),'student',1,'live'); raise exception 'Client order insert allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: API quotas, intent ownership, price validation, atomic payment activation, test-mode isolation, replay deduplication and payment RLS' as result;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare result jsonb; begin
 if not public.email_recipients_allowed(array['email-test@example.invalid']) then raise exception 'Unexpected suppression'; end if;
 perform public.record_email_acceptance('email-test',array['email-test@example.invalid']);
 perform public.record_email_event('email-event-1','email-test','email.bounced',now(),array['email-test@example.invalid']);
 if public.email_recipients_allowed(array['email-test@example.invalid']) then raise exception 'Suppression bypass'; end if;
 result:=public.record_email_event('email-event-1','email-test','email.bounced',now(),array['email-test@example.invalid']);
 if not (result->>'duplicate')::boolean then raise exception 'Email replay not deduplicated'; end if;
 perform public.record_email_event('email-event-2','email-test','email.delivered',now()+interval '1 second',array['email-test@example.invalid']);
 if (select status from smartbridge_private.email_deliveries where provider_id='email-test')<>'email.bounced' then raise exception 'Delivery overrode bounce'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000104","role":"authenticated"}',true);
do $$ begin
 begin perform public.record_email_event('forged','email-test','email.delivered',now(),array['email-test@example.invalid']); raise exception 'Client wrote email event'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: API quotas, payment ownership/activation/replay/test isolation/RLS and email suppression/event deduplication/private delivery records' as result;
