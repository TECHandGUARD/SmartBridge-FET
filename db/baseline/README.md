# Schema-only baseline

The [focused MVP candidate](../../docs/mvp-release-candidate.md) adds later repairs;
the current replay includes twelve migrations and eight SQL suites. The captured
baseline itself remains unchanged and still reproduces the original nine-migration checkpoint.

Captured from SmartBridge FET (`bbhrnidzjeccggununzq`) on 13 October 2026. This snapshot contains definitions and bucket settings, not customer rows, uploaded files, credentials or provider configuration values. The existing recorded website migration is recovered from its stored SQL; no new production migration history has been written.

The captured schema has 54 public tables, 7 application functions, 134 application/storage policies, 49 application/auth triggers, one view and one custom RLS event trigger. There are no application enum types or sequences. Extension-owned functions and managed Supabase Auth/Storage internals are not reimplemented by the baseline.

`20260822153132_capture_live_schema_baseline.sql` was created with `supabase migration new` and reordered immediately after the recovered original migration, before the seven existing repairs. The captured legacy schema requires those security repairs; do not expose an environment after applying the baseline alone.

On an existing database, the baseline checks required columns/types, primary/foreign keys and enabled RLS, then returns without recreating functions, policies or grants. A drift mismatch raises an error instead of attempting destructive reconciliation. No table is dropped and no user row is copied or updated. The live guard was verified in a rolled-back transaction; the production database and migration history remain unchanged.

To reproduce the reviewed SQL from the snapshot:

```sh
python scripts/generate-schema-baseline.py
```

To test a fresh replay:

```sh
npm ci --include=dev
npm run check:db
```

The check uses pinned PGlite 0.3.14 / PostgreSQL 17.5 and pg_trgm. It supplies minimal Auth/Storage SQL fixtures, replays the recovered migration, baseline and seven repairs, compares every captured public column/type/default and policy count, tests no-op/drift guards, then executes all six security/workflow fixtures and rolls their sample data back. It does not exercise managed Auth, Storage HTTP, Realtime, Edge Functions or production PostgreSQL maintenance upgrades. Hosted Supabase staging must still verify those services.

Production currently uses PostgreSQL 17.6. Capture and compare the schema again before rollout if production changes. Run the production guard before any migration-history reconciliation; never mark the seven repair migrations applied before actually applying them. The CLI's `migration list --local` additionally requires a running local Supabase/Docker stack; the embedded SQL check does not provide that stack.
