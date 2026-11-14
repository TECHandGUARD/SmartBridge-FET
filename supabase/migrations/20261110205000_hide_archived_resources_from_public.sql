-- Archived resources must disappear from the public catalogue even when they
-- were previously approved. Tutors may archive their own resources without
-- modifying the administrator-controlled approval state.
DROP POLICY IF EXISTS "Anyone can view approved resources" ON public.resources;
CREATE POLICY "Anyone can view approved active resources"
ON public.resources
FOR SELECT
TO public
USING (
  is_approved = true
  AND COALESCE(is_archived, false) = false
);
