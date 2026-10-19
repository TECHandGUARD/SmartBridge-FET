# Store release verification gates

Status: NOT APPROVED FOR STORE SUBMISSION. This is a release checklist, not evidence that tests passed.

## Blockers

- Implement and test authenticated in-app account deletion, identity verification, data erasure across storage and service providers, lawful retention, and audit handling. The public deletion request page is only an interim request route.
- Validate privacy policy, POPIA obligations, minor/guardian consent, tutor safeguarding, reporting and moderation.
- Validate payment flows, refunds, webhook replay handling and digital subscription billing rules for each store.
- Test complete sign-up, learner, parent, tutor, admin, booking, payment, email and support journeys with real sandbox accounts.
- Verify AI accuracy and safety across Grades 10–12; uploaded document retrieval and general knowledge fallback must identify their sources honestly.
- Confirm downloadable curriculum material is properly licensed, indexed, grade-filtered and not misleadingly described.
- Build and sign Android and iOS release artifacts. Test physical devices, screen readers, low-bandwidth use, app links, notifications, install/update and crash reporting.
- Prepare store screenshots, support contact, accurate data safety and privacy declarations, age rating, reviewer credentials and required testing tracks.

## Price competitiveness

Current database plan prices observed on 19 October 2026: student R5, parent R150, tutor_pro R350. Review costs, verified entitlements and existing customer commitments before changing live prices. Compare tutor commissions and parent features, not just monthly fees. Do not advertise unsupported benefits or automatic renewals.

## Release decision

Do not mark this checklist complete without reproducible automated test results, human safety review, provider sandbox confirmations and successful signed mobile builds.
