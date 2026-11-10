-- Tutors may edit their own resource content and archive it, but cannot
-- self-approve, reject, feature or manipulate moderation/engagement metrics.
CREATE OR REPLACE FUNCTION public.guard_resource_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT COALESCE(smartbridge_private.has_staff_permission('resources'), false)
     AND NOT COALESCE(public.is_admin(auth.uid()), false)
     AND (
       NEW.is_approved IS DISTINCT FROM OLD.is_approved
       OR NEW.is_rejected IS DISTINCT FROM OLD.is_rejected
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.rejected_by IS DISTINCT FROM OLD.rejected_by
       OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
       OR NEW.download_count IS DISTINCT FROM OLD.download_count
       OR NEW.view_count IS DISTINCT FROM OLD.view_count
       OR NEW.rating_average IS DISTINCT FROM OLD.rating_average
       OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
     )
  THEN
    RAISE EXCEPTION 'Only administrators may change resource moderation fields'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$;
REVOKE ALL ON FUNCTION public.guard_resource_moderation_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_resource_moderation_fields ON public.resources;
CREATE TRIGGER guard_resource_moderation_fields
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.guard_resource_moderation_fields();

DROP POLICY IF EXISTS "Tutors can update own resources" ON public.resources;
CREATE POLICY "Tutors can update own resources"
ON public.resources
FOR UPDATE
TO authenticated
USING (auth.uid() = tutor_id AND public.is_tutor(auth.uid()))
WITH CHECK (auth.uid() = tutor_id AND public.is_tutor(auth.uid()));
