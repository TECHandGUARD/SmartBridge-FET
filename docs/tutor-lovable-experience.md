# Tutor experience release candidate

Tutors choose a standard hourly rate, with optional subject overrides and an optional free 30-minute introductory session. Empty rates mean unavailable, zero means intentionally free. The previous R50–R1,000 restriction is removed. Rates must be finite, non-negative currency amounts with at most two decimal places; the platform imposes no commercial floor or ceiling.

The existing dashboard, routes and component structure are retained. The editor confirms the updated row before reporting success, keeps entered data on failure, and restores saved values when Discard Changes is selected. The public directory exposes only the two new professional pricing fields in addition to its existing restricted projection; private profile metadata remains excluded.

Both learner booking entry points show the subject rate and estimated total. Introduction requests are explicitly marked, fix duration at 30 minutes, and are checked on the server. One pending, confirmed or completed introduction is allowed per learner and tutor; cancelled introductions may be requested again. Database locking and a unique index protect against concurrent duplicate requests. Request IDs preserve retry deduplication. Existing regular booking callers keep their seven-argument RPC contract. All booking prices are calculated by the database; the browser supplies no amount. Tutors can also offer regular free sessions. NPO sponsorship budgets and eligibility are a separate unfinished flow.

## Validation

- `npm test`: 61 passing tests, including absent/free/invalid rates, subject overrides and introduction retry IDs.
- `npm run check:db`: full migration replay on local PostgreSQL 17 (PGlite), plus thirteen SQL fixtures. New cases exercise subject pricing, zero prices, missing prices, introduction eligibility/duration, retries, price synchronisation and protected booking fields under authenticated roles.
- `npm run lint`, `npm run typecheck`, `npm run check:api`: passed.
- `npm run build`: passed using explicitly fake Supabase public settings. This verifies compilation, not connection to the live project.
- Existing `npm run test:e2e`: passed with isolated provider fixtures.
- New `npm run test:e2e:tutors`: passed at 375px and 1280px. Covers failed-save retry, standard/subject rates, intro opt-in, discard, blank preview, zero persistence, and both learner booking entry points. Browser requests are mocked; actual database rules are tested separately by the SQL suite.

Browser downloads from the normal Playwright CDN failed in this environment. Tests ran with an independently installed Chromium 153 executable, supplied using the existing `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override. No browser dependency was added to the application.

## Release sequence and limits

1. Review this development branch. No changes have been merged into main or deployed by this work.
2. Apply `20261016194105_tutor_flexible_pricing.sql` to the intended SmartBridge database before deploying the frontend. Verify the new directory fields and both booking RPC signatures in staging.
3. Test real tutor and learner accounts through save, reload, directory display, subject booking, intro confirmation and cancellation. Local mocks do not prove hosted RLS, authentication or browser-to-hosted-database behaviour.
4. Deploy the corresponding frontend and repeat smoke tests on the actual site.

Yoco keys, webhook setup, payments and production settings were untouched. Free sessions remain pending tutor confirmation and do not imply receipt of payment. The STEM lab remains behind its existing release gate; CAPS mapping, simulation links and non-tutor teacher access still need verification and implementation. This is a tested tutor increment toward the minimum lovable product, not a declaration that the entire application is ready for launch.


Subsequent work: see `mlp-integration-20261017.md` for the combined STEM lab and NPO sponsorship candidate. The statements above describe the earlier tutor-only checkpoint.
