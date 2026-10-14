alter table public.payment_orders drop constraint payment_orders_amount_cents_check;
alter table public.payment_orders add constraint payment_orders_amount_cents_check check(amount_cents>=100);
create table public.subscription_prices (
 product text primary key check(product in ('student','parent','tutor_pro')),
 amount_cents integer not null check(amount_cents between 100 and 2147483647),
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.subscription_prices enable row level security;
revoke all on public.subscription_prices from public,anon,authenticated;
grant select on public.subscription_prices to authenticated;
grant all on public.subscription_prices to service_role;
create policy "Read subscription prices" on public.subscription_prices for select to authenticated using(true);
insert into public.subscription_prices(product,amount_cents) values ('student',2000),('parent',5000),('tutor_pro',15000);
create table smartbridge_private.subscription_price_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 product text not null, old_amount_cents integer not null,new_amount_cents integer not null,created_at timestamptz not null default now()
);
alter table smartbridge_private.subscription_price_audit enable row level security;
revoke all on smartbridge_private.subscription_price_audit from public,anon,authenticated;
grant all on smartbridge_private.subscription_price_audit to service_role;
create function smartbridge_private.set_subscription_price(product_key text,new_amount_cents integer,expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous public.subscription_prices; changed public.subscription_prices;
begin
 if auth.uid() is null or not exists(select 1 from public.users where id=auth.uid() and is_active and (role='admin' or is_super_admin)) then raise exception 'Administrator required';end if;
 if new_amount_cents is null or new_amount_cents not between 100 and 2147483647 then raise exception 'Price must be at least R1';end if;
 select * into previous from public.subscription_prices where product=product_key for update;
 if not found then raise exception 'Unknown plan';end if;
 if expected_revision is null or previous.revision<>expected_revision then raise exception 'Another administrator changed this price. Reload before saving.';end if;
 if previous.amount_cents=new_amount_cents then return to_jsonb(previous);end if;
 update public.subscription_prices set amount_cents=new_amount_cents,revision=revision+1,updated_at=now() where product=product_key returning * into changed;
 insert into smartbridge_private.subscription_price_audit(actor_id,product,old_amount_cents,new_amount_cents) values(auth.uid(),product_key,previous.amount_cents,new_amount_cents);
 return to_jsonb(changed);
end;$$;
create function public.set_subscription_price(product_key text,new_amount_cents integer,expected_revision integer) returns jsonb
language sql security invoker set search_path='' as $$select smartbridge_private.set_subscription_price($1,$2,$3)$$;
revoke all on function public.set_subscription_price(text,integer,integer),smartbridge_private.set_subscription_price(text,integer,integer) from public,anon;
grant execute on function public.set_subscription_price(text,integer,integer),smartbridge_private.set_subscription_price(text,integer,integer) to authenticated;
create or replace function public.create_gateway_payment_order(actor_id uuid,request_id uuid,product_key text,quoted_amount integer,payment_mode text,provider_key text) returns jsonb
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
 if quoted_amount is distinct from (select amount_cents from public.subscription_prices where product=product_key) then raise exception 'Plan price changed; refresh before paying'; end if;
 insert into public.payment_orders(id,user_id,product,amount_cents,mode,provider) values(request_id,actor_id,product_key,quoted_amount,payment_mode,provider_key) returning * into previous;
 return to_jsonb(previous);
end;$$;
revoke all on function public.create_gateway_payment_order(uuid,uuid,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.create_gateway_payment_order(uuid,uuid,text,integer,text,text) to service_role;

