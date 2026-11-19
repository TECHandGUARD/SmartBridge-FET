-- The caller's current Auth identity and account state determine feature access.
-- Keep both the administrator-only table policy and its restrictive account check.
create or replace function public.my_feature_access()
returns table(feature_key text, is_enabled boolean, locked_message text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not smartbridge_private.active_account() and not exists (
    select 1 from public.users p
    where p.id = (select auth.uid()) and p.is_active is true and p.is_super_admin is true
  ) then
    raise exception 'Active onboarded account required' using errcode = '42501';
  end if;

  return query
  with account as (
    select p.role, p.is_super_admin, lower(trim(u.email)) as email
    from auth.users u
    join public.users p on p.id = u.id
    where u.id = (select auth.uid())
      and p.is_active is true
      and (p.onboarding_complete is true or p.is_super_admin is true)
  ), flags as (
    select ft.feature_key, ft.is_enabled, ft.locked_message,
           ft.enabled_for_emails, ft.disabled_for_emails
    from public.feature_toggles ft
    union all
    select 'opportunities', true, null, null, null
    where not exists (
      select 1 from public.feature_toggles ft where ft.feature_key = 'opportunities'
    )
  )
  select f.feature_key,
    case
      when f.feature_key = 'opportunities' and a.is_super_admin is not true
        and coalesce(a.role, '') not in ('student', 'parent', 'tutor', 'sace_tutor', 'student_tutor', 'admin') then false
      when exists (select 1 from unnest(f.disabled_for_emails) e where lower(trim(e)) = a.email) then false
      when exists (select 1 from unnest(f.enabled_for_emails) e where lower(trim(e)) = a.email) then true
      else coalesce(f.is_enabled, true)
    end,
    coalesce(nullif(trim(f.locked_message), ''), 'This feature is currently unavailable.')
  from flags f cross join account a;
end;
$$;
revoke all on function public.my_feature_access() from public, anon;
grant execute on function public.my_feature_access() to authenticated;

-- Protect the dedicated catalog at the data boundary, with the same plan and
-- Johannesburg billing dates used in the Opportunities interface.
-- Shared records (personal learning plans, counselor workflows and bursaries)
-- keep their independent access policies.
create function smartbridge_private.can_read_opportunities_catalog()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select case when not smartbridge_private.active_account() then false else exists (
    select 1 from public.my_feature_access() f
    where f.feature_key = 'opportunities' and f.is_enabled
  ) and exists (
    select 1 from public.users p
    where p.id = (select auth.uid())
      and (
        p.trial_started_at + interval '72 hours' > now()
        or exists (
          select 1 from public.subscriptions s
          where s.user_id = p.id and s.plan = 'premium' and s.status = 'active'
            and (now() at time zone 'Africa/Johannesburg')::date between s.start_date and s.end_date
        )
      )
  ) end;
$$;
revoke all on function smartbridge_private.can_read_opportunities_catalog() from public, anon;
grant execute on function smartbridge_private.can_read_opportunities_catalog() to authenticated;

do $$
declare relation text;
begin
  foreach relation in array array[
    'application_deadlines', 'nbt_resources', 'nbt_test_dates', 'opportunity_guides',
    'universities', 'university_directory', 'university_prospectuses'
  ] loop
    execute format(
      'create policy opportunities_catalog_access on public.%I as restrictive for select to authenticated using (
        (select public.is_admin(auth.uid())) or (select smartbridge_private.can_read_opportunities_catalog())
        or (%L = ''university_directory'' and (select smartbridge_private.has_staff_permission(''universities'')))
      )', relation, relation
    );
  end loop;
end;
$$;
