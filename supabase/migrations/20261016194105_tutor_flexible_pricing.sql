-- Tutor-controlled prices: no commercial minimum or maximum. Zero means free.
alter table public.tutor_profiles add column subject_rates jsonb not null default '{}'::jsonb;
alter table public.tutor_profiles add column offers_free_intro boolean not null default false;
alter table public.tutor_bookings add column is_intro boolean not null default false;
-- Pending, confirmed and completed introductions consume the allowance. Cancelled ones can be rebooked.
create unique index one_intro_per_learner_tutor on public.tutor_bookings(student_id,tutor_id)
 where is_intro and status <> 'cancelled';

create function smartbridge_private.validate_tutor_prices() returns trigger
language plpgsql security invoker set search_path='' as $$
declare item record; price numeric;
begin
 if tg_op='INSERT' then new.hourly_rate:=coalesce(new.hourly_rate,new.session_price_per_hour);new.session_price_per_hour:=new.hourly_rate;
 elsif new.hourly_rate is distinct from old.hourly_rate then new.session_price_per_hour := new.hourly_rate;
 elsif new.session_price_per_hour is distinct from old.session_price_per_hour then new.hourly_rate := new.session_price_per_hour; end if;
 foreach price in array array[new.hourly_rate,new.session_price_per_hour,new.group_session_price] loop
  if price is not null and (price::text in ('NaN','Infinity','-Infinity') or price<0 or price<>round(price,2)) then
   raise exception 'Rates must be non-negative amounts with at most two decimal places'; end if;
 end loop;
 if jsonb_typeof(new.subject_rates)<>'object' then raise exception 'Subject prices must be an object'; end if;
 for item in select key,value from jsonb_each(new.subject_rates) loop
  if not coalesce(item.key=any(new.subjects),false) then raise exception 'Set prices only for subjects you offer'; end if;
  if jsonb_typeof(item.value)<>'number' then raise exception 'Subject prices must be numbers'; end if;
  price := item.value::text::numeric;
  if price::text in ('NaN','Infinity','-Infinity') or price<0 or price<>round(price,2) then raise exception 'Enter a valid subject rate'; end if;
 end loop;
 return new;
end $$;
revoke all on function smartbridge_private.validate_tutor_prices() from public,anon,authenticated;
create trigger validate_tutor_prices before insert or update on public.tutor_profiles for each row execute function smartbridge_private.validate_tutor_prices();

create or replace function smartbridge_private.create_booking(
  profile_id uuid, chosen_subject text, chosen_date date, chosen_time text,
  hours numeric, booking_message text, request_id uuid, free_intro boolean
) returns public.tutor_bookings language plpgsql security definer set search_path = '' as $$
declare
  student public.users; tutor public.tutor_profiles; booking public.tutor_bookings;
  begins timestamptz; finishes timestamptz; rate numeric; total numeric;
begin
  if auth.uid() is null or request_id is null then raise exception 'Sign in and provide a request ID'; end if;
  select * into student from public.users where id=auth.uid() and role='student' and is_active=true and onboarding_complete=true;
  if not found then raise exception 'An active student account is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || request_id::text,0));
  select * into booking from public.tutor_bookings where student_id=auth.uid() and client_request_id=request_id;
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
    if exists(select 1 from public.tutor_bookings b where b.student_id=auth.uid() and b.tutor_id=tutor.user_id and b.is_intro and b.status<>'cancelled') then raise exception 'You have already requested an introduction with this tutor'; end if;
    total := 0;
  else
    rate := coalesce((tutor.subject_rates->>chosen_subject)::numeric,tutor.hourly_rate);
    if rate is null or rate<0 or rate::text in ('NaN','Infinity','-Infinity') then raise exception 'Tutor pricing is unavailable'; end if;
    total := round(rate*hours,2);
  end if;
  begins := (chosen_date + chosen_time::time) at time zone 'Africa/Johannesburg';
  finishes := begins + hours * interval '1 hour';
  if begins<=now() then raise exception 'Choose a future session'; end if;
  if exists(select 1 from public.tutor_bookings b where b.tutor_id=tutor.user_id and b.status in ('pending','confirmed')
    and coalesce(b.start_time,(b.date+b.time::time) at time zone 'Africa/Johannesburg') < finishes+interval '15 minutes'
    and coalesce(b.end_time,((b.date+b.time::time) at time zone 'Africa/Johannesburg')+coalesce(b.duration_hours,1)*interval '1 hour') > begins-interval '15 minutes')
    then raise exception 'This session overlaps another booking. Choose another time'; end if;
  insert into public.tutor_bookings(student_id,student_email,student_name,tutor_id,tutor_profile_id,tutor_email,tutor_name,
    subject,date,time,duration_hours,message,amount,status,payment_status,amount_paid,currency,start_time,end_time,client_request_id,created_by,is_intro)
  values(student.id,student.email,student.full_name,tutor.user_id,tutor.id,tutor.user_email,tutor.full_name,
    chosen_subject,chosen_date,chosen_time,hours,booking_message,total,'pending','pending',0,'ZAR',begins,finishes,request_id,student.id,coalesce(free_intro,false))
  returning * into booking;
  return booking;
end $$;
revoke all on function smartbridge_private.create_booking(uuid,text,date,text,numeric,text,uuid,boolean) from public,anon;
grant execute on function smartbridge_private.create_booking(uuid,text,date,text,numeric,text,uuid,boolean) to authenticated;
create or replace function public.create_booking(profile_id uuid,chosen_subject text,chosen_date date,chosen_time text,hours numeric,booking_message text,request_id uuid,free_intro boolean)
returns public.tutor_bookings language sql security invoker set search_path='' as $$
 select smartbridge_private.create_booking(profile_id,chosen_subject,chosen_date,chosen_time,hours,booking_message,request_id,free_intro)
$$;
revoke all on function public.create_booking(uuid,text,date,text,numeric,text,uuid,boolean) from public,anon;
grant execute on function public.create_booking(uuid,text,date,text,numeric,text,uuid,boolean) to authenticated;

-- The seven-argument API stays compatible and gets the same subject pricing and guards.
create or replace function smartbridge_private.create_booking(profile_id uuid,chosen_subject text,chosen_date date,chosen_time text,hours numeric,booking_message text,request_id uuid)
returns public.tutor_bookings language sql security invoker set search_path='' as $$
 select smartbridge_private.create_booking(profile_id,chosen_subject,chosen_date,chosen_time,hours,booking_message,request_id,false)
$$;

drop view public.tutor_directory;
drop function smartbridge_private.verified_tutor_directory();
create function smartbridge_private.verified_tutor_directory()
returns table(id uuid,user_id uuid,user_email text,full_name text,bio text,avatar_url text,subjects text[],grades text[],hourly_rate numeric,rating numeric,total_reviews integer,is_verified boolean,video_url text,subject_rates jsonb,offers_free_intro boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true) then raise exception 'Active account required';end if;
 return query select t.id,t.user_id,t.user_email,t.full_name,t.bio,t.avatar_url,t.subjects,t.grades,t.hourly_rate,t.rating,t.total_reviews,t.is_verified,nullif(t.metadata->>'video_url',''),t.subject_rates,t.offers_free_intro
 from public.tutor_profiles t join public.users u on u.id=t.user_id where t.is_verified and coalesce(t.is_active,true) and u.is_active;
end;$$;
revoke all on function smartbridge_private.verified_tutor_directory() from public,anon;
grant execute on function smartbridge_private.verified_tutor_directory() to authenticated;
create view public.tutor_directory with (security_invoker=true) as select * from smartbridge_private.verified_tutor_directory();
revoke all on public.tutor_directory from public,anon;
grant select on public.tutor_directory to authenticated;
