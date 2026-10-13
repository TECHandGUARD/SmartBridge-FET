-- Curated study rooms, membership-scoped reading and atomic manual moderation.
-- New submissions stay pending until a database-backed administrator reviews them.
create table public.study_rooms(id text primary key,name text not null,is_active boolean not null default true);
insert into public.study_rooms(id,name) values ('math','Mathematics'),('matlit','Mathematical Literacy'),('phsc','Physical Sciences'),('lisc','Life Sciences'),('acc','Accounting'),('bst','Business Studies'),('eco','Economics'),('tour','Tourism');
alter table public.study_rooms enable row level security;
revoke all on public.study_rooms from public,anon,authenticated;
grant select on public.study_rooms to authenticated;
grant all on public.study_rooms to service_role;
create table public.study_room_memberships(room_id text references public.study_rooms(id),user_id uuid references public.users(id) on delete cascade,joined_at timestamptz not null default now(),primary key(room_id,user_id));
alter table public.study_room_memberships enable row level security;
revoke all on public.study_room_memberships from public,anon,authenticated;
grant select on public.study_room_memberships to authenticated;
grant all on public.study_room_memberships to service_role;

create function smartbridge_private.community_account_allowed(actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (($1=(select auth.uid())) or coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'role'='service_role') and exists(select 1 from public.users u where u.id=$1 and u.is_active=true and (u.is_super_admin=true or (u.onboarding_complete=true and (u.role='student' or (u.role in ('tutor','sace_tutor','student_tutor') and exists(select 1 from public.tutor_profiles t where t.user_id=u.id and t.is_verified=true))))));
$$;
create function smartbridge_private.can_read_study_room(chosen_room text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and smartbridge_private.community_account_allowed(auth.uid()) and exists(select 1 from public.study_rooms r where r.id=$1 and r.is_active=true) and (smartbridge_private.is_admin(auth.uid()) or exists(select 1 from public.study_room_memberships m where m.room_id=$1 and m.user_id=auth.uid()));
$$;
revoke all on function smartbridge_private.community_account_allowed(uuid),smartbridge_private.can_read_study_room(text) from public,anon;
grant execute on function smartbridge_private.community_account_allowed(uuid),smartbridge_private.can_read_study_room(text) to authenticated,service_role;
create policy "Available study rooms" on public.study_rooms for select to authenticated using(is_active=true and smartbridge_private.community_account_allowed((select auth.uid())));
create policy "Own study memberships" on public.study_room_memberships for select to authenticated using(user_id=(select auth.uid()) or smartbridge_private.is_admin((select auth.uid())));
create function smartbridge_private.join_study_room(chosen_room text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not smartbridge_private.community_account_allowed(auth.uid()) then raise exception 'Eligible active account required';end if;
 if not exists(select 1 from public.study_rooms where id=chosen_room and is_active=true) then raise exception 'Study room unavailable';end if;
 insert into public.study_room_memberships(room_id,user_id) values(chosen_room,auth.uid()) on conflict do nothing;
 return true;
end;$$;
create function public.join_study_room(chosen_room text) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.join_study_room($1);$$;
revoke all on function smartbridge_private.join_study_room(text),public.join_study_room(text) from public,anon;
grant execute on function smartbridge_private.join_study_room(text),public.join_study_room(text) to authenticated;

alter table public.study_room_posts add column moderation_status text not null default 'pending' check(moderation_status in ('pending','approved','rejected'));
alter table public.study_room_posts add column request_id uuid;
create unique index study_post_request on public.study_room_posts(author_id,request_id) where request_id is not null;
alter table public.study_room_posts enable row level security;
revoke all on public.study_room_posts from public,anon,authenticated;
grant select(id,room_id,subject,author_name,author_id,type,title,body,is_pinned,is_locked,is_hidden,is_archived,reply_count,upvotes,created_at,updated_at,moderation_status) on public.study_room_posts to authenticated;
-- Withdrawals use an owned archive RPC so abuse reports are retained.
grant all on public.study_room_posts to service_role;
create policy "Study post membership boundary" on public.study_room_posts as restrictive for select to authenticated using(smartbridge_private.can_read_study_room(room_id) and (smartbridge_private.is_admin((select auth.uid())) or author_id=(select auth.uid()) or (moderation_status='approved' and is_hidden=false and is_archived=false)));
create policy "Study post owned delete boundary" on public.study_room_posts as restrictive for delete to authenticated using(smartbridge_private.can_read_study_room(room_id) and (author_id=(select auth.uid()) or smartbridge_private.is_admin((select auth.uid()))));
-- Existing permissive public policies are constrained by grants and restrictive predicates.
create table public.study_room_replies(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.study_room_posts(id) on delete cascade,author_id uuid not null references public.users(id),author_name text not null,body text not null check(length(body) between 1 and 5000),moderation_status text not null default 'pending' check(moderation_status in ('pending','approved','rejected')),request_id uuid not null,created_at timestamptz not null default now(),unique(author_id,request_id));
alter table public.study_room_replies enable row level security;
revoke all on public.study_room_replies from public,anon,authenticated;
grant select(id,post_id,author_id,author_name,body,moderation_status,created_at) on public.study_room_replies to authenticated;
grant all on public.study_room_replies to service_role;
create policy "Study reply membership" on public.study_room_replies for select to authenticated using(exists(select 1 from public.study_room_posts p where p.id=post_id and smartbridge_private.can_read_study_room(p.room_id)) and (moderation_status='approved' or author_id=(select auth.uid()) or smartbridge_private.is_admin((select auth.uid()))));
create table public.study_room_reactions(post_id uuid references public.study_room_posts(id) on delete cascade,user_id uuid references public.users(id) on delete cascade,type text not null check(type in ('like','heart','star')),primary key(post_id,user_id,type));
alter table public.study_room_reactions enable row level security;
revoke all on public.study_room_reactions from public,anon,authenticated;
grant select,insert,delete on public.study_room_reactions to authenticated;
grant all on public.study_room_reactions to service_role;
create policy "Read own reactions" on public.study_room_reactions for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.study_room_posts p where p.id=post_id and p.moderation_status='approved' and p.is_hidden=false and smartbridge_private.can_read_study_room(p.room_id)));
create policy "Owned approved-post reactions" on public.study_room_reactions for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.study_room_posts p where p.id=post_id and p.moderation_status='approved' and p.is_hidden=false and smartbridge_private.can_read_study_room(p.room_id)));
create policy "Remove own reactions" on public.study_room_reactions for delete to authenticated using(user_id=(select auth.uid()));

create table smartbridge_private.study_room_reports(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.study_room_posts(id) on delete cascade,reported_by uuid not null references public.users(id),reason text not null check(reason in ('spam','harassment','hate_speech','inappropriate','false_info','privacy','other')),comment text check(length(comment)<=1000),status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default now(),unique(post_id,reported_by));
create table smartbridge_private.community_usage(actor_id uuid references public.users(id) on delete cascade,action text not null check(action in ('posts','replies','reports')),bucket timestamptz not null,calls integer not null check(calls>0),primary key(actor_id,action,bucket));
create table smartbridge_private.community_review_audit(id bigint generated always as identity primary key,reviewer_id uuid not null references public.users(id),target_id uuid not null,target_type text not null,decision text not null,created_at timestamptz not null default now());
alter table smartbridge_private.study_room_reports enable row level security;
alter table smartbridge_private.community_usage enable row level security;
alter table smartbridge_private.community_review_audit enable row level security;
revoke all on smartbridge_private.study_room_reports,smartbridge_private.community_usage,smartbridge_private.community_review_audit from public,anon,authenticated;
grant all on smartbridge_private.study_room_reports,smartbridge_private.community_usage,smartbridge_private.community_review_audit to service_role;

create function public.study_room_quota_status(actor_id uuid,action_name text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare minute_cap integer;day_cap integer;minute_used integer;day_used integer;
begin
 if action_name not in ('posts','replies','reports') or not smartbridge_private.community_account_allowed(actor_id) then raise exception 'Invalid study action';end if;
 minute_cap:=case action_name when 'posts' then 5 when 'replies' then 10 else 3 end;
 day_cap:=case action_name when 'posts' then 30 when 'replies' then 200 else 10 end;
 select coalesce(sum(calls) filter(where bucket>=date_trunc('minute',now())),0),coalesce(sum(calls),0) into minute_used,day_used from smartbridge_private.community_usage where community_usage.actor_id=$1 and action=action_name and bucket>=date_trunc('day',now());
 return jsonb_build_object('allowed',minute_used<minute_cap and day_used<day_cap,'remaining',greatest(0,least(minute_cap-minute_used,day_cap-day_used)));
end;$$;
create function public.submit_study_content(actor_id uuid,action_name text,payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare account public.users%rowtype;post public.study_room_posts%rowtype;reply public.study_room_replies%rowtype;chosen_room text;request_key uuid;result_id uuid;existing_status text;quota jsonb;chosen_body text;chosen_title text;chosen_reason text;
begin
 if action_name not in ('posts','replies','reports') or not smartbridge_private.community_account_allowed(actor_id) then raise exception 'Eligible active account required';end if;
 select * into account from public.users where id=actor_id;
 if action_name='posts' then
  chosen_room:=payload->>'room_id';request_key:=(payload->>'request_id')::uuid;
  chosen_body:=btrim(payload->>'body');chosen_title:=nullif(btrim(payload->>'title'),'');
  if request_key is null or chosen_body is null or length(chosen_body) not between 1 and 10000 or length(coalesce(chosen_title,''))>200 or coalesce(payload->>'type','') not in ('Note','Question') then raise exception 'Invalid post';end if;
 else
  select * into post from public.study_room_posts where id=(payload->>'post_id')::uuid for update;
  if not found or post.moderation_status<>'approved' or post.is_hidden=true or post.is_archived=true then raise exception 'Post unavailable';end if;
  chosen_room:=post.room_id;
  if action_name='replies' then
   if post.is_locked=true then raise exception 'Replies are locked';end if;
   request_key:=(payload->>'request_id')::uuid;chosen_body:=btrim(payload->>'body');
   if request_key is null or chosen_body is null or length(chosen_body) not between 1 and 5000 then raise exception 'Invalid reply';end if;
  else
   chosen_reason:=payload->>'reason';
   if chosen_reason not in ('spam','harassment','hate_speech','inappropriate','false_info','privacy','other') or chosen_reason is null or length(coalesce(payload->>'comment',''))>1000 then raise exception 'Invalid report';end if;
   if post.author_id=actor_id then raise exception 'Cannot report own post';end if;
  end if;
 end if;
 if not exists(select 1 from public.study_rooms where id=chosen_room and is_active=true) or not (account.is_super_admin=true or exists(select 1 from public.study_room_memberships where room_id=chosen_room and user_id=actor_id)) then raise exception 'Study room membership required';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor_id::text||action_name,0));
 if action_name='posts' then select id,moderation_status into result_id,existing_status from public.study_room_posts where author_id=actor_id and request_id=request_key;
 elsif action_name='replies' then select id,moderation_status into result_id,existing_status from public.study_room_replies where author_id=actor_id and request_id=request_key;
 else select id,'received' into result_id,existing_status from smartbridge_private.study_room_reports where post_id=post.id and reported_by=actor_id;end if;
 if result_id is not null then
  if action_name='posts' and not exists(select 1 from public.study_room_posts p where p.id=result_id and p.room_id=chosen_room and p.body=chosen_body and p.title is not distinct from chosen_title and p.type=payload->>'type') then raise exception 'Request key already used for different content';end if;
  if action_name='replies' and not exists(select 1 from public.study_room_replies r where r.id=result_id and r.post_id=post.id and r.body=chosen_body) then raise exception 'Request key already used for different content';end if;
  return jsonb_build_object('id',result_id,'status',existing_status,'approved',existing_status in ('approved','received'),'reason',case when existing_status='pending' then 'queued' else existing_status end);end if;
 quota:=public.study_room_quota_status(actor_id,action_name);
 if not (quota->>'allowed')::boolean then raise exception 'Study action limit reached';end if;
 insert into smartbridge_private.community_usage values(actor_id,action_name,date_trunc('minute',now()),1) on conflict on constraint community_usage_pkey do update set calls=community_usage.calls+1;
 delete from smartbridge_private.community_usage where bucket<now()-interval '2 days';
 if action_name='posts' then
  insert into public.study_room_posts(room_id,subject,room_name,author_id,author_email,author_name,type,title,body,request_id,moderation_status,is_hidden,is_archived) select chosen_room,name,name,account.id,account.email,coalesce(nullif(account.full_name,''),'Learner'),payload->>'type',chosen_title,chosen_body,request_key,'pending',false,false from public.study_rooms where id=chosen_room returning id into result_id;
 elsif action_name='replies' then
  insert into public.study_room_replies(post_id,author_id,author_name,body,request_id) values(post.id,account.id,coalesce(nullif(account.full_name,''),'Learner'),chosen_body,request_key) returning id into result_id;
 else
  insert into smartbridge_private.study_room_reports(post_id,reported_by,reason,comment) values(post.id,account.id,chosen_reason,nullif(btrim(payload->>'comment'),'')) returning id into result_id;
 end if;
 return jsonb_build_object('id',result_id,'status',case when action_name='reports' then 'received' else 'pending' end,'approved',action_name='reports','reason',case when action_name='reports' then 'received' else 'queued' end);
end;$$;
revoke all on function public.study_room_quota_status(uuid,text),public.submit_study_content(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.study_room_quota_status(uuid,text),public.submit_study_content(uuid,text,jsonb) to service_role;

create function smartbridge_private.review_study_content(kind text,target uuid,decision text) returns boolean language plpgsql security definer set search_path='' as $$
declare post_id uuid;affected integer;
begin
 if auth.uid() is null or not smartbridge_private.community_account_allowed(auth.uid()) or not smartbridge_private.is_admin(auth.uid()) then raise exception 'Administrator required';end if;
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
create function public.review_study_content(kind text,target uuid,decision text) returns boolean language sql security invoker set search_path='' as $$ select smartbridge_private.review_study_content($1,$2,$3);$$;
create function smartbridge_private.study_moderation_queue() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not smartbridge_private.community_account_allowed(auth.uid()) or not smartbridge_private.is_admin(auth.uid()) then raise exception 'Administrator required';end if;
 return jsonb_build_object('posts',(select coalesce(jsonb_agg(x),'[]') from (select id,room_id,author_name,title,body,created_at from public.study_room_posts where moderation_status='pending' and is_archived=false order by created_at limit 50)x),'replies',(select coalesce(jsonb_agg(x),'[]') from (select id,post_id,author_name,body,created_at from public.study_room_replies where moderation_status='pending' order by created_at limit 50)x),'reports',(select coalesce(jsonb_agg(x),'[]') from (select r.id,r.post_id,r.reason,r.comment,r.created_at,p.title,p.body from smartbridge_private.study_room_reports r join public.study_room_posts p on p.id=r.post_id where r.status='open' order by r.created_at limit 50)x));
end;$$;
create function public.study_moderation_queue() returns jsonb language sql security invoker set search_path='' as $$ select smartbridge_private.study_moderation_queue();$$;
revoke all on function smartbridge_private.review_study_content(text,uuid,text),public.review_study_content(text,uuid,text),smartbridge_private.study_moderation_queue(),public.study_moderation_queue() from public,anon;
grant execute on function smartbridge_private.review_study_content(text,uuid,text),public.review_study_content(text,uuid,text),smartbridge_private.study_moderation_queue(),public.study_moderation_queue() to authenticated;

create function smartbridge_private.archive_study_post(target uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare chosen_room text;
begin
 if auth.uid() is null or not smartbridge_private.community_account_allowed(auth.uid()) then raise exception 'Eligible active account required';end if;
 select room_id into chosen_room from public.study_room_posts where id=target and author_id=auth.uid();
 if not found or not smartbridge_private.can_read_study_room(chosen_room) then raise exception 'Owned post required';end if;
 update public.study_room_posts set is_archived=true,updated_at=now() where id=target and author_id=auth.uid();
 return true;
end;$$;
create function public.archive_study_post(target uuid) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.archive_study_post($1);$$;
revoke all on function smartbridge_private.archive_study_post(uuid),public.archive_study_post(uuid) from public,anon;
grant execute on function smartbridge_private.archive_study_post(uuid),public.archive_study_post(uuid) to authenticated;
