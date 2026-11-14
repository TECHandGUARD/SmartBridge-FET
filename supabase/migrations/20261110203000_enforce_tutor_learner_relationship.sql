-- A tutor must have a real, confirmed/completed booking relationship before
-- creating learner notes or lesson plans. Ownership must remain valid on update.
DROP POLICY IF EXISTS "Tutors can create notes" ON public.student_notes;
CREATE POLICY "Tutors can create notes for booked learners"
ON public.student_notes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = tutor_id
  AND public.is_tutor(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tutor_bookings b
    WHERE b.tutor_id = auth.uid()
      AND b.student_id = student_notes.student_id
      AND b.status IN ('confirmed', 'completed')
  )
);

DROP POLICY IF EXISTS "Tutors can update own notes" ON public.student_notes;
CREATE POLICY "Tutors can update own notes for booked learners"
ON public.student_notes
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
        AND b.student_id = student_notes.student_id
        AND b.status IN ('confirmed', 'completed')
    )
  )
  OR public.is_admin(auth.uid())
);

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
