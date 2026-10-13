-- Revocation must affect tutor eligibility and discovery without JWT refresh.
create or replace function smartbridge_private.is_tutor(user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and auth.uid()=$1 and exists(
  select 1 from public.tutor_profiles t join public.users u on u.id=t.user_id
  where t.user_id=$1 and t.is_verified=true and coalesce(t.is_active,true) and u.is_active=true);
$$;
create or replace function smartbridge_private.verified_tutor_directory()
returns table(id uuid,user_id uuid,user_email text,full_name text,bio text,avatar_url text,subjects text[],grades text[],hourly_rate numeric,rating numeric,total_reviews integer,is_verified boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true) then raise exception 'Active account required'; end if;
 return query select t.id,t.user_id,t.user_email,t.full_name,t.bio,t.avatar_url,t.subjects,t.grades,t.hourly_rate,t.rating,t.total_reviews,t.is_verified
  from public.tutor_profiles t join public.users u on u.id=t.user_id
  where t.is_verified=true and coalesce(t.is_active,true) and u.is_active=true;
end;$$;
