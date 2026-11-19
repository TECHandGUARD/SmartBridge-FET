-- Existing note content and sharing flags remain intact. The identities on a
-- note are immutable after creation, even when both learners have bookings.
create function smartbridge_private.bind_tutor_note_identity()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if (new.tutor_id, new.student_id, new.tutor_email, new.student_email, new.student_name)
      is distinct from (old.tutor_id, old.student_id, old.tutor_email, old.student_email, old.student_name) then
      raise exception 'Session note identities cannot be changed' using errcode = '23514';
    end if;
    return new;
  end if;

  -- The existing INSERT policy checks verification and the booking relationship.
  -- Derive labels inside that boundary so clients cannot assign another identity.
  select u.email into new.tutor_email from public.users u where u.id = new.tutor_id;
  select u.email, u.full_name into new.student_email, new.student_name
  from public.users u where u.id = new.student_id;
  return new;
end;
$$;
revoke all on function smartbridge_private.bind_tutor_note_identity() from public, anon, authenticated;
create trigger bind_tutor_note_identity
before insert or update on public.student_notes
for each row execute function smartbridge_private.bind_tutor_note_identity();

alter policy "Tutors can view own notes" on public.student_notes to authenticated
using (
  (tutor_id = (select auth.uid()) and (select public.is_tutor(auth.uid())))
  or (select public.is_admin(auth.uid()))
);
