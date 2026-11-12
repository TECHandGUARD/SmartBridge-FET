create table if not exists public.adult_call_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 endpoint text not null unique,
 subscription jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(length(endpoint)<=2048),
 check(octet_length(subscription::text)<=8192)
);
create index if not exists adult_call_push_user_idx on public.adult_call_push_subscriptions(user_id);
alter table public.adult_call_push_subscriptions enable row level security;
revoke all on public.adult_call_push_subscriptions from public,anon,authenticated;
create or replace function public.register_adult_call_push(push_subscription jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare ep text;
begin
 if auth.uid() is null or not smartbridge_private.meeting_adult(auth.uid()) then raise exception 'Adult account required' using errcode='42501';end if;
 ep:=push_subscription->>'endpoint';
 if ep is null or length(ep)>2048 or ep not like 'https://%' or
 jsonb_typeof(push_subscription->'keys')<>'object' or
 nullif(push_subscription#>>'{keys,p256dh}','') is null or
 nullif(push_subscription#>>'{keys,auth}','') is null or
 octet_length(push_subscription::text)>8192 then raise exception 'Invalid push subscription' using errcode='22023';end if;
 insert into public.adult_call_push_subscriptions(user_id,endpoint,subscription)
 values(auth.uid(),ep,push_subscription)
 on conflict(endpoint) do update set user_id=excluded.user_id,subscription=excluded.subscription,updated_at=now();
 return true;
end;$$;
create or replace function public.unregister_adult_call_push(push_endpoint text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 delete from public.adult_call_push_subscriptions where user_id=auth.uid() and endpoint=push_endpoint;
 return found;
end;$$;
revoke all on function public.register_adult_call_push(jsonb),public.unregister_adult_call_push(text) from public,anon;
grant execute on function public.register_adult_call_push(jsonb),public.unregister_adult_call_push(text) to authenticated;