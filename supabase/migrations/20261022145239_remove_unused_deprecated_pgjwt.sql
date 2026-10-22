-- pgjwt is deprecated on Postgres 17 and is unused by SmartBridge FET.
-- RESTRICT prevents removal if any database object gains a dependency.
-- Supabase Auth verifies its own JWTs; it does not depend on this extension.
drop extension if exists pgjwt restrict;
do $$
begin
  if to_regprocedure('public.sign(json,text,text)') is not null then
    raise exception 'Legacy JWT signing endpoint remains';
  end if;
  if to_regprocedure('auth.uid()') is null or to_regprocedure('auth.jwt()') is null then
    raise exception 'Supabase Auth helpers unavailable';
  end if;
end $$;
