-- All five migrations + previous core/API fixtures in one rollback transaction.
reset role;
select set_config('request.jwt.claims','{}',true);
update public.users set is_super_admin=true,is_active=true where id='00000000-0000-4000-8000-000000000102';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$ begin
 begin perform public.set_payment_gateway('paystack',true,'test',0); raise exception 'Student changed gateway'; exception when raise_exception then if sqlerrm='Student changed gateway' then raise; end if; end;
 begin update public.payment_gateway_settings set enabled=true where provider='paystack'; raise exception 'Direct gateway edit allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',true);
select public.set_payment_gateway('paystack',true,'test',0);
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare result jsonb; previous_end date; begin
 if not exists(select 1 from smartbridge_private.payment_gateway_audit where actor_id='00000000-0000-4000-8000-000000000102' and provider='paystack') then raise exception 'Missing gateway audit'; end if;
 perform public.create_gateway_payment_order('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000601','student',2000,'test','paystack');
 begin perform public.create_gateway_payment_order('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000601','student',2000,'test','yoco'); raise exception 'Intent changed providers'; exception when raise_exception then if sqlerrm='Intent changed providers' then raise; end if; end;
 update public.payment_orders set checkout_id='paystack-reference' where id='00000000-0000-4000-8000-000000000601';
 begin perform public.fulfill_yoco_payment('forged-provider','paystack-reference','paystack-123',2000,'ZAR','test'); raise exception 'Wrong provider fulfilled'; exception when raise_exception then if sqlerrm='Wrong provider fulfilled' then raise; end if; end;
 update public.payment_gateway_settings set enabled=false where provider='paystack';
 select max(end_date) into previous_end from public.subscriptions where user_id='00000000-0000-4000-8000-000000000101';
 perform public.fulfill_gateway_payment('paystack-123','paystack-reference','paystack-123',2000,'ZAR','test','paystack');
 if (select max(end_date) from public.subscriptions where user_id='00000000-0000-4000-8000-000000000101')<>previous_end then raise exception 'Test Paystack payment extended access'; end if;
 result:=public.fulfill_gateway_payment('paystack-123','paystack-reference','paystack-123',2000,'ZAR','test','paystack');
 if not (result->>'duplicate')::boolean then raise exception 'Paystack replay not deduplicated'; end if;
end $$;
reset role;
select 'PASS: gateway admin permissions/audit, provider-bound intents/fulfillment, disabled-gateway settlement and Paystack test/replay isolation' as result;
