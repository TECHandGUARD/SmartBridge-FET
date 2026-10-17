-- Free text communication uses UUID participants, separate from legacy attachment/AI features.
create table public.direct_messages(
 id uuid primary key default gen_random_uuid(),sender_id uuid not null references public.users(id),recipient_id uuid not null references public.users(id),
 body text not null check(length(btrim(body)) between 1 and 4000),request_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),read_at timestamptz,
 unique(sender_id,request_id),check(sender_id<>recipient_id));
create index direct_messages_sender_time on public.direct_messages(sender_id,created_at desc,id desc);
create index direct_messages_recipient_time on public.direct_messages(recipient_id,created_at desc,id desc);
alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from public,anon,authenticated;
grant select on public.direct_messages to authenticated;
grant all on public.direct_messages to service_role;

create function smartbridge_private.messaging_account(actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users u where u.id=actor and u.is_active and u.onboarding_complete and
 (u.role in ('student','parent') or (u.role in ('tutor','sace_tutor','student_tutor') and exists(select 1 from public.tutor_profiles t where t.user_id=u.id and t.is_verified and t.is_active))))
$$;
revoke all on function smartbridge_private.messaging_account(uuid) from public,anon;
grant execute on function smartbridge_private.messaging_account(uuid) to authenticated;
create policy "Direct participants read own messages" on public.direct_messages for select to authenticated
 using(smartbridge_private.messaging_account((select auth.uid())) and (sender_id=(select auth.uid()) or recipient_id=(select auth.uid())));

create function smartbridge_private.can_direct_message(first_user uuid,second_user uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare a public.users;b public.users;
begin
 if first_user=second_user or not smartbridge_private.messaging_account(first_user) or not smartbridge_private.messaging_account(second_user) then return false;end if;
 select * into a from public.users where id=first_user;select * into b from public.users where id=second_user;
 if a.role in ('student','parent') and b.role in ('tutor','sace_tutor','student_tutor') then return true;end if;
 if (a.role='student' and b.role='parent') or (a.role='parent' and b.role='student') then
  return exists(select 1 from public.parent_student_links l where l.status='approved' and ((l.parent_id=first_user and l.student_id=second_user) or(l.parent_id=second_user and l.student_id=first_user)));
 end if;
 if a.role in ('tutor','sace_tutor','student_tutor') and b.role in ('student','parent') then
  return exists(select 1 from public.direct_messages d where d.sender_id=second_user and d.recipient_id=first_user)
   or exists(select 1 from public.tutor_bookings k where k.tutor_id=first_user and k.status in ('pending','confirmed','completed') and
     (k.student_id=second_user or exists(select 1 from public.parent_student_links l where l.student_id=k.student_id and l.parent_id=second_user and l.status='approved')));
 end if;
 return false;
end $$;
revoke all on function smartbridge_private.can_direct_message(uuid,uuid) from public,anon;
grant execute on function smartbridge_private.can_direct_message(uuid,uuid) to authenticated;

create function smartbridge_private.messaging_contacts() returns table(user_id uuid,full_name text,role text,can_send boolean,unread_count bigint,last_message_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.messaging_account(auth.uid()) then raise exception 'An active learner, parent or verified tutor account is required';end if;
 return query select u.id,coalesce(nullif(u.full_name,''),'SmartBridge contact'),u.role,smartbridge_private.can_direct_message(auth.uid(),u.id),
  (select count(*) from public.direct_messages d where d.sender_id=u.id and d.recipient_id=auth.uid() and d.read_at is null),
  (select max(d.created_at) from public.direct_messages d where (d.sender_id=u.id and d.recipient_id=auth.uid()) or(d.sender_id=auth.uid() and d.recipient_id=u.id))
 from public.users u where u.id<>auth.uid() and (smartbridge_private.can_direct_message(auth.uid(),u.id) or exists(select 1 from public.direct_messages d where (d.sender_id=u.id and d.recipient_id=auth.uid()) or(d.sender_id=auth.uid() and d.recipient_id=u.id)))
 order by 6 desc nulls last,2 limit 300;
end $$;
revoke all on function smartbridge_private.messaging_contacts() from public,anon;
grant execute on function smartbridge_private.messaging_contacts() to authenticated;
create function public.messaging_contacts() returns table(user_id uuid,full_name text,role text,can_send boolean,unread_count bigint,last_message_at timestamptz)
language sql security invoker set search_path='' as $$select * from smartbridge_private.messaging_contacts()$$;
revoke all on function public.messaging_contacts() from public,anon;
grant execute on function public.messaging_contacts() to authenticated;

create function smartbridge_private.send_direct_message(to_user uuid,message_text text,client_request_id uuid) returns public.direct_messages
language plpgsql security definer set search_path='' as $$
declare message public.direct_messages;text_value text:=btrim(message_text);
begin
 if not smartbridge_private.messaging_account(auth.uid()) or client_request_id is null then raise exception 'Sign in and provide a message request ID';end if;
 if text_value is null or length(text_value) not between 1 and 4000 then raise exception 'Write a message of 1 to 4000 characters';end if;
 perform pg_advisory_xact_lock(hashtextextended('direct-message:'||auth.uid()::text,0));
 select * into message from public.direct_messages where sender_id=auth.uid() and request_id=client_request_id;
 if found then
  if message.recipient_id<>to_user or message.body<>text_value then raise exception 'Request ID already used for another message';end if;
  return message;
 end if;
 if not smartbridge_private.can_direct_message(auth.uid(),to_user) then raise exception 'This contact is not available for messaging';end if;
 if (select count(*) from public.direct_messages where sender_id=auth.uid() and created_at>clock_timestamp()-interval '1 minute')>=30 then raise exception 'Please wait a moment before sending more messages';end if;
 insert into public.direct_messages(sender_id,recipient_id,body,request_id) values(auth.uid(),to_user,text_value,client_request_id) returning * into message;
 return message;
end $$;
revoke all on function smartbridge_private.send_direct_message(uuid,text,uuid) from public,anon;
grant execute on function smartbridge_private.send_direct_message(uuid,text,uuid) to authenticated;
create function public.send_direct_message(to_user uuid,message_text text,client_request_id uuid) returns public.direct_messages
language sql security invoker set search_path='' as $$select smartbridge_private.send_direct_message(to_user,message_text,client_request_id)$$;
revoke all on function public.send_direct_message(uuid,text,uuid) from public,anon;
grant execute on function public.send_direct_message(uuid,text,uuid) to authenticated;

create function public.read_direct_thread(other_user uuid,cursor_time timestamptz default null,cursor_id uuid default null) returns setof public.direct_messages
language sql stable security invoker set search_path='' as $$
 select d.* from public.direct_messages d where ((d.sender_id=auth.uid() and d.recipient_id=other_user) or(d.sender_id=other_user and d.recipient_id=auth.uid()))
 and (cursor_time is null or (d.created_at,d.id)<(cursor_time,cursor_id)) order by d.created_at desc,d.id desc limit 50
$$;
revoke all on function public.read_direct_thread(uuid,timestamptz,uuid) from public,anon;
grant execute on function public.read_direct_thread(uuid,timestamptz,uuid) to authenticated;

create function smartbridge_private.mark_direct_read(other_user uuid,through_message uuid) returns integer language plpgsql security definer set search_path='' as $$
declare boundary public.direct_messages;changed integer;
begin
 if not smartbridge_private.messaging_account(auth.uid()) then raise exception 'Active messaging account required';end if;
 select * into boundary from public.direct_messages where id=through_message and sender_id=other_user and recipient_id=auth.uid();
 if not found then raise exception 'Choose a received message in this conversation';end if;
 update public.direct_messages set read_at=clock_timestamp() where sender_id=other_user and recipient_id=auth.uid() and read_at is null and (created_at,id)<=(boundary.created_at,boundary.id);
 get diagnostics changed=row_count;return changed;
end $$;
revoke all on function smartbridge_private.mark_direct_read(uuid,uuid) from public,anon;
grant execute on function smartbridge_private.mark_direct_read(uuid,uuid) to authenticated;
create function public.mark_direct_read(other_user uuid,through_message uuid) returns integer language sql security invoker set search_path='' as $$select smartbridge_private.mark_direct_read(other_user,through_message)$$;
revoke all on function public.mark_direct_read(uuid,uuid) from public,anon;
grant execute on function public.mark_direct_read(uuid,uuid) to authenticated;

-- Forum replies use a checked, retry-safe operation; no AI or premium dependency.
alter table public.forum_comments add column client_request_id uuid;
create unique index forum_comment_request_unique on public.forum_comments(author_id,client_request_id);
create function smartbridge_private.submit_forum_comment(target_post uuid,comment_text text,client_request_id uuid) returns public.forum_comments
language plpgsql security definer set search_path='' as $$
declare actor public.users;comment public.forum_comments;post public.forum_posts;
begin
 if not smartbridge_private.active_account() or client_request_id is null then raise exception 'Active account and request ID required';end if;
 if comment_text is null or length(btrim(comment_text)) not between 1 and 5000 then raise exception 'Write a reply of 1 to 5000 characters';end if;
 perform pg_advisory_xact_lock(hashtextextended('forum-reply:'||auth.uid()::text,0));
 select * into comment from public.forum_comments c where c.author_id=auth.uid() and c.client_request_id=$3;
 if found then if comment.post_id<>target_post::text or comment.body<>btrim(comment_text) then raise exception 'Request ID used for another reply';end if;return comment;end if;
 select * into post from public.forum_posts p where p.id=target_post and p.is_removed=false for update;
 if not found or coalesce(post.is_locked,false) then raise exception 'This discussion is unavailable or locked';end if;
 if (select count(*) from public.forum_comments where author_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'Please wait before posting more replies';end if;
 select * into actor from public.users where id=auth.uid();
 insert into public.forum_comments(post_id,body,author_id,author_email,author_name,is_removed,is_flagged,is_best_answer,likes,liked_by,client_request_id)
 values(target_post::text,btrim(comment_text),actor.id,actor.email,coalesce(nullif(actor.full_name,''),'Community member'),false,false,false,0,'{}',client_request_id) returning * into comment;
 update public.forum_posts set comment_count=(select count(*) from public.forum_comments c where c.post_id=target_post::text and coalesce(c.is_removed,false)=false) where id=target_post;
 return comment;
end $$;
revoke all on function smartbridge_private.submit_forum_comment(uuid,text,uuid) from public,anon;
grant execute on function smartbridge_private.submit_forum_comment(uuid,text,uuid) to authenticated;
create function public.submit_forum_comment(target_post uuid,comment_text text,client_request_id uuid) returns public.forum_comments
language sql security invoker set search_path='' as $$select smartbridge_private.submit_forum_comment(target_post,comment_text,client_request_id)$$;
revoke all on function public.submit_forum_comment(uuid,text,uuid) from public,anon;
grant execute on function public.submit_forum_comment(uuid,text,uuid) to authenticated;
