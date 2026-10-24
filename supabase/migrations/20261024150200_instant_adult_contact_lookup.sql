create or replace function public.lookup_instant_adult_contact(contact_email text)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare found_id uuid;
begin
 if auth.uid() is null or not smartbridge_private.meeting_adult(auth.uid()) then
 raise exception 'Adult account required' using errcode='42501';end if;
 select id into found_id from public.users where lower(email)=lower(trim(contact_email)) and id<>auth.uid()
 and smartbridge_private.meeting_adult(id) limit 1;
 return found_id;
end;$$;
revoke all on function public.lookup_instant_adult_contact(text) from public,anon;
grant execute on function public.lookup_instant_adult_contact(text) to authenticated;