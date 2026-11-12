-- Shared media support for existing lesson presentations and admin marketing posts.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
 ('lesson-media','lesson-media',false,31457280,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']),
 ('marketing-media','marketing-media',true,31457280,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists lesson_media_owner_read on storage.objects;
create policy lesson_media_owner_read on storage.objects for select to authenticated
 using(bucket_id='lesson-media' and (storage.foldername(name))[1]=auth.uid()::text and (select smartbridge_private.presentation_author()));
drop policy if exists lesson_media_owner_insert on storage.objects;
create policy lesson_media_owner_insert on storage.objects for insert to authenticated
 with check(bucket_id='lesson-media' and (storage.foldername(name))[1]=auth.uid()::text and (select smartbridge_private.presentation_author()));
drop policy if exists lesson_media_owner_update on storage.objects;
create policy lesson_media_owner_update on storage.objects for update to authenticated
 using(bucket_id='lesson-media' and (storage.foldername(name))[1]=auth.uid()::text and (select smartbridge_private.presentation_author()))
 with check(bucket_id='lesson-media' and (storage.foldername(name))[1]=auth.uid()::text and (select smartbridge_private.presentation_author()));
drop policy if exists lesson_media_owner_delete on storage.objects;
create policy lesson_media_owner_delete on storage.objects for delete to authenticated
 using(bucket_id='lesson-media' and (storage.foldername(name))[1]=auth.uid()::text and (select smartbridge_private.presentation_author()));

drop policy if exists marketing_media_admin_insert on storage.objects;
create policy marketing_media_admin_insert on storage.objects for insert to authenticated
 with check(bucket_id='marketing-media' and (storage.foldername(name))[1]=auth.uid()::text and smartbridge_private.is_admin(auth.uid()));
drop policy if exists marketing_media_admin_update on storage.objects;
create policy marketing_media_admin_update on storage.objects for update to authenticated
 using(bucket_id='marketing-media' and (storage.foldername(name))[1]=auth.uid()::text and smartbridge_private.is_admin(auth.uid()))
 with check(bucket_id='marketing-media' and (storage.foldername(name))[1]=auth.uid()::text and smartbridge_private.is_admin(auth.uid()));
drop policy if exists marketing_media_admin_delete on storage.objects;
create policy marketing_media_admin_delete on storage.objects for delete to authenticated
 using(bucket_id='marketing-media' and (storage.foldername(name))[1]=auth.uid()::text and smartbridge_private.is_admin(auth.uid()));

create table public.marketing_post_media(
 post_id uuid primary key references public.marketing_posts(id) on delete cascade,
 object_path text not null check(length(object_path)<=500),
 media_type text not null check(media_type in ('image','video')),
 alt_text text not null default '' check(length(alt_text)<=240),
 updated_at timestamptz not null default now()
);
alter table public.marketing_post_media enable row level security;
revoke all on public.marketing_post_media from public,anon,authenticated;
grant select on public.marketing_post_media to anon,authenticated;
grant insert,update,delete on public.marketing_post_media to authenticated;
create policy public_media_for_published_posts on public.marketing_post_media for select to anon
 using(exists(select 1 from public.marketing_posts p where p.id=post_id and p.published));
create policy member_media_for_posts on public.marketing_post_media for select to authenticated
 using(exists(select 1 from public.marketing_posts p where p.id=post_id and (p.published or smartbridge_private.is_admin(auth.uid()))));
create policy admins_manage_post_media on public.marketing_post_media for all to authenticated
 using(smartbridge_private.is_admin(auth.uid())) with check(smartbridge_private.is_admin(auth.uid()));
create policy active_account_required on public.marketing_post_media as restrictive for all to authenticated
 using((select smartbridge_private.enabled_account())) with check((select smartbridge_private.enabled_account()));

-- Extend slide validation without invalidating legacy text-only presentations.
create or replace function smartbridge_private.valid_presentation(content jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare slide jsonb; media jsonb;
begin
 if (jsonb_typeof(content)='object' and content->>'theme' in ('forest','ocean','sunrise','midnight') and jsonb_typeof(content->'show_author')='boolean' and jsonb_typeof(content->'slides')='array') is distinct from true then return false;end if;
 if jsonb_array_length(content->'slides') not between 1 and 40 or octet_length(content::text)>200000 then return false;end if;
 for slide in select value from jsonb_array_elements(content->'slides') loop
  if (jsonb_typeof(slide)='object' and jsonb_typeof(slide->'title')='string' and length(btrim(slide->>'title')) between 1 and 100 and jsonb_typeof(slide->'body')='string' and length(slide->>'body')<=1600 and jsonb_typeof(slide->'notes')='string' and length(slide->>'notes')<=2000 and slide->>'layout' in ('title','content')) is distinct from true then return false;end if;
  if slide ? 'media' and slide->'media'<>'null'::jsonb then
   media:=slide->'media';
   if jsonb_typeof(media)<>'object' or coalesce(media->>'kind','') not in ('image','video') or jsonb_typeof(media->'path') is distinct from 'string' or length(media->>'path')>500 or coalesce(length(media->>'caption'),0)>240 then return false;end if;
   if split_part(media->>'path','/',1)='' then return false;end if;
  end if;
 end loop;return true;
end $$;
revoke all on function smartbridge_private.valid_presentation(jsonb) from public,anon;
grant execute on function smartbridge_private.valid_presentation(jsonb) to authenticated;
