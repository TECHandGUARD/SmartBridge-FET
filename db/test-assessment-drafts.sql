-- Rolled back with all other fixtures: no emails or live learner records.
reset role;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000009101','draft-learner@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000009102','draft-tutor@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000009103','draft-other@example.invalid','{}');
update public.users set role='student',is_active=true,onboarding_complete=true where id in ('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009103');
update public.users set role='admin',is_active=true,onboarding_complete=true where id='00000000-0000-4000-8000-000000009102';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009102","role":"authenticated"}',true);
insert into public.tutor_assessments(id,tutor_id,student_id,title,subject,grade,kind,opens_at,due_at,time_limit_minutes,questions,max_marks,status,moderation_status)
values('00000000-0000-4000-8000-000000009104','00000000-0000-4000-8000-000000009102','00000000-0000-4000-8000-000000009101','Draft persistence','Mathematics',10,'test',now()-interval '1 hour',now()+interval '1 hour',30,'[{"type":"mcq","prompt":"Choose the correct option","marks":2,"options":["A","B","C","D"],"correct_index":1}]',2,'published','approved');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009101","role":"authenticated"}',true);
select public.start_tutor_assessment('00000000-0000-4000-8000-000000009104');
select public.save_assessment_draft('00000000-0000-4000-8000-000000009104','{"0":"1"}',0);
do $$declare d jsonb;begin
 d:=public.assessment_draft('00000000-0000-4000-8000-000000009104');
 if d->'answers'->>'0'<>'1' or (d->>'revision')::integer<>1 or (d->>'deadline')::timestamptz<> (d->>'started_at')::timestamptz+interval '30 minutes' then raise exception 'Draft or deadline not preserved';end if;
 begin perform public.save_assessment_draft('00000000-0000-4000-8000-000000009104','{"0":"2"}',0);raise exception 'Stale write accepted';exception when raise_exception then if sqlerrm='Stale write accepted' then raise;end if;end;
 if exists(select 1 from public.my_tutor_assessments() x where x.id='00000000-0000-4000-8000-000000009104' and x.questions::text like '%correct_index%') then raise exception 'Answer key leaked';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009103","role":"authenticated"}',true);
do $$begin
 begin perform public.assessment_draft('00000000-0000-4000-8000-000000009104');raise exception 'Other learner read draft';exception when raise_exception then if sqlerrm='Other learner read draft' then raise;end if;end;
 begin perform public.save_assessment_draft('00000000-0000-4000-8000-000000009104','{"0":"2"}',1);raise exception 'Other learner wrote draft';exception when raise_exception then if sqlerrm='Other learner wrote draft' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009101","role":"authenticated"}',true);
select public.submit_tutor_assessment('00000000-0000-4000-8000-000000009104','{"0":"1"}',null);
do $$begin
 begin perform public.save_assessment_draft('00000000-0000-4000-8000-000000009104','{"0":"2"}',1);raise exception 'Submitted draft changed';exception when raise_exception then if sqlerrm='Submitted draft changed' then raise;end if;end;
end $$;
reset role;

-- An expired profile flag cannot waive commission on a NEW booking; a dated Pro receipt can.
select set_config('request.jwt.claims','{}',true);
update public.users set is_premium=true where id='00000000-0000-4000-8000-000000009902';
insert into public.subscriptions(user_id,user_email,plan,status,start_date,end_date,metadata) values
 ('00000000-0000-4000-8000-000000009902','booking-tutor@example.invalid','premium','active',current_date-10,current_date-1,'{"product":"tutor_pro"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
do $$declare b public.tutor_bookings;begin
 b:=public.create_booking('00000000-0000-4000-8000-000000009905','History',current_date+150,'10:00',1,'Expired Pro benefit',gen_random_uuid(),false);
 if b.platform_fee<>35 then raise exception 'Stale Pro flag waived commission';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
insert into public.subscriptions(user_id,user_email,plan,status,start_date,end_date,metadata) values
 ('00000000-0000-4000-8000-000000009902','booking-tutor@example.invalid','premium','active',current_date,current_date+10,'{"product":"tutor_pro"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
do $$declare b public.tutor_bookings;begin
 b:=public.create_booking('00000000-0000-4000-8000-000000009905','History',current_date+151,'10:00',1,'Current Pro benefit',gen_random_uuid(),false);
 if b.platform_fee<>0 then raise exception 'Current Pro receipt ignored';end if;
end $$;
reset role;

-- Schema-safe invalidation for both URL column names; unaffected edits preserve the index.
select set_config('request.jwt.claims','{}',true);
insert into public.educational_resources(title,subject,grade,resource_url,is_active)
values('Index fixture','Mathematics','Grade 10','https://example.invalid/book.pdf',true);
insert into public.learning_knowledge_chunks(source_type,source_id,title,subject,grade,page_number,chunk_number,content)
select 'educational_resources',id,title,subject,grade,1,0,'Original index fixture content for verification.' from public.educational_resources where title='Index fixture';
update public.educational_resources set description='Metadata change' where title='Index fixture';
do $$begin if not exists(select 1 from public.learning_knowledge_chunks where title='Index fixture') then raise exception 'Unchanged content lost index';end if;end $$;
update public.educational_resources set grade='Grade 11' where title='Index fixture';
do $$begin if exists(select 1 from public.learning_knowledge_chunks where title='Index fixture') then raise exception 'Stale index survived changed grade';end if;end $$;
update public.resources set is_archived=true where metadata->>'smartbridge_pack_id'='math-10';
do $$begin if exists(select 1 from public.learning_knowledge_chunks k join public.resources r on r.id=k.source_id where k.source_type='resources' and r.metadata->>'smartbridge_pack_id'='math-10') then raise exception 'Archived guide retained index';end if;end $$;
