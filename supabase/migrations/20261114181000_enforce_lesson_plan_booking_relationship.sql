-- Tutor lesson plans are private tutor records. Learners receive only the safe email projection.
-- Creation and updates require an active confirmed/completed booking relationship.
DROP POLICY IF EXISTS "Tutors can create lesson plans" ON public.lesson_plans;
CREATE POLICY "Tutors can create lesson plans for booked learners"
ON public.lesson_plans
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = tutor_id
  AND public.is_tutor(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tutor_bookings b
    WHERE b.tutor_id = auth.uid()
      AND b.student_id = lesson_plans.student_id
      AND b.status IN ('confirmed', 'completed')
  )
);

DROP POLICY IF EXISTS "Tutors can update own lesson plans" ON public.lesson_plans;
CREATE POLICY "Tutors can update own lesson plans for booked learners"
ON public.lesson_plans
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = tutor_id AND public.is_tutor(auth.uid()))
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  (
    auth.uid() = tutor_id
    AND public.is_tutor(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.tutor_bookings b
      WHERE b.tutor_id = auth.uid()
        AND b.student_id = lesson_plans.student_id
        AND b.status IN ('confirmed', 'completed')
    )
  )
  OR public.is_admin(auth.uid())
);
