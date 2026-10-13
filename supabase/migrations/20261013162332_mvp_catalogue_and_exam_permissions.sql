-- Local MVP follow-up. Apply after the captured baseline and all seven repairs.
-- Preserve RLS; explicitly grant only ordinary API operations, never TRUNCATE/TRIGGER.
create or replace function smartbridge_private.is_admin(user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and auth.uid()=$1 and exists(
  select 1 from public.users u where u.id=$1 and u.is_active=true
  and (u.is_super_admin=true or u.role='admin'));
$$;
create function smartbridge_private.active_account()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.users u
  where u.id=auth.uid() and u.is_active=true and u.onboarding_complete=true);
$$;
create function smartbridge_private.student_account()
returns boolean language sql stable security definer set search_path='' as $$
 select smartbridge_private.active_account() and exists(select 1 from public.users u
  where u.id=auth.uid() and u.role='student');
$$;
revoke all on function smartbridge_private.active_account(),smartbridge_private.student_account() from public,anon;
grant execute on function smartbridge_private.active_account(),smartbridge_private.student_account() to authenticated;

do $$ declare relation text; begin
 foreach relation in array array['application_deadlines','bursaries','nbt_test_dates','opportunity_guides',
  'pending_application_deadlines','pending_opportunity_guides','pending_university_prospectuses',
  'subjects','universities','university_directory','university_prospectuses','feature_toggles','profiles',
  'banner_clicks','exam_schedule'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on table public.%I from public,anon,authenticated',relation);
  execute format('grant select,insert,update,delete on table public.%I to authenticated',relation);
  execute format('grant all on table public.%I to service_role',relation);
  execute format('create policy "MVP administrator management" on public.%I for all to authenticated using(public.is_admin((select auth.uid()))) with check(public.is_admin((select auth.uid())))',relation);
 end loop;
end $$;
-- Only enrolled active accounts see catalogue content; drafts remain administrator-only.
create policy "Published deadlines" on public.application_deadlines for select to authenticated
 using(smartbridge_private.active_account() and is_active=true and is_approved=true);
create policy "Active bursaries" on public.bursaries for select to authenticated
 using(smartbridge_private.active_account() and is_active=true);
create policy "Active NBT dates" on public.nbt_test_dates for select to authenticated
 using(smartbridge_private.active_account() and is_active=true);
create policy "Published opportunity guides" on public.opportunity_guides for select to authenticated
 using(smartbridge_private.active_account() and is_active=true and is_pending=false);
create policy "Published subjects" on public.subjects for select to authenticated
 using(smartbridge_private.active_account() and is_active=true and is_published=true);
create policy "Active universities" on public.universities for select to authenticated
 using(smartbridge_private.active_account() and is_active=true);
create policy "Active university directory" on public.university_directory for select to authenticated
 using(smartbridge_private.active_account() and is_active=true);
create policy "Published prospectuses" on public.university_prospectuses for select to authenticated
 using(smartbridge_private.active_account() and is_active=true and is_approved=true);
-- profiles is a dormant legacy relation. Its role must never become an authorization source.
create policy "Read own legacy profile" on public.profiles for select to authenticated
 using(id=(select auth.uid()) and smartbridge_private.active_account());
-- Feature override email lists and discovery/review queues are intentionally admin-only.

create policy "Read own exam plan" on public.exam_schedule for select to authenticated
 using(student_id=(select auth.uid()) and smartbridge_private.student_account());
create policy "Create own exam plan" on public.exam_schedule for insert to authenticated
 with check(student_id=(select auth.uid()) and smartbridge_private.student_account());
create policy "Edit own unpublished exam plan" on public.exam_schedule for update to authenticated
 using(student_id=(select auth.uid()) and is_published=false and smartbridge_private.student_account())
 with check(student_id=(select auth.uid()) and is_published=false and smartbridge_private.student_account());
create policy "Delete own unpublished exam plan" on public.exam_schedule for delete to authenticated
 using(student_id=(select auth.uid()) and is_published=false and smartbridge_private.student_account());
create function smartbridge_private.protect_exam_plan()
returns trigger language plpgsql security definer set search_path='' as $$
declare email_address text; begin
 if coalesce(auth.role(),'')='service_role' or (auth.uid() is null and session_user='postgres' and current_setting('role',true) in ('none','postgres'))
  or public.is_admin(auth.uid()) then return new; end if;
 if not smartbridge_private.student_account() or new.student_id is distinct from auth.uid() then
  raise exception 'An active learner must own the exam plan'; end if;
 select email into email_address from public.users where id=auth.uid();
 if new.student_email is distinct from email_address then raise exception 'Exam owner email mismatch'; end if;
 if new.is_published is distinct from false or new.published_date is not null
  or new.results_available is distinct from false or new.results_published_at is not null or new.score is not null then
  raise exception 'Publication and marks require administrator review'; end if;
 if tg_op='UPDATE' and (new.id is distinct from old.id or new.student_id is distinct from old.student_id
  or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at) then
  raise exception 'Exam ownership and creation fields cannot change'; end if;
 if tg_op='INSERT' then new.created_by:=auth.uid(); end if;
 new.updated_by:=auth.uid(); return new;
end;$$;
revoke all on function smartbridge_private.protect_exam_plan() from public,anon,authenticated;
create trigger protect_exam_plan before insert or update on public.exam_schedule
 for each row execute function smartbridge_private.protect_exam_plan();

create policy "Record own banner click" on public.banner_clicks for insert to authenticated
 with check(smartbridge_private.active_account() and user_id=(select auth.uid())
  and user_email=(select email from public.users where id=(select auth.uid()))
  and banner_name='tech_guard' and ip_address is null and user_agent is null);

-- One transaction locks the review item and publishes it. Only the authenticated Edge
-- service may supply actor_id, after checking its real user token; browser RPC is revoked.
create function public.review_opportunity_content(actor_id uuid,content_type text,item_id uuid,
 decision text,review_notes text default '') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare pending_table text; item record; published_id uuid; review_time timestamptz:=now();
begin
 if not exists(select 1 from public.users u where u.id=actor_id and u.is_active=true
  and (u.is_super_admin=true or u.role='admin')) then raise exception 'Active administrator required'; end if;
 if decision not in ('approve','reject') or decision is null then raise exception 'Invalid review decision'; end if;
 pending_table:=case content_type when 'deadline' then 'pending_application_deadlines'
  when 'guide' then 'pending_opportunity_guides' when 'prospectus' then 'pending_university_prospectuses' end;
 if pending_table is null or item_id is null or length(coalesce(review_notes,''))>5000 then
  raise exception 'Invalid review request'; end if;
 execute format('select * from public.%I where id=$1 for update',pending_table) into item using item_id;
 if item.id is null then raise exception 'Review item not found'; end if;
 if item.status=(case decision when 'approve' then 'approved' else 'rejected' end) then
  return jsonb_build_object('success',true,'action',item.status,'skipped',true); end if;
 if item.status<>'pending' then raise exception 'Only pending content can be reviewed'; end if;
 if decision='reject' then
  execute format('update public.%I set status=''rejected'',admin_notes=$2,reviewed_at=$3,reviewed_by=$4,rejected_at=$3,rejected_reason=$2 where id=$1',pending_table)
   using item_id,coalesce(review_notes,''),review_time,actor_id;
  return jsonb_build_object('success',true,'action','rejected');
 end if;
 published_id:=item_id;
 case content_type
 when 'deadline' then
  if nullif(btrim(item.event_name),'') is null or item.date is null then raise exception 'Deadline name and date required'; end if;
  insert into public.application_deadlines(id,event_name,university,date,description,link,category,is_active,is_approved,approved_at,approved_by)
   values(item_id,item.event_name,item.university,item.date,item.description,item.link,coalesce(item.category,'Other'),true,true,review_time,actor_id)
   on conflict(id) do update set event_name=excluded.event_name,university=excluded.university,date=excluded.date,
    description=excluded.description,link=excluded.link,category=excluded.category,is_active=true,is_approved=true,
    approved_at=excluded.approved_at,approved_by=excluded.approved_by;
 when 'guide' then
  if nullif(btrim(item.title),'') is null or nullif(coalesce(item.external_link,item.file_url),'') is null then raise exception 'Guide title and URL required'; end if;
  insert into public.opportunity_guides(id,title,description,file_url,category,metadata,is_active,is_pending,approved_at,approved_by)
   values(item_id,item.title,item.description,coalesce(nullif(item.external_link,''),item.file_url),coalesce(item.category,'General'),
    coalesce(item.metadata,'{}'::jsonb)||jsonb_build_object('source',coalesce(item.source,'')),true,false,review_time,actor_id)
   on conflict(id) do update set title=excluded.title,description=excluded.description,file_url=excluded.file_url,
    category=excluded.category,metadata=excluded.metadata,is_active=true,is_pending=false,
    approved_at=excluded.approved_at,approved_by=excluded.approved_by;
 when 'prospectus' then
  if nullif(btrim(item.university_name),'') is null or item.year is null or nullif(coalesce(item.external_link,item.file_url),'') is null then raise exception 'Prospectus university, year and URL required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(item.university_name||':'||item.year::text,0));
  if (select count(*) from public.university_prospectuses p where p.university_name=item.university_name and p.year=item.year)>1 then
   raise exception 'Reconcile duplicate university prospectuses before publication'; end if;
  select id into published_id from public.university_prospectuses p where p.university_name=item.university_name and p.year=item.year for update;
  published_id:=coalesce(published_id,item_id);
  insert into public.university_prospectuses(id,university_name,year,file_url,application_link,description,is_active,is_approved,approved_at,approved_by)
   values(published_id,item.university_name,item.year,coalesce(nullif(item.external_link,''),item.file_url),item.application_link,item.description,true,true,review_time,actor_id)
   on conflict(id) do update set file_url=excluded.file_url,application_link=excluded.application_link,
    description=excluded.description,is_active=true,is_approved=true,approved_at=excluded.approved_at,approved_by=excluded.approved_by;
 end case;
 execute format('update public.%I set status=''approved'',admin_notes=$2,reviewed_at=$3,reviewed_by=$4,approved_at=$3,approved_by=$4 where id=$1',pending_table)
  using item_id,coalesce(review_notes,''),review_time,actor_id;
 return jsonb_build_object('success',true,'action','approved','published_id',published_id);
end;$$;
revoke all on function public.review_opportunity_content(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_opportunity_content(uuid,text,uuid,text,text) to service_role;
