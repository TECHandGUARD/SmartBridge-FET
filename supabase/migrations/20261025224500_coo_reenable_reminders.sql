-- An authenticated tutor can explicitly resume optional operational profile reminders.
-- The function cannot change another user's preferences or suppression state.
create or replace function public.coo_reenable_reminders()
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid;
begin
 v_id := auth.uid();
 if v_id is null then raise exception 'Not authenticated'; end if;
 if not exists(select 1 from public.users where id=v_id and role in ('student_tutor','sace_tutor','tutor') and is_active=true)
 then raise exception 'Tutor account required'; end if;
 delete from public.coo_reminder_suppressions where tutor_id=v_id;
 update public.users set communication_preferences='email' where id=v_id;
 return true;
end $$;
revoke all on function public.coo_reenable_reminders() from PUBLIC,anon;
grant execute on function public.coo_reenable_reminders() to authenticated;