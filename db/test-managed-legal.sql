-- Run in an outer transaction and roll back. No fixture records persist.
reset role;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000009001','legal-admin@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000009002','legal-tutor@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000009003','legal-owner@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000009004','legal-other@example.invalid','{}');
update public.users set role='admin',is_active=true,onboarding_complete=true where id='00000000-0000-4000-8000-000000009001';
update public.users set role='student_tutor',is_active=true,onboarding_complete=true where id='00000000-0000-4000-8000-000000009002';
update public.users set role='student',is_active=true,onboarding_complete=true where id in ('00000000-0000-4000-8000-000000009003','00000000-0000-4000-8000-000000009004');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009001","role":"authenticated"}',true);
insert into public.legal_documents(doc_key,title,content,version,audience,is_published,owner_user_id,contains_personal_information,file_path,file_sha256) values
 ('test_legal_public','Public','Test','1.0','public',true,null,false,'legal-test-public.pdf',repeat('a',64)),
 ('test_legal_tutor','Payout dates','Test','1.0','tutor',true,null,false,'legal-test-tutor.pdf',repeat('b',64)),
 ('test_legal_owner','Signed form','Test','1.0','owner',true,'00000000-0000-4000-8000-000000009003',true,'legal-test-owner.pdf',repeat('c',64)),
 ('test_legal_admin','Private','Test','1.0','admin',true,null,true,null,null),
 ('test_legal_draft','Draft','Test','1.0','public',false,null,false,null,null);
do $$begin
 begin insert into public.legal_documents(doc_key,title,content,audience,contains_personal_information) values('test_legal_leak','Bad','Test','public',true);
 raise exception 'Confidential publication accepted';exception when check_violation then null;end;
 begin update public.legal_documents set content='Changed' where doc_key='test_legal_public';
 raise exception 'Same-version replacement accepted';exception when raise_exception then if sqlerrm='Same-version replacement accepted' then raise;end if;end;
end;$$;
reset role;
insert into storage.objects(bucket_id,name) values('legal-documents','legal-test-public.pdf'),('legal-documents','legal-test-tutor.pdf'),('legal-documents','legal-test-owner.pdf');
select set_config('storage.operation','object.get_authenticated',true);
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$begin
 if (select count(*) from public.legal_documents where doc_key like 'test_legal_%')<>1 then raise exception 'Anonymous metadata leak';end if;
 if (select count(*) from storage.objects where name like 'legal-test-%')<>1 then raise exception 'Anonymous file leak';end if;
end;$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009002","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.legal_documents where doc_key like 'test_legal_%')<>2 then raise exception 'Tutor scope incorrect';end if;
 if (select count(*) from storage.objects where name like 'legal-test-%')<>2 then raise exception 'Tutor file scope incorrect';end if;
 begin perform public.accept_legal_document('test_legal_owner','1.0',repeat('c',64));raise exception 'Cross-owner acceptance allowed';exception when raise_exception then if sqlerrm='Cross-owner acceptance allowed' then raise;end if;end;
 begin insert into public.legal_documents(doc_key,title,content) values('test_legal_unauthorized','Bad','Test');raise exception 'Non-admin write allowed';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009003","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.legal_documents where doc_key like 'test_legal_%')<>2 then raise exception 'Owner scope incorrect';end if;
 if (select count(*) from storage.objects where name like 'legal-test-%')<>2 then raise exception 'Owner file scope incorrect';end if;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009004","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.legal_documents where doc_key like 'test_legal_%')<>1 then raise exception 'Cross-user metadata leak';end if;
 if (select count(*) from storage.objects where name like 'legal-test-%')<>1 then raise exception 'Cross-user file leak';end if;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009001","role":"authenticated"}',true);
update public.legal_documents set is_published=false where doc_key='test_legal_public' and revision=1;
do $$begin
 if exists(select 1 from public.legal_documents where doc_key='test_legal_public' and revision=1) then raise exception 'Revision did not increment';end if;
end;$$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$begin
 if exists(select 1 from storage.objects where name='legal-test-public.pdf') then raise exception 'Unpublished file still accessible';end if;
end;$$;
reset role;
do $$begin
 if not exists(select 1 from smartbridge_private.legal_document_audit where actor_id='00000000-0000-4000-8000-000000009001' and action='UPDATE') then raise exception 'Audit missing';end if;
end;$$;
