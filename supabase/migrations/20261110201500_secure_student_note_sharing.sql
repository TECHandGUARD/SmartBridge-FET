-- Tutor notes are private to the tutor unless explicitly shared.
-- Learners may only read notes that are shared, non-confidential and not archived.
-- Tutor/admin read and write policies remain unchanged.
DROP POLICY IF EXISTS "Students can view notes about themselves" ON public.student_notes;

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
