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
