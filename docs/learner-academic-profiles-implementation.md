# Learner academic profiles — implementation contract

## Goal
Extend existing SmartBridge FET onboarding and dashboards without replacing existing accounts or changing production until tests pass.

## User journeys
- Learner chooses current Grade 10, 11, or 12, then selects CAPS-aligned subjects (including language level where relevant). Complete profile required before personalised learning views.
- Existing learners are asked to complete missing academic information on next sign-in, without account recreation.
- Learner dashboard filters subjects, content and tutor recommendations by saved grade and subjects; empty states explain how to edit selection.
- Tutor sees only the grade, subject and learning goal relevant to an accepted booking; no unrestricted access to learner history.
- Parent links to child via verified, consent-aware invitation, then sees authorised subjects, sessions, attendance, progress and their own payment records.
- On academic-year change, prompt learner to confirm promoted/repeated grade and current subjects; never assume promotion. Preserve immutable year snapshots and subject-change history.

## Data and security requirements
- Use existing Supabase schema where feasible; inspect current migrations, auth roles, RLS, profile storage and enrolments before writing a migration.
- Normalised grade/year/subject enrolments, year history, tutor lesson notes and parent-child links. Enforce subject selection validity server-side, not only in UI.
- RLS: learner owns their profile; tutors only access assigned booking-specific data; linked guardians have explicitly authorised, age-appropriate access; admins follow least privilege.
- Do not expose children's private details in public storefronts, search results or client logs.
- Backfill existing learners safely, preserving current records; use reversible migrations and no destructive data rewrite.

## Release gates
1. Review existing routes/components and database schema; document compatibility.
2. Implement and test onboarding validation, profile editing, personalised queries and graceful migration for existing users.
3. Implement tutor booking context, parent linking and progress visibility with role-specific integration tests.
4. Verify RLS denial tests, consent, safeguarding, accessibility and responsive mobile UI.
5. Run build, automated tests and manual role-based staging acceptance. Deploy to production only after verified checks and rollback plan.

## Scope protection
Only TECHandGUARD/SmartBridge-FET. Do not modify GuardCommerce/EduConnect or the separate Tech & Guard website.
