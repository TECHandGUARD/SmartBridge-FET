# Feature consolidation dependency audit — 25 October 2026

## Scope
The initial change consolidates **navigation and entry points**, not database models, business logic, payment integrations or permissions. The existing route paths remain reachable to preserve deep links, existing dashboard actions, notifications, bookmarks and automated tests.

## Verified dependencies
- `src/lib/navigation.js` supplies both desktop `Navbar.jsx` and mobile `MobileHeader.jsx` / `MobileBottomTabs.jsx`; updating the shared navigation model affects all three.
- `src/App.jsx` owns route registration, authentication and onboarding guards. Hub routes are additive and use the existing onboarding guard.
- Learning: `/subjects`, `/learn`, `/search`, `/resources-library`, `/videos` remain independent destination pages.
- Practice: `/quiz`, `/assessments` remain separate workflows; assessment link is restricted to supported roles.
- Communication: account messaging remains on role-specific dashboard sections; virtual meetings and instant calls remain at `/meetings`, with existing role protection.
- Career: `/bursaries` and `/opportunities` remain intact.
- Administration and payments: no payment or admin behavior is modified; these require a separate permission-aware audit before consolidation.

## Preservation and risk controls
- No database migrations, schema changes, deletions or user-data migrations.
- No modifications to Yoco, bookings, tutoring, authentication, virtual meetings or call signaling.
- Existing routes and deep links remain accessible.
- Mobile and desktop use the same consolidated navigation.
- Tests check route preservation, navigation and link targets; full CI and manual role-by-role smoke testing required before production deployment.

## Follow-up
- Verify all hubs on desktop and mobile for learner, parent, tutor, tutor_pending, admin and counselor accounts.
- Assess feature usage before hiding forums, study rooms, presentation studio or STEM lab.
- Assess messaging permissions for pending tutor accounts.
- Consolidate payments administration only after permission and payout-contract review.
