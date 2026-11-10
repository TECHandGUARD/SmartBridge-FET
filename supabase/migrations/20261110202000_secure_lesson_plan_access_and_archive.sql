-- Lesson plan rows also contain private tutor reflection notes.
-- Learners receive the safe lesson-plan email projection from sendEmail; they must
-- not be able to SELECT the underlying tutor record.
ALTER TABLE public.lesson_plans
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Students can view lesson plans" ON public.lesson_plans;
