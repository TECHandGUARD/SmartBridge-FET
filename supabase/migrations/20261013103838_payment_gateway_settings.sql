-- After API integrations. Credentials remain server-side; admin settings contain no secrets.
create table public.payment_gateway_settings(
 provider text primary key check(provider in ('yoco','paystack')),
 enabled boolean not null default false,
 mode text not null default 'test' check(mode in ('test','live')),
 priority integer not null default 0 check(priority between 0 and 100),
 updated_at timestamptz not null default now(),
 updated_by uuid references public.users(id)
);
alter table public.payment_gateway_settings enable row level security;
revoke all on public.payment_gateway_settings from public,anon,authenticated;
grant select on public.payment_gateway_settings to authenticated;
grant all on public.payment_gateway_settings to service_role;
create policy "Read gateway availability" on public.payment_gateway_settings for select to authenticated using(true);
insert into public.payment_gateway_settings(provider,priority) values('yoco',0),('paystack',1);
create table smartbridge_private.payment_gateway_audit(
 id uuid primary key default gen_random_uuid(), actor_id uuid not null, provider text not null,
 before_settings jsonb not null, after_settings jsonb not null, created_at timestamptz not null default now()
);
alter table smartbridge_private.payment_gateway_audit enable row level security;
revoke all on smartbridge_private.payment_gateway_audit from public,anon,authenticated;
grant all on smartbridge_private.payment_gateway_audit to service_role;
create function smartbridge_private.set_payment_gateway(provider_key text,is_enabled boolean,chosen_mode text,display_priority integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare previous public.payment_gateway_settings; changed public.payment_gateway_settings;
begin
 if auth.uid() is null or not exists(select 1 from public.users where id=auth.uid() and is_active=true and (is_super_admin=true or role='admin')) then raise exception 'Administrator required'; end if;
 if provider_key not in ('yoco','paystack') or is_enabled is null or chosen_mode not in ('test','live') or display_priority not between 0 and 100 then raise exception 'Invalid gateway settings'; end if;
 select * into previous from public.payment_gateway_settings where provider=provider_key for update;
 if not found then raise exception 'Gateway unavailable'; end if;
 update public.payment_gateway_settings set enabled=is_enabled,mode=chosen_mode,priority=display_priority,updated_at=now(),updated_by=auth.uid() where provider=provider_key returning * into changed;
 insert into smartbridge_private.payment_gateway_audit(actor_id,provider,before_settings,after_settings) values(auth.uid(),provider_key,to_jsonb(previous),to_jsonb(changed));
 return true;
end;$$;
create function public.set_payment_gateway(provider_key text,is_enabled boolean,chosen_mode text,display_priority integer) returns boolean
language sql security invoker set search_path='' as $$select smartbridge_private.set_payment_gateway(provider_key,is_enabled,chosen_mode,display_priority)$$;
revoke all on function public.set_payment_gateway(text,boolean,text,integer),smartbridge_private.set_payment_gateway(text,boolean,text,integer) from public,anon;
grant execute on function public.set_payment_gateway(text,boolean,text,integer),smartbridge_private.set_payment_gateway(text,boolean,text,integer) to authenticated;
alter table public.payment_orders add column provider text not null default 'yoco' references public.payment_gateway_settings(provider);

create function public.create_gateway_payment_order(actor_id uuid,request_id uuid,product_key text,quoted_amount integer,payment_mode text,provider_key text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare account public.users; previous public.payment_orders;
begin
 select * into account from public.users where id=actor_id and is_active=true;
 if provider_key not in ('yoco','paystack') then raise exception 'Unsupported gateway'; end if;
 if not found or request_id is null then raise exception 'Account unavailable'; end if;
 if not ((product_key='student' and account.role='student') or (product_key='parent' and account.role='parent') or
 (product_key='tutor_pro' and account.role in ('tutor','sace_tutor','student_tutor') and account.is_verified=true)) then raise exception 'Plan unavailable for account'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request_id::text,0));
 select * into previous from public.payment_orders where id=request_id;
 if found then
  if previous.provider<>provider_key or previous.user_id<>actor_id or previous.product<>product_key or previous.mode<>payment_mode or previous.amount_cents<>quoted_amount then raise exception 'Payment intent conflict'; end if;
  return to_jsonb(previous);
 end if;
 insert into public.payment_orders(id,user_id,product,amount_cents,mode,provider) values(request_id,actor_id,product_key,quoted_amount,payment_mode,provider_key) returning * into previous;
 return to_jsonb(previous);
end;$$;
revoke all on function public.create_gateway_payment_order(uuid,uuid,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.create_gateway_payment_order(uuid,uuid,text,integer,text,text) to service_role;


create function public.fulfill_gateway_payment(event_key text,checkout_key text,payment_key text,paid_amount integer,paid_currency text,paid_mode text,provider_key text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare purchase public.payment_orders; account public.users; receipt uuid; start_on date; end_on date; seen smartbridge_private.payment_events;
begin
 if event_key is null or checkout_key is null or payment_key is null then raise exception 'Incomplete payment event'; end if;
 select * into purchase from public.payment_orders where checkout_id=checkout_key and provider=provider_key for update;
 if not found then raise exception 'Unknown checkout'; end if;
 if purchase.amount_cents<>paid_amount or purchase.currency<>paid_currency or purchase.mode<>paid_mode then raise exception 'Payment mismatch'; end if;
 select * into seen from smartbridge_private.payment_events where event_id=event_key;
 if found then
  if seen.order_id<>purchase.id or seen.payment_id<>payment_key then raise exception 'Event conflict'; end if;
  return jsonb_build_object('success',true,'duplicate',true);
 end if;
 if purchase.status='paid' then
  if purchase.payment_id<>payment_key then raise exception 'Additional payment requires manual reconciliation'; end if;
  insert into smartbridge_private.payment_events values(event_key,purchase.id,payment_key,now());
  return jsonb_build_object('success',true,'duplicate',true);
 end if;
 select * into account from public.users where id=purchase.user_id and is_active=true for update;
 if not found then raise exception 'Account unavailable'; end if;
 -- Test payments never grant access; live subscriptions are fulfilled atomically with the receipt.
 if paid_mode='live' then
  start_on:=(now() at time zone 'Africa/Johannesburg')::date;
  select greatest(start_on,coalesce(max(s.end_date)+1,start_on)) into start_on from public.subscriptions s where s.user_id=account.id and s.plan='premium' and s.status='active';
  end_on:=start_on+interval '1 month'-interval '1 day';
  select id into receipt from public.subscriptions where user_id=account.id and plan='premium' and status='active' order by end_date desc nulls last limit 1 for update;
  if receipt is null then
   insert into public.subscriptions(user_id,user_email,plan,status,amount_paid,currency,payment_reference,start_date,end_date,payment_method,auto_renew,is_trial,last_payment_date,metadata)
   values(account.id,account.email,'premium','active',paid_amount::numeric/100,'ZAR',payment_key,start_on,end_on,'card',false,false,now(),jsonb_build_object('provider',provider_key,'product',purchase.product,'order_id',purchase.id)) returning id into receipt;
  else
   update public.subscriptions set end_date=end_on,amount_paid=coalesce(amount_paid,0)+paid_amount::numeric/100,payment_reference=payment_key,auto_renew=false,is_trial=false,last_payment_date=now(),updated_at=now(),metadata=coalesce(metadata,'{}')||jsonb_build_object('provider',provider_key,'product',purchase.product,'order_id',purchase.id) where id=receipt;
  end if;
  update public.users set is_premium=true,updated_at=now() where id=account.id;
 end if;
 update public.payment_orders set status='paid',payment_id=payment_key,paid_at=now(),subscription_id=receipt where id=purchase.id;
 insert into smartbridge_private.payment_events values(event_key,purchase.id,payment_key,now());
 return jsonb_build_object('success',true,'duplicate',false,'activated',paid_mode='live');
end;$$;
revoke all on function public.fulfill_gateway_payment(text,text,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_gateway_payment(text,text,text,integer,text,text,text) to service_role;


-- Preserve older server calls, explicitly bound to Yoco rather than any provider's checkout.
create or replace function public.create_payment_order(actor_id uuid,request_id uuid,product_key text,quoted_amount integer,payment_mode text) returns jsonb language sql security invoker set search_path='' as $$
 select public.create_gateway_payment_order(actor_id,request_id,product_key,quoted_amount,payment_mode,'yoco');
$$;
create or replace function public.fulfill_yoco_payment(event_key text,checkout_key text,payment_key text,paid_amount integer,paid_currency text,paid_mode text) returns jsonb language sql security invoker set search_path='' as $$
 select public.fulfill_gateway_payment(event_key,checkout_key,payment_key,paid_amount,paid_currency,paid_mode,'yoco');
$$;
