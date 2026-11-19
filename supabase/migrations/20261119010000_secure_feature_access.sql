-- Return only the calling user's effective feature permissions.
-- Never expose feature_toggles email allow/deny arrays to ordinary users.
create or replace function public.my_feature_access()
returns table(feature_key text, is_enabled boolean, locked_message text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not smartbridge_private.active_account() then
    raise exception 'Active onboarded account required' using errcode = '42501';
  end if;

  return query
  select ft.feature_key,
    case
      when lower(trim(u.email)) = any(coalesce(array(select lower(trim(x)) from unnest(ft.disabled_for_emails) as x), array[]::text[])) then false
      when lower(trim(u.email)) = any(coalesce(array(select lower(trim(x)) from unnest(ft.enabled_for_emails) as x), array[]::text[])) then true
      else coalesce(ft.is_enabled, true)
    end,
    coalesce(ft.locked_message, 'This feature is currently unavailable.')
  from public.feature_toggles ft
  join auth.users u on u.id = (select auth.uid());
end;
$$;
revoke all on function public.my_feature_access() from public, anon;
grant execute on function public.my_feature_access() to authenticated;
