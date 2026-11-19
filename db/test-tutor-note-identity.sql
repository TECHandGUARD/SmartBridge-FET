-- CRM notes use the booked learner's UUID for identity and sharing.
savepoint tutor_note_fixture;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009902","role":"authenticated"}',true);
insert into public.student_notes(id,tutor_id,student_id,tutor_email,student_email,student_name,note,is_confidential)
values ('00000000-0000-4000-8000-000000009916',auth.uid(),'00000000-0000-4000-8000-000000009901',
 'injected@example.invalid','injected@example.invalid','Untrusted label','Tutor session fixture',true);

do $$ begin
 if not exists(select 1 from public.student_notes where id='00000000-0000-4000-8000-000000009916'
  and tutor_email='booking-tutor@example.invalid' and student_email='booking-student@example.invalid'
  and student_name is distinct from 'Untrusted label') then
  raise exception 'Note labels were not derived from the linked accounts';
 end if;
 begin
  update public.student_notes set student_email='different@example.invalid'
  where id='00000000-0000-4000-8000-000000009916';
  raise exception 'Note identity could be changed';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.student_notes where id='00000000-0000-4000-8000-000000009916') then
  raise exception 'Learner sees an unshared note';
 end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009902","role":"authenticated"}',true);
update public.student_notes set is_confidential=false,is_shared_with_student=true
where id='00000000-0000-4000-8000-000000009916';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}',true);
do $$ begin
 if not exists(select 1 from public.student_notes where id='00000000-0000-4000-8000-000000009916') then
  raise exception 'Learner cannot read an explicitly shared note';
 end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.tutor_profiles set is_verified=false where user_id='00000000-0000-4000-8000-000000009902';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000009902","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.student_notes where id='00000000-0000-4000-8000-000000009916') then
  raise exception 'Former tutor retained access to notes';
 end if;
end $$;
rollback to tutor_note_fixture;
release savepoint tutor_note_fixture;
