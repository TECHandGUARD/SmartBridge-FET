-- Requires the preceding core-flow migration. Target: the existing SmartBridge schema.
alter table public.tutor_bookings add column if not exists client_request_id uuid;
create unique index if not exists booking_request_unique on public.tutor_bookings(student_id,client_request_id);

-- Ordinary clients book through one checked operation, never by supplying a price.
drop policy if exists "Students can create bookings" on public.tutor_bookings;
create or replace function smartbridge_private.create_booking(
  profile_id uuid, chosen_subject text, chosen_date date, chosen_time text,
  hours numeric, booking_message text, request_id uuid
) returns public.tutor_bookings language plpgsql security definer set search_path = '' as $$
declare
  student public.users; tutor public.tutor_profiles; booking public.tutor_bookings;
  begins timestamptz; finishes timestamptz;
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
  if tutor.hourly_rate is null or tutor.hourly_rate<=0 then raise exception 'Tutor pricing is unavailable'; end if;
  begins := (chosen_date + chosen_time::time) at time zone 'Africa/Johannesburg';
  finishes := begins + hours * interval '1 hour';
  if begins<=now() then raise exception 'Choose a future session'; end if;
  if exists(select 1 from public.tutor_bookings b where b.tutor_id=tutor.user_id and b.status in ('pending','confirmed')
    and coalesce(b.start_time,(b.date+b.time::time) at time zone 'Africa/Johannesburg') < finishes+interval '15 minutes'
    and coalesce(b.end_time,((b.date+b.time::time) at time zone 'Africa/Johannesburg')+coalesce(b.duration_hours,1)*interval '1 hour') > begins-interval '15 minutes')
    then raise exception 'This session overlaps another booking. Choose another time'; end if;
  insert into public.tutor_bookings(student_id,student_email,student_name,tutor_id,tutor_profile_id,tutor_email,tutor_name,
    subject,date,time,duration_hours,message,amount,status,payment_status,amount_paid,currency,start_time,end_time,client_request_id,created_by)
  values(student.id,student.email,student.full_name,tutor.user_id,tutor.id,tutor.user_email,tutor.full_name,
    chosen_subject,chosen_date,chosen_time,hours,booking_message,round(tutor.hourly_rate*hours,2),'pending','pending',0,'ZAR',begins,finishes,request_id,student.id)
  returning * into booking;
  return booking;
end $$;
revoke all on function smartbridge_private.create_booking(uuid,text,date,text,numeric,text,uuid) from public,anon;
grant execute on function smartbridge_private.create_booking(uuid,text,date,text,numeric,text,uuid) to authenticated;
create or replace function public.create_booking(profile_id uuid,chosen_subject text,chosen_date date,chosen_time text,hours numeric,booking_message text,request_id uuid)
returns public.tutor_bookings language sql security invoker set search_path='' as $$
 select smartbridge_private.create_booking(profile_id,chosen_subject,chosen_date,chosen_time,hours,booking_message,request_id)
$$;
revoke all on function public.create_booking(uuid,text,date,text,numeric,text,uuid) from public,anon;
grant execute on function public.create_booking(uuid,text,date,text,numeric,text,uuid) to authenticated;

-- An UPDATE policy alone does not protect financial or ownership columns.
create or replace function smartbridge_private.protect_booking_update() returns trigger
language plpgsql security invoker set search_path='' as $$
declare permitted text[];
begin
  if public.is_admin(auth.uid()) or current_setting('role',true)='service_role'
    or (auth.uid() is null and session_user='postgres' and current_setting('role',true) in ('none','postgres')) then return new; end if;
  if auth.uid()=old.student_id then
    permitted:=array['status','cancellation_reason','cancelled_at','cancelled_by','student_rating','student_feedback','updated_at','updated_by'];
    if new.status is distinct from old.status and not (new.status='cancelled' and old.status in ('pending','confirmed')) then raise exception 'Students may only cancel an upcoming booking'; end if;
    if (new.student_rating is distinct from old.student_rating or new.student_feedback is distinct from old.student_feedback) and old.status<>'completed' then raise exception 'Review a completed session'; end if;
  elsif auth.uid()=old.tutor_id then
    permitted:=array['status','session_link','meeting_link','meeting_platform','cancellation_reason','cancelled_at','cancelled_by','completed_at','updated_at','updated_by'];
    if new.status is distinct from old.status and not ((old.status='pending' and new.status in ('confirmed','cancelled')) or (old.status='confirmed' and new.status in ('completed','cancelled'))) then raise exception 'Invalid booking transition'; end if;
    if new.status='completed' and old.end_time>now() then raise exception 'Session has not finished'; end if;
  else raise exception 'Booking access denied'; end if;
  if (to_jsonb(new)-permitted) is distinct from (to_jsonb(old)-permitted) then raise exception 'Booking ownership, schedule and payment details cannot be edited'; end if;
  if new.status='cancelled' and new.status is distinct from old.status then new.cancelled_by:=auth.uid(); new.cancelled_at:=now(); end if;
  if new.status='completed' and new.status is distinct from old.status then new.completed_at:=now(); end if;
  new.updated_by:=auth.uid();
  return new;
end $$;
revoke all on function smartbridge_private.protect_booking_update() from public,anon,authenticated;
create trigger protect_booking_update before update on public.tutor_bookings for each row execute function smartbridge_private.protect_booking_update();

-- Consent is represented by a relationship, not a client-editable email field.
create table public.parent_student_links(
 id uuid primary key default gen_random_uuid(), parent_id uuid not null references public.users(id) on delete cascade,
 student_id uuid not null references public.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','revoked')),
 created_at timestamptz not null default now(), approved_at timestamptz,
 unique(parent_id,student_id),check(parent_id<>student_id)
);
alter table public.parent_student_links enable row level security;
grant select on public.parent_student_links to authenticated;
revoke all on public.parent_student_links from anon;
create policy "Participants read own links" on public.parent_student_links for select to authenticated
using(auth.uid()=parent_id or auth.uid()=student_id);
create index parent_links_student_status on public.parent_student_links(student_id,status);

create or replace function smartbridge_private.has_parent_link(learner_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.parent_student_links l
 join public.users p on p.id=l.parent_id join public.users s on s.id=l.student_id where l.parent_id=auth.uid() and l.student_id=learner_id and l.status='approved' and p.role='parent' and p.is_active=true and s.role='student' and s.is_active=true)
$$;
revoke all on function smartbridge_private.has_parent_link(uuid) from public,anon;
grant execute on function smartbridge_private.has_parent_link(uuid) to authenticated;
create policy "Approved parents read progress" on public.student_progress for select to authenticated using(smartbridge_private.has_parent_link(student_id));
create policy "Approved parents read quiz results" on public.quiz_results for select to authenticated using(smartbridge_private.has_parent_link(student_id));
create policy "Approved parents read bookings" on public.tutor_bookings for select to authenticated using(smartbridge_private.has_parent_link(student_id));

create or replace function smartbridge_private.request_parent_link(learner_email text) returns boolean
language plpgsql security definer set search_path='' as $$
declare learner uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.users where id=auth.uid() and role='parent' and is_active=true and onboarding_complete=true) then raise exception 'An active parent account is required'; end if;
 if (select count(*) from public.parent_student_links where parent_id=auth.uid() and created_at>now()-interval '1 day')>=5 then raise exception 'Too many link requests. Try again later'; end if;
 select id into learner from public.users where lower(email)=lower(trim(learner_email)) and role='student' and is_active=true and onboarding_complete=true;
 -- Always return the same response; do not disclose whether an email is registered.
 if learner is not null then
  insert into public.parent_student_links(parent_id,student_id) values(auth.uid(),learner)
  on conflict(parent_id,student_id) do nothing;
 end if;
 return true;
end $$;
create or replace function public.request_parent_link(learner_email text) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.request_parent_link(learner_email)$$;

create or replace function smartbridge_private.respond_parent_link(link_id uuid,decision text) returns boolean
language plpgsql security definer set search_path='' as $$
declare link public.parent_student_links;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into link from public.parent_student_links where id=link_id and (student_id=auth.uid() or parent_id=auth.uid()) for update;
 if not found then raise exception 'Request unavailable'; end if;
 if decision='approved' and auth.uid()=link.student_id and link.status='pending'
   and exists(select 1 from public.users where id=auth.uid() and role='student' and is_active=true) then
  update public.parent_student_links set status='approved',approved_at=now() where id=link_id;
 elsif decision='revoked' then update public.parent_student_links set status='revoked' where id=link_id;
 else raise exception 'Only the learner may approve a pending request'; end if;
 return true;
end $$;
create or replace function public.respond_parent_link(link_id uuid,decision text) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.respond_parent_link(link_id,decision)$$;
create or replace function smartbridge_private.get_parent_links() returns table(id uuid,parent_id uuid,student_id uuid,parent_email text,student_email text,status text)
language sql stable security definer set search_path='' as $$
 select l.id,l.parent_id,l.student_id,p.email,s.email,l.status from public.parent_student_links l
 join public.users p on p.id=l.parent_id join public.users s on s.id=l.student_id
 where auth.uid() is not null and (l.parent_id=auth.uid() or l.student_id=auth.uid()) and p.is_active=true and s.is_active=true
$$;
create or replace function public.get_parent_links() returns table(id uuid,parent_id uuid,student_id uuid,parent_email text,student_email text,status text)
language sql stable security invoker set search_path='' as $$select * from smartbridge_private.get_parent_links()$$;
revoke all on function smartbridge_private.request_parent_link(text),smartbridge_private.respond_parent_link(uuid,text),smartbridge_private.get_parent_links(),public.request_parent_link(text),public.respond_parent_link(uuid,text),public.get_parent_links() from public,anon;
grant execute on function smartbridge_private.request_parent_link(text),smartbridge_private.respond_parent_link(uuid,text),smartbridge_private.get_parent_links(),public.request_parent_link(text),public.respond_parent_link(uuid,text),public.get_parent_links() to authenticated;

-- Configuration readers receive only settings intended for the interface.
create policy "Admins manage system configuration" on public.system_configuration for all to authenticated
using(public.is_admin(auth.uid())) with check(public.is_admin(auth.uid()));
create policy "Clients read safe active settings" on public.system_configuration for select to authenticated
using(is_active=true and coalesce(is_encrypted,false)=false and key in
 ('ai_guardrails','ai_welcome_message','ai_suggestions','exam_term_dates','academic_term_dates','tutor_profile_config','tutor_verification_config'));

-- Client-reported activity is attributed to the caller, never a supplied email.
create or replace function smartbridge_private.attribute_activity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('role',true)='service_role' or (auth.uid() is null and session_user='postgres' and current_setting('role',true) in ('none','postgres')) then return new; end if;
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select id,email into new.user_id,new.user_email from public.users where id=auth.uid() and is_active=true;
 if not found then raise exception 'Active account required'; end if;
 new.created_at:=now();
 return new;
end $$;
revoke all on function smartbridge_private.attribute_activity() from public,anon,authenticated;
create trigger attribute_activity before insert on public.activity_log for each row execute function smartbridge_private.attribute_activity();
drop policy if exists "System can insert activity logs" on public.activity_log;
create policy "Users report their own activity" on public.activity_log for insert to authenticated with check(auth.uid()=user_id);
