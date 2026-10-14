-- Administrator-controlled documents; confidential records never use public storage.
alter table public.legal_documents
 add column category text not null default 'policy' check(category in ('agreements','compliance','terms','policy')),
 add column audience text not null default 'public' check(audience in ('public','tutor','parent','student','owner','admin')),
 add column owner_user_id uuid references public.users(id),
 add column contains_personal_information boolean not null default false,
 add column file_path text unique,
 add column file_sha256 text,
 add column revision bigint not null default 1,
 add constraint legal_confidential_boundary check(not contains_personal_information or audience in ('owner','admin')),
 add constraint legal_owner_required check(audience <> 'owner' or owner_user_id is not null),
 add constraint legal_file_digest check((file_path is null and file_sha256 is null) or (file_path is not null and file_sha256 ~ '^[a-f0-9]{64}$'));
update public.legal_documents set category=case when doc_key like 'terms_%' then 'terms' when doc_key like 'indemnity_%' or doc_key='guardian_consent' then 'agreements' else 'policy' end,
 audience=case when doc_key in ('terms_tutor','indemnity_tutor') then 'tutor' when doc_key in ('terms_parent','indemnity_parent','guardian_consent') then 'parent' when doc_key='indemnity_student' then 'student' else 'public' end;

alter table public.legal_documents alter column audience set default 'admin';

create function smartbridge_private.legal_document_visible(published boolean, audience text, owner_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select case when smartbridge_private.is_admin(auth.uid()) and smartbridge_private.active_account() then true
 when not published then false when audience='public' then true
 when not smartbridge_private.active_account() then false
 when audience='owner' then owner_user_id=auth.uid()
 else exists(select 1 from public.users u where u.id=auth.uid() and u.is_active and (u.role=audience or (audience='tutor' and u.role in ('student_tutor','professional_tutor')))) end;
$$;
revoke all on function smartbridge_private.legal_document_visible(boolean,text,uuid) from public;
grant execute on function smartbridge_private.legal_document_visible(boolean,text,uuid) to anon,authenticated,service_role;
-- Replace all legacy policies on this table so role-wide permissions cannot leak rows.
do $$ declare p record; begin
 for p in select policyname from pg_policies where schemaname='public' and tablename='legal_documents' loop
 execute format('drop policy %I on public.legal_documents',p.policyname);end loop;
end $$;
alter table public.legal_documents enable row level security;
revoke all on public.legal_documents from anon,authenticated;
grant select on public.legal_documents to anon,authenticated;
grant insert,update,delete on public.legal_documents to authenticated;
create policy legal_read on public.legal_documents for select to anon,authenticated
 using(smartbridge_private.legal_document_visible(is_published,audience,owner_user_id));
create policy legal_admin_insert on public.legal_documents for insert to authenticated
 with check(smartbridge_private.legal_document_visible(false,'admin',null));
create policy legal_admin_update on public.legal_documents for update to authenticated
 using(smartbridge_private.legal_document_visible(false,'admin',null))
 with check(smartbridge_private.legal_document_visible(false,'admin',null));
create policy legal_admin_delete on public.legal_documents for delete to authenticated
 using(smartbridge_private.legal_document_visible(false,'admin',null));

create or replace function smartbridge_private.hash_legal_document() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.doc_key<>old.doc_key then raise exception 'Document key cannot change';end if;
  if (new.content is distinct from old.content or new.file_sha256 is distinct from old.file_sha256) and new.version=old.version then raise exception 'Changed document requires a new version';end if;
  new.revision:=old.revision+1;
 else new.revision:=1;end if;
 new.updated_at:=now();new.updated_by:=auth.uid();
 new.document_sha256:=encode(sha256(convert_to(new.content||coalesce(new.file_sha256,''),'UTF8')),'hex');
 return new;
end;$$;

create table smartbridge_private.legal_document_audit(
 id bigint generated always as identity primary key,document_id uuid not null,actor_id uuid,
 action text not null,revision bigint,version text,audience text,changed_at timestamptz not null default now()
);
alter table smartbridge_private.legal_document_audit enable row level security;
revoke all on smartbridge_private.legal_document_audit from public,anon,authenticated;
create function smartbridge_private.audit_legal_document() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into smartbridge_private.legal_document_audit(document_id,actor_id,action,revision,version,audience)
 values(case when tg_op='DELETE' then old.id else new.id end,auth.uid(),tg_op,
 case when tg_op='DELETE' then old.revision else new.revision end,
 case when tg_op='DELETE' then old.version else new.version end,
 case when tg_op='DELETE' then old.audience else new.audience end);
 return null;
end;$$;
revoke all on function smartbridge_private.audit_legal_document() from public,anon,authenticated;
create trigger legal_document_audit after insert or update or delete on public.legal_documents for each row execute function smartbridge_private.audit_legal_document();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('legal-documents','legal-documents',false,10485760,array['application/pdf'])
 on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];
create policy legal_files_read on storage.objects for select to anon,authenticated
 using(bucket_id='legal-documents' and exists(select 1 from public.legal_documents d where d.file_path=name));
create policy legal_files_admin_write on storage.objects for all to authenticated
 using(bucket_id='legal-documents' and smartbridge_private.legal_document_visible(false,'admin',null))
 with check(bucket_id='legal-documents' and smartbridge_private.legal_document_visible(false,'admin',null));
-- Restrictive guard neutralises any older permissive storage policy for this bucket.
create policy legal_files_boundary on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'legal-documents' or (smartbridge_private.legal_document_visible(false,'admin',null)) or
 (storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info']) and exists(select 1 from public.legal_documents d where d.file_path=name)))
 with check(bucket_id<>'legal-documents' or (smartbridge_private.legal_document_visible(false,'admin',null)));

create or replace function smartbridge_private.accept_legal_document(document_key text,expected_version text,expected_sha256 text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare accepted uuid;
begin
 if not smartbridge_private.active_account() then raise exception 'Active account required';end if;
 if not exists(select 1 from public.legal_documents d where d.doc_key=document_key and d.is_published
 and smartbridge_private.legal_document_visible(d.is_published,d.audience,d.owner_user_id)
 and not d.contains_personal_information and d.version=expected_version and d.document_sha256=expected_sha256 and length(expected_sha256)=64)
 then raise exception 'Review the currently published document';end if;
 insert into public.legal_acceptances(user_id,doc_key,version,document_sha256) values(auth.uid(),document_key,expected_version,expected_sha256)
 on conflict(user_id,doc_key,version,document_sha256) do update set user_id=excluded.user_id returning id into accepted;
 return accepted;
end;$$;
