-- Return only the calling user's effective feature permissions.
-- Never expose feature_toggles email allow/deny arrays to ordinary users.
create or replace function public.my_feature_access()
returns table(feature_key text, is_enabled boolean, locked_message text)
language sql stable security definer
set search_path = ''
as $$
  select ft.feature_key,
    case
      when lower(u.email) = any(coalesce(array(select lower(trim(x)) from unnest(ft.disabled_for_emails) as x), array[]::text[])) then false
      when lower(u.email) = any(coalesce(array(select lower(trim(x)) from unnest(ft.enabled_for_emails) as x), array[]::text[])) then true
      else coalesce(ft.is_enabled, true)
    end,
    coalesce(ft.locked_message, 'This feature is currently unavailable.')
  from public.feature_toggles ft
  join auth.users u on u.id = (select auth.uid())
  where (select auth.uid()) is not null;
$$;
revoke all on function public.my_feature_access() from public, anon;
grant execute on function public.my_feature_access() to authenticated;

-- Remove the broad policy that currently exposes entire allow/deny email arrays.
-- Admins retain their dedicated MVP administrator management policy.
drop policy if exists active_account_required on public.feature_toggles;
