-- Durable transactional notifications. Browser roles cannot author recipients or mail bodies.
create table public.action_notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.users(id) on delete cascade,
 actor_id uuid references public.users(id) on delete set null, kind text not null, subject text not null, message text not null,
 booking_id uuid references public.tutor_bookings(id) on delete cascade, email_status text not null default 'pending',
 read_at timestamptz, created_at timestamptz not null default now()
);
alter table public.action_notifications enable row level security;
revoke all on public.action_notifications from public,anon,authenticated;
grant select on public.action_notifications to authenticated;
grant all on public.action_notifications to service_role;
create policy "Read own action notifications" on public.action_notifications for select to authenticated
using(recipient_id=(select auth.uid()) and smartbridge_private.active_account());
create table smartbridge_private.notification_outbox (
 id uuid primary key references public.action_notifications(id) on delete cascade, event_key text not null unique,
 recipient_email text not null, state text not null default 'pending' check(state in ('pending','sending','accepted','failed','review')),
 attempts integer not null default 0, lease_until timestamptz, next_attempt_at timestamptz not null default now(),
 provider_id text, error_code text, created_at timestamptz not null default now()
);
alter table smartbridge_private.notification_outbox enable row level security;
revoke all on smartbridge_private.notification_outbox from public,anon,authenticated;
grant all on smartbridge_private.notification_outbox to service_role;
create function smartbridge_private.queue_notification(event_key text,recipient uuid,actor uuid,kind text,subject text,message text,booking uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing uuid; email text; created uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(event_key,0));
 select o.id into existing from smartbridge_private.notification_outbox o where o.event_key=queue_notification.event_key;
 if existing is not null then return existing; end if;
 select u.email into email from public.users u where u.id=recipient;
 if email is null then return null;end if;
 insert into public.action_notifications(recipient_id,actor_id,kind,subject,message,booking_id)
 values(recipient,actor,kind,subject,message,booking) returning id into created;
 insert into smartbridge_private.notification_outbox(id,event_key,recipient_email) values(created,event_key,email);
 return created;
end;$$;
revoke all on function smartbridge_private.queue_notification(text,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;

-- One administrator transaction creates the missing profile and synchronizes approval flags.
create function smartbridge_private.approve_account(target_id uuid,approved_role text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare account public.users; event uuid;
begin
 if not smartbridge_private.is_admin(auth.uid()) then raise exception 'Active administrator required';end if;
 if approved_role not in ('student','parent','tutor_pending','student_tutor','sace_tutor') then raise exception 'Invalid approval role';end if;
 select * into account from public.users where id=target_id and is_active=true for update;
 if not found then raise exception 'Account unavailable';end if;
 if approved_role in ('student_tutor','sace_tutor','tutor_pending') then
  if approved_role='sace_tutor' and coalesce(account.sace_number,'')='' then raise exception 'SACE credentials required';end if;
  if not exists(select 1 from public.tutor_profiles t where t.user_id=target_id) then
   insert into public.tutor_profiles(user_id,user_email,full_name,subjects,grades,hourly_rate,is_verified,is_active)
   values(account.id,account.email,coalesce(account.full_name,account.email),array[]::text[],array[]::text[],0,approved_role<>'tutor_pending',true);
  else
   update public.tutor_profiles set is_verified=approved_role<>'tutor_pending',is_active=true,updated_at=now() where user_id=target_id;
  end if;
 end if;
 update public.users set role=approved_role,is_verified=approved_role in ('student_tutor','sace_tutor'),onboarding_complete=true,updated_at=now() where id=target_id;
 event:=smartbridge_private.queue_notification('approval:'||target_id||':'||approved_role,target_id,auth.uid(),'account-approved',
 'Your SmartBridge FET account has been approved','Your account is approved as '||replace(approved_role,'_',' ')||'. Sign in to use your dashboard.');
 return jsonb_build_object('id',target_id,'role',approved_role,'notification_id',event);
end;$$;
create function public.approve_account(target_id uuid,approved_role text) returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.approve_account($1,$2)$$;
revoke all on function public.approve_account(uuid,text),smartbridge_private.approve_account(uuid,text) from public,anon;
grant execute on function public.approve_account(uuid,text),smartbridge_private.approve_account(uuid,text) to authenticated;

create function smartbridge_private.action_notification_ids(action_booking uuid default null) returns uuid[] language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(n.id),'{}'::uuid[]) from public.action_notifications n where auth.uid() is not null and smartbridge_private.active_account() and (n.recipient_id=auth.uid() or n.actor_id=auth.uid()) and (action_booking is null or n.booking_id=action_booking) and n.email_status in ('pending','failed');
$$;
create function public.action_notification_ids(action_booking uuid default null) returns uuid[] language sql security invoker set search_path='' as $$select smartbridge_private.action_notification_ids($1)$$;
revoke all on function public.action_notification_ids(uuid),smartbridge_private.action_notification_ids(uuid) from public,anon;
grant execute on function public.action_notification_ids(uuid),smartbridge_private.action_notification_ids(uuid) to authenticated;
create function public.claim_action_notification(event_id uuid,caller_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare event public.action_notifications; item smartbridge_private.notification_outbox;
begin
 select * into event from public.action_notifications n where n.id=event_id;
 if event.id is null or (caller_id is not null and not exists(select 1 from public.users u where u.id=caller_id and u.is_active=true and (u.id=event.actor_id or u.id=event.recipient_id or u.role='admin' or u.is_super_admin))) then raise exception 'Notification access denied';end if;
 select * into item from smartbridge_private.notification_outbox o where o.id=event_id for update skip locked;
 if item.id is null or item.state in ('accepted','review') or item.next_attempt_at>now() or (item.state='sending' and item.lease_until>now()) then return null;end if;
 if item.attempts>=5 or (item.attempts>0 and item.created_at<now()-interval '23 hours') then
  update smartbridge_private.notification_outbox set state='review',error_code='retry_window_expired' where id=event_id;return null;
 end if;
 update smartbridge_private.notification_outbox set state='sending',attempts=attempts+1,lease_until=now()+interval '90 seconds' where id=event_id;
 return jsonb_build_object('id',event.id,'to',item.recipient_email,'subject',event.subject,'message',event.message);
end;$$;
create function public.finish_action_notification(event_id uuid,message_id text,error_code text default null) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update smartbridge_private.notification_outbox set state=case when message_id is not null then 'accepted' else 'failed' end,
 provider_id=message_id,error_code=finish_action_notification.error_code,lease_until=null,next_attempt_at=now()+interval '1 minute' where id=event_id and state='sending';
 if not found then raise exception 'Notification lease unavailable';end if;
 update public.action_notifications set email_status=case when message_id is not null then 'accepted' else 'failed' end where id=event_id;
 return true;
end;$$;
revoke all on function public.claim_action_notification(uuid,uuid),public.finish_action_notification(uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_action_notification(uuid,uuid),public.finish_action_notification(uuid,text,text) to service_role;

-- Refund eligibility is a server decision, separate from actual provider settlement.
alter table public.tutor_bookings add column refund_eligibility text,add column refundable_amount numeric not null default 0;
create function smartbridge_private.cancel_booking(booking_id uuid,cancellation_message text) returns jsonb language plpgsql security definer set search_path='' as $$
declare booking public.tutor_bookings; eligible text; refundable numeric:=0; tutor_event uuid; student_event uuid; starts timestamptz;
begin
 if not smartbridge_private.active_account() then raise exception 'Active account required';end if;
 if length(trim(coalesce(cancellation_message,''))) not between 10 and 2000 then raise exception 'Write a cancellation message of 10 to 2000 characters';end if;
 select * into booking from public.tutor_bookings b where b.id=booking_id for update;
 if booking.id is null or not (auth.uid() in (booking.student_id,booking.tutor_id) or smartbridge_private.is_admin(auth.uid())) then raise exception 'Booking access denied';end if;
 if booking.status='cancelled' then return to_jsonb(booking);end if;
 if booking.status not in ('pending','confirmed') then raise exception 'This booking cannot be cancelled';end if;
 starts:=(booking.date::text||' '||booking.time)::timestamp at time zone 'Africa/Johannesburg';
 eligible:=case when booking.payment_status<>'paid' then 'no_payment'
  when auth.uid()=booking.tutor_id or smartbridge_private.is_admin(auth.uid()) or starts>=now()+interval '24 hours' then 'full_booking_refund'
  else 'manual_statutory_review' end;
 if eligible='full_booking_refund' then refundable:=coalesce(booking.amount_paid,0);end if;
 -- Existing update protection is enforced for direct clients; this trusted operation has checked actor/row.
 perform set_config('smartbridge.cancel_booking','true',true);
 update public.tutor_bookings set status='cancelled',cancellation_reason=trim(cancellation_message),cancelled_at=now(),cancelled_by=auth.uid(),
 refund_eligibility=eligible,refundable_amount=refundable,updated_at=now() where id=booking_id returning * into booking;
 perform set_config('smartbridge.cancel_booking','false',true);
 tutor_event:=smartbridge_private.queue_notification('cancel:tutor:'||booking_id,booking.tutor_id,auth.uid(),'booking-cancelled','Tutoring booking cancelled',trim(cancellation_message),booking_id);
 student_event:=smartbridge_private.queue_notification('cancel:student:'||booking_id,booking.student_id,auth.uid(),'booking-cancelled','Tutoring booking cancelled',trim(cancellation_message),booking_id);
 return to_jsonb(booking)||jsonb_build_object('notification_ids',jsonb_build_array(tutor_event,student_event));
end;$$;
create function public.cancel_booking(booking_id uuid,cancellation_message text) returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.cancel_booking($1,$2)$$;
revoke all on function public.cancel_booking(uuid,text),smartbridge_private.cancel_booking(uuid,text) from public,anon;
grant execute on function public.cancel_booking(uuid,text),smartbridge_private.cancel_booking(uuid,text) to authenticated;
-- Wrap the existing protected transition function with an additional cancellation/finance boundary.
alter function smartbridge_private.protect_booking_update() rename to protect_booking_update_legacy;
create function smartbridge_private.protect_booking_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user='postgres' and current_setting('smartbridge.cancel_booking',true)='true' then return new;end if;
 if new.status='cancelled' and old.status<>'cancelled' then raise exception 'Use cancel_booking with a message';end if;
 if new.refund_eligibility is distinct from old.refund_eligibility or new.refundable_amount is distinct from old.refundable_amount then raise exception 'Refund eligibility is server managed';end if;
 return new;
end;$$;
revoke all on function smartbridge_private.protect_booking_update() from public,anon,authenticated;
create trigger cancellation_and_refund_boundary before update on public.tutor_bookings for each row execute function smartbridge_private.protect_booking_update();
-- The legacy trigger still enforces its original row/schedule/price boundary outside the trusted RPC.

-- Profile media is intentionally visible for tutor discovery; only its UUID owner can upload.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('tutor-profile-media','tutor-profile-media',true,20971520,array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict(id) do nothing;
create function smartbridge_private.can_manage_tutor_media(bucket text,path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and bucket='tutor-profile-media' and split_part(path,'/',1)=auth.uid()::text and path !~ '(^|/)\.\.(/|$)'
 and exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true and u.role in ('tutor','student_tutor','sace_tutor','tutor_pending'));
$$;
revoke all on function smartbridge_private.can_manage_tutor_media(text,text) from public,anon;
grant execute on function smartbridge_private.can_manage_tutor_media(text,text) to authenticated;
create policy "Tutor profile media upload" on storage.objects for insert to authenticated with check(smartbridge_private.can_manage_tutor_media(bucket_id,name));
create policy "Tutor profile media read" on storage.objects for select to authenticated using(smartbridge_private.can_manage_tutor_media(bucket_id,name));
create policy "Tutor profile media delete" on storage.objects for delete to authenticated using(smartbridge_private.can_manage_tutor_media(bucket_id,name));
-- Restrictive boundary prevents permissive legacy policies from broadening the new bucket.
create policy "Tutor media ownership boundary insert" on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'tutor-profile-media' or smartbridge_private.can_manage_tutor_media(bucket_id,name));
create policy "Tutor media ownership boundary update" on storage.objects as restrictive for update to authenticated using(bucket_id<>'tutor-profile-media' or smartbridge_private.can_manage_tutor_media(bucket_id,name)) with check(bucket_id<>'tutor-profile-media' or smartbridge_private.can_manage_tutor_media(bucket_id,name));
create policy "Tutor media ownership boundary delete" on storage.objects as restrictive for delete to authenticated using(bucket_id<>'tutor-profile-media' or smartbridge_private.can_manage_tutor_media(bucket_id,name));

-- Signed-in sessions receive their protected database role/profile changes without refresh.
do $$declare relation text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach relation in array array['study_progress','quiz_results','users','tutor_profiles','tutor_bookings','parent_student_links','study_sessions','student_progress','syllabus_progress','nbt_planner_progress','action_notifications','study_room_memberships','study_room_replies'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=relation) then
    execute format('alter publication supabase_realtime add table public.%I',relation);
   end if;
  end loop;
 end if;
end;$$;

create or replace function smartbridge_private.protect_booking_update_legacy() returns trigger
language plpgsql security invoker set search_path='' as $$
declare permitted text[];
begin
  if current_user='postgres' and current_setting('smartbridge.cancel_booking',true)='true' then return new;end if;
  if public.is_admin(auth.uid()) or current_setting('role',true)='service_role'
    or (auth.uid() is null and session_user='postgres' and current_setting('role',true) in ('none','postgres')) then return new; end if;
  if auth.uid()=old.student_id then
    permitted:=array['status','cancellation_reason','cancelled_at','cancelled_by','student_rating','student_feedback','updated_at','updated_by'];
    if new.status is distinct from old.status and not (new.status='cancelled' and old.status in ('pending','confirmed')) then raise exception 'Students may only cancel an upcoming booking'; end if;
    if (new.student_rating is distinct from old.student_rating or new.student_feedback is distinct from old.student_feedback) and old.status<>'completed' then raise exception 'Review a completed session'; end if;
  elsif auth.uid()=old.tutor_id then
    permitted:=array['status','session_link','meeting_link','meeting_platform','cancellation_reason','cancelled_at','cancelled_by','completed_at','updated_at','updated_by'];
    if new.status is distinct from old.status and not ((old.status='pending' and new.status in ('confirmed','cancelled')) or (old.status='confirmed' and new.status in ('completed','cancelled'))) then raise exception 'Invalid booking transition'; end if;
    if new.status='completed' and old.end_time>now() then raise exception 'Session has not finished'; end if;
  else raise exception 'Booking access denied'; end if;
  if (to_jsonb(new)-permitted) is distinct from (to_jsonb(old)-permitted) then raise exception 'Booking ownership, schedule and payment details cannot be edited'; end if;
  if new.status='cancelled' and new.status is distinct from old.status then new.cancelled_by:=auth.uid(); new.cancelled_at:=now(); end if;
  if new.status='completed' and new.status is distinct from old.status then new.completed_at:=now(); end if;
  new.updated_by:=auth.uid();
  return new;
end $$;

create policy "Tutor profile media replace" on storage.objects for update to authenticated using(smartbridge_private.can_manage_tutor_media(bucket_id,name)) with check(smartbridge_private.can_manage_tutor_media(bucket_id,name));

create function smartbridge_private.booking_notifications() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or (new.status is distinct from old.status and new.status in ('confirmed','completed')) then
  perform smartbridge_private.queue_notification('booking:'||new.id||':'||new.status||':'||new.student_id,new.student_id,auth.uid(),'booking-'||new.status,
   'Tutoring booking '||new.status,'Your '||new.subject||' session is '||new.status||' for '||new.date||' at '||new.time||' (South Africa time).',new.id);
  perform smartbridge_private.queue_notification('booking:'||new.id||':'||new.status||':'||new.tutor_id,new.tutor_id,auth.uid(),'booking-'||new.status,
   'Tutoring booking '||new.status,'A '||new.subject||' session is '||new.status||' for '||new.date||' at '||new.time||' (South Africa time).',new.id);
 end if; return new;
end;$$;
revoke all on function smartbridge_private.booking_notifications() from public,anon,authenticated;
create trigger booking_notification_events after insert or update of status on public.tutor_bookings for each row execute function smartbridge_private.booking_notifications();

-- Keep existing public privacy notices visible; new contractual documents require explicit publication.
alter table public.legal_documents add column is_published boolean not null default false,add column document_sha256 text;
create function smartbridge_private.hash_legal_document() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and old.is_published and new.content is distinct from old.content and new.version=old.version then raise exception 'Changed published text requires a new version';end if;
 new.document_sha256:=encode(sha256(convert_to(new.content,'UTF8')),'hex');return new;
end;$$;
revoke all on function smartbridge_private.hash_legal_document() from public,anon,authenticated;
create trigger legal_document_hash before insert or update on public.legal_documents for each row execute function smartbridge_private.hash_legal_document();
update public.legal_documents set is_published=true where doc_key like 'privacy_%';
create table public.legal_acceptances (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.users(id) on delete cascade,
 doc_key text not null,version text not null,document_sha256 text not null,accepted_at timestamptz not null default now(),
 unique(user_id,doc_key,version,document_sha256)
);
alter table public.legal_acceptances enable row level security;
revoke all on public.legal_acceptances from public,anon,authenticated;
grant select on public.legal_acceptances to authenticated;grant all on public.legal_acceptances to service_role;
create policy "Read own legal acceptances" on public.legal_acceptances for select to authenticated using(user_id=(select auth.uid()));
create function smartbridge_private.accept_legal_document(document_key text,expected_version text,expected_sha256 text) returns uuid
language plpgsql security definer set search_path='' as $$
declare accepted uuid;
begin
 if not smartbridge_private.active_account() then raise exception 'Active account required';end if;
 if not exists(select 1 from public.legal_documents d where d.doc_key=document_key and d.is_published=true and d.version=expected_version and d.document_sha256=expected_sha256 and length(expected_sha256)=64) then raise exception 'Review the currently published document';end if;
 insert into public.legal_acceptances(user_id,doc_key,version,document_sha256) values(auth.uid(),document_key,expected_version,expected_sha256)
 on conflict(user_id,doc_key,version,document_sha256) do update set user_id=excluded.user_id returning id into accepted;
 return accepted;
end;$$;
create function public.accept_legal_document(document_key text,expected_version text,expected_sha256 text) returns uuid language sql security invoker set search_path='' as $$select smartbridge_private.accept_legal_document($1,$2,$3)$$;
revoke all on function public.accept_legal_document(text,text,text),smartbridge_private.accept_legal_document(text,text,text) from public,anon;
grant execute on function public.accept_legal_document(text,text,text),smartbridge_private.accept_legal_document(text,text,text) to authenticated;
create policy "Published legal document boundary" on public.legal_documents as restrictive for select using(case when auth.uid() is null then is_published else is_published or smartbridge_private.is_admin((select auth.uid())) end);
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('terms_service','Terms of Service','# Terms of Service

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## The service
SmartBridge FET provides a learning platform, resources, progress tools and a marketplace for independently provided tutoring. Features offered are those shown as available. We do not guarantee examination results, CAPS certification, school admission, scholarships, employment or uninterrupted internet access. Tutors may not represent themselves as employees or authorised agents unless separately appointed in writing.

## Accounts and young learners
Provide accurate information, protect login details and do not share accounts. Learners under 18 require appropriate parent or guardian authorisation. A parent''s relationship and authority must be verified; a downloadable form alone does not grant access to a learner''s account. Account privileges and tutor verification are controlled by the company. We may restrict unsafe conduct, fraud, unlawful content or material breaches after fair notice where practicable. Emergency protective suspension may be immediate, with a review channel through support.

## Fees and cancellation
Subscription fees cover the selected access period and contribute to hosting, database operation, security, maintenance, support and third-party services. They are ordinarily non-refundable for change of mind after access starts, subject to mandatory consumer rights and the published refund policy. They are not a charge for indefinite retention of personal information. Cancelling renewal stops future billing according to the disclosed renewal cutoff; it does not erase data or by itself require reimbursement for an already supplied period. Do not charge or renew a plan unless price, duration, renewal terms and consent have been disclosed.

Tutoring booking fees are separate. The Subscription and Booking Cancellation Policy controls eligibility. A refund decision is distinct from actual repayment. No user should be told a refund is completed before payment settlement is confirmed. The company will not collect for unavailable or knowingly undeliverable services.

## Responsible use and content
Do not harass, impersonate, discriminate, cheat, distribute malware, publish illegal or infringing materials, expose personal contact details in public learning areas, or bypass access/payment controls. You retain rights to your original work and permit the platform only to host and display it for the agreed service. Tutors must hold permission for their teaching materials. Public tutor photos and introduction videos are intentionally viewable; do not include identity documents, learners'' images without valid consent, banking information or private contact details.

## AI and third-party services
AI is supplementary educational assistance and may be incorrect. Check important answers with an appropriate teacher or source. No automated output is a certification or professional advice. OpenAI integration requires a configured server API project; account registration alone does not activate it. Do not submit sensitive documents, children''s identifiers, health details or financial information to AI prompts. Relevant processing and retention must be disclosed in the privacy notice. Third-party outages do not remove statutory service remedies.

## Important risk and liability notice
Online tutoring requires compatible devices, connectivity, responsible behaviour and supervision appropriate to age. Limitations and indemnities apply only to the extent lawful and proportionate. Nothing excludes fraud, wilful misconduct, gross negligence, mandatory consumer remedies or other liability that cannot legally be excluded. You are responsible for your own unlawful conduct; the company is not automatically responsible for every independent tutor statement. Any claim must be assessed on its facts, with a fair dispute process. We do not promise the company will suffer no losses.

## Complaints, records and changes
Contact support with a booking/payment reference and a description. Do not send passwords or full card details. We will acknowledge complaints and communicate the review route; statutory deadlines take precedence. Preserve acceptance version and transaction records. Material changes apply prospectively after notice and any legally required consent; they do not rewrite a completed transaction. South African law applies without preventing lawful access to courts, regulators or other mandatory remedies.
','1.1-draft','7161f34e27fc9dc8a2478cad4b957f9e4ab79a76851799b684e422bcca3a677e',false) on conflict(doc_key) do nothing;
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('terms_student','Student Terms and Conditions','# Student Terms and Conditions

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## Student responsibilities
Use your own account for learning, respect classmates and tutors, and provide an accurate grade and subject selection. A parent or competent guardian must authorise a minor''s participation where required. Keep personal details out of public study posts. Obtain help if anyone asks for money outside approved payment channels, private images or unsafe contact.

## Learning and tutoring
Resources and quizzes support learning; results are not official school marks. Verify important information with your teacher. A verified tutor listing is not a guarantee of outcomes or a blanket safeguarding certification. Attend the booked session on time with suitable internet/device access. Do not record a tutor or another participant without valid permission. Arrange guardian supervision appropriate to your circumstances.

## Payments and cancellations
Read the shared subscription and booking policy before paying. Subscription charges normally pay for the access period and platform operating costs; mandatory refund rights are preserved. A paid tutoring booking cancelled at least 24 hours before the session is eligible for a full booking-fee refund. Use the in-app cancellation action and provide a written message to the tutor so they can rearrange their day. Keep the cancellation reference. Do not rely only on closing the browser or an unrelated chat message. If the app is unavailable, contact support with the booking reference and ask for recorded notice to the tutor; a technical failure must not erase your legal rights.

## Safety, privacy and complaints
Report bullying, inappropriate materials or tutor misconduct. Learner-approved parent links control routine progress sharing; guardian-authority questions receive separate review. Ask support for a secure process to submit a completed guardian/indemnity form or request access/deletion. Do not post completed forms in study rooms. The general Terms of Service, Privacy Notice and shared refund policy apply; no provision removes statutory rights.
','1.1-draft','245211af63b347963777570605d336486a8270ba6fb9e98791f0a054db3c1d12',false) on conflict(doc_key) do nothing;
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('terms_tutor','Tutor Policies, Terms and Conditions','# Tutor Policies, Terms and Conditions

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## Accurate professional profile
Provide accurate qualifications, institution/SACE details where applicable, subject competence, availability and rates. Keep your bio and introduction truthful. Only publish media you own or have permission to use. Explicitly acknowledge that profile media is public. Never upload a learner''s likeness, clearance document or confidential credential as a public introduction. Approval is subject to continuing review and is not an employment appointment or a guarantee of income.

## Sessions and safeguarding
Confirm bookings only when you can deliver. Be punctual, prepare suitable material and maintain professional boundaries, especially with minors. No sexual, discriminatory, threatening or exploitative conduct; no requests for private images or unauthorised personal information. Keep communications within the agreed platform channels. Obtain valid consent before recording, retain only necessary records, and report safeguarding concerns through appropriate channels.

## Cancellation and settlement
A student''s paid booking cancellation at least 24 hours before the scheduled session is eligible for full repayment of the booking fee. Read the written cancellation notice and acknowledge receipt where possible so you can re-plan your day. If you cancel or fail to provide the booked service, the learner must not fund a service you did not supply; a paid booking is referred for full refund. Late cancellations and exceptional circumstances require fair review, not automatic forfeiture irrespective of law. Do not pressure a learner to waive mandatory rights.

Tutor payouts are separate from subscription revenue and may only use confirmed payment records. The disclosed commission/flat-fee agreement controls permitted deductions; deductions may not be invented retrospectively. Settlement must account for completion, genuine disputes, chargebacks and refund obligations before release. Payment tools are not active merely because this document describes them. The company must approve the actual payout timetable and tax/contract arrangements before paid operation.

## Account conduct and liability
Do not redirect platform customers to evade agreed fees, misrepresent authority, misuse learner data or infringe materials. A proportionate contractual claim for losses caused by your proven breach or unlawful conduct may apply, subject to lawful process; no unlimited automatic penalty is imposed. Fraud, wilful misconduct and gross negligence cannot be shielded by an indemnity. A classification clause alone does not determine employment status in law. The general service terms, privacy notice and refund policy apply.
','1.1-draft','da2cf50096763e6e0a842356f4aa57203edf8d4d6ba2b5425c6cae16afb23df5',false) on conflict(doc_key) do nothing;
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('terms_parent','Parent and Guardian Terms of Service','# Parent and Guardian Terms of Service

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## Authority and learner access
Provide accurate contact details and confirm your authority to act for the learner. Submit evidence only through an approved secure process if requested; do not upload identity documents to public areas. A signed form does not automatically establish guardianship or grant database access. Routine report access follows the approved learner-parent link; questions involving a minor''s competent-person consent require review under applicable law.

## Supervision and payment
Help the learner use appropriate equipment, attend agreed sessions and stay safe online. Review the tutor''s profile and suitability; platform verification is not a guarantee of outcomes. Read the price, access duration, renewal terms and refund policy before purchasing. Platform subscription fees and tutor booking fees are distinct. Do not share your account or ask a learner to disclose passwords.

## Cancellation and consent
Help the learner submit a written booking cancellation to the tutor. At least 24 hours'' notice makes a paid booking eligible for a full booking-fee refund; later notice or exceptional circumstances are reviewed fairly and mandatory rights remain. Ordinary subscription change-of-mind refunds are unavailable after access begins, subject to statutory exceptions. A guardian''s permission must be informed and specific; an indemnity does not waive the company''s non-excludable duties. Ask support to change consent or seek a verified data-access/deletion process. Retain a copy of the version you accepted and any completed forms.
','1.1-draft','8220cbd7c4a71bfb700f27248e9892f8ee91b401eb0453b92c9e7fba448b5f67',false) on conflict(doc_key) do nothing;
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('refund_policy','Subscription and Booking Cancellation Policy','# Subscription and Booking Cancellation Policy

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## Subscription fees
Subscription fees pay for the selected service/access period and contribute to server hosting, database operation, security, maintenance, support and other services that keep the app working. They are ordinarily non-refundable for change of mind once the paid service has commenced. Cancellation of renewal stops future charges in line with disclosed renewal terms; it does not automatically reverse an already supplied period. These fees are not an indefinite personal-data-storage fee and do not override privacy/deletion obligations.

## Mandatory rights take precedence
This policy does not exclude applicable cooling-off, fixed-term cancellation, unfair-term, non-supply, defective-service, duplicate/unauthorised-payment or other statutory remedies. Where law requires a refund, the company will honour it. Any early-start consent must be separate, informed and recorded; a general checkbox is not assumed to remove every cooling-off right.

## Tutor booking fees: at least 24 hours'' notice
A paid booking cancelled at least 24 hours before its scheduled start is eligible for a full booking-fee refund. The server measures the exact interval using the session''s South African time; cancellation exactly 24 hours beforehand qualifies. Submit the in-app cancellation and write a message informing the tutor that you are cancelling, allowing them to rearrange their day. The message and cancellation timestamp are recorded. A queued or failed email does not invalidate an otherwise timely recorded cancellation or make the learner responsible for an email-provider failure.

## Later cancellations, tutor cancellation and non-delivery
Later cancellations and no-shows are not automatically granted a change-of-mind refund, but must be reviewed for reasonable actual loss, mitigation/rebooking and statutory exceptions. No blanket forfeiture is imposed. Death or hospitalisation affecting the booked beneficiary receives the protection required by law. Do not request detailed medical records through public messages; use a secure minimal-evidence review. A tutor/company cancellation or failure to deliver a booked service is referred for full booking-fee refund when payment was received. Unpaid bookings have no money to return.

## Processing and loss prevention
Refund eligibility is not proof of completed repayment. Refund only the amount actually collected, once, against the original payment/booking reference and normally through the original payment method where practicable. Do not refund subscription revenue as if it were a booking payment. Do not mark a booking refunded or release an associated tutor payout until settlement is verified. Keep an audit trail and reconcile chargebacks to avoid duplicate reimbursement. Do not deduct undisclosed penalties or use processing costs to defeat a mandatory full refund. Contact support with your reference; provider timelines and applicable statutory deadlines will be communicated during review.
','1.1-draft','799cd16f1aa3ff7ac61c63ad595f156c7c2a51f2bf62773ab2593134e685b956',false) on conflict(doc_key) do nothing;
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('indemnity_student','Student Participation and Limited Indemnity Form','# Student Participation and Limited Indemnity Form

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## Read before signing
This form accompanies the Student Terms, general Terms of Service and refund policy. It is not a waiver of statutory rights or a substitute for verified guardian consent. A minor''s guardian must sign where legally required; the student''s signature alone is not treated as sufficient authority.

## Acknowledgement
I understand the platform is educational support, not a promise of marks, admission or uninterrupted connectivity. I will follow safety rules, use my own account, protect personal information and promptly report misconduct. Tutoring may require age-appropriate supervision.

## Limited responsibility
To the extent lawful, I accept responsibility for losses directly caused by my own proven unlawful conduct or material breach, with causation, fair process and mitigation considered. I do not indemnify the company for its fraud, wilful misconduct, gross negligence or any duty/liability that cannot legally be excluded. No automatic unlimited liability or waiver of valid refund rights is accepted.

## Signature declaration
I have had a reasonable opportunity to read and ask questions. The version above is a draft; signing a review copy does not activate unpublished terms. Complete the fields below and retain a copy. Submit a completed form only through the company''s verified secure process, not a public study post.
','1.1-draft','41396913c149425dff20e0a251dcb1aab9089e6875941f4a92e6c9c2a5bed9e3',false) on conflict(doc_key) do nothing;
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('indemnity_tutor','Tutor Participation and Limited Indemnity Form','# Tutor Participation and Limited Indemnity Form

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## Read before signing
This form accompanies the Tutor Policies, general service terms and shared refund policy. It does not determine employment status or remove non-excludable legal rights.

## Tutor declaration
I will describe my competence accurately, protect learner data, respect professional/safeguarding boundaries, honour confirmed sessions and obtain permission for published materials/media. I will report cancellations and incidents promptly and will not demand settlement for a service I did not supply.

## Limited indemnity
Subject to law, I accept responsibility for direct losses proven to result from my own fraud, unlawful conduct, material contract breach or infringement of another person''s rights. Any claim must take account of causation, proportionate responsibility, mitigation and fair dispute resolution. This does not cover the company''s own fraud, wilful misconduct, gross negligence or non-excludable liability. No arbitrary deduction, unlimited automatic penalty or surrender of statutory rights is authorised.

## Record
I have had an opportunity to read and ask questions. This is a draft for review, not activation of unpublished terms. Complete the signature fields, retain a copy and submit only through an approved secure process.
','1.1-draft','260c10dd7de04e756e0b38dc269b649aa9a042c6d95fd9f0248eb0986fe47522',false) on conflict(doc_key) do nothing;
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('indemnity_parent','Parent/Guardian Participation and Limited Indemnity Form','# Parent/Guardian Participation and Limited Indemnity Form

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## Authority and supervision
I declare that the authority I describe below is accurate and can be verified through a secure process. I understand a completed form alone does not grant access to a learner''s account. I will arrange age-appropriate supervision and discuss safe online conduct with the learner.

## Important limitation
I acknowledge ordinary device/connectivity and independent-learning risks. I do not waive the learner''s statutory rights or indemnify the company for its own fraud, wilful misconduct, gross negligence or non-excludable duties. Responsibility for my own proven unlawful conduct or material breach is limited by law, causation and fair process. This form does not require a parent to accept unlimited liability for every action of a child.

## Consent and records
Read the general terms, Parent Terms and privacy notice. Any competent-person consent must be specific to its purpose and lawfully verified. No marketing, AI processing of sensitive information, recording or public use of a learner''s image is authorised by this general form. This draft is for review; keep a copy and use an approved secure submission route.
','1.1-draft','b2b4e6fddf43c3ffd596c1a1529f148dce012b212321a91d7e37bc227f0194f2',false) on conflict(doc_key) do nothing;
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('guardian_consent','Guardian Consent and Participation Form','# Guardian Consent and Participation Form

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## Purpose
Record the learner''s participation and the competent person''s authority where required. A staff member must verify the request before enabling any account/report access. Do not collect national identity numbers, health details or banking information on this form.

## Choices
Permission for learning-platform participation does not automatically permit public learner photographs, session recordings, direct marketing, sensitive-data AI processing or disclosure to unrelated tutors/parents. Separate, specific consent is needed where applicable. Learner-approved report links remain subject to lawful guardian-authority review.

## Declaration
I have reviewed the service and parent/student terms and understand the fee/cancellation policy. I will contact support if authority, consent or the learner''s circumstances change. I understand withdrawal or a deletion request may require identity/authority verification and lawful record-retention review. This is a draft, not activated contractual consent. Complete and retain the form; submit it securely only when the process is approved.
','1.1-draft','c7bac8d6da6e7755fff0a96a1e65a20f1eb83f71108c75f76c73908a3251e28a',false) on conflict(doc_key) do nothing;
insert into public.legal_documents(doc_key,title,content,version,document_sha256,is_published) values('privacy_service_addendum','Service, Media and AI Privacy Addendum','# Service, Media and AI Privacy Addendum

SmartBridge FET | Tech & GUARD (Pty) Ltd
Version 1.1-draft | Prepared 14 October 2026

DRAFT FOR OWNER AND SOUTH AFRICAN LEGAL REVIEW. This document is not yet an activated contract. Registered business address and company registration details must be confirmed before paid public trading. Support: aneleq@techandguard.co.za.

## Purpose and minimisation
The platform processes account, booking, progress, consent and security records to provide and protect the service. Public tutor profile media is intentionally visible and should contain only professional information the tutor is authorised to publish. Learner records and completed legal forms must not be published in study rooms or public media buckets.

## Providers and AI
Hosting, database and delivery providers process information needed for their functions. The proposed AI provider is OpenAI; the company must confirm the actual API project, processing terms, retention and safeguards before activation. Do not send children''s identifiers, guardian forms, health or financial details to AI prompts. A reduced-storage API option is not a guarantee that no provider logging occurs. Explain international processing and lawful safeguards where applicable.

## Rights and support
Use the existing Privacy Notice alongside this draft addendum. Requests for access, correction, deletion or consent changes go through a verified support process. Keep only records necessary for the service, security, lawful transaction evidence and applicable retention duties; subscription payment does not justify indefinite data retention. The operator must confirm its registered address, responsible privacy contact, security-incident process and retention schedule before publishing this addendum. No claim of certified POPIA compliance is made.
','1.1-draft','b7029f586e69a949fb14f26fd4abe747c62440bd24e278725f99dc9861411057',false) on conflict(doc_key) do nothing;

create function public.pending_action_notification_ids(batch_size integer default 10) returns uuid[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(id),'{}'::uuid[]) from (select id from smartbridge_private.notification_outbox where state in ('pending','failed') and attempts<5 and next_attempt_at<=now() and created_at>now()-interval '23 hours' order by created_at limit greatest(1,least(batch_size,10))) q;
$$;
revoke all on function public.pending_action_notification_ids(integer) from public,anon,authenticated;
grant execute on function public.pending_action_notification_ids(integer) to service_role;
alter table smartbridge_private.scheduled_jobs drop constraint scheduled_job_keys;
alter table smartbridge_private.scheduled_jobs add constraint scheduled_job_keys check(key in ('study','session-24h','session-1h','nbt','deadlines','subscriptions','weekly-parents','alerts','notifications'));
insert into smartbridge_private.scheduled_jobs(key,function_slug,body,cron_expression) values('notifications','dispatch-notifications','{"job":true}','* * * * *');

-- Only the introduction URL joins the existing deliberately restricted public-professional fields.
drop view public.tutor_directory;
drop function smartbridge_private.verified_tutor_directory();
create function smartbridge_private.verified_tutor_directory()
returns table(id uuid,user_id uuid,user_email text,full_name text,bio text,avatar_url text,subjects text[],grades text[],hourly_rate numeric,rating numeric,total_reviews integer,is_verified boolean,video_url text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true) then raise exception 'Active account required';end if;
 return query select t.id,t.user_id,t.user_email,t.full_name,t.bio,t.avatar_url,t.subjects,t.grades,t.hourly_rate,t.rating,t.total_reviews,t.is_verified,nullif(t.metadata->>'video_url','')
 from public.tutor_profiles t join public.users u on u.id=t.user_id where t.is_verified and coalesce(t.is_active,true) and u.is_active;
end;$$;
revoke all on function smartbridge_private.verified_tutor_directory() from public,anon;
grant execute on function smartbridge_private.verified_tutor_directory() to authenticated;
create view public.tutor_directory with (security_invoker=true) as select * from smartbridge_private.verified_tutor_directory();
revoke all on public.tutor_directory from public,anon;
grant select on public.tutor_directory to authenticated;
