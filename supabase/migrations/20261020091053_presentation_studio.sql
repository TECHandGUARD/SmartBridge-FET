-- Private account-owned decks. Branding is added by the renderer, not editable content.
create function smartbridge_private.presentation_author() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.users u where u.id=auth.uid() and u.is_active and u.onboarding_complete and (u.is_super_admin or u.role='admin' or (u.role in ('tutor','sace_tutor','student_tutor') and exists(select 1 from public.tutor_profiles t where t.user_id=u.id and t.is_active and t.is_verified))))
$$;
create function smartbridge_private.valid_presentation(content jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare slide jsonb;
begin
 if (jsonb_typeof(content)='object' and content->>'theme' in ('forest','ocean','sunrise','midnight') and jsonb_typeof(content->'show_author')='boolean' and jsonb_typeof(content->'slides')='array') is distinct from true then return false;end if;
 if jsonb_array_length(content->'slides') not between 1 and 40 or octet_length(content::text)>200000 then return false;end if;
 for slide in select value from jsonb_array_elements(content->'slides') loop
  if (jsonb_typeof(slide)='object' and jsonb_typeof(slide->'title')='string' and length(btrim(slide->>'title')) between 1 and 100 and jsonb_typeof(slide->'body')='string' and length(slide->>'body')<=1600 and jsonb_typeof(slide->'notes')='string' and length(slide->>'notes')<=2000 and slide->>'layout' in ('title','content')) is distinct from true then return false;end if;
 end loop;return true;
end $$;
revoke all on function smartbridge_private.presentation_author(),smartbridge_private.valid_presentation(jsonb) from public,anon;
grant execute on function smartbridge_private.presentation_author(),smartbridge_private.valid_presentation(jsonb) to authenticated;
create table public.presentation_decks(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references public.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 3 and 120),content jsonb not null check(smartbridge_private.valid_presentation(content)),
 revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index presentation_decks_owner on public.presentation_decks(owner_id,updated_at desc);
alter table public.presentation_decks enable row level security;
revoke all on public.presentation_decks from public,anon,authenticated;
grant select,insert,update,delete on public.presentation_decks to authenticated;
create policy "Authors read own presentations" on public.presentation_decks for select to authenticated using(owner_id=(select auth.uid()) and (select smartbridge_private.presentation_author()));
create policy "Authors create own presentations" on public.presentation_decks for insert to authenticated with check(owner_id=(select auth.uid()) and revision=1 and (select smartbridge_private.presentation_author()));
create policy "Authors edit own presentations" on public.presentation_decks for update to authenticated using(owner_id=(select auth.uid()) and (select smartbridge_private.presentation_author())) with check(owner_id=(select auth.uid()) and (select smartbridge_private.presentation_author()));
create policy "Authors remove own presentations" on public.presentation_decks for delete to authenticated using(owner_id=(select auth.uid()) and (select smartbridge_private.presentation_author()));
create function smartbridge_private.presentation_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.owner_id<>old.owner_id or new.id<>old.id then raise exception 'Presentation ownership cannot be changed';end if;
 new.revision:=old.revision+1;new.created_at:=old.created_at;new.updated_at:=now();return new;
end $$;
create trigger presentation_deck_revision before update on public.presentation_decks for each row execute function smartbridge_private.presentation_revision();
revoke all on function smartbridge_private.presentation_revision() from public,anon;
