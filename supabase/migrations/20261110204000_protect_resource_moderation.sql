-- Tutors may edit their own resource content and archive it, but cannot
-- self-approve, reject, feature or manipulate moderation/engagement metrics.
CREATE OR REPLACE FUNCTION public.guard_resource_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
$$;
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
CREATE OR REPLACE FUNCTION smartbridge_private.protect_resource_record() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
begin
 if tg_op='UPDATE' and old.is_approved=true and new.is_archived=true
 and new.is_archived is distinct from old.is_archived
 and (to_jsonb(new)-array['is_archived','updated_at'])=(to_jsonb(old)-array['is_archived','updated_at']) then
  return new;
 end if;
 if tg_op='UPDATE' and smartbridge_private.has_staff_permission('resources')
 and (to_jsonb(new)-array['is_approved','is_rejected','updated_at'])=(to_jsonb(old)-array['is_approved','is_rejected','updated_at'])
 and new.is_approved is not null and new.is_rejected is not null and new.is_approved<>new.is_rejected then
  new.approved_by:=case when new.is_approved then auth.uid() else null end;
  new.approved_at:=case when new.is_approved then now() else null end;
  new.rejected_by:=case when new.is_rejected then auth.uid() else null end;
  new.rejected_at:=case when new.is_rejected then now() else null end;
  return new;
 end if;
 if public.is_admin(auth.uid()) or coalesce(auth.role(),'')='service_role' or auth.uid() is null then return new; end if;
 if new.tutor_id is distinct from auth.uid() or new.tutor_email is distinct from (select email from public.users where id=auth.uid())
 or new.is_approved=true or new.is_rejected=true or new.approved_by is not null or new.approved_at is not null
 or new.rejected_by is not null or new.rejected_at is not null then
  raise exception 'Resource review requires administrator approval';
 end if;
 if tg_op='UPDATE' and old.is_approved=true then raise exception 'Approved resources require administrator editing'; end if;
 if new.file_url not like 'storage://tutor-resources/'||auth.uid()::text||'/%'
 and new.file_url not like 'storage://resources/'||auth.uid()::text||'/%' then
  raise exception 'Upload resources to an owned private path';
 end if;
 return new;
end;$$;
