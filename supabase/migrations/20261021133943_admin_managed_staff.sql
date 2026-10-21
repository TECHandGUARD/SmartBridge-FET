-- Delegated staff keep their own accounts. Full-administrator status is never granted.
create table public.staff_accounts (
 user_id uuid primary key references public.users(id) on delete cascade,
 permissions text[] not null default '{}',
 enabled boolean not null default true,
 version integer not null default 1,
 updated_by uuid not null references public.users(id),
 updated_at timestamptz not null default now(),
 constraint staff_permission_catalogue check (permissions <@ array['resources','assessments','study_moderation','announcements','universities']::text[] and array_position(permissions,null) is null)
);
create index staff_accounts_updated_by_idx on public.staff_accounts(updated_by);
alter table public.staff_accounts enable row level security;
revoke all on public.staff_accounts from public,anon,authenticated;
grant select on public.staff_accounts to authenticated;
grant all on public.staff_accounts to service_role;
create policy "Own staff access or full administrator" on public.staff_accounts for select to authenticated
 using (user_id=(select auth.uid()) or smartbridge_private.is_admin((select auth.uid())));

create table smartbridge_private.staff_audit (
 id bigint generated always as identity primary key,
 actor_id uuid references public.users(id) on delete set null,
 target_id text not null,
 area text not null,
 action text not null,
 detail jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index staff_audit_actor_idx on smartbridge_private.staff_audit(actor_id,created_at desc);
alter table smartbridge_private.staff_audit enable row level security;
revoke all on smartbridge_private.staff_audit from public,anon,authenticated;

create function smartbridge_private.has_staff_permission(permission_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 smartbridge_private.is_admin(auth.uid()) or exists (
 select 1 from public.staff_accounts s join public.users u on u.id=s.user_id
 where s.user_id=auth.uid() and s.enabled and u.is_active and permission_name=any(s.permissions)));
$$;
revoke all on function smartbridge_private.has_staff_permission(text) from public,anon;
grant execute on function smartbridge_private.has_staff_permission(text) to authenticated;

create function public.get_staff_access() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('enabled',s.enabled,'permissions',s.permissions,'version',s.version)
 from public.staff_accounts s where s.user_id=auth.uid()
 and exists(select 1 from public.users u where u.id=auth.uid() and u.is_active);
$$;

create function smartbridge_private.set_staff_account(p_email text,p_permissions text[],p_enabled boolean,p_expected_version integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare target public.users; existing public.staff_accounts; chosen text[];
begin
 if not smartbridge_private.is_admin(auth.uid()) then raise exception 'Full administrator required';end if;
 if p_email is null or p_enabled is null or p_permissions is null or p_expected_version is null then raise exception 'Complete the staff account fields';end if;
 if not p_permissions <@ array['resources','assessments','study_moderation','announcements','universities']::text[] or array_position(p_permissions,null) is not null then raise exception 'Unknown staff permission';end if;
 select array_agg(distinct x order by x) into chosen from unnest(p_permissions) x;
 chosen:=coalesce(chosen,'{}');
 if p_enabled and cardinality(chosen)=0 then raise exception 'Choose at least one duty';end if;
 -- Lock the identity to serialize concurrent first grants and changes.
 select * into target from public.users where lower(email)=lower(btrim(p_email)) for update;
 if target.id is null then raise exception 'Staff must first register their own account and confirm their email';end if;
 if target.id=auth.uid() or target.is_super_admin or target.role='admin' then raise exception 'Full administrator accounts are managed separately';end if;
 if not target.is_active then raise exception 'Choose an active registered account';end if;
 select * into existing from public.staff_accounts where user_id=target.id for update;
 if coalesce(existing.version,0)<>p_expected_version then raise exception 'Staff access changed. Refresh before saving again';end if;
 insert into public.staff_accounts(user_id,permissions,enabled,updated_by)
 values(target.id,chosen,p_enabled,auth.uid())
 on conflict(user_id) do update set permissions=excluded.permissions,enabled=excluded.enabled,
 version=public.staff_accounts.version+1,updated_by=auth.uid(),updated_at=now();
 insert into smartbridge_private.staff_audit(actor_id,target_id,area,action,detail)
 values(auth.uid(),target.id::text,'staff_accounts',case when existing.user_id is null then 'added' when not p_enabled then 'suspended' else 'permissions_updated' end,
 jsonb_build_object('previous_permissions',existing.permissions,'permissions',chosen,'enabled',p_enabled));
 return true;
end $$;
create function public.set_staff_account(p_email text,p_permissions text[],p_enabled boolean,p_expected_version integer default 0)
returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.set_staff_account($1,$2,$3,$4)$$;

create function smartbridge_private.staff_account_roster() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.is_admin(auth.uid()) then raise exception 'Full administrator required';end if;
 return jsonb_build_object('accounts',(select coalesce(jsonb_agg(x),'[]') from (
 select s.*,u.full_name,u.email,u.is_active from public.staff_accounts s join public.users u on u.id=s.user_id order by s.updated_at desc limit 500)x),
 'audit',(select coalesce(jsonb_agg(x),'[]') from (
 select a.*,u.full_name as actor_name from smartbridge_private.staff_audit a left join public.users u on u.id=a.actor_id order by a.id desc limit 100)x));
end $$;
create function public.staff_account_roster() returns jsonb language sql stable security invoker set search_path='' as $$select smartbridge_private.staff_account_roster()$$;

-- Resource reviewers can change moderation flags only, never ownership or file URLs.
create function smartbridge_private.staff_resource_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.has_staff_permission('resources') then raise exception 'Resource review permission required';end if;
 return (select coalesce(jsonb_agg(x),'[]') from (select id,title,subject,grade,type,file_url,is_approved,is_rejected from public.resources order by created_at desc limit 200)x);
end $$;
create function public.staff_resource_queue() returns jsonb language sql stable security invoker set search_path='' as $$select smartbridge_private.staff_resource_queue()$$;
create function smartbridge_private.staff_review_resource(p_resource uuid,p_approved boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not smartbridge_private.has_staff_permission('resources') then raise exception 'Resource review permission required';end if;
 if p_approved is null then raise exception 'Choose a decision';end if;
 update public.resources set is_approved=p_approved,is_rejected=not p_approved where id=p_resource;
 if not found then raise exception 'Resource unavailable';end if;
 insert into smartbridge_private.staff_audit(actor_id,target_id,area,action) values(auth.uid(),p_resource::text,'resources',case when p_approved then 'approved' else 'rejected' end);
 return true;
end $$;
create function public.staff_review_resource(p_resource uuid,p_approved boolean) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.staff_review_resource($1,$2)$$;

-- Existing components retain their behavior; each delegated operation has an explicit boundary.
create policy "Delegated announcement management" on public.platform_announcements for all to authenticated
 using(smartbridge_private.has_staff_permission('announcements')) with check(smartbridge_private.has_staff_permission('announcements'));
create policy "Delegated university management" on public.university_directory for all to authenticated
 using(smartbridge_private.has_staff_permission('universities')) with check(smartbridge_private.has_staff_permission('universities'));
grant select,insert,update,delete on public.platform_announcements to authenticated;

create function smartbridge_private.audit_staff_operation() returns trigger language plpgsql security definer set search_path='' as $$
declare target text;
begin
 if auth.uid() is null then return null;end if;
 target:=case when tg_op='DELETE' then old.id::text else new.id::text end;
 insert into smartbridge_private.staff_audit(actor_id,target_id,area,action) values(auth.uid(),target,tg_table_name,lower(tg_op));
 return null;
end $$;
create trigger audit_staff_announcements after insert or update or delete on public.platform_announcements for each row execute function smartbridge_private.audit_staff_operation();
create trigger audit_staff_universities after insert or update or delete on public.university_directory for each row execute function smartbridge_private.audit_staff_operation();
create trigger audit_staff_assessments after insert on public.tutor_assessment_moderation_log for each row execute function smartbridge_private.audit_staff_operation();
create trigger audit_staff_study_reviews after insert on smartbridge_private.community_review_audit for each row execute function smartbridge_private.audit_staff_operation();
revoke all on function smartbridge_private.audit_staff_operation() from public,anon,authenticated;

revoke all on function public.get_staff_access(),public.set_staff_account(text,text[],boolean,integer),smartbridge_private.set_staff_account(text,text[],boolean,integer),public.staff_account_roster(),smartbridge_private.staff_account_roster(),public.staff_resource_queue(),smartbridge_private.staff_resource_queue(),public.staff_review_resource(uuid,boolean),smartbridge_private.staff_review_resource(uuid,boolean) from public,anon;
grant execute on function public.get_staff_access(),public.set_staff_account(text,text[],boolean,integer),smartbridge_private.set_staff_account(text,text[],boolean,integer),public.staff_account_roster(),smartbridge_private.staff_account_roster(),public.staff_resource_queue(),smartbridge_private.staff_resource_queue(),public.staff_review_resource(uuid,boolean),smartbridge_private.staff_review_resource(uuid,boolean) to authenticated;

create or replace function public.admin_assessment_review_queue()
returns table(id uuid,tutor_id uuid,title text,subject text,grade smallint,kind text,
 instructions text,questions jsonb,max_marks integer,status text,moderation_status text,
 moderation_reason text,created_at timestamptz,moderated_at timestamptz,due_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.has_staff_permission('assessments') then
  raise exception 'Administrator access required';
 end if;
 return query select a.id,a.tutor_id,a.title,a.subject,a.grade,a.kind,a.instructions,
 a.questions,a.max_marks,a.status,a.moderation_status,a.moderation_reason,a.created_at,a.moderated_at,a.due_at
 from public.tutor_assessments a order by
 case a.moderation_status when 'pending' then 0 when 'rejected' then 1 else 2 end,
 a.created_at desc limit 200;
end $$;

create or replace function public.admin_moderate_tutor_assessment(p_assessment uuid,p_decision text,p_reason text default '')
returns boolean language plpgsql security definer set search_path='' as $$
declare a public.tutor_assessments;
begin
 if not smartbridge_private.has_staff_permission('assessments') then
  raise exception 'Administrator access required';
 end if;
 if p_decision not in ('approved','rejected','suspended') or length(btrim(coalesce(p_reason,'')))>2000 then
  raise exception 'Invalid moderation decision or reason';
 end if;
 if p_decision in ('rejected','suspended') and length(btrim(coalesce(p_reason,'')))<5 then
  raise exception 'A reason is required';
 end if;
 select * into a from public.tutor_assessments where id=p_assessment for update;
 if not found then raise exception 'Assessment not found'; end if;
 if p_decision in ('approved','rejected') and (a.status<>'draft' or a.moderation_status not in ('pending','rejected')) then
  raise exception 'Only pending or rejected drafts may be reviewed';
 end if;
 if p_decision='suspended' and a.moderation_status<>'approved' then
  raise exception 'Only approved assessments may be suspended';
 end if;
 update public.tutor_assessments set
  moderation_status=p_decision,
  moderation_reason=coalesce(btrim(p_reason),''),
  moderated_by=auth.uid(),moderated_at=now(),
  status=case when p_decision='suspended' then 'closed' else status end
 where id=p_assessment;
 insert into public.tutor_assessment_moderation_log(assessment_id,moderator_id,decision,reason)
 values(p_assessment,auth.uid(),p_decision,coalesce(btrim(p_reason),''));
 return true;
end $$;

create or replace function smartbridge_private.review_study_content(kind text,target uuid,decision text) returns boolean language plpgsql security definer set search_path='' as $$
declare post_id uuid;affected integer;
begin
 if not smartbridge_private.has_staff_permission('study_moderation') then raise exception 'Administrator required';end if;
 if kind not in ('post','reply','report') or decision not in ('approved','rejected','hidden','visible','locked','unlocked','resolved') then raise exception 'Invalid review';end if;
 if kind='post' then
  if decision in ('approved','rejected') then update public.study_room_posts set moderation_status=decision,updated_at=now() where id=target;
  elsif decision in ('hidden','visible') then update public.study_room_posts set is_hidden=(decision='hidden'),updated_at=now() where id=target;
  elsif decision in ('locked','unlocked') then update public.study_room_posts set is_locked=(decision='locked'),updated_at=now() where id=target;else raise exception 'Invalid post decision';end if;
 elsif kind='reply' then
  if decision not in ('approved','rejected') then raise exception 'Invalid reply decision';end if;
  select r.post_id into post_id from public.study_room_replies r where r.id=target;
  perform 1 from public.study_room_posts p where p.id=post_id for update;
  update public.study_room_replies set moderation_status=decision where id=target;
  update public.study_room_posts p set reply_count=(select count(*) from public.study_room_replies r where r.post_id=p.id and moderation_status='approved'),last_reply_at=case when decision='approved' then now() else last_reply_at end where p.id=post_id;
 else
  if decision<>'resolved' then raise exception 'Invalid report decision';end if;
  update smartbridge_private.study_room_reports set status='resolved' where id=target;
 end if;
 get diagnostics affected=row_count;
 if affected=0 then raise exception 'Review target unavailable';end if;
 insert into smartbridge_private.community_review_audit(reviewer_id,target_id,target_type,decision) values(auth.uid(),target,kind,decision);
 return true;
end;$$;
create or replace function public.review_study_content(kind text,target uuid,decision text) returns boolean language sql security invoker set search_path='' as $$ select smartbridge_private.review_study_content($1,$2,$3);$$;
create or replace function smartbridge_private.study_moderation_queue() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not smartbridge_private.has_staff_permission('study_moderation') then raise exception 'Administrator required';end if;
 return jsonb_build_object('posts',(select coalesce(jsonb_agg(x),'[]') from (select id,room_id,author_name,title,body,created_at from public.study_room_posts where moderation_status='pending' and is_archived=false order by created_at limit 50)x),'replies',(select coalesce(jsonb_agg(x),'[]') from (select id,post_id,author_name,body,created_at from public.study_room_replies where moderation_status='pending' order by created_at limit 50)x),'reports',(select coalesce(jsonb_agg(x),'[]') from (select r.id,r.post_id,r.reason,r.comment,r.created_at,p.title,p.body from smartbridge_private.study_room_reports r join public.study_room_posts p on p.id=r.post_id where r.status='open' order by r.created_at limit 50)x));
end;$$;
create or replace function public.study_moderation_queue() returns jsonb language sql security invoker set search_path='' as $$ select smartbridge_private.study_moderation_queue();$$;
revoke all on function smartbridge_private.review_study_content(text,uuid,text),public.review_study_content(text,uuid,text),smartbridge_private.study_moderation_queue(),public.study_moderation_queue() from public,anon;
grant execute on function smartbridge_private.review_study_content(text,uuid,text),public.review_study_content(text,uuid,text),smartbridge_private.study_moderation_queue(),public.study_moderation_queue() to authenticated;


create or replace function smartbridge_private.protect_resource_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and smartbridge_private.has_staff_permission('resources')
 and (to_jsonb(new)-array['is_approved','is_rejected','updated_at'])=(to_jsonb(old)-array['is_approved','is_rejected','updated_at'])
 and new.is_approved is not null and new.is_rejected is not null and new.is_approved<>new.is_rejected then
  new.approved_by:=case when new.is_approved then auth.uid() else null end;
  new.approved_at:=case when new.is_approved then now() else null end;
  new.rejected_by:=case when new.is_rejected then auth.uid() else null end;
  new.rejected_at:=case when new.is_rejected then now() else null end;
  return new;
 end if;
 if public.is_admin(auth.uid()) or coalesce(auth.role(),'')='service_role' or auth.uid() is null then return new; end if;
 if new.tutor_id is distinct from auth.uid() or new.tutor_email is distinct from (select email from public.users where id=auth.uid()) or new.is_approved=true or new.is_rejected=true or new.approved_by is not null or new.approved_at is not null or new.rejected_by is not null or new.rejected_at is not null then raise exception 'Resource review requires administrator approval'; end if;
 if tg_op='UPDATE' and old.is_approved=true then raise exception 'Approved resources require administrator editing'; end if;
 if new.file_url not like 'storage://tutor-resources/'||auth.uid()::text||'/%' and new.file_url not like 'storage://resources/'||auth.uid()::text||'/%' then raise exception 'Upload resources to an owned private path'; end if;
 return new;
end;$$;

create or replace function smartbridge_private.can_read_file(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and path !~ '(^|/)\.\.(/|$)' and exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true) and
 (public.is_admin(auth.uid()) or (smartbridge_private.has_staff_permission('resources') and bucket in ('resources','tutor-resources') and exists(select 1 from public.resources r where r.file_url='storage://'||bucket||'/'||path)) or split_part(path,'/',1)=auth.uid()::text or
 (bucket in ('resources','tutor-resources') and exists(select 1 from public.resources r where r.file_url='storage://'||bucket||'/'||path and r.is_approved=true and coalesce(r.is_archived,false)=false and (r.is_premium=false or smartbridge_private.has_paid_access()))) or
 (bucket='educational_resources' and exists(select 1 from public.educational_resources r where r.resource_url='storage://'||bucket||'/'||path and r.is_active=true and (r.is_premium=false or smartbridge_private.has_paid_access()))) or
 (bucket='chat-attachments' and exists(select 1 from public.chat_messages m where m.metadata->>'attachment_url'='storage://'||bucket||'/'||path and (m.sender_id=auth.uid() or m.recipient_id=auth.uid()) and coalesce(m.is_deleted,false)=false)));
$$;
