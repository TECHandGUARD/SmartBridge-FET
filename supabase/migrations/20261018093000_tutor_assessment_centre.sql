-- Tutor-owned assessments, protected answer keys, and server-side grading.
-- Does not alter payments, OpenAI, or existing quiz tables.
create table if not exists public.tutor_assessments (
 id uuid primary key default gen_random_uuid(),
 tutor_id uuid not null references public.users(id),
 student_id uuid not null references public.users(id),
 title text not null check (length(btrim(title)) between 3 and 160),
 subject text not null check(length(btrim(subject)) between 2 and 100),
 grade smallint not null check(grade between 10 and 12),
 kind text not null check(kind in ('quiz','test','assignment','exam')),
 instructions text not null default '' check(length(instructions)<=5000),
 questions jsonb not null default '[]'::jsonb,
 due_at timestamptz not null,
 opens_at timestamptz not null default now(),
 time_limit_minutes integer check(time_limit_minutes between 5 and 240),
 max_marks integer not null check(max_marks between 1 and 500),
 status text not null default 'draft' check(status in ('draft','published','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(due_at>opens_at),
 check(jsonb_typeof(questions)='array' and jsonb_array_length(questions) between 1 and 50)
);
create index if not exists tutor_assessments_student on public.tutor_assessments(student_id,status,due_at);
create index if not exists tutor_assessments_tutor on public.tutor_assessments(tutor_id,created_at desc);
create table if not exists public.tutor_assessment_submissions (
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid not null references public.tutor_assessments(id) on delete cascade,
 student_id uuid not null references public.users(id),
 started_at timestamptz not null default now(),
 submitted_at timestamptz,
 answers jsonb not null default '{}'::jsonb,
 attachment_path text,
 score numeric(7,2),
 feedback text not null default '',
 marked_at timestamptz,
 status text not null default 'in_progress' check(status in ('in_progress','submitted','marked')),
 unique(assessment_id,student_id),
 check(score is null or score>=0)
);
alter table public.tutor_assessments enable row level security;
alter table public.tutor_assessment_submissions enable row level security;
revoke all on public.tutor_assessments,public.tutor_assessment_submissions from public,anon,authenticated;
grant select,insert,update,delete on public.tutor_assessments to authenticated;
grant select on public.tutor_assessment_submissions to authenticated;
create policy "Owner tutor reads assessments" on public.tutor_assessments for select to authenticated
 using(tutor_id=auth.uid() and exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true and u.role in ('tutor','sace_tutor','student_tutor','admin')));
create policy "Owner tutor creates assessments" on public.tutor_assessments for insert to authenticated
 with check(tutor_id=auth.uid() and status='draft' and exists(select 1 from public.tutor_profiles t where t.user_id=auth.uid() and t.is_verified=true and t.is_active=true)
 and exists(select 1 from public.tutor_bookings b where b.tutor_id=auth.uid() and b.student_id=tutor_assessments.student_id and b.status in ('confirmed','completed')));
create policy "Owner tutor edits assessments" on public.tutor_assessments for update to authenticated
 using(tutor_id=auth.uid() and exists(select 1 from public.tutor_profiles t where t.user_id=auth.uid() and t.is_verified=true and t.is_active=true))
 with check(tutor_id=auth.uid());
create policy "Owner tutor deletes drafts" on public.tutor_assessments for delete to authenticated
 using(tutor_id=auth.uid() and status='draft');
create policy "Participants read submissions" on public.tutor_assessment_submissions for select to authenticated
 using(student_id=auth.uid() or exists(select 1 from public.tutor_assessments a where a.id=assessment_id and a.tutor_id=auth.uid()));
-- Protect immutable ownership, question keys, and published content from browser edits.
create or replace function public.guard_tutor_assessment() returns trigger language plpgsql security definer set search_path='' as $$
declare q jsonb; total integer:=0;
begin
 if auth.uid() is null or not exists(select 1 from public.users u where u.id=auth.uid() and u.is_active=true and u.onboarding_complete=true) then raise exception 'Active account required'; end if;
 if tg_op='UPDATE' then
   if new.id is distinct from old.id or new.tutor_id is distinct from old.tutor_id or new.student_id is distinct from old.student_id or new.created_at is distinct from old.created_at then raise exception 'Assessment ownership cannot change'; end if;
   if old.status<>'draft' and (new.questions is distinct from old.questions or new.max_marks is distinct from old.max_marks or new.kind is distinct from old.kind or new.grade is distinct from old.grade or new.subject is distinct from old.subject or new.opens_at is distinct from old.opens_at or new.due_at is distinct from old.due_at or new.time_limit_minutes is distinct from old.time_limit_minutes) then raise exception 'Published assessment content is locked'; end if;
   if old.status='closed' and new.status<>'closed' then raise exception 'Closed assessments cannot reopen'; end if;
   if old.status='published' and new.status='draft' then raise exception 'Published assessments cannot become drafts'; end if;
 end if;
 if new.status='published' and new.due_at<=now() then raise exception 'Due date must be in the future'; end if;
 for q in select value from jsonb_array_elements(new.questions) loop
   if jsonb_typeof(q)<>'object' or length(btrim(coalesce(q->>'prompt','')))<3 or coalesce((q->>'marks') ~ '^[1-9][0-9]*$',false)=false or (q->>'marks')::integer>100 then raise exception 'Each question needs text and 1–100 marks'; end if;
   if q->>'type' not in ('mcq','written') then raise exception 'Unsupported question type'; end if;
   if q->>'type'='mcq' and (jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>4 or coalesce((q->>'correct_index') ~ '^[0-3]$',false)=false) then raise exception 'MCQ requires four options and an answer key'; end if;
   total:=total+(q->>'marks')::integer;
 end loop;
 if total<>new.max_marks then raise exception 'Maximum marks must equal question marks'; end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function public.guard_tutor_assessment() from public,anon,authenticated;
create trigger guard_tutor_assessment before insert or update on public.tutor_assessments for each row execute function public.guard_tutor_assessment();
-- Public RPCs expose question prompts but never answer keys to learners.
create or replace function public.my_tutor_assessments()
returns table(id uuid,title text,subject text,grade smallint,kind text,instructions text,opens_at timestamptz,due_at timestamptz,time_limit_minutes integer,max_marks integer,status text,questions jsonb,submission_status text,score numeric,feedback text,attachment_path text)
language sql stable security definer set search_path='' as $$
 select a.id,a.title,a.subject,a.grade,a.kind,a.instructions,a.opens_at,a.due_at,a.time_limit_minutes,a.max_marks,a.status,
 (select coalesce(jsonb_agg(q.value - 'correct_index' - 'model_answer' - 'correct'),'[]'::jsonb) from jsonb_array_elements(a.questions) q),
 s.status,s.score,case when s.status='marked' then s.feedback else '' end,
 s.attachment_path
 from public.tutor_assessments a left join public.tutor_assessment_submissions s on s.assessment_id=a.id and s.student_id=auth.uid()
 where a.student_id=auth.uid() and a.status in ('published','closed')
 and exists(select 1 from public.users u where u.id=auth.uid() and u.role='student' and u.is_active=true and u.onboarding_complete=true)
 order by a.due_at desc
$$;
create or replace function public.start_tutor_assessment(p_assessment uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.tutor_assessments; sid uuid;
begin
 select * into a from public.tutor_assessments where id=p_assessment and student_id=auth.uid() and status='published' and opens_at<=now() and due_at>now();
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
 select * into a from public.tutor_assessments where id=p_assessment and student_id=auth.uid() and status='published' for update;
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
create or replace function public.mark_tutor_assessment(p_submission uuid,p_score numeric,p_feedback text)
returns boolean language plpgsql security definer set search_path='' as $$
declare a public.tutor_assessments;
begin
 select a.* into a from public.tutor_assessments a join public.tutor_assessment_submissions s on s.assessment_id=a.id where s.id=p_submission and a.tutor_id=auth.uid() and s.status in ('submitted','marked');
 if not found or not exists(select 1 from public.tutor_profiles t where t.user_id=auth.uid() and t.is_verified=true and t.is_active=true) then raise exception 'Not authorised to mark'; end if;
 if p_score is null or p_score<0 or p_score>a.max_marks or length(coalesce(p_feedback,''))>5000 then raise exception 'Invalid marks or feedback'; end if;
 update public.tutor_assessment_submissions set score=p_score,feedback=coalesce(p_feedback,''),status='marked',marked_at=now() where id=p_submission;
 return true;
end $$;
revoke all on function public.my_tutor_assessments(),public.start_tutor_assessment(uuid),public.submit_tutor_assessment(uuid,jsonb,text),public.mark_tutor_assessment(uuid,numeric,text) from public,anon;
grant execute on function public.my_tutor_assessments(),public.start_tutor_assessment(uuid),public.submit_tutor_assessment(uuid,jsonb,text),public.mark_tutor_assessment(uuid,numeric,text) to authenticated;
-- Private attachment bucket; only assigned learner uploads, owner tutor reads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('tutor-assessments','tutor-assessments',false,10485760,array['application/pdf','image/png','image/jpeg'])
on conflict(id) do nothing;
create policy "Learners upload assessment work" on storage.objects for insert to authenticated
with check(bucket_id='tutor-assessments' and (storage.foldername(name))[2]=auth.uid()::text
 and exists(select 1 from public.tutor_assessments a where a.id::text=(storage.foldername(name))[1] and a.student_id=auth.uid() and a.status='published' and a.opens_at<=now() and a.due_at>now()));
create policy "Assessment participants read attachments" on storage.objects for select to authenticated
using(bucket_id='tutor-assessments' and exists(select 1 from public.tutor_assessments a where a.id::text=(storage.foldername(name))[1] and (a.student_id=auth.uid() or a.tutor_id=auth.uid())));
