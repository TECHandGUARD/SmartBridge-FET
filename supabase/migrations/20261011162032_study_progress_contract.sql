-- Adapt dashboards to canonical progress and existing study-session records.
create policy "Approved parents read study sessions" on public.study_sessions for select to authenticated
using(smartbridge_private.has_parent_link(student_id));
create policy "Verified tutors read booked study sessions" on public.study_sessions for select to authenticated
using(public.is_tutor(auth.uid()) and exists(select 1 from public.tutor_bookings b where b.tutor_id=auth.uid() and b.student_id=study_sessions.student_id and b.status in ('confirmed','completed')));
create index if not exists study_sessions_student_subject on public.study_sessions(student_id,subject);
create view public.study_progress with (security_invoker=true) as
 select p.*,p.student_email as user_email,p.grade as grade_level,
  (select count(*) from public.study_sessions s where s.student_id=p.student_id and s.subject=p.subject and s.is_completed=true) as study_sessions,
  (select max(s.date)::text from public.study_sessions s where s.student_id=p.student_id and s.subject=p.subject and s.is_completed=true) as last_access
 from public.student_progress p;
grant select on public.study_progress to authenticated;
revoke all on public.study_progress from anon;

create or replace function smartbridge_private.log_study_session(chosen_subject text,chosen_grade text,request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare learner public.users; existing public.study_sessions; grade text; local_now timestamp;
begin
 if auth.uid() is null or request_id is null then raise exception 'Sign in and supply a request ID'; end if;
 select * into learner from public.users where id=auth.uid() and role='student' and is_active=true for update;
 if not found then raise exception 'An active student account is required'; end if;
 select * into existing from public.study_sessions where id=request_id;
 if found then
  if existing.student_id<>auth.uid() then raise exception 'Request unavailable'; end if;
  return existing.id;
 end if;
 if chosen_subject is null or length(trim(chosen_subject)) not between 1 and 100 then raise exception 'Choose a subject'; end if;
 grade:=chosen_grade;
 if grade is null then select p.grade into grade from public.student_progress p where p.student_id=auth.uid() and p.subject=chosen_subject; end if;
 if grade is null or grade not in ('Grade 10','Grade 11','Grade 12') then raise exception 'Track a grade for this subject first'; end if;
 insert into public.student_progress(student_id,student_email,subject,grade)
 values(learner.id,learner.email,chosen_subject,grade)
 on conflict(student_email,subject) do update set grade=excluded.grade,student_id=excluded.student_id
 where student_progress.student_id=auth.uid() or student_progress.student_id is null;
 if not found then raise exception 'Progress ownership mismatch'; end if;
 local_now:=now() at time zone 'Africa/Johannesburg';
 insert into public.study_sessions(id,student_id,student_email,subject,date,hour,duration_minutes,is_completed,completed_at,created_by)
 values(request_id,learner.id,learner.email,chosen_subject,local_now::date,extract(hour from local_now)::integer,0,true,now(),learner.id);
 return request_id;
end $$;
create or replace function public.log_study_session(chosen_subject text,chosen_grade text,request_id uuid) returns uuid
language sql security invoker set search_path='' as $$select smartbridge_private.log_study_session(chosen_subject,chosen_grade,request_id)$$;
revoke all on function smartbridge_private.log_study_session(text,text,uuid),public.log_study_session(text,text,uuid) from public,anon;
grant execute on function smartbridge_private.log_study_session(text,text,uuid),public.log_study_session(text,text,uuid) to authenticated;
-- Prevent reassignment through legacy direct update paths.
alter policy "Students can update own progress" on public.student_progress
with check(public.is_admin(auth.uid()) or (student_id=auth.uid() and student_email=(select u.email from public.users u where u.id=auth.uid())));
alter policy "Students can update own study sessions" on public.study_sessions
with check(public.is_admin(auth.uid()) or (student_id=auth.uid() and student_email=(select u.email from public.users u where u.id=auth.uid())));
alter policy "Students can create study sessions" on public.study_sessions
with check(student_id=auth.uid() and student_email=(select u.email from public.users u where u.id=auth.uid()));
alter policy "Tutors can view student progress" on public.student_progress
using(public.is_tutor(auth.uid()) and exists(select 1 from public.tutor_bookings b where b.tutor_id=auth.uid() and b.student_id=student_progress.student_id and b.status in ('confirmed','completed')));
