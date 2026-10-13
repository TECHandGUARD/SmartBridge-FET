# SmartBridge-FET staging rollout

## Prepared and verified

Local development continues on Free with no hosted branch or billing authorization.
The later [MVP access follow-up](mvp-backend-access.md) adds a tenth migration and
seventh SQL suite; include that migration before deploying its atomic review handler.

The schema-only baseline and original migration history are reconstructed in the repository. `npm run check:db` tests a fresh PostgreSQL 17 replay of all nine migrations and the six SQL workflow/security suites. The existing live-schema guard passes without changing production. All 38 Edge Function source bundles can be prepared with `npm run prepare:edge -- /tmp/staging-functions`; custom entrypoints and JWT settings are declared in `supabase/config.toml`.

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
