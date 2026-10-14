-- Additional fixtures live only inside the check runner's rolled-back transaction.
reset role;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000002011','improve-student@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000002012','improve-tutor@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000002013','improve-admin@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000002014','improve-other@example.invalid','{}');
update public.users set role='admin',onboarding_complete=true where id='00000000-0000-4000-8000-000000002013';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002013","role":"authenticated"}',true);
select public.approve_account('00000000-0000-4000-8000-000000002012','student_tutor');
select public.approve_account('00000000-0000-4000-8000-000000002012','student_tutor');
do $$begin
 if (select count(*) from public.tutor_profiles where user_id='00000000-0000-4000-8000-000000002012')<>1 then raise exception 'Profile missing or duplicated';end if;
 if not exists(select 1 from public.users where id='00000000-0000-4000-8000-000000002012' and is_verified) then raise exception 'Approval flags inconsistent';end if;
end;$$;
reset role;
update public.tutor_profiles set subjects=array['Mathematics'],hourly_rate=100 where user_id='00000000-0000-4000-8000-000000002012';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002011","role":"authenticated"}',true);
select public.complete_onboarding('student','','','',true,false);
do $$declare booking jsonb;begin
 begin perform public.approve_account('00000000-0000-4000-8000-000000002014','student_tutor');raise exception 'Learner approval bypass';exception when raise_exception then if sqlerrm='Learner approval bypass' then raise;end if;end;
 begin perform public.accept_legal_document('terms_student','1.1-draft',repeat('a',64));raise exception 'Draft accepted';exception when raise_exception then if sqlerrm='Draft accepted' then raise;end if;end;
 booking:=to_jsonb(public.create_booking((select id from public.tutor_directory where user_id='00000000-0000-4000-8000-000000002012'),'Mathematics','2099-12-01','10:00',1,'Testing',gen_random_uuid()));
 perform set_config('smartbridge.test_booking',booking->>'id',true);
 begin update public.tutor_bookings set status='cancelled' where id=(booking->>'id')::uuid;raise exception 'Cancellation notice bypass';exception when raise_exception then if sqlerrm='Cancellation notice bypass' then raise;end if;end;
 begin perform public.cancel_booking((booking->>'id')::uuid,'short');raise exception 'Short notice accepted';exception when raise_exception then if sqlerrm='Short notice accepted' then raise;end if;end;
end;$$;
reset role;select set_config('request.jwt.claims','{}',true);
update public.tutor_bookings set payment_status='paid',amount_paid=100 where id=current_setting('smartbridge.test_booking')::uuid;
update public.legal_documents set is_published=true where doc_key='terms_student';
select set_config('smartbridge.test_doc_hash',(select document_sha256 from public.legal_documents where doc_key='terms_student'),true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002011","role":"authenticated"}',true);
do $$declare cancelled jsonb; receipt uuid;begin
 cancelled:=public.cancel_booking(current_setting('smartbridge.test_booking')::uuid,'I am cancelling this booking so you can rearrange your day.');
 if cancelled->>'refund_eligibility'<>'full_booking_refund' or (cancelled->>'refundable_amount')::numeric<>100 then raise exception 'Paid refund eligibility wrong';end if;
 if cancelled->>'payment_status'<>'paid' then raise exception 'Cancellation falsely settled payment';end if;
 perform public.cancel_booking(current_setting('smartbridge.test_booking')::uuid,'Repeated cancellation request');
 receipt:=public.accept_legal_document('terms_student','1.1-draft',current_setting('smartbridge.test_doc_hash'));
 if public.accept_legal_document('terms_student','1.1-draft',current_setting('smartbridge.test_doc_hash'))<>receipt then raise exception 'Acceptance duplicated';end if;
 begin perform public.accept_legal_document('terms_student','wrong-version',current_setting('smartbridge.test_doc_hash'));raise exception 'Stale legal version accepted';exception when raise_exception then if sqlerrm='Stale legal version accepted' then raise;end if;end;
 if exists(select 1 from public.action_notifications where recipient_id='00000000-0000-4000-8000-000000002012') then raise exception 'Other recipient leaked';end if;
end;$$;
reset role;select set_config('request.jwt.claims','{}',true);
do $$begin
 if (select count(*) from smartbridge_private.notification_outbox where event_key like 'approval:00000000-0000-4000-8000-000000002012:%')<>1 then raise exception 'Approval email duplicated';end if;
 if (select count(*) from public.action_notifications where booking_id=current_setting('smartbridge.test_booking')::uuid and kind='booking-cancelled')<>2 then raise exception 'Cancellation notices missing or duplicated';end if;
end;$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002014","role":"authenticated"}',true);
select public.complete_onboarding('student','','','',true,false);
do $$begin
 if exists(select 1 from public.legal_acceptances) then raise exception 'Legal receipt privacy failed';end if;
 if has_table_privilege('authenticated','smartbridge_private.notification_outbox','SELECT') then raise exception 'Browser outbox privilege';end if;
 begin perform public.cancel_booking(current_setting('smartbridge.test_booking')::uuid,'I am not the owner of this booking.');raise exception 'Other account cancelled';exception when raise_exception then if sqlerrm='Other account cancelled' then raise;end if;end;
end;$$;
reset role;
