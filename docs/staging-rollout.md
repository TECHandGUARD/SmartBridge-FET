# SmartBridge-FET rollout

## Approved production rollout — 13 October 2026

The owner approved the focused MVP scope, PR #1 merge and deployment to the existing Supabase Free project and AWS Amplify. No paid upgrade or hosted staging branch was authorized or created.

PR #1 merged as `c2062c27528bceb5beab065fc8eecdf3eb30d289`. Amplify main job 100 passed build/deploy/verify. Application origin: `https://main.d2pos7eidu5lbk.amplifyapp.com`. No custom domain is attached to this Amplify app. Branch public origin settings now use this hostname; developer/admin bypass and automatic approval controls are disabled. Existing support contact is retained.

All 13 migrations are applied in `bbhrnidzjeccggununzq`, with original repository versions/names preserved. The baseline and eleven repairs were applied atomically after a successful rolled-back rehearsal; connector batch history was reconciled to the baseline entry only after successful application. The original migration was not replayed. All four existing accounts remain. All 38 reviewed Edge bundles are active with matching manifest JWT settings. All eight hosted SQL suites pass in a rolled-back transaction; catalogue count checks were scoped to the test markers to preserve existing published university rows. Zero public RLS tables lack policies. Payment gateways and scheduled jobs remain disabled.

Hosted acceptance evidence and remaining public-onboarding settings are recorded in `mvp-release-candidate.md`. The sections below describe the earlier staging proposal and checkpoint, not a requirement to buy staging or repeat completed deployment.

## Historical preparation and staging proposal


## Prepared and verified

Local development continues on Free with no hosted branch or billing authorization.
The [focused MVP candidate](mvp-release-candidate.md) includes thirteen migrations
and eight SQL suites, plus a disposable real-services CI gate. Include the catalogue
review migration before deploying its atomic review handler.

The schema-only baseline and original migration history are reconstructed in the repository. `npm run check:db` tests a fresh PostgreSQL 17 replay of all thirteen migrations and the eight SQL workflow/security suites. The existing live-schema guard passes without changing production. All 38 Edge Function source bundles can be prepared with `npm run prepare:edge -- /tmp/staging-functions`; custom entrypoints and JWT settings are declared in `supabase/config.toml`.

## Hosted staging gate

The only branch currently associated with SmartBridge FET is its production `main` branch. No separate staging branch has been created. The Supabase connector advertises branch creation but returns `UNAVAILABLE` for its prerequisite `get_cost` operation (`MCP tool get_cost was not returned by tools/list`). Do not fabricate a cost-confirmation ID or deploy into production as a substitute. The parent organization is currently on the Free plan. Hosted branching requires Pro or above; upgrading the organization introduces a recurring subscription and can affect billing for its other active project. Creating a hosted preview environment therefore requires the user’s billing decision and either a functioning connector or authorized dashboard setup. General published pricing is Pro from USD 25/month plus branch Micro compute from USD 0.01344/hour and any applicable usage; these are not an account-specific invoice estimate.

Use the parent SmartBridge FET project `bbhrnidzjeccggununzq`, in its existing organization `qmiljpnuvtzopumqkven`. Do not use the other Tech & GUARD project or reconnect the repository. Suggested temporary branch name: `smartbridge-fet-staging-20261013`. Copy no production user data. Keep automated email, AI calls, payments and scheduled jobs inactive while testing.

## Execution sequence after the gate

1. Create the isolated branch and wait for it to become healthy. Record its returned project reference; reject the production reference for staging deployment.
2. Compare its migration history with the recovered original. Apply the baseline and remaining repairs in order; do not replay the already-recorded original migration as a new version. Verify every migration, key relation, helper/RPC, grant and RLS boundary.
3. Deploy the 38 reviewed bundles to the returned branch reference. Confirm deployed names/JWT settings match the manifest. Never copy provider secrets from SQL configuration or from the frontend build environment.
4. Run the six SQL security/workflow suites with disposable fixture accounts in a rolled-back transaction. Run Supabase advisors against the staging branch. Resolve remaining feature access-policy/schema gaps before declaring those features available.
5. Give only the Amplify `pr-1` preview the staging URL and publishable key, keeping the main branch settings separate. Build and verify deployed signed-out routing and real staging account flows.
6. Exercise signup/login, onboarding, booking retries/server prices, learner-approved parent links, progress saves, queued study posts/replies, administrator moderation, reports and private-file upload/download/replacement/delete. The local SQL fixtures are evidence for database rules, not substitutes for these service tests.
7. Verify SMTP/sender delivery, approved model access and merchant sandbox callbacks only once the relevant settings/accounts are available. Disable any visible feature whose complete backend flow is not verified.
8. Record live acceptance results, recovery/backup readiness and deployment-origin auth redirects before merging PR #1. No production merge, database migration, provider activation or branch deletion has occurred in this baseline work.

The existing live advisor's 18 policy gaps and other legacy feature contracts remain tracked in `functional-audit.md` and `functional-blockers.csv`. The baseline reproduces their current state; it does not claim to repair them by copying it.
