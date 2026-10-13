-- Real PostgREST service-role updates execute invoker triggers and their helpers.
-- Preserve browser/anonymous restrictions; authorize only the trusted server role.
grant usage on schema smartbridge_private to service_role;
grant execute on function public.is_admin(uuid),public.is_tutor(uuid),
 smartbridge_private.is_admin(uuid),smartbridge_private.is_tutor(uuid) to service_role;
