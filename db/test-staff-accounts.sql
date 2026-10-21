-- Rolled-back fixtures. Test actual database privileges, not UI visibility.
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000007701','staff-owner@example.invalid'),
 ('00000000-0000-4000-8000-000000007702','staff-worker@example.invalid'),
 ('00000000-0000-4000-8000-000000007703','staff-outsider@example.invalid');
update public.users set role='user',onboarding_complete=true where id in ('00000000-0000-4000-8000-000000007702','00000000-0000-4000-8000-000000007703');
update public.users set role='admin',onboarding_complete=true where id='00000000-0000-4000-8000-000000007701';
insert into public.resources(id,title,subject,grade,type,file_url,is_approved,is_rejected) values
 ('00000000-0000-4000-8000-000000007704','Staff pending resource','Mathematics','Grade 10','Notes','storage://tutor-resources/00000000-0000-4000-8000-000000007703/review.pdf',false,false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007701","role":"authenticated"}',true);
select public.set_staff_account('staff-worker@example.invalid',array['resources'],true,0);
do $$begin
 if jsonb_array_length(public.staff_account_roster()->'accounts')<1 then raise exception 'Staff roster empty';end if;
 begin perform public.set_staff_account('staff-worker@example.invalid',array['announcements'],true,0);raise exception 'Stale overwrite accepted';exception when raise_exception then if sqlerrm='Stale overwrite accepted' then raise;end if;end;
 begin perform public.set_staff_account('staff-outsider@example.invalid',array['payments'],true,0);raise exception 'Unknown permission accepted';exception when raise_exception then if sqlerrm='Unknown permission accepted' then raise;end if;end;
 begin perform public.set_staff_account('staff-owner@example.invalid',array['resources'],true,0);raise exception 'Full admin converted';exception when raise_exception then if sqlerrm='Full admin converted' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007702","role":"authenticated"}',true);
do $$begin
 if public.is_admin(auth.uid()) then raise exception 'Staff received full admin';end if;
 if public.get_staff_access()->>'enabled'<>'true' then raise exception 'Own staff access missing';end if;
 if jsonb_array_length(public.staff_resource_queue())<1 then raise exception 'Resource queue inaccessible';end if;
 if not smartbridge_private.can_read_file('tutor-resources','00000000-0000-4000-8000-000000007703/review.pdf') then raise exception 'Pending resource file unreadable';end if;
 if smartbridge_private.can_read_file('application_documents','00000000-0000-4000-8000-000000007703/private.pdf') then raise exception 'Private learner file exposed';end if;
 begin perform public.set_staff_account('staff-outsider@example.invalid',array['resources'],true,0);raise exception 'Staff granted privileges';exception when raise_exception then if sqlerrm='Staff granted privileges' then raise;end if;end;
 begin perform public.staff_account_roster();raise exception 'Staff read roster';exception when raise_exception then if sqlerrm='Staff read roster' then raise;end if;end;
 begin update public.staff_accounts set permissions=array['announcements'] where user_id=auth.uid();raise exception 'Direct grant accepted';exception when insufficient_privilege then null;end;
 begin perform public.admin_assessment_review_queue();raise exception 'Other queue exposed';exception when raise_exception then if sqlerrm='Other queue exposed' then raise;end if;end;
 begin perform public.study_moderation_queue();raise exception 'Other moderation exposed';exception when raise_exception then if sqlerrm='Other moderation exposed' then raise;end if;end;
 begin insert into public.platform_announcements(title,message,audience) values('Unauthorized staff notice','Denied',array['all']);raise exception 'Announcement permission bypass';exception when insufficient_privilege then null;end;
 begin insert into public.university_directory(name,url) values('Unauthorized university','https://example.invalid');raise exception 'University permission bypass';exception when insufficient_privilege then null;end;
end $$;
select public.staff_review_resource('00000000-0000-4000-8000-000000007704',true);
reset role;
do $$begin
 if not exists(select 1 from public.resources where id='00000000-0000-4000-8000-000000007704' and is_approved and not is_rejected and approved_by='00000000-0000-4000-8000-000000007702') then raise exception 'Scoped resource approval failed';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007701","role":"authenticated"}',true);
select public.set_staff_account('staff-worker@example.invalid',array['announcements','universities','assessments','study_moderation'],true,1);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007702","role":"authenticated"}',true);
select public.admin_assessment_review_queue();
select public.study_moderation_queue();
insert into public.platform_announcements(title,message,audience) values('Authorized staff notice','Granted',array['all']);
insert into public.university_directory(name,url) values('Authorized staff university','https://example.invalid');
do $$begin
 begin perform public.staff_resource_queue();raise exception 'Removed resource access remained';exception when raise_exception then if sqlerrm='Removed resource access remained' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007701","role":"authenticated"}',true);
select public.set_staff_account('staff-worker@example.invalid',array['announcements'],false,2);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007702","role":"authenticated"}',true);
do $$declare n integer;begin
 if smartbridge_private.has_staff_permission('announcements') then raise exception 'Suspension ineffective';end if;
 update public.platform_announcements set message='Bypassed suspension' where title='Authorized staff notice';get diagnostics n=row_count;
 if n<>0 then raise exception 'Suspended staff edited announcement';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007703","role":"authenticated"}',true);
do $$begin
 if public.get_staff_access() is not null then raise exception 'Outsider inherited staff';end if;
 if exists(select 1 from public.staff_accounts) then raise exception 'Outsider read staff';end if;
 begin perform public.staff_review_resource('00000000-0000-4000-8000-000000007704',false);raise exception 'Outsider reviewed resource';exception when raise_exception then if sqlerrm='Outsider reviewed resource' then raise;end if;end;
end $$;
reset role;
do $$begin
 if (select count(*) from smartbridge_private.staff_audit where actor_id='00000000-0000-4000-8000-000000007701')<3 then raise exception 'Permission audit missing';end if;
 if not exists(select 1 from smartbridge_private.staff_audit where actor_id='00000000-0000-4000-8000-000000007702' and area='platform_announcements') then raise exception 'Staff operation audit missing';end if;
end $$;
