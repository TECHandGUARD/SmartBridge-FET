# COO tutor onboarding — staging integration checklist

**Status:** implementation draft; no production schedule, sending, or migration executed.

## Authority
COO has standing authority only for routine onboarding messages to eligible SmartBridge tutor accounts. CMO may review copy. No autonomous permission to send marketing, change pricing, approve tutors, or email arbitrary addresses.

## Configuration
- `COO_EMAIL_ENABLED=false` by default; only enable after tests, proof of consent/legal basis, and verified Resend sender domain.
- Reuse `JOB_AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` from existing backend.
- Expose `coo-tutor-onboarding` only through job-authenticated scheduling; do not allow anonymous/ordinary user invocation.
- Add `coo-tutor-onboarding` to the allowlist in `runScheduledJob/entry.ts` after staging verification and add a unique operational job record. Schedule daily around 09:00 Africa/Johannesburg. Existing operational scheduler configuration and secret wiring must be verified before production activation.
- Verify tutor profile URL: current code uses `/tutor/profile` as an initial candidate, not yet confirmed from route inventory.
- Sync `coo_tutor_email_log` with the existing signed Resend webhook to track delivered/bounced/suppressed, not just provider-accepted.
- Add an admin-only COO daily report/Board UI using database aggregates of logs and eligible counts. No tutor email addresses in public reporting.
- Verify `users.communication_preferences` valid values and default to no send if email permission cannot be established; refine before enabling.

## Staging acceptance
1. Confirm fields and actual definition of profile completeness, with legitimate alternate qualifications and rates.
2. Fake tutor aged 47h => no email; 48h incomplete => eligible; complete => skipped; opt-out => skipped.
3. Concurrent workers => at most one reservation for each campaign and no more than 25 reservations per Johannesburg local day.
4. Simulated provider failure => failed audit record, no duplicate sends or confusing resend.
5. Resend webhook accepted/delivered/bounced => matching COO audit states with signed event.
6. Route redirects authenticated tutor to edit screen.
7. Scheduler requires job token and respects kill switch.
8. Daily report reconciles provider acceptance vs delivered and failed with actual counts.
9. Ensure GDPR/POPIA compliance and no email without authorised basis.
10. Keep rollout OFF until all acceptance checks pass.

## Safety
Reservation consumes the cap before provider call. Failure handling deliberately prioritises duplicate prevention over automatic retries. A failed send may be retried only after explicitly designed safe recovery with Resend idempotency.
