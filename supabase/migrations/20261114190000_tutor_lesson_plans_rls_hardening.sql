-- Harden lesson-plan ownership and separate private tutor notes from
-- learner-visible lesson-plan records. Apply after the compatible UI is deployed.

drop policy if exists "Students can view lesson plans" on public.lesson_plans;
create policy "Students view their linked lesson plans"
on public.lesson_plans
for select to authenticated
using (student_id = (select auth.uid()));

drop policy if exists "Tutors can view own lesson plans" on public.lesson_plans;
create policy "Tutors view own lesson plans"
on public.lesson_plans
for select to authenticated
using (
  tutor_id = (select auth.uid())
  or public.is_admin((select auth.uid()))
);

drop policy if exists "Tutors can create lesson plans" on public.lesson_plans;
create policy "Verified tutors create plans for booked learners"
on public.lesson_plans
for insert to authenticated
with check (
  tutor_id = (select auth.uid())
  and public.is_tutor((select auth.uid()))
  and student_id is not null
  and exists (
    select 1
    from public.tutor_bookings b
    where b.tutor_id = (select auth.uid())
      and b.student_id = lesson_plans.student_id
      and b.status in ('confirmed', 'completed')
      and (lesson_plans.booking_id is null or b.id = lesson_plans.booking_id)
  )
);

drop policy if exists "Tutors can update own lesson plans" on public.lesson_plans;
create policy "Tutors update own linked lesson plans"
on public.lesson_plans
for update to authenticated
using (
  (tutor_id = (select auth.uid()) and public.is_tutor((select auth.uid())))
  or public.is_admin((select auth.uid()))
)
with check (
  public.is_admin((select auth.uid()))
  or (
    tutor_id = (select auth.uid())
    and public.is_tutor((select auth.uid()))
    and student_id is not null
    and exists (
      select 1
      from public.tutor_bookings b
      where b.tutor_id = (select auth.uid())
        and b.student_id = lesson_plans.student_id
        and b.status in ('confirmed', 'completed', 'cancelled')
        and (lesson_plans.booking_id is null or b.id = lesson_plans.booking_id)
    )
  )
);

drop policy if exists "Tutors delete own lesson plans" on public.lesson_plans;
create policy "Tutors delete own lesson plans"
on public.lesson_plans
for delete to authenticated
using (
  (tutor_id = (select auth.uid()) and public.is_tutor((select auth.uid())))
  or public.is_admin((select auth.uid()))
);

-- The lesson_plans table is readable by learners. Private notes must never be
-- written into it; tutor-only reflections live in tutor_lesson_reflections.
alter table public.lesson_plans
  add constraint lesson_plans_private_notes_separated
  check (notes is null and reflection_notes is null and metadata is null);
