# MVP backend access follow-up

Target: `TECHandGUARD/SmartBridge-FET`, draft PR #1. This work follows verified
checkpoint `71c049680cd70f061a35f83c776c096446a864f8`. The baseline follow-up's
[remote CI](https://github.com/TECHandGUARD/SmartBridge-FET/actions/runs/38426989696)
passed, including its SQL replay and browser checks.

## Implemented locally

Migration `20261013162332_mvp_catalogue_and_exam_permissions.sql` completes access
rules for the 15 formerly policy-less legacy tables not already covered by the
configuration, consent and educational-resource repairs. RLS stays enabled.
Active, onboarded accounts can read active bursaries, NBT dates and university
directories; subjects additionally require publication, deadlines/prospectuses
require approval, and opportunity guides must no longer be pending. Administrators
can manage these catalogues and review queues. Pending discovery content and
feature-override email lists remain administrator-only. Ordinary accounts can
read their own legacy profile, but cannot write its role. Authorization continues
to use the protected `users` relation, never `profiles` or editable JWT metadata.

Explicit table grants remove inherited TRUNCATE/TRIGGER/REFERENCES/MAINTAIN rights
from browser roles. Inactive administrators are rejected by the shared database
administrator check immediately. Valid administrator accounts use either the
protected administrator role or super-administrator flag, matching Edge checks.

Personal exam plans now support owner-scoped save/read/edit/delete. The frontend
filters by the authenticated account UUID. A trigger rejects forged owner emails,
ownership transfers, publication and self-awarded marks. Published exam entries
cannot be edited/deleted by their learner; the delete control is disabled.
Banner tracking includes the real user UUID and skips signed-out tracking.
The AI assistant's clear-filter choices use valid non-empty Radix option values
while preserving empty subject/grade/resource semantics in API requests.

Opportunity review now uses a service-role-only `review_opportunity_content` RPC.
The Edge handler verifies the real user token, then the RPC verifies that supplied
actor against the active database administrator account. A row lock and one
transaction cover publication and review tracking. Repeated terminal decisions
are idempotent; conflicting terminal decisions fail. Prospectus review serializes
by university/year and refuses ambiguous pre-existing duplicates. Browser roles
cannot call the RPC by forging an actor ID. No provider call is needed for review.

## Evidence

`npm run check:db` now replays ten migrations on PGlite/PostgreSQL 17.5, retains
baseline parity/no-op/drift guards, and runs seven SQL suites. The new
`db/test-mvp-access.sql` covers eight catalogue visibility/write boundaries,
private queues/legacy profiles, tracking ownership, learner exam save/read/edit/
delete and publication restrictions, forged actors, inactive accounts, administrator
revocation, and atomic review rollback/retries. An injected failure in the final
review-status write proves the newly published row rolls back with it. Existing
booking, parent-consent, onboarding, payment, operations and study-room suites pass.

The 48 unit/API tests, lint, full frontend typecheck, production build with synthetic
public settings, API mapping checks, Edge source checks and all 38 reviewed bundles
pass locally. Edge checks still stub remote SDK types. Browser coverage now includes
personal exam save, UUID-scoped reload and deletion. The browser installer returned
truncated archives in this environment, so that new regression must pass in remote
CI before being counted as verified. No local-browser pass is claimed here.

## Remaining acceptance and scope

These repository changes do not deploy Supabase migrations or functions. All live
service checks in `staging-rollout.md` remain outstanding. Work continues locally
on Free; no plan upgrade, hosted staging branch, production deployment or main
merge is authorized. Deploy the new migration before the corresponding updated
review function on an isolated environment when that rollout is authorized.

Legacy exam rows without a trusted `student_id` need administrator reconciliation;
email alone does not grant access. Dormant legacy profiles remain a compatibility
read, not a second onboarding or permissions system. This round does not make the
old feature-flags hook a runtime feature gate.

Unimplemented syllabus/NBT progress, flashcards, simulations, discussion-answer
contracts, advanced chat and remaining tutor workflow/data contracts still need
implementation or explicit MVP exclusion. Their precise static entries remain in
`functional-blockers.csv`; that historical inventory includes some already repaired
fields and must be checked against current callers. Provider delivery/model/payment
sandbox tests, Storage binary operations, live Auth and scheduled-job activation
remain separate acceptance gates. Catalogue policies alone do not supply content
or prove private-file download/provider readiness. This is not public-MVP approval.
