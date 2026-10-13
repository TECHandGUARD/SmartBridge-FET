-- Target: existing SmartBridge FET schema, PostgreSQL 17.
-- Run as the database owner, inside a transaction. No customer data is deleted.
create schema if not exists smartbridge_private;
revoke all on schema smartbridge_private from public, anon;
grant usage on schema smartbridge_private to authenticated;

-- Authentication metadata is user-editable. New accounts never inherit a role from it.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.users (id,email,role,full_name,onboarding_complete,is_active,is_super_admin,is_premium)
  values (new.id,new.email,'user',coalesce(new.raw_user_meta_data->>'full_name',new.email),false,true,false,false);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
alter function public.sync_user_update() set search_path = public, pg_temp;
revoke execute on function public.sync_user_update() from public, anon, authenticated;
alter function public.update_updated_at_column() set search_path = public, pg_temp;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- A user may choose a non-privileged role once, at initial onboarding only.
create or replace function public.protect_privileged_columns()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if public.is_admin(auth.uid()) or coalesce(auth.role(),'') = 'service_role'
     or (auth.uid() is null and session_user = 'postgres' and current_setting('role',true) in ('none','postgres')) then return new; end if;
  if new.is_super_admin is distinct from old.is_super_admin
    or new.is_premium is distinct from old.is_premium
    or new.is_verified is distinct from old.is_verified
    or new.is_active is distinct from old.is_active
    or new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.linked_student_email is distinct from old.linked_student_email
    or (old.onboarding_complete and new.trial_started_at is distinct from old.trial_started_at) then
    raise exception 'Only an administrator may change account privileges or linked learners';
  end if;
  if old.onboarding_complete and not coalesce(new.onboarding_complete,false) then
    raise exception 'Onboarding cannot be reset by the account owner';
  end if;
  if new.role is distinct from old.role and not (
    not coalesce(old.onboarding_complete,false) and old.role in ('user','student')
    and new.onboarding_complete and new.role in ('student','parent','tutor_pending')
  ) then raise exception 'This role change requires administrator approval'; end if;
  return new;
end;
$$;
revoke execute on function public.protect_privileged_columns() from public, anon, authenticated;

-- Avoid the ambiguous user_id=user_id predicate in the original function.
create or replace function smartbridge_private.is_admin(user_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and auth.uid()=$1 and exists(select 1 from public.users u where u.id=$1 and u.is_super_admin=true);
$$;
create or replace function smartbridge_private.is_tutor(user_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and auth.uid()=$1 and exists(select 1 from public.tutor_profiles t where t.user_id=$1 and t.is_verified=true and coalesce(t.is_active,true));
$$;
revoke execute on function smartbridge_private.is_admin(uuid),smartbridge_private.is_tutor(uuid) from public,anon;
grant execute on function smartbridge_private.is_admin(uuid),smartbridge_private.is_tutor(uuid) to authenticated;
create or replace function public.is_admin(user_id uuid)
returns boolean language sql stable security invoker set search_path = public, pg_temp as $$ select smartbridge_private.is_admin($1); $$;
create or replace function public.is_tutor(user_id uuid)
returns boolean language sql stable security invoker set search_path = public, pg_temp as $$ select smartbridge_private.is_tutor($1); $$;
revoke execute on function public.is_admin(uuid),public.is_tutor(uuid) from public,anon;
grant execute on function public.is_admin(uuid),public.is_tutor(uuid) to authenticated;

-- Protect verification, ownership and commercial fields even when UPDATE RLS permits the row.
create or replace function smartbridge_private.protect_tutor_privileges()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if public.is_admin(auth.uid()) or coalesce(auth.role(),'') = 'service_role'
     or (auth.uid() is null and session_user = 'postgres' and current_setting('role',true) in ('none','postgres')) then return new; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.is_verified,false) or coalesce(new.is_premium,false) or coalesce(new.background_check_completed,false)
      or coalesce(new.rating,0) <> 0 then raise exception 'Tutor approval requires an administrator'; end if;
  else
    if new.is_verified is distinct from old.is_verified or new.is_premium is distinct from old.is_premium
      or new.background_check_completed is distinct from old.background_check_completed
      or new.verification_date is distinct from old.verification_date or new.rating is distinct from old.rating
      or new.user_id is distinct from old.user_id or new.user_email is distinct from old.user_email then
      raise exception 'Tutor approval and ownership require an administrator';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function smartbridge_private.protect_tutor_privileges() from public,anon;
grant execute on function smartbridge_private.protect_tutor_privileges() to authenticated;
drop trigger if exists protect_tutor_privileges on public.tutor_profiles;
create trigger protect_tutor_privileges before insert or update on public.tutor_profiles
for each row execute function smartbridge_private.protect_tutor_privileges();

-- Pending tutor applications are private to their owner and administrators.
drop policy if exists "Anyone can view tutor profiles" on public.tutor_profiles;
drop policy if exists "Anyone can view verified tutors" on public.tutor_profiles;
drop policy if exists "Tutor profiles visible to owner or admin" on public.tutor_profiles;
create policy "Tutor profiles visible to owner or admin" on public.tutor_profiles for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));
-- Publish a restricted directory instead of exposing credentials and clearance documents.
create or replace function smartbridge_private.verified_tutor_directory()
returns table(id uuid,user_id uuid,user_email text,full_name text,bio text,avatar_url text,subjects text[],grades text[],hourly_rate numeric,rating numeric,total_reviews integer,is_verified boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return query select t.id,t.user_id,t.user_email,t.full_name,t.bio,t.avatar_url,t.subjects,t.grades,t.hourly_rate,t.rating,t.total_reviews,t.is_verified
    from public.tutor_profiles t where t.is_verified=true and coalesce(t.is_active,true);
end;
$$;
revoke execute on function smartbridge_private.verified_tutor_directory() from public,anon;
grant execute on function smartbridge_private.verified_tutor_directory() to authenticated;
create or replace view public.tutor_directory with (security_invoker = true) as
select * from smartbridge_private.verified_tutor_directory();
revoke all on public.tutor_directory from public,anon;
grant select on public.tutor_directory to authenticated;
comment on view public.tutor_directory is 'Verified tutors only, explicit directory fields. Credentials and verification documents are excluded.';

-- Consent is written atomically with onboarding by the private implementation.
create or replace function smartbridge_private.complete_onboarding(
 requested_role text,sace_number text,university_name text,student_number text,
 policy_accepted boolean,tutor_agreement_accepted boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare account public.users; chosen_role text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if policy_accepted is distinct from true then raise exception 'Accept the privacy policy and terms'; end if;
  if requested_role not in ('student','parent','sace_tutor','student_tutor') or requested_role is null then raise exception 'Invalid onboarding role'; end if;
  select * into account from public.users where id=auth.uid() for update;
  if not found or account.is_active=false then raise exception 'Account unavailable'; end if;
  if account.onboarding_complete then return to_jsonb(account); end if;
  if requested_role in ('sace_tutor','student_tutor') then
    if tutor_agreement_accepted is distinct from true then raise exception 'Accept the tutor agreement'; end if;
    if requested_role='sace_tutor' and coalesce(trim(sace_number),'')='' then raise exception 'SACE number required'; end if;
    if requested_role='student_tutor' and (coalesce(trim(university_name),'')='' or coalesce(trim(student_number),'')='') then raise exception 'University and student number required'; end if;
    chosen_role := 'tutor_pending';
    if not exists(select 1 from public.tutor_profiles where user_id=auth.uid()) then
      insert into public.tutor_profiles(user_id,user_email,full_name,sace_number,qualifications,subjects,hourly_rate,is_verified,is_premium,rating)
      values (account.id,account.email,coalesce(account.full_name,account.email),sace_number,
        array[case when requested_role='sace_tutor' then 'SACE Registered: '||sace_number else university_name end],array[]::text[],0,false,false,0);
    end if;
    insert into public.user_consents(user_id,consent_type,consent_source,consent_metadata)
      values (account.id,'tutor_service_agreement','onboarding',jsonb_build_object('version','1.0.0'));
  else chosen_role:=requested_role; end if;
  update public.users set role=chosen_role,onboarding_complete=true,tutor_type=case when chosen_role='tutor_pending' then requested_role else null end,
    sace_number=complete_onboarding.sace_number,university=university_name,student_number=complete_onboarding.student_number,
    trial_started_at=coalesce(trial_started_at,now()),updated_at=now() where id=account.id returning * into account;
  insert into public.user_consents(user_id,consent_type,consent_source) values (account.id,'privacy_and_terms','onboarding');
  return to_jsonb(account);
end;
$$;
revoke execute on function smartbridge_private.complete_onboarding(text,text,text,text,boolean,boolean) from public,anon;
grant execute on function smartbridge_private.complete_onboarding(text,text,text,text,boolean,boolean) to authenticated;
create or replace function public.complete_onboarding(
 requested_role text,sace_number text default '',university_name text default '',student_number text default '',
 policy_accepted boolean default false,tutor_agreement_accepted boolean default false)
returns jsonb language sql security invoker set search_path = public, pg_temp as $$
 select smartbridge_private.complete_onboarding($1,$2,$3,$4,$5,$6);
$$;
revoke execute on function public.complete_onboarding(text,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.complete_onboarding(text,text,text,text,boolean,boolean) to authenticated;
-- Reading one's own consent records is safe; no client write grant is needed.
drop policy if exists "Read own consents" on public.user_consents;
create policy "Read own consents" on public.user_consents for select to authenticated using(user_id=(select auth.uid()));
