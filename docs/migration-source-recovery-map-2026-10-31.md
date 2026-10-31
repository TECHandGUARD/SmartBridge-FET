# SmartBridge FET migration source-recovery map

**Snapshot:** 31 October 2026  
**Scope:** Repository migration files compared with the live Supabase migration ledger. This is an inventory, not a migration to run.

## Current discrepancy

The live project reports 66 applied migration versions. The current `main` tree contains 44 SQL migration files. The version comparison finds 29 live-applied versions without an exactly matching filename/version in `main`, and seven repository migration files not recorded as applied in the live ledger.

This explains a concrete CI failure: the disposable Supabase test database is built from the repository migrations, then the security test requests `public.ai_executive_training`; PostgREST reports that the relation is absent. The live database has the table, but the repository replay does not create it.

## Live-applied versions absent from the repository

| Live version | Live migration name | Candidate source / evidence | Reconciliation status |
|---|---|---|---|
| 20261022144635 | move_trigram_extension_to_extensions | PR #56, exact SQL patch and filename | Source recovered; compare with live extension state before restoring |
| 20261022145239 | remove_unused_deprecated_pgjwt | PR #56, exact SQL patch and filename | Source recovered; confirm dependency-safe removal and extension state |
| 20261024130857 | peer_study_call_foundation | PR #57 contains foundation SQL under version 20261024140000 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024130902 | peer_call_rls_nonrecursive | PR #57 contains corresponding policy repair under 20261024140100 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024130907 | peer_call_expiry_and_visibility | PR #57 contains corresponding expiry policy under 20261024140200 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024131039 | peer_call_guardian_grants | PR #57 contains guardian grant logic under 20261024140300 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024132303 | peer_call_minimum_age_15 | PR #57 contains minimum-age rule under 20261024140400 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024132415 | peer_call_verified_age_and_moderator_admission | PR #57 contains verification/moderator logic under 20261024140500 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024132541 | peer_call_moderator_assignment | PR #57 contains moderator assignment under 20261024140600 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024132646 | peer_call_signaling_transport | PR #57 contains signaling table under 20261024140700 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024132950 | peer_call_live_moderator_admission | PR #57 contains live moderator admission under 20261024140800 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024133010 | peer_call_secure_signaling | PR #57 contains secure signaling under 20261024140900 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024134332 | instant_adult_call_requests | PR #58 contains matching request/call RPC SQL under 20261024150000 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024134355 | instant_adult_call_signaling | PR #58 contains matching signaling SQL under 20261024150100 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024134732 | instant_adult_contact_lookup | PR #58 contains matching lookup SQL under 20261024150200 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261024142032 | adult_call_push_subscriptions | PR #59 contains push subscription SQL under 20261024161000 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261025183150 | coo_tutor_onboarding | PR #66 contains the onboarding audit/quota migration under 20261025203000 | Timestamp differs; reconcile subsequent edits before restoring |
| 20261025184443 | coo_onboarding_disabled_schedule | Related to COO scheduler rollout in PRs #66/#68 | Exact live SQL not recovered |
| 20261025184627 | coo_resend_vault_signing_key_access | Related to COO/Resend Vault work in PRs #66/#68 | Exact live SQL not recovered |
| 20261025184847 | coo_scheduler_secret_and_control | PR #68 contains scheduler secret/control SQL under 20261025220000 | Multiple live versions split/edited; exact equivalence not proven |
| 20261025185139 | coo_service_role_acl_based_auth | Related to COO scheduler security changes in PRs #66/#68 | Exact live SQL not recovered |
| 20261025185407 | coo_daily_executive_reporting | PR #68 contains daily report SQL in its combined migration | Exact live split/version not proven |
| 20261025185515 | coo_tutor_72_hour_cooldown | PR #68 contains cooldown logic in its combined migration | Exact live split/version not proven |
| 20261025195021 | coo_admin_reminders_opt_out | PR #71 contains opt-out migration under 20261025223500 | Timestamp differs; token expiry and preference semantics require review |
| 20261025195318 | coo_reenable_reminders | PR #71 contains re-enable RPC under 20261025224500 | Timestamp differs; preference semantics require review |
| 20261025205645 | ai_executive_training_phase1 | Related AI training centre work in PRs #64/#74 | Exact live SQL not recovered |
| 20261025205923 | ai_training_review_actions | Related AI training review/approval work in PRs #64/#74/#75 | Exact live SQL not recovered |
| 20261026134125 | ai_executive_reviews_and_proposals | PR #85 contains matching table definitions under 20261026153000 | Timestamp differs; live source not yet proven byte-equivalent |
| 20261026134129 | ai_board_operating_snapshot | PR #85 contains matching RPC under 20261026153100 | Timestamp differs; live source not yet proven byte-equivalent |

## Repository migrations not recorded as applied live

The following files exist on `main` but are not present by version in the live migration ledger:

- `20261024150000_instant_adult_call_requests.sql`
- `20261024150100_instant_adult_call_signaling.sql`
- `20261024150200_instant_adult_contact_lookup.sql`
- `20261025203000_coo_tutor_onboarding.sql`
- `20261025220000_coo_autonomous_schedule_and_reporting.sql`
- `20261026153000_ai_executive_reviews_and_proposals.sql`
- `20261026153100_ai_board_operating_snapshot.sql`

Several are candidate equivalents of live-applied migrations with different timestamps. They must not be applied to production just to make the ledger match.

## Follow-up recovery work — AI Board Phase 5

A focused follow-up compared the two Phase 5 AI Board migrations against the live catalog and restored the exact applied version identifiers on draft PR #97:

- Live version `20261026134125` — `ai_executive_reviews_and_proposals`.
- Live version `20261026134129` — `ai_board_operating_snapshot`.

The original SQL content was recovered from PR #85. Read-only catalog checks confirm the live review/proposal tables have the expected columns, generated score fields, constraints, indexes, four administrator-only policies, and authenticated SELECT/INSERT grants. The snapshot RPC definition matches the recovered SQL, uses an empty search path, checks `smartbridge_private.is_admin(auth.uid())`, and has no anonymous execute grant. The repository's later duplicate filenames (`20261026153000` and `20261026153100`) were removed from the recovery branch and the source-controlled governance tests were updated to reference the applied version identifiers.

**Validation still pending:** PR #97 CI is running. The live database catalogue comparison is read-only; it does not prove a full clean replay until the CI migration and local service job passes. Two earlier runs on the uncorrected branch failed the governance test only because the tests still referenced the removed duplicate filenames. This was corrected in the current head.

The other two live-only AI migration versions (`20261025205645` training phase 1 and `20261025205923` training review actions) remain unresolved. Their exact SQL was not found in the recovered PR patches. Do not reconstruct them from table names alone; recover their full column, constraint, policy, grant, trigger and function definitions from the live catalog and obtain a source/review decision first.

## AI training Phase 1 / review-action catalog inspection

The two remaining AI training migrations are still source-recovery blockers. A read-only live catalog inspection identified the current end state:

- `ai_executive_training`: 8 columns (`id`, `executive`, `instruction`, `status`, `version`, `created_by`, `created_at`, `updated_at`); status is constrained to `draft`, `approved`, or `withdrawn`; instructions are trimmed and constrained to 10–6,000 characters; executive values are limited to CEO, COO, CFO, CMO, CIO and General Manager.
- Training table RLS is enabled. Authenticated administrators can read records, insert their own initial draft (version 1), and update draft records. Anonymous access is not granted. Authenticated table-level grants are broad, but RLS restricts effective row access.
- `ai_executive_training_audit`: 6 columns (`id` bigint, `training_id`, `actor_id`, `old_status`, `new_status`, `created_at`), with a primary key and a foreign key to the training record. It has no sequence/default for `id`, no user-defined triggers, and no insert/update/delete RLS policies. Only an administrator SELECT policy exists.
- The audit table currently has broad table ACL entries for anon/authenticated, but RLS denies those roles writes because there are no matching policies. This is an unnecessarily broad grant surface and should be reduced in a separately reviewed forward migration.
- No function whose name or body clearly references executive training was found in the public/private schemas. No trigger currently writes audit rows. Therefore, the audit table's name should not be mistaken for a functioning append-only audit trail.
- The UI's training-record component inserts draft rows into `ai_executive_training`; the inspected component does not create audit rows or activate an AI model.

This catalog is sufficient to design a reconstruction candidate, but not to claim exact recovery of the two original migrations. The original source was not found in PR #64 or #74. Before restoring the live version identifiers `20261025205645` and `20261025205923`, recover the original SQL from commit history or explicitly label any catalog-derived reconstruction as such, then compare the rebuilt schema and test administrator/non-administrator boundaries. Separately design an append-only audit mechanism with a narrow server-side writer, deny client writes, and immutable audit semantics; do not add it to a historical migration unless source evidence proves it existed there.

## AI training schema reconstruction branch

Draft PR #98 (`recovery/reconstruct-ai-training-migrations`) now contains schema-equivalent reconstructions for live version identifiers `20261025205645` and `20261025205923`. The migrations are explicitly labelled as catalog-derived reconstructions because the original executed SQL could not be recovered from PR #64/#74 or the available commit history.

The reconstruction captures the live table columns, checks, foreign keys and RLS policies. It deliberately tightens table grants compared with the current live ACL: authenticated receives only SELECT/INSERT/UPDATE on training and SELECT on the audit table; anon receives none. This intentional ACL difference must be reviewed and followed by a separately approved forward migration for production if accepted. The audit table remains read-only to clients and has no invented trigger/RPC writer. PR #98 CI is pending; no production SQL was executed.

## Peer-call migration catalog inspection

A read-only live catalog inventory has now captured the six core peer-call tables:

- `peer_study_calls`, `peer_study_call_members`, `peer_study_call_signals`
- `peer_call_age_verifications`, `peer_call_guardian_grants`, `peer_call_moderators`

The live catalog confirms important guardrails: call sessions expire within 60 minutes; signaling payloads are limited to 16 KB and expire within 10 minutes (default five); call membership is scoped to a live call; age-verification expiry is capped at 365 days; guardian grants are capped at 365 days; the supported age-verification methods are restricted to trusted provider or manual document review. RLS policies expose call rows only to eligible participants, member rows only to admitted members, and signaling rows only to an admitted recipient when the live moderator and sender checks pass.

The live database also contains six private helper functions governing eligibility, guardian consent, moderator availability, host liveness, membership, recipient admission and signaling. Public SECURITY DEFINER RPCs include moderator assignment, start/join/heartbeat/leave. The functions inspected use an empty search path and enforce authenticated identity and/or moderator checks.

PR #57 contains a later-timestamp candidate series (`20261024140000`–`20261024140900`) for the ten live peer-call versions (`20261024130857`–`20261024133010`). Those timestamps differ, and the candidate branch is not proof of byte-equivalent original SQL. The catalog inventory is now recorded as the comparison baseline. Before creating restored historical filenames, compare every table column/default, constraint, index, policy, grant, function definition/ACL, trigger and dependency against the PR #57 candidate SQL and the clean replay. Do not restore the ten versions by blind rename.

The three instant-adult-call migrations and push-subscription migration remain a separate recovery batch. Their PR #58/#59 candidates also use later timestamps and require the same comparison process.

## Instant adult-call and push-subscription catalog inspection

The live catalog has now been captured for `instant_adult_calls`, `instant_adult_call_signals`, and `adult_call_push_subscriptions`. The live schema confirms:
- Instant calls distinguish audio/video and ringing/accepted/declined/missed/ended; a call request expires after 45 seconds and caller/callee must differ.
- Signaling is recipient-scoped, participant-checked, limited to approved signal kinds, capped at 16 KB in the table (8 KB in the RPC), and defaults to five-minute expiry.
- Adult call history is visible only to either participant when the adult-account helper passes.
- Push subscriptions enforce unique endpoints, a 2,048-character endpoint limit and an 8 KB JSON payload limit. Registration validates HTTPS endpoints and required Web Push keys; the RPC is adult-account gated.
- The inspected public RPCs use SECURITY DEFINER with an empty search path and enforce caller/callee identity and adult-account checks. Signaling includes a per-sender rate limit.

PR #58 contains three later-timestamp candidate migrations for live versions `20261024134332`, `20261024134355`, and `20261024134732`; PR #59 contains a later-timestamp push-subscription candidate for live version `20261024142032`. This catalog capture is the comparison baseline, not proof of exact SQL provenance. Compare complete constraints, indexes, RLS policies, table ACLs, RPC signatures/definitions/ACLs, helper functions and dependencies before restoring the applied filenames.

## COO automation catalog and control-path inspection

A read-only inspection of the live COO schema and routines confirms:
- `coo_automation_settings` enforces a daily limit between 1 and 25 and `autonomy='routine'`; the setting is currently disabled.
- The live reservation routine serializes quota checks, enforces the 25-per-Africa/Johannesburg-day limit, one campaign per tutor, a 72-hour cooldown, active-account checks and the suppression table.
- The live reservation routine rejects known opt-out values but accepts NULL or unknown `communication_preferences` values. The source-controlled `cooTutorOnboarding` Edge Function separately uses a strict allowlist (`all`, `email`, `email_only`, `email_enabled`) and therefore fails closed on that execution path. The database routine should independently apply the allowlist as defence in depth, since it is a privileged service-role RPC.
- Unsubscribe token issuance/redemption is service-role-only. Redemption consumes all outstanding tokens for the tutor and records suppression, but currently does not check token age. The unsubscribe endpoint source is present in PR #71, but the corresponding function source/config/migration are not present on main. The live registry reports `coo-reminder-unsubscribe` ACTIVE; therefore source-controlled deployment provenance is incomplete.
- `coo_reenable_reminders()` allows an authenticated active tutor to remove suppression and set preference to `email`. It is identity-scoped, but this action and its UX should be reviewed against the intended consent model.
- The COO reservation function is defined with `search_path=public`, not an empty search path; schema-qualifying object references and setting an empty path would reduce SECURITY DEFINER search-path risk.
- Daily reporting is based on the email log and the private capture routine. A report row is not evidence that a delivery occurred; provider acceptance/delivery/bounce states must be reconciled from signed Resend events.
- The live scheduler remains disabled. No reminder emails were sent and no settings were changed during this inspection.

PR #71 provides candidate source for the opt-out endpoint, suppression/token routines and re-enable routine. Its SQL timestamp `20261025223500` and `20261025224500` are repository candidates, not the nine live COO version identifiers. The exact executed SQL for the nine live COO migration versions has not been recovered. Do not blindly map or rename PR #71 candidate files to live versions. Before production activation, restore a coherent migration chain, add database-level fail-closed consent and a bounded token lifetime, test the GET-confirm/POST-opt-out flow, and verify that the deployed function matches source.

## Safe reconciliation procedure

1. Preserve the live migration ledger and database state. Do not delete, rewrite or mark migrations as applied in production to silence drift.
2. Recover the exact SQL that was executed for every live-only version. PR patches are useful provenance, but a later patch with a different version is not proof of the exact live SQL.
3. For each candidate, compare SQL behavior with the current live catalog: relations, columns, constraints, indexes, RLS policies, grants, functions, triggers, publications, extensions and scheduled jobs.
4. Record an explicit equivalence decision with source commit/PR, reviewed SQL hash, live object evidence and reviewer.
5. Rebuild a clean disposable database from the reconstructed ordered migration history. Run the full schema checks and negative security tests.
6. Compare the clean replay's schema to a read-only live schema inventory. Explain intentional differences, extension-managed objects and environment-specific Vault/cron state.
7. Only after replay and rollback validation, prepare a separately reviewed forward migration if the live schema needs changes. Never replay historical production migrations just to repair bookkeeping.

## Explicit hold

Until the mismatch is resolved, do not run `supabase db push`, reset or repair production migration history, apply the seven repository-only files, merge backend migration changes, or enable peer-call/COO schedulers. No production database changes were made as part of this inventory.

## COO migration candidate-to-live comparison — 31 October 2026

A second read-only comparison used the live migration ledger, PostgreSQL function definitions and table catalog metadata, and the SQL patches in PRs #66, #68 and #71. It narrows the recovery decision but does **not** establish original SQL byte equivalence.

### What the live catalog proves

The live ledger contains nine separately applied COO versions:

- 20261025183150_coo_tutor_onboarding
- 20261025184443_coo_onboarding_disabled_schedule
- 20261025184627_coo_resend_vault_signing_key_access
- 20261025184847_coo_scheduler_secret_and_control
- 20261025185139_coo_service_role_acl_based_auth
- 20261025185407_coo_daily_executive_reporting
- 20261025185515_coo_tutor_72_hour_cooldown
- 20261025195021_coo_admin_reminders_opt_out
- 20261025195318_coo_reenable_reminders

The recovered PR candidates are not a one-to-one history: PR #66 has a single onboarding/log/reservation migration at 20261025203000; PR #68 combines scheduler secrets, reporting and a cron setup in 20261025220000; PR #71 combines opt-out and reservation changes in 20261025223500, then adds re-enable logic at 20261025224500. Their timestamps and transaction boundaries differ from the nine live versions. Do not split or rename those combined candidates into historical versions without recovering the original commits or documenting a reconstruction decision.

### Material differences between candidate SQL and live routines

- The live public.coo_reserve_email(uuid,text,text,text[]) accepts only profile_48h and profile_72h, serializes the daily quota with an advisory transaction lock, requires an active tutor account, checks the preference field, checks the suppression table, enforces a 72-hour cooldown, caps the Africa/Johannesburg day at 25, and uses a unique tutor/campaign reservation.
- PR #66's initial candidate includes an explicit service-role claim check and daily quota, but does not include the later active-account, preference, suppression or cooldown checks.
- PR #68's combined candidate adds the 72-hour cooldown and scheduler/reporting routines, but its reservation routine does not include the later preference and suppression checks.
- PR #71's candidate adds the preference denylist, suppression and 72-hour cooldown, but does not prove the exact live function body or historical point at which each control was introduced. The live function's effective execution boundary must be confirmed from its ACL, not inferred from the body alone.
- The live preference check is still not fail-closed: it rejects known opt-out strings but allows NULL and unknown values. The tracked Edge Function has a stricter explicit allowlist. A future forward migration should make the database RPC independently fail closed; do not silently rewrite a historical migration to pretend that control already existed.
- The live unsubscribe token table has a created_at column but no expiry column. The live issue/redeem functions use search_path=public; redemption records suppression, changes the tutor preference to none, and consumes all outstanding tokens for that tutor. Token age is not checked. These are confirmed current-state gaps, not evidence that the original migration lacked other logic.
- The live coo_reenable_reminders() is identity-scoped to the authenticated active tutor, removes that tutor's suppression and sets the preference to email. Its consent semantics need product/legal review before reminder automation is enabled.
- The scheduler setting is disabled in the live database. The PR #68 candidate contains cron scheduling SQL, but that source does not mean the live scheduler is currently enabled. Preserve the disabled state.

### Recovery decision

PR #66/#68/#71 provide useful candidate provenance, but their SQL is materially different from the current live function definitions and combines several changes that the live ledger records as separate versions. The exact SQL for all nine versions remains **unrecovered**. Next, inspect the original commit history for the exact nine versioned files; if that fails, create clearly labelled catalog-derived reconstruction candidates with a per-object comparison matrix and separate them from any forward security hardening. No production changes or scheduler activation were performed.
