-- Verified external grants are recorded by an administrator, never minted by sponsors/learners.
create table public.sponsorship_programmes(
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 3 and 150),
 organisation text not null check(length(trim(organisation)) between 2 and 150),
 verified_funding numeric(14,2) not null check(verified_funding>0 and verified_funding::text not in ('NaN','Infinity','-Infinity')),
 funding_reference text not null unique check(length(trim(funding_reference)) between 5 and 200),
 verification_note text not null check(length(trim(verification_note)) between 10 and 1000),
 active boolean not null default true, created_by uuid not null references public.users(id),created_at timestamptz not null default now());
create table public.sponsorship_allocations(
 id uuid primary key default gen_random_uuid(), programme_id uuid not null references public.sponsorship_programmes(id),
 student_id uuid not null references public.users(id), label text not null,
 budget numeric(14,2) not null check(budget>0), active boolean not null default true,
 created_by uuid not null references public.users(id),created_at timestamptz not null default now(),unique(programme_id,student_id));
create table public.sponsorship_reservations(
 booking_id uuid primary key references public.tutor_bookings(id),allocation_id uuid not null references public.sponsorship_allocations(id),
 amount numeric(14,2) not null check(amount>0),state text not null default 'reserved' check(state in ('reserved','consumed','released')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index on public.sponsorship_allocations(student_id);
create index on public.sponsorship_reservations(allocation_id);
alter table public.sponsorship_programmes enable row level security;
alter table public.sponsorship_allocations enable row level security;
alter table public.sponsorship_reservations enable row level security;
revoke all on public.sponsorship_programmes,public.sponsorship_allocations,public.sponsorship_reservations from public,anon,authenticated;
grant select on public.sponsorship_programmes,public.sponsorship_allocations,public.sponsorship_reservations to authenticated;
create policy "Administrator funding records" on public.sponsorship_programmes for select to authenticated using(smartbridge_private.active_account() and smartbridge_private.is_admin(auth.uid()));
create policy "Own learner allocation" on public.sponsorship_allocations for select to authenticated using(smartbridge_private.active_account() and (student_id=auth.uid() or smartbridge_private.is_admin(auth.uid())));
create policy "Own learner reservations" on public.sponsorship_reservations for select to authenticated using(smartbridge_private.active_account() and exists(select 1 from public.sponsorship_allocations a where a.id=allocation_id and (a.student_id=auth.uid() or smartbridge_private.is_admin(auth.uid()))));

create function smartbridge_private.manage_sponsorship(action text,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;p public.sponsorship_programmes;allocated numeric;amount numeric;
begin
 if not smartbridge_private.active_account() or not smartbridge_private.is_admin(auth.uid()) then raise exception 'Active administrator required';end if;
 if action='record_verified_funding' then
  amount:=(payload->>'amount')::numeric;
  if amount is null or amount<=0 or amount<>round(amount,2) or amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Enter a positive rand amount with at most two decimals';end if;
  if (payload->>'verified')::boolean is distinct from true then raise exception 'Confirm receipt of external funds first';end if;
  insert into public.sponsorship_programmes(name,organisation,verified_funding,funding_reference,verification_note,created_by)
  values(trim(payload->>'name'),trim(payload->>'organisation'),(payload->>'amount')::numeric,trim(payload->>'reference'),trim(payload->>'note'),auth.uid()) returning id into result;
 elsif action='allocate' then
  select * into p from public.sponsorship_programmes where id=(payload->>'programme_id')::uuid for update;
  if p.id is null or not p.active then raise exception 'Active programme required';end if;
  if not exists(select 1 from public.users where id=(payload->>'student_id')::uuid and role='student' and is_active and onboarding_complete) then raise exception 'Eligible active learner required';end if;
  amount:=(payload->>'amount')::numeric;
  select coalesce(sum(budget),0) into allocated from public.sponsorship_allocations where programme_id=p.id;
  if amount is null or amount<=0 or amount<>round(amount,2) or amount::text in ('NaN','Infinity','-Infinity') or allocated+amount>p.verified_funding then raise exception 'Allocation exceeds verified funding or invalid amount';end if;
  insert into public.sponsorship_allocations(programme_id,student_id,label,budget,created_by) values(p.id,(payload->>'student_id')::uuid,p.name,amount,auth.uid()) returning id into result;
 elsif action='pause_programme' then
  update public.sponsorship_programmes set active=false where id=(payload->>'programme_id')::uuid returning id into result;
 else raise exception 'Unknown sponsorship operation';end if;
 return result;
end $$;
revoke all on function smartbridge_private.manage_sponsorship(text,jsonb) from public,anon;
grant execute on function smartbridge_private.manage_sponsorship(text,jsonb) to authenticated;
create function public.manage_sponsorship(action text,payload jsonb) returns uuid language sql security invoker set search_path='' as $$select smartbridge_private.manage_sponsorship($1,$2)$$;
revoke all on function public.manage_sponsorship(text,jsonb) from public,anon;
grant execute on function public.manage_sponsorship(text,jsonb) to authenticated;

alter table public.tutor_bookings add column sponsorship_allocation_id uuid references public.sponsorship_allocations(id);
alter table public.tutor_bookings drop constraint tutor_bookings_payment_status_check;
alter table public.tutor_bookings add constraint tutor_bookings_payment_status_check check(payment_status in ('pending','paid','refunded','failed','sponsored'));
-- Dedicated trusted transaction may change payment metadata; clients cannot set it directly.
create function smartbridge_private.protect_sponsorship_booking() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.sponsorship_allocation_id is distinct from old.sponsorship_allocation_id or (old.sponsorship_allocation_id is not null and (new.amount is distinct from old.amount or new.payment_status is distinct from old.payment_status or new.amount_paid is distinct from old.amount_paid)) then
  if current_user<>'postgres' or current_setting('smartbridge.sponsorship',true) is distinct from 'true' then raise exception 'Sponsorship is server managed';end if;
 end if;
 return new;
end $$;
revoke all on function smartbridge_private.protect_sponsorship_booking() from public,anon,authenticated;
create trigger protect_sponsorship_booking before update on public.tutor_bookings for each row execute function smartbridge_private.protect_sponsorship_booking();

create function smartbridge_private.create_sponsored_booking(allocation uuid,profile_id uuid,chosen_subject text,chosen_date date,chosen_time text,hours numeric,booking_message text,request_id uuid)
returns public.tutor_bookings language plpgsql security definer set search_path='' as $$
declare a public.sponsorship_allocations;p public.sponsorship_programmes;b public.tutor_bookings;spent numeric;
begin
 if not smartbridge_private.active_account() then raise exception 'Active learner required';end if;
 -- Same lock as ordinary booking: retry cannot switch an existing request between funding sources.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||request_id::text,0));
 select * into b from public.tutor_bookings where student_id=auth.uid() and client_request_id=request_id;
 if b.id is not null then
  if b.sponsorship_allocation_id is distinct from allocation then raise exception 'Request already uses a different funding source';end if;
  return b;
 end if;
 select * into a from public.sponsorship_allocations where id=allocation and student_id=auth.uid() for update;
 if a.id is null or not a.active then raise exception 'No active allocation for this learner';end if;
 select * into p from public.sponsorship_programmes where id=a.programme_id for share;
 if not p.active then raise exception 'Programme is paused';end if;
 b:=smartbridge_private.create_booking(profile_id,chosen_subject,chosen_date,chosen_time,hours,booking_message,request_id,false);
 if b.amount<=0 then raise exception 'Free sessions do not need sponsorship';end if;
 select coalesce(sum(amount),0) into spent from public.sponsorship_reservations where allocation_id=a.id and state<>'released';
 if spent+b.amount>a.budget then raise exception 'Not enough sponsored funding for this session';end if;
 insert into public.sponsorship_reservations(booking_id,allocation_id,amount) values(b.id,a.id,b.amount);
 -- Legacy update guard already has a trusted cancellation bypass, reused only inside this checked transaction.
 perform set_config('smartbridge.cancel_booking','true',true);
 perform set_config('smartbridge.sponsorship','true',true);
 update public.tutor_bookings set sponsorship_allocation_id=a.id,payment_status='sponsored' where id=b.id returning * into b;
 perform set_config('smartbridge.sponsorship','false',true);
 perform set_config('smartbridge.cancel_booking','false',true);
 return b;
end $$;
revoke all on function smartbridge_private.create_sponsored_booking(uuid,uuid,text,date,text,numeric,text,uuid) from public,anon;
grant execute on function smartbridge_private.create_sponsored_booking(uuid,uuid,text,date,text,numeric,text,uuid) to authenticated;
create function public.create_sponsored_booking(allocation uuid,profile_id uuid,chosen_subject text,chosen_date date,chosen_time text,hours numeric,booking_message text,request_id uuid)
returns public.tutor_bookings language sql security invoker set search_path='' as $$select smartbridge_private.create_sponsored_booking($1,$2,$3,$4,$5,$6,$7,$8)$$;
revoke all on function public.create_sponsored_booking(uuid,uuid,text,date,text,numeric,text,uuid) from public,anon;
grant execute on function public.create_sponsored_booking(uuid,uuid,text,date,text,numeric,text,uuid) to authenticated;

create function smartbridge_private.update_sponsorship_reservation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.sponsorship_allocation_id is not null then
  -- Lock allocation so release and new reservations serialize. No cash refund to learner.
  perform 1 from public.sponsorship_allocations where id=new.sponsorship_allocation_id for update;
  update public.sponsorship_reservations set state=case when new.status='cancelled' then 'released' when new.status='completed' then 'consumed' else 'reserved' end,updated_at=now() where booking_id=new.id;
 end if;
 return new;
end $$;
revoke all on function smartbridge_private.update_sponsorship_reservation() from public,anon,authenticated;
create trigger update_sponsorship_reservation after update of status on public.tutor_bookings for each row when(old.status is distinct from new.status) execute function smartbridge_private.update_sponsorship_reservation();
