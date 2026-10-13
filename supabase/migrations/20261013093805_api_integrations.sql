-- After the three core repair migrations. Server-only API usage and verified payment fulfillment.
create schema if not exists smartbridge_private;
revoke all on schema smartbridge_private from public,anon;
grant usage on schema smartbridge_private to service_role;
create table smartbridge_private.api_usage(
 actor_id uuid not null references public.users(id) on delete cascade,
 scope text not null check(scope in ('ai','email','checkout')),
 bucket timestamptz not null,
 calls integer not null check(calls>=0),
 primary key(actor_id,scope,bucket)
);
alter table smartbridge_private.api_usage enable row level security;
revoke all on smartbridge_private.api_usage from public,anon,authenticated;
grant all on smartbridge_private.api_usage to service_role;
create index api_usage_expiry on smartbridge_private.api_usage(bucket);
create function public.consume_api_quota(actor_id uuid,quota_scope text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare minute_cap integer; daily_cap integer; used integer; current_bucket timestamptz:=date_trunc('minute',now());
begin
 if quota_scope not in ('ai','email','checkout') or actor_id is null then raise exception 'Invalid quota'; end if;
 if not exists(select 1 from public.users u where u.id=actor_id and u.is_active=true) then return false; end if;
 minute_cap:=case quota_scope when 'ai' then 10 when 'email' then 5 else 3 end;
 daily_cap:=case quota_scope when 'ai' then 100 when 'email' then 30 else 10 end;
 perform pg_advisory_xact_lock(hashtextextended(actor_id::text||quota_scope,0));
 select coalesce(sum(calls),0) into used from smartbridge_private.api_usage a where a.actor_id=$1 and a.scope=quota_scope and a.bucket>=date_trunc('day',now());
 if used>=daily_cap then return false; end if;
 select calls into used from smartbridge_private.api_usage a where a.actor_id=$1 and a.scope=quota_scope and a.bucket=current_bucket;
 if coalesce(used,0)>=minute_cap then return false; end if;
 insert into smartbridge_private.api_usage values(actor_id,quota_scope,current_bucket,1)
 on conflict on constraint api_usage_pkey do update set calls=api_usage.calls+1;
 delete from smartbridge_private.api_usage where bucket<now()-interval '2 days';
 return true;
end;$$;
revoke all on function public.consume_api_quota(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_api_quota(uuid,text) to service_role;

create table public.payment_orders(
 id uuid primary key,
 user_id uuid not null references public.users(id),
 product text not null check(product in ('student','parent','tutor_pro')),
 amount_cents integer not null check(amount_cents between 100 and 1000000),
 currency text not null default 'ZAR' check(currency='ZAR'),
 mode text not null check(mode in ('test','live')),
 status text not null default 'pending' check(status in ('pending','paid')),
 checkout_id text unique,
 redirect_url text,
 payment_id text unique,
 subscription_id uuid references public.subscriptions(id),
 created_at timestamptz not null default now(),
 paid_at timestamptz
);
alter table public.payment_orders enable row level security;
revoke all on public.payment_orders from public,anon,authenticated;
grant select on public.payment_orders to authenticated;
grant all on public.payment_orders to service_role;
create policy "Read own payment orders" on public.payment_orders for select to authenticated using(user_id=(select auth.uid()));
create index payment_orders_owner on public.payment_orders(user_id,created_at);
create table smartbridge_private.payment_events(
 event_id text primary key,
 order_id uuid not null references public.payment_orders(id),
 payment_id text not null,
 created_at timestamptz not null default now()
);
alter table smartbridge_private.payment_events enable row level security;
revoke all on smartbridge_private.payment_events from public,anon,authenticated;
grant all on smartbridge_private.payment_events to service_role;
create function public.create_payment_order(actor_id uuid,request_id uuid,product_key text,quoted_amount integer,payment_mode text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare account public.users; previous public.payment_orders;
begin
 select * into account from public.users where id=actor_id and is_active=true;
 if not found or request_id is null then raise exception 'Account unavailable'; end if;
 if not ((product_key='student' and account.role='student') or (product_key='parent' and account.role='parent') or
 (product_key='tutor_pro' and account.role in ('tutor','sace_tutor','student_tutor') and account.is_verified=true)) then raise exception 'Plan unavailable for account'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request_id::text,0));
 select * into previous from public.payment_orders where id=request_id;
 if found then
  if previous.user_id<>actor_id or previous.product<>product_key or previous.mode<>payment_mode or previous.amount_cents<>quoted_amount then raise exception 'Payment intent conflict'; end if;
  return to_jsonb(previous);
 end if;
 insert into public.payment_orders(id,user_id,product,amount_cents,mode) values(request_id,actor_id,product_key,quoted_amount,payment_mode) returning * into previous;
 return to_jsonb(previous);
end;$$;
revoke all on function public.create_payment_order(uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.create_payment_order(uuid,uuid,text,integer,text) to service_role;

create function public.fulfill_yoco_payment(event_key text,checkout_key text,payment_key text,paid_amount integer,paid_currency text,paid_mode text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare purchase public.payment_orders; account public.users; receipt uuid; start_on date; end_on date; seen smartbridge_private.payment_events;
begin
 if event_key is null or checkout_key is null or payment_key is null then raise exception 'Incomplete payment event'; end if;
 select * into purchase from public.payment_orders where checkout_id=checkout_key for update;
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
   values(account.id,account.email,'premium','active',paid_amount::numeric/100,'ZAR',payment_key,start_on,end_on,'card',false,false,now(),jsonb_build_object('provider','yoco','product',purchase.product,'order_id',purchase.id)) returning id into receipt;
  else
   update public.subscriptions set end_date=end_on,amount_paid=coalesce(amount_paid,0)+paid_amount::numeric/100,payment_reference=payment_key,auto_renew=false,is_trial=false,last_payment_date=now(),updated_at=now(),metadata=coalesce(metadata,'{}')||jsonb_build_object('provider','yoco','product',purchase.product,'order_id',purchase.id) where id=receipt;
  end if;
  update public.users set is_premium=true,updated_at=now() where id=account.id;
 end if;
 update public.payment_orders set status='paid',payment_id=payment_key,paid_at=now(),subscription_id=receipt where id=purchase.id;
 insert into smartbridge_private.payment_events values(event_key,purchase.id,payment_key,now());
 return jsonb_build_object('success',true,'duplicate',false,'activated',paid_mode='live');
end;$$;
revoke all on function public.fulfill_yoco_payment(text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_yoco_payment(text,text,text,integer,text,text) to service_role;

-- Delivery records contain minimal operational metadata, never message bodies or open/click tracking.
create table smartbridge_private.email_deliveries(
 provider_id text primary key, recipients text[] not null,
 status text not null, event_at timestamptz not null default now()
);
create table smartbridge_private.email_events(
 event_id text primary key, provider_id text not null, event_type text not null, event_at timestamptz not null
);
create table smartbridge_private.email_suppressions(
 email text primary key, reason text not null, created_at timestamptz not null default now()
);
alter table smartbridge_private.email_deliveries enable row level security;
alter table smartbridge_private.email_events enable row level security;
alter table smartbridge_private.email_suppressions enable row level security;
revoke all on smartbridge_private.email_deliveries,smartbridge_private.email_events,smartbridge_private.email_suppressions from public,anon,authenticated;
grant all on smartbridge_private.email_deliveries,smartbridge_private.email_events,smartbridge_private.email_suppressions to service_role;
create function public.email_recipients_allowed(recipient_emails text[]) returns boolean language sql stable security invoker set search_path='' as $$
 select cardinality(recipient_emails) between 1 and 50 and not exists(select 1 from smartbridge_private.email_suppressions where email=any(recipient_emails));
$$;
create function public.record_email_acceptance(provider_id text,recipient_emails text[]) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 insert into smartbridge_private.email_deliveries values(provider_id,recipient_emails,'accepted',now()) on conflict do nothing;return true;
end;$$;
create function public.record_email_event(event_key text,provider_id text,event_type text,event_time timestamptz,recipient_emails text[]) returns jsonb language plpgsql security invoker set search_path='' as $$
declare stored_id text;
begin
 if event_type not in ('email.sent','email.delivered','email.bounced','email.complained','email.delivery_delayed','email.failed','email.suppressed') or event_key is null or provider_id is null or cardinality(recipient_emails) not between 1 and 50 then raise exception 'Invalid delivery event'; end if;
 insert into smartbridge_private.email_events values(event_key,provider_id,event_type,event_time) on conflict do nothing returning event_id into stored_id;
 if stored_id is null then
  if not exists(select 1 from smartbridge_private.email_events e where e.event_id=event_key and e.provider_id=$2 and e.event_type=$3) then raise exception 'Email event conflict'; end if;
  return jsonb_build_object('received',true,'duplicate',true);
 end if;
 insert into smartbridge_private.email_deliveries values(provider_id,recipient_emails,event_type,event_time)
 on conflict on constraint email_deliveries_pkey do update set status=excluded.status,event_at=excluded.event_at
 where email_deliveries.event_at<=excluded.event_at and email_deliveries.status not in ('email.bounced','email.complained','email.suppressed');
 if event_type in ('email.bounced','email.complained','email.suppressed') then
  insert into smartbridge_private.email_suppressions(email,reason) select lower(address),event_type from unnest(recipient_emails) as address on conflict do nothing;
 end if;
 return jsonb_build_object('received',true,'duplicate',false);
end;$$;
revoke all on function public.email_recipients_allowed(text[]),public.record_email_acceptance(text,text[]),public.record_email_event(text,text,text,timestamptz,text[]) from public,anon,authenticated;
grant execute on function public.email_recipients_allowed(text[]),public.record_email_acceptance(text,text[]),public.record_email_event(text,text,text,timestamptz,text[]) to service_role;
