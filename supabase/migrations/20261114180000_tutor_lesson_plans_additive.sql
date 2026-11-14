-- Add booking linkage and tutor-only reflection storage without changing the
-- existing lesson-plan write policy. This migration is backward-compatible
-- with the currently deployed Tutor Hub and is safe to apply before the UI rollout.

alter table public.lesson_plans
  add column if not exists booking_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.lesson_plans'::regclass
      and conname = 'lesson_plans_booking_id_fkey'
  ) then
    alter table public.lesson_plans
      add constraint lesson_plans_booking_id_fkey
      foreign key (booking_id) references public.tutor_bookings(id)
      on delete set null;
  end if;
end
$$;

create index if not exists lesson_plans_tutor_student_session_idx
  on public.lesson_plans (tutor_id, student_id, session_date desc);

create index if not exists lesson_plans_booking_id_idx
  on public.lesson_plans (booking_id)
  where booking_id is not null;

-- Private teaching reflections are deliberately separated from lesson_plans:
-- learners can read their lesson plan rows, but never this table.
create table if not exists public.tutor_lesson_reflections (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid not null references public.lesson_plans(id) on delete cascade,
  tutor_id uuid not null references auth.users(id) on delete cascade,
  preparation_notes text,
  what_went_well text,
  areas_for_improvement text,
  next_session_goals text[] not null default '{}',
  confidence_rating smallint check (confidence_rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_plan_id, tutor_id)
);

alter table public.tutor_lesson_reflections enable row level security;
revoke all on public.tutor_lesson_reflections from anon, public;
grant select, insert, update, delete on public.tutor_lesson_reflections to authenticated;

drop policy if exists "Tutors manage own lesson reflections" on public.tutor_lesson_reflections;
create policy "Tutors manage own lesson reflections"
on public.tutor_lesson_reflections
for all to authenticated
using (
  tutor_id = (select auth.uid())
  and (select smartbridge_private.enabled_account())
  and public.is_tutor((select auth.uid()))
  and exists (
    select 1 from public.lesson_plans p
    where p.id = tutor_lesson_reflections.lesson_plan_id
      and p.tutor_id = (select auth.uid())
  )
)
with check (
  tutor_id = (select auth.uid())
  and public.is_tutor((select auth.uid()))
  and exists (
    select 1 from public.lesson_plans p
    where p.id = tutor_lesson_reflections.lesson_plan_id
      and p.tutor_id = (select auth.uid())
  )
);

-- Restore the delete action already presented in the Tutor Hub. This is
-- additive/backward-compatible and restricted to the owning verified tutor.
drop policy if exists "Tutors delete own lesson plans" on public.lesson_plans;
create policy "Tutors delete own lesson plans"
on public.lesson_plans
for delete to authenticated
using (
  (tutor_id = (select auth.uid()) and public.is_tutor((select auth.uid())))
  or public.is_admin((select auth.uid()))
);
