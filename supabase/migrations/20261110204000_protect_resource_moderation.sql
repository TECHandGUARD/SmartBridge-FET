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

-- Preserve the existing private upload-path and admin-review guard, but permit
-- a tutor to archive an already-approved resource without editing its content.
CREATE OR REPLACE FUNCTION smartbridge_private.protect_resource_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.is_approved = true
     AND NEW.is_archived = true
     AND NEW.is_archived IS DISTINCT FROM OLD.is_archived
     AND (to_jsonb(NEW) - ARRAY['is_archived','updated_at'])
         = (to_jsonb(OLD) - ARRAY['is_archived','updated_at'])
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND smartbridge_private.has_staff_permission('resources')
     AND (to_jsonb(NEW) - ARRAY['is_approved','is_rejected','updated_at'])
         = (to_jsonb(OLD) - ARRAY['is_approved','is_rejected','updated_at'])
     AND NEW.is_approved IS NOT NULL
     AND NEW.is_rejected IS NOT NULL
     AND NEW.is_approved <> NEW.is_rejected
  THEN
    NEW.approved_by := CASE WHEN NEW.is_approved THEN auth.uid() ELSE NULL END;
    NEW.approved_at := CASE WHEN NEW.is_approved THEN now() ELSE NULL END;
    NEW.rejected_by := CASE WHEN NEW.is_rejected THEN auth.uid() ELSE NULL END;
    NEW.rejected_at := CASE WHEN NEW.is_rejected THEN now() ELSE NULL END;
    RETURN NEW;
  END IF;

  IF public.is_admin(auth.uid())
     OR COALESCE(auth.role(),'') = 'service_role'
     OR auth.uid() IS NULL
  THEN
    RETURN NEW;
  END IF;

  IF NEW.tutor_id IS DISTINCT FROM auth.uid()
     OR NEW.tutor_email IS DISTINCT FROM (SELECT email FROM public.users WHERE id=auth.uid())
     OR NEW.is_approved = true
     OR NEW.is_rejected = true
     OR NEW.approved_by IS NOT NULL
     OR NEW.approved_at IS NOT NULL
     OR NEW.rejected_by IS NOT NULL
     OR NEW.rejected_at IS NOT NULL
  THEN
    RAISE EXCEPTION 'Resource review requires administrator approval';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_approved = true THEN
    RAISE EXCEPTION 'Approved resources require administrator editing';
  END IF;

  IF NEW.file_url NOT LIKE 'storage://tutor-resources/' || auth.uid()::text || '/%'
     AND NEW.file_url NOT LIKE 'storage://resources/' || auth.uid()::text || '/%'
  THEN
    RAISE EXCEPTION 'Upload resources to an owned private path';
  END IF;

  RETURN NEW;
END;
$$;
