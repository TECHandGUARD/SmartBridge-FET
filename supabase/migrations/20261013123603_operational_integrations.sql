-- After five repair migrations. Private storage + scheduled-job and monitoring contracts.
-- The observed resource bucket is empty. Existing files require a reviewed migration first.
do $$ begin if exists(select 1 from storage.objects where bucket_id='resources') then raise exception 'Migrate existing resource files and references before making the resource bucket private'; end if; end $$;
update storage.buckets set public=false where id='resources';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('application_documents','application_documents',false,5242880,array['application/pdf','image/jpeg','image/png']),
 ('nbt_results','nbt_results',false,5242880,array['application/pdf','image/jpeg','image/png']),
 ('chat-attachments','chat-attachments',false,10485760,array['application/pdf','image/jpeg','image/png','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
 ('educational_resources','educational_resources',false,26214400,array['application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
 ('tutor-resources','tutor-resources',false,10485760,array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function smartbridge_private.has_paid_access() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.users u join public.subscriptions s on s.user_id=u.id where u.id=auth.uid() and u.is_active=true and s.plan='premium' and s.status='active' and s.start_date<=(now() at time zone 'Africa/Johannesburg')::date and s.end_date>=(now() at time zone 'Africa/Johannesburg')::date);
$$;
create function smartbridge_private.can_manage_file(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and split_part(path,'/',1)=auth.uid()::text and path !~ '(^|/)\.\.(/|$)' and exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true and
 (public.is_admin(auth.uid()) or (bucket in ('application_documents','nbt_results','chat-attachments') and u.role in ('student','parent','tutor','sace_tutor','student_tutor')) or (bucket in ('resources','tutor-resources') and u.is_verified=true and u.role in ('tutor','sace_tutor','student_tutor'))))
 and (bucket not in ('resources','tutor-resources') or not exists(select 1 from public.resources r where r.file_url='storage://'||bucket||'/'||path and r.is_approved=true));
$$;
create function smartbridge_private.can_read_file(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and path !~ '(^|/)\.\.(/|$)' and exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true) and
 (public.is_admin(auth.uid()) or split_part(path,'/',1)=auth.uid()::text or
 (bucket in ('resources','tutor-resources') and exists(select 1 from public.resources r where r.file_url='storage://'||bucket||'/'||path and r.is_approved=true and coalesce(r.is_archived,false)=false and (r.is_premium=false or smartbridge_private.has_paid_access()))) or
 (bucket='educational_resources' and exists(select 1 from public.educational_resources r where r.resource_url='storage://'||bucket||'/'||path and r.is_active=true and (r.is_premium=false or smartbridge_private.has_paid_access()))) or
 (bucket='chat-attachments' and exists(select 1 from public.chat_messages m where m.metadata->>'attachment_url'='storage://'||bucket||'/'||path and (m.sender_id=auth.uid() or m.recipient_id=auth.uid()) and coalesce(m.is_deleted,false)=false)));
$$;
revoke all on function smartbridge_private.has_paid_access(),smartbridge_private.can_manage_file(text,text),smartbridge_private.can_read_file(text,text) from public,anon;
grant execute on function smartbridge_private.has_paid_access(),smartbridge_private.can_manage_file(text,text),smartbridge_private.can_read_file(text,text) to authenticated;
-- A restrictive boundary overrides the legacy permissive "Public can view files" policy.
create policy "Private files have an access boundary" on storage.objects as restrictive for select to public using(bucket_id not in ('resources','application_documents','nbt_results','chat-attachments','educational_resources','tutor-resources') or (case when auth.uid() is null then false else smartbridge_private.can_read_file(bucket_id,name) end));
create policy "Upload owned private files" on storage.objects for insert to authenticated with check(bucket_id in ('resources','application_documents','nbt_results','chat-attachments','educational_resources','tutor-resources') and smartbridge_private.can_manage_file(bucket_id,name));
create policy "Read permitted private files" on storage.objects for select to authenticated using(bucket_id in ('resources','application_documents','nbt_results','chat-attachments','educational_resources','tutor-resources') and smartbridge_private.can_read_file(bucket_id,name));
create policy "Private file update boundary" on storage.objects as restrictive for update to public using(bucket_id not in ('resources','application_documents','nbt_results','chat-attachments','educational_resources','tutor-resources') or smartbridge_private.can_manage_file(bucket_id,name)) with check(bucket_id not in ('resources','application_documents','nbt_results','chat-attachments','educational_resources','tutor-resources') or smartbridge_private.can_manage_file(bucket_id,name));
create policy "Private file delete boundary" on storage.objects as restrictive for delete to public using(bucket_id not in ('resources','application_documents','nbt_results','chat-attachments','educational_resources','tutor-resources') or smartbridge_private.can_manage_file(bucket_id,name));
create policy "Manage own private uploads" on storage.objects for update to authenticated using(smartbridge_private.can_manage_file(bucket_id,name)) with check(smartbridge_private.can_manage_file(bucket_id,name));
create policy "Delete own private uploads" on storage.objects for delete to authenticated using(smartbridge_private.can_manage_file(bucket_id,name));

create function smartbridge_private.protect_document_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if public.is_admin(auth.uid()) or coalesce(auth.role(),'')='service_role' or auth.uid() is null then return new; end if;
 if new.student_id is distinct from auth.uid() or new.student_email is distinct from (select email from public.users where id=auth.uid()) or new.file_url not like 'storage://application_documents/'||auth.uid()::text||'/%' or new.status not in ('uploaded','submitted') then raise exception 'Invalid owned document'; end if;
 if not exists(select 1 from public.university_applications a where a.id::text=new.application_id and a.student_id=auth.uid()) then raise exception 'Owned application required';end if;
 if tg_op='UPDATE' and (old.student_id<>auth.uid() or old.status='verified' or new.application_id is distinct from old.application_id or new.verified_at is distinct from old.verified_at or new.rejected_at is distinct from old.rejected_at or new.notes is distinct from old.notes) then raise exception 'Document review fields are administrator managed'; end if;
 return new;
end;$$;
revoke all on function smartbridge_private.protect_document_record() from public,anon,authenticated;
create trigger protect_document_record before insert or update on public.application_documents for each row execute function smartbridge_private.protect_document_record();
create policy "Owners delete unverified documents" on public.application_documents for delete to authenticated using(student_id=auth.uid() and status<>'verified');
create policy "Document ownership update boundary" on public.application_documents as restrictive for update to authenticated using(student_id=auth.uid() or public.is_admin(auth.uid())) with check(student_id=auth.uid() or public.is_admin(auth.uid()));
create policy "NBT ownership update boundary" on public.nbt_registrations as restrictive for update to authenticated using(student_id=auth.uid() or public.is_admin(auth.uid())) with check(student_id=auth.uid() or public.is_admin(auth.uid()));
create function smartbridge_private.protect_resource_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if public.is_admin(auth.uid()) or coalesce(auth.role(),'')='service_role' or auth.uid() is null then return new; end if;
 if new.tutor_id is distinct from auth.uid() or new.tutor_email is distinct from (select email from public.users where id=auth.uid()) or new.is_approved=true or new.is_rejected=true or new.approved_by is not null or new.approved_at is not null or new.rejected_by is not null or new.rejected_at is not null then raise exception 'Resource review requires administrator approval'; end if;
 if tg_op='UPDATE' and old.is_approved=true then raise exception 'Approved resources require administrator editing'; end if;
 if new.file_url not like 'storage://tutor-resources/'||auth.uid()::text||'/%' and new.file_url not like 'storage://resources/'||auth.uid()::text||'/%' then raise exception 'Upload resources to an owned private path'; end if;
 return new;
end;$$;
revoke all on function smartbridge_private.protect_resource_record() from public,anon,authenticated;
create trigger protect_resource_record before insert or update on public.resources for each row execute function smartbridge_private.protect_resource_record();
create policy "Admins manage educational resources" on public.educational_resources for all to authenticated using(public.is_admin(auth.uid())) with check(public.is_admin(auth.uid()));
create policy "Users read available educational resources" on public.educational_resources for select to authenticated using(is_active=true and (is_premium=false or smartbridge_private.has_paid_access()));

create table smartbridge_private.operational_events(
 id uuid primary key default gen_random_uuid(), source text not null check(source in ('edge','client','job')), code text not null check(code ~ '^[a-z0-9_-]{1,80}$'),
 actor_id uuid, http_status integer, created_at timestamptz not null default now()
);
alter table smartbridge_private.operational_events enable row level security;
revoke all on smartbridge_private.operational_events from public,anon,authenticated;
grant all on smartbridge_private.operational_events to service_role;
create index operational_events_time on smartbridge_private.operational_events(created_at);
create function public.record_operational_event(event_source text,event_code text,event_status integer default null) returns boolean language plpgsql security invoker set search_path='' as $$
begin insert into smartbridge_private.operational_events(source,code,http_status) values(event_source,event_code,event_status);delete from smartbridge_private.operational_events where created_at<now()-interval '30 days';return true;end;$$;
revoke all on function public.record_operational_event(text,text,integer) from public,anon,authenticated;
grant execute on function public.record_operational_event(text,text,integer) to service_role;
create function smartbridge_private.report_client_event(event_code text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or event_code not in ('render_error','unhandled_rejection','request_error') then raise exception 'Invalid error report'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||'monitor',0));
 if (select count(*) from smartbridge_private.operational_events where actor_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then return false; end if;
 insert into smartbridge_private.operational_events(source,code,actor_id) values('client',event_code,auth.uid());return true;
end;$$;
create function public.report_client_event(event_code text) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.report_client_event(event_code)$$;
revoke all on function public.report_client_event(text),smartbridge_private.report_client_event(text) from public,anon;
grant execute on function public.report_client_event(text),smartbridge_private.report_client_event(text) to authenticated;

create table smartbridge_private.scheduled_jobs(
 key text primary key, function_slug text not null, body jsonb not null default '{}', cron_expression text not null,
 enabled boolean not null default false, lease_token uuid, lease_until timestamptz,last_started_at timestamptz,last_finished_at timestamptz,last_status text,
 constraint scheduled_job_keys check(key in ('study','session-24h','session-1h','nbt','deadlines','subscriptions','weekly-parents','alerts'))
);
alter table smartbridge_private.scheduled_jobs enable row level security;
revoke all on smartbridge_private.scheduled_jobs from public,anon,authenticated;
grant all on smartbridge_private.scheduled_jobs to service_role;
insert into smartbridge_private.scheduled_jobs(key,function_slug,body,cron_expression) values
 ('study','send-study-reminders','{}','* * * * *'),('session-24h','send-session-reminders','{"window":"24h"}','*/15 * * * *'),('session-1h','send-session-reminders','{"window":"1h"}','*/5 * * * *'),
 ('nbt','send-nbt-reminders','{}','0 6 * * *'),('deadlines','send-deadline-reminders','{}','0 6 * * *'),('subscriptions','expire-subscriptions','{}','5 22 * * *'),
 ('weekly-parents','send-weekly-parent-reports','{}','0 5 * * 1'),('alerts','send-operational-alerts','{}','*/15 * * * *');
create table smartbridge_private.job_runs(id uuid primary key,key text not null references smartbridge_private.scheduled_jobs(key),status text not null,started_at timestamptz not null default now(),finished_at timestamptz);
alter table smartbridge_private.job_runs enable row level security;
revoke all on smartbridge_private.job_runs from public,anon,authenticated;
grant all on smartbridge_private.job_runs to service_role;
create function public.claim_operational_job(job_key text,run_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare job smartbridge_private.scheduled_jobs;
begin
 select * into job from smartbridge_private.scheduled_jobs where key=job_key and enabled=true and (lease_until is null or lease_until<now()) and (last_started_at is null or last_started_at<now()-interval '45 seconds') for update skip locked;
 if not found then return null; end if;
 update smartbridge_private.scheduled_jobs set lease_token=run_id,lease_until=now()+interval '2 minutes',last_started_at=now(),last_status='running' where key=job_key;
 insert into smartbridge_private.job_runs(id,key,status) values(run_id,job_key,'running');return jsonb_build_object('key',job.key,'function_slug',job.function_slug,'body',job.body);
end;$$;
create function public.finish_operational_job(job_key text,run_id uuid,run_status text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if run_status not in ('success','failed','partial') then raise exception 'Invalid run status'; end if;
 update smartbridge_private.scheduled_jobs set lease_until=null,last_finished_at=now(),last_status=run_status where key=job_key and lease_token=run_id;
 if not found then return false; end if;
 update smartbridge_private.job_runs set status=run_status,finished_at=now() where id=run_id;
 if run_status<>'success' then insert into smartbridge_private.operational_events(source,code) values('job','job_'||job_key);end if;
 delete from smartbridge_private.job_runs where started_at<now()-interval '30 days';return true;
end;$$;
revoke all on function public.claim_operational_job(text,uuid),public.finish_operational_job(text,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_operational_job(text,uuid),public.finish_operational_job(text,uuid,text) to service_role;
create function smartbridge_private.set_scheduled_job(job_key text,is_enabled boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'Administrator required'; end if;
 update smartbridge_private.scheduled_jobs set enabled=is_enabled where key=job_key;if not found then raise exception 'Unknown job';end if;return true;
end;$$;
create function public.set_scheduled_job(job_key text,is_enabled boolean) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.set_scheduled_job(job_key,is_enabled)$$;
revoke all on function public.set_scheduled_job(text,boolean),smartbridge_private.set_scheduled_job(text,boolean) from public,anon;
grant execute on function public.set_scheduled_job(text,boolean),smartbridge_private.set_scheduled_job(text,boolean) to authenticated;
create table smartbridge_private.weekly_report_receipts(parent_id uuid,student_id uuid,week_start date,provider_id text,primary key(parent_id,student_id,week_start));
create table smartbridge_private.alert_receipts(window_start timestamptz primary key,provider_ids jsonb not null default '[]');
alter table smartbridge_private.weekly_report_receipts enable row level security;
alter table smartbridge_private.alert_receipts enable row level security;
revoke all on smartbridge_private.weekly_report_receipts,smartbridge_private.alert_receipts from public,anon,authenticated;
grant all on smartbridge_private.weekly_report_receipts,smartbridge_private.alert_receipts to service_role;
create function public.operational_status() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('jobs',(select jsonb_agg(jsonb_build_object('key',key,'enabled',enabled,'cron',cron_expression,'last_started',last_started_at,'last_finished',last_finished_at,'status',last_status)) from smartbridge_private.scheduled_jobs),'recent_errors',(select count(*) from smartbridge_private.operational_events where created_at>now()-interval '1 day'),'events',(select jsonb_agg(e) from (select source,code,http_status,created_at from smartbridge_private.operational_events order by created_at desc limit 20)e));
$$;
revoke all on function public.operational_status() from public,anon,authenticated;
grant execute on function public.operational_status() to service_role;

create function public.weekly_report_recorded(parent_key uuid,student_key uuid,chosen_week date) returns boolean language sql stable security invoker set search_path='' as $$select exists(select 1 from smartbridge_private.weekly_report_receipts where parent_id=parent_key and student_id=student_key and week_start=chosen_week)$$;
create function public.save_weekly_report(parent_key uuid,student_key uuid,chosen_week date,email_id text) returns boolean language plpgsql security invoker set search_path='' as $$begin insert into smartbridge_private.weekly_report_receipts values(parent_key,student_key,chosen_week,email_id);return true;end;$$;
create function public.alert_window_recorded(chosen_window timestamptz) returns boolean language sql stable security invoker set search_path='' as $$select exists(select 1 from smartbridge_private.alert_receipts where window_start=chosen_window)$$;
create function public.save_alert_window(chosen_window timestamptz,email_ids jsonb) returns boolean language plpgsql security invoker set search_path='' as $$begin insert into smartbridge_private.alert_receipts values(chosen_window,email_ids);return true;end;$$;
revoke all on function public.weekly_report_recorded(uuid,uuid,date),public.save_weekly_report(uuid,uuid,date,text),public.alert_window_recorded(timestamptz),public.save_alert_window(timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.weekly_report_recorded(uuid,uuid,date),public.save_weekly_report(uuid,uuid,date,text),public.alert_window_recorded(timestamptz),public.save_alert_window(timestamptz,jsonb) to service_role;

create function smartbridge_private.has_chat_relationship(first_id uuid,second_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tutor_bookings b join public.users t on t.id=b.tutor_id join public.users s on s.id=b.student_id where b.status in ('confirmed','completed') and t.is_active=true and t.is_verified=true and s.is_active=true and ((b.tutor_id=first_id and b.student_id=second_id) or (b.student_id=first_id and b.tutor_id=second_id)));
$$;
revoke all on function smartbridge_private.has_chat_relationship(uuid,uuid) from public,anon;
grant execute on function smartbridge_private.has_chat_relationship(uuid,uuid) to authenticated,service_role;
create policy "Attachment relationship boundary" on public.chat_messages as restrictive for insert to authenticated with check(not coalesce(metadata,'{}') ? 'attachment_url' or smartbridge_private.has_chat_relationship(sender_id,recipient_id));
create function smartbridge_private.protect_attachment_message() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.role(),'')='service_role' or public.is_admin(auth.uid()) or auth.uid() is null then return new;end if;
 if old.metadata ? 'attachment_url' and (new.sender_id is distinct from old.sender_id or new.recipient_id is distinct from old.recipient_id or new.metadata is distinct from old.metadata) then raise exception 'Attachment participants and references cannot change';end if;return new;
end;$$;
revoke all on function smartbridge_private.protect_attachment_message() from public,anon,authenticated;
create trigger protect_attachment_message before update on public.chat_messages for each row execute function smartbridge_private.protect_attachment_message();
create function public.create_chat_attachment(actor_id uuid,receiver_id uuid,file_ref text,file_label text) returns uuid language plpgsql security invoker set search_path='' as $$
declare sender public.users;receiver public.users;created uuid;
begin
 select * into sender from public.users where id=actor_id and is_active=true;
 select * into receiver from public.users where id=receiver_id and is_active=true;
 if sender.id is null or receiver.id is null or not smartbridge_private.has_chat_relationship(actor_id,receiver_id) or file_ref not like 'storage://chat-attachments/'||actor_id::text||'/%' or length(file_label) not between 1 and 200 then raise exception 'Attachment relationship unavailable';end if;
 if not exists(select 1 from storage.objects where bucket_id='chat-attachments' and name=substring(file_ref from length('storage://chat-attachments/')+1)) then raise exception 'Attachment upload unavailable';end if;
 insert into public.chat_messages(sender_id,sender_email,sender_name,recipient_id,recipient_email,room_id,message,message_type,metadata)
 values(actor_id,sender.email,sender.full_name,receiver_id,receiver.email,least(sender.email,receiver.email)||'__'||greatest(sender.email,receiver.email),'Attachment: '||file_label,'file',jsonb_build_object('attachment_url',file_ref,'file_name',file_label)) returning id into created;return created;
end;$$;
revoke all on function public.create_chat_attachment(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.create_chat_attachment(uuid,uuid,text,text) to service_role;

create function public.expire_paid_subscriptions() returns jsonb language plpgsql security invoker set search_path='' as $$
declare account record;deactivated integer:=0;changed integer;today date:=(now() at time zone 'Africa/Johannesburg')::date;
begin
 for account in select u.id from public.users u where exists(select 1 from public.subscriptions s where s.user_id=u.id and s.status='active' and s.end_date<today) for update loop
  update public.subscriptions set status='inactive',updated_at=now() where user_id=account.id and status='active' and end_date<today;
  get diagnostics changed=row_count;deactivated:=deactivated+changed;
  update public.users set is_premium=exists(select 1 from public.subscriptions s where s.user_id=account.id and s.status='active' and s.plan='premium' and s.start_date<=today and s.end_date>=today),updated_at=now() where id=account.id;
 end loop;
 return jsonb_build_object('expired',deactivated,'deactivated',deactivated);
end;$$;
revoke all on function public.expire_paid_subscriptions() from public,anon,authenticated;
grant execute on function public.expire_paid_subscriptions() to service_role;
-- RLS expressions initialize helper permissions even for an anonymous false branch.
-- This helper returns false without auth.uid(); private schema/data access remains revoked.
grant execute on function smartbridge_private.can_read_file(text,text) to anon;
create function public.pending_weekly_report_links(chosen_week date,batch_size integer default 50) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(link),'[]'::jsonb) from (select l.parent_id,l.student_id from public.parent_student_links l join public.users p on p.id=l.parent_id join public.users s on s.id=l.student_id where l.status='approved' and p.is_active=true and p.role='parent' and s.is_active=true and s.role='student' and not exists(select 1 from smartbridge_private.weekly_report_receipts r where r.parent_id=l.parent_id and r.student_id=l.student_id and r.week_start=chosen_week) order by l.parent_id,l.student_id limit greatest(1,least(batch_size,50)))link;
$$;
revoke all on function public.pending_weekly_report_links(date,integer) from public,anon,authenticated;
grant execute on function public.pending_weekly_report_links(date,integer) to service_role;
update smartbridge_private.scheduled_jobs set cron_expression='*/15 5-21 * * 1-5' where key='weekly-parents';
