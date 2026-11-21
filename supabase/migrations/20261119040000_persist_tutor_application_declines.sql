alter table public.users add column tutor_application_declined_at timestamptz;

-- Applicants can see this field on their own account but cannot edit the decision.
create function smartbridge_private.protect_tutor_application_decision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tutor_application_declined_at is distinct from old.tutor_application_declined_at
    and not smartbridge_private.is_admin(auth.uid()) then
    raise exception 'Administrator required for tutor application decisions' using errcode = '42501';
  end if;
  if old.role = 'tutor_pending' and new.role is distinct from old.role then
    new.tutor_application_declined_at := null;
  end if;
  return new;
end;
$$;
revoke all on function smartbridge_private.protect_tutor_application_decision() from public, anon, authenticated;
create trigger protect_tutor_application_decision
before update on public.users
for each row execute function smartbridge_private.protect_tutor_application_decision();

create function smartbridge_private.decline_tutor_application(target_id uuid)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare account public.users;
begin
  if not smartbridge_private.is_admin(auth.uid()) then
    raise exception 'Active administrator required' using errcode = '42501';
  end if;

  select * into account from public.users
  where id = target_id and is_active is true and role = 'tutor_pending'
  for update;
  if not found then
    raise exception 'Application is no longer awaiting review';
  end if;
  if account.tutor_application_declined_at is not null then
    return account.tutor_application_declined_at;
  end if;

  update public.tutor_profiles set is_verified = false, is_active = false, updated_at = now()
  where user_id = target_id;
  update public.users set is_verified = false, tutor_application_declined_at = now(), updated_at = now()
  where id = target_id returning tutor_application_declined_at into account.tutor_application_declined_at;
  insert into public.activity_log(event_type,user_id,user_email,description,metadata)
  select 'tutor_rejected', actor.id, actor.email, 'Administrator declined a tutor application',
    jsonb_build_object('applicant_id', target_id)
  from public.users actor where actor.id = (select auth.uid());
  return account.tutor_application_declined_at;
end;
$$;

create function public.decline_tutor_application(target_id uuid)
returns timestamptz
language sql security invoker
set search_path = ''
as $$ select smartbridge_private.decline_tutor_application($1); $$;
revoke all on function public.decline_tutor_application(uuid),
  smartbridge_private.decline_tutor_application(uuid) from public, anon;
grant execute on function public.decline_tutor_application(uuid),
  smartbridge_private.decline_tutor_application(uuid) to authenticated;
