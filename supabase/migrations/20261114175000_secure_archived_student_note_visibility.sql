-- Keep learner note visibility restricted to notes that are explicitly shared,
-- non-confidential and not archived. Tutor/admin ownership policies remain intact.
DROP POLICY IF EXISTS "Students can view shared nonconfidential notes" ON public.student_notes;
CREATE POLICY "Students can view shared nonconfidential notes"
ON public.student_notes
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id
  AND is_shared_with_student IS TRUE
  AND COALESCE(is_confidential, false) = false
  AND COALESCE(is_archived, false) = false
);
