-- Keep relocatable trigram helpers outside the public Data API schema.
-- pgjwt and pg_net are non-relocatable and require separate dependency review.
-- Existing indexes and application routines were checked before production rollout.
alter extension pg_trgm set schema extensions;
do $$
begin
  if extensions.similarity('smartbridge', 'smartbridge') <> 1 then
    raise exception 'Trigram regression';
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_depend d on d.classid = 'pg_proc'::regclass and d.objid = p.oid
    join pg_extension e on e.oid = d.refobjid and d.refclassid = 'pg_extension'::regclass
    where e.extname = 'pg_trgm' and d.deptype = 'e'
      and p.pronamespace = 'public'::regnamespace
  ) then
    raise exception 'Public trigram functions remain';
  end if;
end $$;
