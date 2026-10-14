alter table public.users drop constraint users_role_check;
alter table public.users add constraint users_role_check check(role in ('admin','user','student','parent','sace_tutor','student_tutor','tutor_pending','tutor','school_counselor'));
-- Staff assignments do not confer access until the learner approves sharing.
create table public.counselor_student_links (
 id uuid primary key default gen_random_uuid(), counselor_id uuid not null references public.users(id) on delete cascade,
 student_id uuid not null references public.users(id) on delete cascade, school_name text not null check(length(trim(school_name)) between 2 and 200),
 status text not null default 'pending' check(status in ('pending','approved','revoked')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(counselor_id,student_id),check(counselor_id<>student_id)
);
create index counselor_links_student_status on public.counselor_student_links(student_id,status);
create table public.counselor_dashboard_signals(counselor_id uuid primary key references public.users(id) on delete cascade,revision bigint not null default 0,updated_at timestamptz not null default now());
alter table public.counselor_student_links enable row level security;
alter table public.counselor_dashboard_signals enable row level security;
revoke all on public.counselor_student_links,public.counselor_dashboard_signals from anon,authenticated;
grant select on public.counselor_student_links,public.counselor_dashboard_signals to authenticated;
grant all on public.counselor_student_links,public.counselor_dashboard_signals to service_role;
create policy "Counselor link participants" on public.counselor_student_links for select to authenticated using(smartbridge_private.active_account() and (auth.uid() in (student_id,counselor_id) or smartbridge_private.is_admin(auth.uid())));
create policy "Own dashboard signals" on public.counselor_dashboard_signals for select to authenticated using(smartbridge_private.active_account() and counselor_id=auth.uid());
create function smartbridge_private.assign_counselor(counselor_email text,learner_email text,school_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.users;s public.users;link uuid;
begin
 if not smartbridge_private.active_account() or not smartbridge_private.is_admin(auth.uid()) then raise exception 'Administrator required';end if;
 if length(trim(school_name)) not between 2 and 200 then raise exception 'School name required';end if;
 select * into c from public.users u where lower(u.email)=lower(trim(counselor_email)) and u.is_active;
 select * into s from public.users u where lower(u.email)=lower(trim(learner_email)) and u.role='student' and u.is_active;
 if c.id is null or s.id is null or c.id=s.id or c.role not in ('user','student','school_counselor') then raise exception 'Choose an eligible registered staff account and a separate active learner';end if;
 update public.users set role='school_counselor',onboarding_complete=true where id=c.id;
 insert into public.counselor_student_links(counselor_id,student_id,school_name) values(c.id,s.id,trim(school_name))
 on conflict(counselor_id,student_id) do update set status=case when counselor_student_links.school_name is distinct from excluded.school_name then 'pending' else counselor_student_links.status end,school_name=excluded.school_name,updated_at=now() returning id into link;
 insert into public.counselor_dashboard_signals(counselor_id) values(c.id) on conflict do nothing;
 return link;
end;$$;
create function public.assign_counselor(counselor_email text,learner_email text,school_name text) returns uuid language sql security invoker set search_path='' as $$select smartbridge_private.assign_counselor($1,$2,$3)$$;
create function smartbridge_private.get_counselor_sharing_requests() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.active_account() then raise exception 'Active learner account required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'school_name',l.school_name,'status',l.status,'counselor_name',u.full_name,'counselor_email',u.email)),'[]') from public.counselor_student_links l join public.users u on u.id=l.counselor_id where l.student_id=auth.uid() and u.is_active and u.role='school_counselor');
end;$$;
create function public.get_counselor_sharing_requests() returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.get_counselor_sharing_requests()$$;
revoke all on function smartbridge_private.get_counselor_sharing_requests(),public.get_counselor_sharing_requests() from public,anon;
grant execute on function smartbridge_private.get_counselor_sharing_requests(),public.get_counselor_sharing_requests() to authenticated;
create function smartbridge_private.respond_counselor_link(link_id uuid,decision text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not smartbridge_private.active_account() or decision not in ('approved','revoked') then raise exception 'Valid sharing decision required';end if;
 update public.counselor_student_links set status=decision,updated_at=now() where id=link_id and student_id=auth.uid();
 if not found then raise exception 'Sharing request unavailable';end if;return true;
end;$$;
create function public.respond_counselor_link(link_id uuid,decision text) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.respond_counselor_link($1,$2)$$;
create function smartbridge_private.get_counselor_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare staff public.users; roster jsonb; apps jsonb; docs jsonb;
begin
 select * into staff from public.users where id=auth.uid() and is_active;
 if staff.id is null or not (staff.role='school_counselor' or smartbridge_private.is_admin(staff.id)) then raise exception 'Counsellor access required';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'full_name',u.full_name) order by u.full_name),'[]') into roster from public.users u where u.is_active and u.role='student' and
 (smartbridge_private.is_admin(staff.id) or exists(select 1 from public.counselor_student_links l where l.counselor_id=staff.id and l.student_id=u.id and l.status='approved'));
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'student_id',a.student_id,'student_email',a.student_email,'university_name',a.university_name,'course',a.course,'stage',a.stage,'deadline',a.deadline)),'[]') into apps from public.university_applications a where exists(select 1 from jsonb_array_elements(roster) u where (u->>'id')::uuid=a.student_id and u->>'email'=a.student_email);
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'student_email',d.student_email,'application_id',d.application_id,'doc_type',d.doc_type,'status',d.status)),'[]') into docs from public.application_documents d where exists(select 1 from jsonb_array_elements(apps) a where a->>'id'=d.application_id::text and a->>'student_id'=d.student_id::text and a->>'student_email'=d.student_email);
 return jsonb_build_object('students',roster,'applications',apps,'documents',docs);
end;$$;
create function public.get_counselor_dashboard() returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.get_counselor_dashboard()$$;
create function smartbridge_private.queue_counselor_reminder(learner_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not smartbridge_private.active_account() then raise exception 'Active staff account required';end if;
 if not (smartbridge_private.is_admin(auth.uid()) or (exists(select 1 from public.users where id=auth.uid() and role='school_counselor') and exists(select 1 from public.counselor_student_links where counselor_id=auth.uid() and student_id=learner_id and status='approved'))) then raise exception 'Approved learner access required';end if;
 if not exists(select 1 from public.users where id=learner_id and role='student' and is_active) then raise exception 'Learner unavailable';end if;
 return smartbridge_private.queue_notification('counselor-reminder:'||auth.uid()||':'||learner_id||':'||((now() at time zone 'Africa/Johannesburg')::date),learner_id,auth.uid(),'counselor-reminder','Application checklist reminder','Your school counsellor asks you to review your saved university applications, deadlines and document checklist. Sign in to review the current information. No application is submitted automatically.');
end;$$;
create function public.queue_counselor_reminder(learner_id uuid) returns uuid language sql security invoker set search_path='' as $$select smartbridge_private.queue_counselor_reminder($1)$$;
create function smartbridge_private.signal_counselor_dashboard() returns trigger language plpgsql security definer set search_path='' as $$
declare ids uuid[]; v jsonb;
begin
 if tg_table_name='counselor_student_links' then
  v:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;ids:=array[(v->>'counselor_id')::uuid];
 else
  select array_agg(distinct l.counselor_id) into ids from public.counselor_student_links l where l.status='approved' and
  (l.student_id=(to_jsonb(new)->>'student_id')::uuid or l.student_id=(to_jsonb(old)->>'student_id')::uuid);
 end if;
 insert into public.counselor_dashboard_signals(counselor_id,revision) select distinct id,1 from unnest(ids) id where exists(select 1 from public.users u where u.id=id)
 on conflict(counselor_id) do update set revision=public.counselor_dashboard_signals.revision+1,updated_at=now();
 return null;
end;$$;
create trigger counselor_links_signal after insert or update or delete on public.counselor_student_links for each row execute function smartbridge_private.signal_counselor_dashboard();
create trigger counselor_applications_signal after insert or update or delete on public.university_applications for each row execute function smartbridge_private.signal_counselor_dashboard();
create trigger counselor_documents_signal after insert or update or delete on public.application_documents for each row execute function smartbridge_private.signal_counselor_dashboard();
revoke all on function smartbridge_private.signal_counselor_dashboard() from public,anon,authenticated;
revoke all on function smartbridge_private.assign_counselor(text,text,text),public.assign_counselor(text,text,text),smartbridge_private.respond_counselor_link(uuid,text),public.respond_counselor_link(uuid,text),smartbridge_private.get_counselor_dashboard(),public.get_counselor_dashboard(),smartbridge_private.queue_counselor_reminder(uuid),public.queue_counselor_reminder(uuid) from public,anon;
grant execute on function smartbridge_private.assign_counselor(text,text,text),public.assign_counselor(text,text,text),smartbridge_private.respond_counselor_link(uuid,text),public.respond_counselor_link(uuid,text),smartbridge_private.get_counselor_dashboard(),public.get_counselor_dashboard(),smartbridge_private.queue_counselor_reminder(uuid),public.queue_counselor_reminder(uuid) to authenticated;
-- Fresh local databases may not have the hosted default publication yet.
do $$declare relation text;begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime;end if;
 foreach relation in array array['quiz_results','users','tutor_profiles','tutor_bookings','parent_student_links','study_sessions','student_progress','syllabus_progress','nbt_planner_progress','action_notifications','study_room_memberships','study_room_replies','counselor_student_links','counselor_dashboard_signals'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=relation) then execute format('alter publication supabase_realtime add table public.%I',relation);end if;
 end loop;
end;$$;
