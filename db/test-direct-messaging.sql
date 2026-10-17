reset role;
select set_config('request.jwt.claims','{}',true);
update public.users set role='student',is_active=true,onboarding_complete=true where id='00000000-0000-4000-8000-000000000101';
update public.users set role='tutor',is_active=true,onboarding_complete=true where id='00000000-0000-4000-8000-000000000102';
update public.tutor_profiles set is_verified=true,is_active=true where user_id='00000000-0000-4000-8000-000000000102';
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000009701','dm-other@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000009702','dm-parent@example.invalid','{}');
update public.users set role=case when id='00000000-0000-4000-8000-000000009702' then 'parent' else 'student' end,is_active=true,onboarding_complete=true where id in ('00000000-0000-4000-8000-000000009701','00000000-0000-4000-8000-000000009702');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$ declare first public.direct_messages;again public.direct_messages;begin
 first:=public.send_direct_message('00000000-0000-4000-8000-000000000102','Free learner enquiry','00000000-0000-4000-8000-000000009711');
 again:=public.send_direct_message('00000000-0000-4000-8000-000000000102','Free learner enquiry','00000000-0000-4000-8000-000000009711');
 if first.id<>again.id or first.sender_id<>auth.uid() then raise exception 'Message retry/identity failed';end if;
 begin perform public.send_direct_message('00000000-0000-4000-8000-000000009701','Unrelated learner','00000000-0000-4000-8000-000000009712');raise exception 'Unrelated learner contact accepted';
 exception when raise_exception then if sqlerrm='Unrelated learner contact accepted' then raise;end if;end;
 begin perform public.send_direct_message('00000000-0000-4000-8000-000000000102','Changed retry','00000000-0000-4000-8000-000000009711');raise exception 'Different content reused ID';
 exception when raise_exception then if sqlerrm='Different content reused ID' then raise;end if;end;
 begin perform public.mark_direct_read('00000000-0000-4000-8000-000000000102',first.id);raise exception 'Sender forged read status';
 exception when raise_exception then if sqlerrm='Sender forged read status' then raise;end if;end;
 begin update public.direct_messages set body='Tampered';raise exception 'Direct body update accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',true);
do $$ declare m public.direct_messages;begin
 if not exists(select 1 from public.messaging_contacts() where user_id='00000000-0000-4000-8000-000000000101' and unread_count=1 and can_send) then raise exception 'Tutor inbox missing enquiry/unread';end if;
 select * into m from public.read_direct_thread('00000000-0000-4000-8000-000000000101');
 perform public.mark_direct_read(m.sender_id,m.id);
 m:=public.send_direct_message('00000000-0000-4000-8000-000000000101','Tutor reply','00000000-0000-4000-8000-000000009713');
 if m.sender_id<>auth.uid() then raise exception 'Tutor reply sender wrong';end if;
 begin perform public.send_direct_message('00000000-0000-4000-8000-000000009701','Cold learner contact','00000000-0000-4000-8000-000000009714');raise exception 'Tutor could contact arbitrary learner';
 exception when raise_exception then if sqlerrm='Tutor could contact arbitrary learner' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009701","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.direct_messages) or exists(select 1 from public.read_direct_thread('00000000-0000-4000-8000-000000000102')) then raise exception 'Unrelated learner read another conversation';end if;
 if exists(select 1 from public.messaging_contacts() where user_id='00000000-0000-4000-8000-000000000101') then raise exception 'Unrelated learner directory leak';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009702","role":"authenticated"}',true);
select public.send_direct_message('00000000-0000-4000-8000-000000000102','Parent enquiry','00000000-0000-4000-8000-000000009715');
do $$ begin
 begin perform public.send_direct_message('00000000-0000-4000-8000-000000000101','Unlinked parent','00000000-0000-4000-8000-000000009716');raise exception 'Unlinked parent messaged learner';
 exception when raise_exception then if sqlerrm='Unlinked parent messaged learner' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
insert into public.parent_student_links(parent_id,student_id,status) values('00000000-0000-4000-8000-000000009702','00000000-0000-4000-8000-000000000101','approved');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009702","role":"authenticated"}',true);
select public.send_direct_message('00000000-0000-4000-8000-000000000101','Linked parent message','00000000-0000-4000-8000-000000009716');
reset role;
select set_config('request.jwt.claims','{}',true);
update public.parent_student_links set status='revoked' where parent_id='00000000-0000-4000-8000-000000009702';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009702","role":"authenticated"}',true);
do $$ begin
 if not exists(select 1 from public.messaging_contacts() where user_id='00000000-0000-4000-8000-000000000101' and can_send=false) then raise exception 'Revoked conversation not read-only';end if;
 begin perform public.send_direct_message('00000000-0000-4000-8000-000000000101','Revoked link','00000000-0000-4000-8000-000000009717');raise exception 'Revoked link still sends';
 exception when raise_exception then if sqlerrm='Revoked link still sends' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
insert into public.forum_posts(id,title,category,body,author_id,author_email,author_name,is_removed) values('00000000-0000-4000-8000-000000009720','Free forum test','General','Ordinary discussion','00000000-0000-4000-8000-000000000101','repair-student@example.invalid','Learner',false);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009702","role":"authenticated"}',true);
do $$ declare first public.forum_comments;again public.forum_comments;begin
 first:=public.submit_forum_comment('00000000-0000-4000-8000-000000009720','Free parent reply','00000000-0000-4000-8000-000000009721');
 again:=public.submit_forum_comment('00000000-0000-4000-8000-000000009720','Free parent reply','00000000-0000-4000-8000-000000009721');
 if first.id<>again.id or first.author_id<>auth.uid() then raise exception 'Forum reply identity/retry failed';end if;
 if (select comment_count from public.forum_posts where id='00000000-0000-4000-8000-000000009720')<>1 then raise exception 'Forum reply count failed';end if;
end $$;
reset role;
select 'PASS: free messaging enquiry/reply, retry IDs, read receipts, role contacts, parent consent, privacy and immutable bodies' result;
