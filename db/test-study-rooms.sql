-- Runs after all seven migrations in a rolled-back transaction; no real messages.
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000701','room-learner-a@example.test'),('00000000-0000-4000-8000-000000000702','room-learner-b@example.test'),('00000000-0000-4000-8000-000000000703','room-admin@example.test'),('00000000-0000-4000-8000-000000000704','room-parent@example.test');
update public.users set role='student',onboarding_complete=true,is_active=true where id in ('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000702');
update public.users set is_super_admin=true,is_active=true where id='00000000-0000-4000-8000-000000000703';
update public.users set role='parent',onboarding_complete=true,is_active=true where id='00000000-0000-4000-8000-000000000704';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000701","role":"authenticated"}',true);
select public.join_study_room('math');
do $$begin
 if (select count(*) from public.study_room_memberships where user_id='00000000-0000-4000-8000-000000000701')<>1 then raise exception 'Membership missing';end if;
 begin perform public.submit_study_content('00000000-0000-4000-8000-000000000701','posts','{}');raise exception 'Client bypassed moderation RPC';exception when insufficient_privilege then null;end;
 begin perform public.review_study_content('post','00000000-0000-4000-8000-000000000999','approved');raise exception 'Learner bypassed reviewer permission';exception when raise_exception then if sqlerrm='Learner bypassed reviewer permission' then raise;end if;end;
end;$$;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.submit_study_content('00000000-0000-4000-8000-000000000701','posts','{"room_id":"math","type":"Note","title":"Test note","body":"Explain differentiation","request_id":"00000000-0000-4000-8000-000000000711"}');
do $$declare result jsonb;begin
 result:=public.submit_study_content('00000000-0000-4000-8000-000000000701','posts','{"room_id":"math","type":"Note","title":"Test note","body":"Explain differentiation","request_id":"00000000-0000-4000-8000-000000000711"}');
 if result->>'status'<>'pending' or (result->>'approved')::boolean then raise exception 'Submission was not queued';end if;
 if (select sum(calls) from smartbridge_private.community_usage where actor_id='00000000-0000-4000-8000-000000000701')<>1 then raise exception 'Retry consumed quota twice';end if;
 begin perform public.submit_study_content('00000000-0000-4000-8000-000000000701','posts','{"room_id":"math","type":"Note","body":"Different body","request_id":"00000000-0000-4000-8000-000000000711"}');raise exception 'Reused key changed content';exception when raise_exception then if sqlerrm='Reused key changed content' then raise;end if;end;
 begin perform public.submit_study_content('00000000-0000-4000-8000-000000000702','posts','{"room_id":"math","type":"Note","body":"Not joined","request_id":"00000000-0000-4000-8000-000000000712"}');raise exception 'Nonmember submitted';exception when raise_exception then if sqlerrm='Nonmember submitted' then raise;end if;end;
end;$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000702","role":"authenticated"}',true);
do $$begin if (select count(id) from public.study_room_posts where room_id='math')<>0 then raise exception 'Nonmember read posts';end if;end;$$;
select public.join_study_room('math');
do $$begin if (select count(id) from public.study_room_posts where title='Test note')<>0 then raise exception 'Member read pending content';end if;end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000704","role":"authenticated"}',true);
do $$begin begin perform public.join_study_room('math');raise exception 'Parent joined learner room';exception when raise_exception then if sqlerrm='Parent joined learner room' then raise;end if;end;end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000703","role":"authenticated"}',true);
do $$declare target uuid;begin
 select id into target from public.study_room_posts where title='Test note';
 perform public.review_study_content('post',target,'approved');
 if (public.study_moderation_queue()->'posts') @> jsonb_build_array(jsonb_build_object('id',target)) then raise exception 'Approved post remained pending';end if;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000702","role":"authenticated"}',true);
do $$begin
 if (select count(id) from public.study_room_posts where title='Test note')<>1 then raise exception 'Member could not read approved post';end if;
 begin perform author_email from public.study_room_posts;raise exception 'Private author email exposed';exception when insufficient_privilege then null;end;
 begin insert into public.study_room_posts(room_id,subject,author_name,author_email,author_id,body) values('math','Mathematics','Fake','fake@example.test','00000000-0000-4000-8000-000000000702','bypass');raise exception 'Direct unmoderated post inserted';exception when insufficient_privilege then null;end;
end;$$;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare target uuid;result jsonb;begin
 select id into target from public.study_room_posts where title='Test note';
 result:=public.submit_study_content('00000000-0000-4000-8000-000000000702','replies',jsonb_build_object('post_id',target,'body','A reply','request_id','00000000-0000-4000-8000-000000000713'));
 if result->>'status'<>'pending' or (select reply_count from public.study_room_posts where id=target)<>0 then raise exception 'Pending reply was counted';end if;
 perform public.submit_study_content('00000000-0000-4000-8000-000000000702','reports',jsonb_build_object('post_id',target,'reason','other'));
 perform public.submit_study_content('00000000-0000-4000-8000-000000000702','reports',jsonb_build_object('post_id',target,'reason','other'));
 if (select count(*) from smartbridge_private.study_room_reports where post_id=target)<>1 then raise exception 'Report retry duplicated';end if;
 insert into smartbridge_private.community_usage values('00000000-0000-4000-8000-000000000701','posts',date_trunc('minute',now()),5) on conflict(actor_id,action,bucket) do update set calls=5;
 begin perform public.submit_study_content('00000000-0000-4000-8000-000000000701','posts','{"room_id":"math","type":"Note","body":"Over limit","request_id":"00000000-0000-4000-8000-000000000714"}');raise exception 'Quota exceeded';exception when raise_exception then if sqlerrm='Quota exceeded' then raise;end if;end;
end;$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000703","role":"authenticated"}',true);
do $$declare reply_id uuid;target uuid;begin
 select id,post_id into reply_id,target from public.study_room_replies where body='A reply';perform public.review_study_content('reply',reply_id,'approved');perform public.review_study_content('reply',reply_id,'approved');
 if (select reply_count from public.study_room_posts where id=target)<>1 then raise exception 'Reply count was not atomic and retry safe';end if;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000702","role":"authenticated"}',true);
do $$declare target uuid;begin
 select id into target from public.study_room_posts where title='Test note';
 begin perform public.archive_study_post(target);raise exception 'Foreign post archived';exception when raise_exception then if sqlerrm='Foreign post archived' then raise;end if;end;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000701","role":"authenticated"}',true);
do $$declare target uuid;begin select id into target from public.study_room_posts where title='Test note';perform public.archive_study_post(target);end;$$;
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$begin if (select count(*) from smartbridge_private.study_room_reports)<>1 then raise exception 'Withdrawal removed moderation evidence';end if;end;$$;
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
update public.users set is_active=false where id='00000000-0000-4000-8000-000000000702';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000702","role":"authenticated"}',true);
do $$begin if (select count(id) from public.study_room_posts where room_id='math')<>0 then raise exception 'Inactive member read room';end if;end;$$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$begin begin perform id from public.study_room_posts;raise exception 'Anonymous read room posts';exception when insufficient_privilege then null;end;end;$$;
reset role;
select set_config('request.jwt.claims','{}',true);
