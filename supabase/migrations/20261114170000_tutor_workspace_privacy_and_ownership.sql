-- Tutor workspace privacy and ownership hardening.
-- Notes are private unless a tutor explicitly shares a non-confidential note.
-- Availability metadata is private to its tutor and administrators.

-- A learner must not be able to read confidential or unshared tutor notes.
drop policy if exists "Students can view notes about themselves" on public.student_notes;
create policy "Students can view shared nonconfidential notes"
on public.student_notes for select to authenticated
using (
  student_id = (select auth.uid())
  and coalesce(is_shared_with_student, false) = true
  and coalesce(is_confidential, false) = false
);

-- Tutors may create notes only for learners with whom they have a real tutoring
-- relationship. Identity and email fields are bound to the authenticated records.
drop policy if exists "Tutors can create notes" on public.student_notes;
create policy "Verified tutors create notes for booked learners"
on public.student_notes for insert to authenticated
with check (
  tutor_id = (select auth.uid())
  and public.is_tutor((select auth.uid()))
  and student_id is not null
  and lower(trim(tutor_email)) = lower(trim((
    select u.email from public.users u where u.id = (select auth.uid())
  )))
  and lower(trim(student_email)) = lower(trim((
    select u.email from public.users u where u.id = student_notes.student_id
  )))
  and not (coalesce(is_confidential, false) and coalesce(is_shared_with_student, false))
  and exists (
    select 1
    from public.tutor_bookings b
    where b.tutor_id = (select auth.uid())
      and b.student_id = student_notes.student_id
      and b.status in ('confirmed', 'completed')
  )
);

-- Keep updates attached to the original tutor/learner relationship. Admins retain
-- support access; tutors cannot reassign a note to an unrelated learner.
drop policy if exists "Tutors can update own notes" on public.student_notes;
create policy "Tutors update notes for their booked learners"
on public.student_notes for update to authenticated
using (
  tutor_id = (select auth.uid())
  or public.is_admin((select auth.uid()))
)
with check (
  public.is_admin((select auth.uid()))
  or (
    tutor_id = (select auth.uid())
    and public.is_tutor((select auth.uid()))
    and student_id is not null
    and lower(trim(tutor_email)) = lower(trim((
      select u.email from public.users u where u.id = (select auth.uid())
    )))
    and lower(trim(student_email)) = lower(trim((
      select u.email from public.users u where u.id = student_notes.student_id
    )))
    and not (coalesce(is_confidential, false) and coalesce(is_shared_with_student, false))
    and exists (
      select 1
      from public.tutor_bookings b
      where b.tutor_id = (select auth.uid())
        and b.student_id = student_notes.student_id
        and b.status in ('confirmed', 'completed')
    )
  )
);

-- Availability contains tutor email addresses and free-text notes. It is not a
-- public directory endpoint; public tutor discovery uses the restricted directory.
drop policy if exists "Anyone can view availability" on public.tutor_availability;
drop policy if exists "Tutors can manage own availability" on public.tutor_availability;
create policy "Verified tutors manage own availability"
on public.tutor_availability for all to authenticated
using (
  tutor_id = (select auth.uid())
  and public.is_tutor((select auth.uid()))
)
with check (
  tutor_id = (select auth.uid())
  and public.is_tutor((select auth.uid()))
);
create policy "Admins read tutor availability"
on public.tutor_availability for select to authenticated
using (public.is_admin((select auth.uid())));

-- The tutor UI offers deletion only for resources still awaiting moderation.
create policy "Tutors delete own unapproved resources"
on public.resources for delete to authenticated
using (
  tutor_id = (select auth.uid())
  and coalesce(is_approved, false) = false
  and public.is_tutor((select auth.uid()))
);
