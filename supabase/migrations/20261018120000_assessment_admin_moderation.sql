-- Mandatory academic moderation before any tutor assessment is published.
alter table public.tutor_assessments
 add column moderation_status text not null default 'pending' check(moderation_status in ('pending','approved','rejected','suspended')),
 add column moderated_by uuid references public.users(id),
 add column moderated_at timestamptz,
 add column moderation_reason text not null default '' check(length(moderation_reason)<=2000);
create index tutor_assessments_moderation_queue on public.tutor_assessments(moderation_status,created_at desc);

-- Tutors can edit their assessment but cannot grant themselves moderation approval.
revoke update on public.tutor_assessments from authenticated;
grant update(title,subject,grade,kind,instructions,questions,due_at,opens_at,time_limit_minutes,max_marks,status) on public.tutor_assessments to authenticated;

create table public.tutor_assessment_moderation_log(
 id bigint generated always as identity primary key,
 assessment_id uuid not null references public.tutor_assessments(id),
 moderator_id uuid not null references public.users(id),
 decision text not null check(decision in ('approved','rejected','suspended')),
 reason text not null default '',
 created_at timestamptz not null default now()
);
alter table public.tutor_assessment_moderation_log enable row level security;
revoke all on public.tutor_assessment_moderation_log from public,anon,authenticated;

-- Enforce moderation in the database, not merely in the UI.
create or replace function public.enforce_assessment_moderation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='published' and new.moderation_status<>'approved' then
  raise exception 'Admin approval is required before publishing';
 end if;
 if tg_op='UPDATE' then
  if old.moderation_status='approved' and old.status='draft'
    and (new.title is distinct from old.title or new.subject is distinct from old.subject
    or new.grade is distinct from old.grade or new.kind is distinct from old.kind
    or new.instructions is distinct from old.instructions or new.questions is distinct from old.questions
    or new.opens_at is distinct from old.opens_at or new.due_at is distinct from old.due_at
    or new.time_limit_minutes is distinct from old.time_limit_minutes or new.max_marks is distinct from old.max_marks)
  then raise exception 'Approved assessment content is locked'; end if;
 end if;
 return new;
end $$;
revoke all on function public.enforce_assessment_moderation() from public,anon,authenticated;
create trigger enforce_assessment_moderation before insert or update on public.tutor_assessments
for each row execute function public.enforce_assessment_moderation();

-- Moderator view deliberately omits student identity, answers, grades and uploaded files.
create or replace function public.admin_assessment_review_queue()
returns table(id uuid,tutor_id uuid,title text,subject text,grade smallint,kind text,
 instructions text,questions jsonb,max_marks integer,status text,moderation_status text,
 moderation_reason text,created_at timestamptz,moderated_at timestamptz,due_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true and (u.role='admin' or u.is_super_admin=true)) then
  raise exception 'Administrator access required';
 end if;
 return query select a.id,a.tutor_id,a.title,a.subject,a.grade,a.kind,a.instructions,
 a.questions,a.max_marks,a.status,a.moderation_status,a.moderation_reason,a.created_at,a.moderated_at,a.due_at
 from public.tutor_assessments a order by
 case a.moderation_status when 'pending' then 0 when 'rejected' then 1 else 2 end,
 a.created_at desc limit 200;
end $$;

create or replace function public.admin_moderate_tutor_assessment(p_assessment uuid,p_decision text,p_reason text default '')
returns boolean language plpgsql security definer set search_path='' as $$
declare a public.tutor_assessments;
begin
 if not exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true and (u.role='admin' or u.is_super_admin=true)) then
  raise exception 'Administrator access required';
 end if;
 if p_decision not in ('approved','rejected','suspended') or length(btrim(coalesce(p_reason,'')))>2000 then
  raise exception 'Invalid moderation decision or reason';
 end if;
 if p_decision in ('rejected','suspended') and length(btrim(coalesce(p_reason,'')))<5 then
  raise exception 'A reason is required';
 end if;
 select * into a from public.tutor_assessments where id=p_assessment for update;
 if not found then raise exception 'Assessment not found'; end if;
 if p_decision in ('approved','rejected') and (a.status<>'draft' or a.moderation_status not in ('pending','rejected')) then
  raise exception 'Only pending or rejected drafts may be reviewed';
 end if;
 if p_decision='suspended' and a.moderation_status<>'approved' then
  raise exception 'Only approved assessments may be suspended';
 end if;
 update public.tutor_assessments set
  moderation_status=p_decision,
  moderation_reason=coalesce(btrim(p_reason),''),
  moderated_by=auth.uid(),moderated_at=now(),
  status=case when p_decision='suspended' then 'closed' else status end
 where id=p_assessment;
 insert into public.tutor_assessment_moderation_log(assessment_id,moderator_id,decision,reason)
 values(p_assessment,auth.uid(),p_decision,coalesce(btrim(p_reason),''));
 return true;
end $$;
create or replace function public.request_tutor_assessment_review(p_assessment uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.tutor_assessments a where a.id=p_assessment and a.tutor_id=auth.uid() and a.status='draft' and a.moderation_status='rejected') then
  raise exception 'Only your rejected draft can be resubmitted';
 end if;
 update public.tutor_assessments set moderation_status='pending',moderation_reason='',moderated_by=null,moderated_at=null where id=p_assessment;
 return true;
end $$;
revoke all on function public.admin_assessment_review_queue(),public.admin_moderate_tutor_assessment(uuid,text,text),public.request_tutor_assessment_review(uuid) from public,anon;
grant execute on function public.admin_assessment_review_queue(),public.admin_moderate_tutor_assessment(uuid,text,text),public.request_tutor_assessment_review(uuid) to authenticated;

-- Hide rejected/suspended content from learners and prevent new starts or submissions.
create or replace function public.my_tutor_assessments()
returns table(id uuid,title text,subject text,grade smallint,kind text,instructions text,opens_at timestamptz,due_at timestamptz,time_limit_minutes integer,max_marks integer,status text,questions jsonb,submission_status text,score numeric,feedback text,attachment_path text)
language sql stable security definer set search_path='' as $$
 select a.id,a.title,a.subject,a.grade,a.kind,a.instructions,a.opens_at,a.due_at,a.time_limit_minutes,a.max_marks,a.status,
 (select coalesce(jsonb_agg(q.value - 'correct_index' - 'model_answer' - 'correct'),'[]'::jsonb) from jsonb_array_elements(a.questions) q),
 s.status,s.score,case when s.status='marked' then s.feedback else '' end,
 s.attachment_path
 from public.tutor_assessments a left join public.tutor_assessment_submissions s on s.assessment_id=a.id and s.student_id=auth.uid()
 where a.student_id=auth.uid() and a.status in ('published','closed') and a.moderation_status='approved'
 and exists(select 1 from public.users u where u.id=auth.uid() and u.role='student' and u.is_active=true and u.onboarding_complete=true)
 order by a.due_at desc
$$;

create or replace function public.start_tutor_assessment(p_assessment uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.tutor_assessments; sid uuid;
begin
 select * into a from public.tutor_assessments where id=p_assessment and student_id=auth.uid() and status='published' and moderation_status='approved' and opens_at<=now() and due_at>now();
 if not found or not exists(select 1 from public.users u where u.id=auth.uid() and u.role='student' and u.is_active=true and u.onboarding_complete=true) then raise exception 'Assessment is unavailable'; end if;
 insert into public.tutor_assessment_submissions(assessment_id,student_id) values(a.id,auth.uid()) on conflict(assessment_id,student_id) do nothing;
 select id into sid from public.tutor_assessment_submissions where assessment_id=a.id and student_id=auth.uid() and status='in_progress';
 if sid is null then raise exception 'Assessment already submitted'; end if;
 return sid;
end $$;

create or replace function public.submit_tutor_assessment(p_assessment uuid,p_answers jsonb,p_attachment text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.tutor_assessments; s public.tutor_assessment_submissions; q jsonb; i integer:=0; total numeric:=0; manual boolean:=false; reply text;
begin
 select * into a from public.tutor_assessments where id=p_assessment and student_id=auth.uid() and status='published' and moderation_status='approved' for update;
 select * into s from public.tutor_assessment_submissions where assessment_id=p_assessment and student_id=auth.uid() for update;
 if a.id is null or s.id is null or s.status<>'in_progress' or now()>a.due_at or (a.time_limit_minutes is not null and now()>s.started_at+make_interval(mins=>a.time_limit_minutes)) then raise exception 'Assessment deadline passed or already submitted'; end if;
 if jsonb_typeof(p_answers)<>'object' or length(p_answers::text)>40000 then raise exception 'Invalid or oversized answers'; end if;
 if p_attachment is not null and (length(p_attachment)>300 or p_attachment not like a.id::text||'/'||auth.uid()::text||'/%' or p_attachment !~ '\.(pdf|png|jpg|jpeg)$') then raise exception 'Invalid attachment path'; end if;
 for q in select value from jsonb_array_elements(a.questions) loop
   reply:=p_answers->>i::text;
   if q->>'type'='mcq' then
     if reply is not null and reply=(q->>'correct_index') then total:=total+(q->>'marks')::integer; end if;
   else manual:=true;
   end if;
   i:=i+1;
 end loop;
 update public.tutor_assessment_submissions set answers=p_answers,attachment_path=p_attachment,submitted_at=now(),
 score=case when manual then null else total end,status=case when manual then 'submitted' else 'marked' end,
 marked_at=case when manual then null else now() end
 where id=s.id;
 return jsonb_build_object('status',case when manual then 'submitted' else 'marked' end,'score',case when manual then null else total end,'max_marks',a.max_marks);
end $$;

