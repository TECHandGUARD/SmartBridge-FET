reset role;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000009701','marketing-admin@example.invalid','{}'),
 ('10000000-0000-4000-8000-000000009702','marketing-member@example.invalid','{}'),
 ('10000000-0000-4000-8000-000000009703','marketing-new@example.invalid','{}');
update public.users set role='admin',onboarding_complete=true where id='10000000-0000-4000-8000-000000009701';
update public.users set role='student',onboarding_complete=true where id in ('10000000-0000-4000-8000-000000009702','10000000-0000-4000-8000-000000009703');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000009701","role":"authenticated"}',true);
select public.save_marketing_post(null,'public-campaign','Public campaign','A test summary','This is enough content for a published test campaign.','campaign',null,true,0);
select public.save_marketing_post(null,'private-draft','Private draft','','Draft content','article',null,false,0);
do $$declare pid uuid;begin
 select id into pid from public.marketing_posts where slug='public-campaign';
 begin perform public.save_marketing_post(pid,'public-campaign','Overwrite','','Content','article',null,false,0);raise exception 'Stale edit accepted';exception when raise_exception then if sqlerrm='Stale edit accepted' then raise;end if;end;
 if (select version from public.marketing_posts where id=pid)<>1 then raise exception 'Stale edit changed version';end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$begin
 if exists(select 1 from public.marketing_posts where slug='private-draft') then raise exception 'Draft leaked';end if;
 if not exists(select 1 from public.marketing_posts where slug='public-campaign') then raise exception 'Public post unavailable';end if;
 if has_function_privilege('anon','public.marketing_metrics()','execute') then raise exception 'Anonymous metrics access';end if;
 if exists(select 1 from public.public_tutors() x where to_jsonb(x) ?| array['user_email','phone','sace_number','clearance_certificate_url','user_id']) then raise exception 'Private tutor fields exposed';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000009702","role":"authenticated"}',true);
do $$begin
 begin perform public.save_marketing_post(null,'unauthorized','Bad post','','','article',null,false,0);raise exception 'Member published';exception when raise_exception then if sqlerrm='Member published' then raise;end if;end;
 begin perform public.marketing_metrics();raise exception 'Member read metrics';exception when raise_exception then if sqlerrm='Member read metrics' then raise;end if;end;
 perform set_config('test.marketing_ref',public.my_referral_link(),true);
 if public.record_marketing_attribution(current_setting('test.marketing_ref'),null) then raise exception 'Self referral accepted';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000009703","role":"authenticated"}',true);
do $$begin
 if not public.record_marketing_attribution(current_setting('test.marketing_ref'),'public-campaign') then raise exception 'Attribution missing';end if;
 if public.record_marketing_attribution(current_setting('test.marketing_ref'),'public-campaign') then raise exception 'Duplicate attribution counted';end if;
end $$;
reset role;
-- A failed audit write must roll back the post write within the same transaction.
create function pg_temp.fail_marketing_audit() returns trigger language plpgsql as $$begin raise exception 'Injected audit failure';end$$;
create trigger fail_marketing_audit before insert on smartbridge_private.marketing_audit for each row execute function pg_temp.fail_marketing_audit();
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000009701","role":"authenticated"}',true);
do $$begin
 begin perform public.save_marketing_post(null,'must-rollback','Must roll back','','Valid draft','article',null,false,0);exception when raise_exception then if sqlerrm<>'Injected audit failure' then raise;end if;end;
 if exists(select 1 from public.marketing_posts where slug='must-rollback') then raise exception 'Partial post survived failed audit';end if;
end $$;
reset role;
drop trigger fail_marketing_audit on smartbridge_private.marketing_audit;
-- Retained learner JWT cannot submit or directly read tables after suspension.
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000009701","role":"authenticated"}',true);
insert into public.tutor_assessments(id,tutor_id,student_id,title,subject,grade,kind,opens_at,due_at,questions,max_marks,status,moderation_status)
values('10000000-0000-4000-8000-000000009704','10000000-0000-4000-8000-000000009701','10000000-0000-4000-8000-000000009703','Suspension check','Mathematics',10,'test',now()-interval '1 hour',now()+interval '1 hour','[{"type":"mcq","prompt":"Choose","marks":2,"options":["A","B","C","D"],"correct_index":1}]',2,'published','approved');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000009703","role":"authenticated"}',true);
select public.start_tutor_assessment('10000000-0000-4000-8000-000000009704');
reset role;
select set_config('request.jwt.claims','{}',true);
update public.users set is_active=false where id='10000000-0000-4000-8000-000000009703';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000009703","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.users where id=auth.uid()) then raise exception 'Suspended direct read allowed';end if;
 begin perform public.submit_tutor_assessment('10000000-0000-4000-8000-000000009704','{"0":"1"}',null);raise exception 'Suspended submission allowed';exception when raise_exception then if sqlerrm='Suspended submission allowed' then raise;end if;end;
 begin perform public.my_referral_link();raise exception 'Suspended referral allowed';exception when raise_exception then if sqlerrm='Suspended referral allowed' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
-- Inject a failure after subscription changes but before receipt commit.
create function pg_temp.fail_payment_event() returns trigger language plpgsql as $$begin raise exception 'Injected payment failure';end$$;
create trigger fail_payment_event before insert on smartbridge_private.payment_events for each row execute function pg_temp.fail_payment_event();
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare previous_end date;begin
 select max(end_date) into previous_end from public.subscriptions where user_id='10000000-0000-4000-8000-000000009702';
 perform public.create_gateway_payment_order('10000000-0000-4000-8000-000000009702','10000000-0000-4000-8000-000000009705','student',(select amount_cents from public.subscription_prices where product='student'),'live','yoco');
 update public.payment_orders set checkout_id='acid-rollback-checkout' where id='10000000-0000-4000-8000-000000009705';
 begin perform public.fulfill_gateway_payment('acid-test-event','acid-rollback-checkout','acid-test-payment',(select amount_cents from public.subscription_prices where product='student'),'ZAR','live','yoco');exception when raise_exception then if sqlerrm<>'Injected payment failure' then raise;end if;end;
 if (select status from public.payment_orders where id='10000000-0000-4000-8000-000000009705')='paid' then raise exception 'Failed payment marked paid';end if;
 if (select max(end_date) from public.subscriptions where user_id='10000000-0000-4000-8000-000000009702') is distinct from previous_end then raise exception 'Failed payment granted access';end if;
end $$;
reset role;
drop trigger fail_payment_event on smartbridge_private.payment_events;
select 'PASS: public privacy, admin boundaries, stale edits, referral deduplication, suspension, payment and audit rollback' as result;
