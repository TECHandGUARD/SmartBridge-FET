# Combined tutor, STEM lab and sponsorship candidate

This increment continues PR #6 and preserves the existing SmartBridge dashboard and route structure. It combines the tutor improvements with a guided lab pilot and verified external sponsorship allocations. Yoco credentials, webhooks and provider integration are untouched.

## Included behaviour

- Tutors choose a standard rate, optional subject rates, and an optional free 30-minute live introduction. The separate optional recorded profile video is clearly labelled 30–60 seconds. Missing prices remain unavailable; intentional zero prices remain free. A blank optional study year now saves as NULL to satisfy the real database constraint.
- Tutor profile saves require an updated row, retain input after failure, and restore saved fields on discard. Phone editing uses ordinary page scrolling and wrapping buttons.
- The STEM lab supplies three original Physical Sciences activities: Grade 10 transverse waves, Grade 11 Ohm’s law and Grade 12 acid strength/concentration. The curriculum references are printed CAPS pages 27, 88 and 127. Existing learner/parent accounts can access classroom mode without tutor registration; this is not a separate teacher-account onboarding system. `/stem-lab` and the learner dashboard expose the pilot.
- Activities include predictions, guided steps, evidence tables, questions and explanations, low-data paper alternatives and downloadable **text** worksheets with visit-only notes. PhET loads only after an explicit external-link click. Existing database simulation records are untouched; the pilot intentionally displays its reviewed static catalogue, not arbitrary admin-managed records. It does not replace prescribed physical practical assessments, cover every STEM subject, save classroom records, or make the whole app work offline.
- Admins record externally verified funding with an audit reference and verification note, allocate learner budgets, and pause programmes. Learners choose their allocated funding at either booking entry point. No sponsor or learner can manufacture a balance. Admin recording is an operator assertion about actual funds, not a payment-provider verification.
- Server prices, row locks, request deduplication and allocation limits protect reservations. Cancellation releases reserved funding; completed sessions consume it. Sponsored records have `amount_paid=0`, do not grant a cash refund to the learner, and do not claim tutor settlement. Actual disbursement/reconciliation, top-ups and sponsor self-service are outside this increment.
- Admin tutor reports now use saved booking amounts, including zero, rather than the tutor’s current rate. Session value, recorded payment receipts and sponsored value are distinguished from tutor payouts.

## Verification evidence

- 69 unit/API regression tests passed on the combined tree.
- Local PostgreSQL 17 replay passed all migrations and fourteen SQL security/workflow fixtures, including learner isolation, funding caps, snapshots, cancellation/retry and intro eligibility.
- Lint, full typecheck, API mapping check and a production build with explicitly fake public settings passed. Fake settings verify compilation, not hosted connectivity.
- Existing core browser tests plus focused tutor, STEM lab and sponsorship browser suites are in CI. Focused suites cover phone and desktop widths, save failure/retry, both booking entry points, non-tutor classroom access, worksheets and no automatic PhET fetches.
- CI on the earlier tutor-only checkpoint `7fc18d9` passed both application checks and disposable real Supabase service tests. The combined candidate additionally includes a two-connection PostgREST funding race and concurrent retry test in `tests/local-supabase-services.cjs`; its combined CI result must be checked before release. Docker/Supabase CLI services are unavailable in the local work environment, so no local run of that container suite is claimed.

## Hosted preflight and rollout

The existing Amplify PR preview was reachable and its public compiled database origin matched `bbhrnidzjeccggununzq` (SmartBridge FET). Read-only hosted checks showed the tutor migration still absent, one active verified tutor and no conflicting populated hourly-rate fields. Existing security-advisor notices remain the previously tracked extension-location and leaked-password-protection settings; private operational tables intentionally deny browser access. No hosted schema changes or user records were written during this preflight.

The two available Supabase connections, **Primary** and **Qamata**, both list this same project. The deployment operator must choose the intended connection before database writes, as required by the connector’s account-selection rule.

After that selection and a passing combined CI:

1. Apply the tutor flexible-pricing migration, then the NPO sponsorship migration, to the intended SmartBridge database; reconcile migration history through the approved deployment path.
2. Verify new columns, public directory projection, function permissions and RLS; run the safe scoped tutor and sponsored-booking acceptance checks. Do not seed invented received funds into a real programme.
3. Release the reviewed frontend; repeat real-account save/reload, pricing, intro, sponsor reservation/cancellation and classroom access checks at the deployed origin.
4. Invite a small pilot group after checking the existing public-onboarding requirements (Auth redirect settings and actual email delivery) in `mvp-release-candidate.md`.

This is a combined, testable minimum-lovable-product increment. It does not certify the entire application, provider payments, formal CAPS assessment equivalence, or legal compliance.
