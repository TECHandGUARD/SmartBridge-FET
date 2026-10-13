# Onboarding and page flow

> Historical repair checkpoint from the correction repository. See [repository-transfer.md](repository-transfer.md) for validation and blockers in SmartBridge-FET.


This UX pass extends the existing core-flow repair branch. It uses the current React/Vite app, brand colours, route guards and transactional onboarding RPC. It introduces no duplicate account records or curriculum content.

## Account journeys

| Account | Setup steps | Destination | Next action |
| --- | --- | --- | --- |
| Learner | Role → review and privacy consent | `/student-dashboard` | Explore subjects and record study progress |
| Parent / guardian | Role → review and privacy consent | `/parent-dashboard` | Request report access; the learner must approve |
| SACE tutor | Role → SACE credentials → review and agreements | `/tutor-dashboard` | Application review screen until verified |
| University tutor | Role → university and student number → review and agreements | `/tutor-dashboard` | Application review screen until verified |
| Super administrator | Setup bypass | `/admin` | Administration |

Tutor agreement acceptance returns to the review screen. It does not submit an application. Submission has an explicit button, a synchronous duplicate-click guard, a timeout and a visible retry error. Back preserves entries in memory; a full reload intentionally does not persist sensitive credentials. Another-university entry is supported. Completed accounts cannot reopen setup; login, registration, OAuth callback and password recovery use the same destination helper. Users can sign out of setup to correct an account choice.

## Shared components and routes

`src/lib/navigation.js` provides the role destinations and primary/secondary links used by desktop navigation, mobile tabs, the mobile menu and the desktop footer. The four primary destinations match across screen sizes. The menu contains secondary pages and sign-out. Tutor bookings lead to the tutor dashboard's bookings component rather than the learner booking form. Parent linking and report links lead directly to their corresponding dashboard sections.

`useDashboardSection` stores the selected component in `?section=`. Refresh and browser Back preserve the section; unknown sections show the overview. Quick actions expose their selected state and no longer overlap the page header. The responsive shell reserves fixed-header/tab space and device safe areas, uses a skip link, focuses new page content and respects reduced motion for page transitions. Setup role cards use keyboard-accessible radios; form fields have labels; the agreement scroll region is keyboard accessible.

Browser testing found that the empty notification viewport intercepted mobile menu taps. The viewport now allows taps through empty space while individual notifications remain interactive. Mobile touch-target rules also no longer stretch radios and checkboxes.

## Validation and limits

Lint, typecheck, existing unit tests and the production build pass. The mocked browser suite covers the existing ten technical checks plus dashboard history, completed-account redirects, all three additional setup roles, verified tutor navigation and overflow checks at 320, 768, 1024 and 1440 pixels. It checks a failed setup submission retains consent and can retry, Back preserves credentials, and keyboard agreement acceptance makes no submission until the final button. Review/subjects screenshots were inspected locally.

These are controlled browser checks with mocked services. Live OAuth/email, real account data, screen-reader review, user usability sessions and all secondary integrations remain unverified. Database migrations from the core repair must be deployed before the new onboarding RPC can work in production. This branch has not been merged or deployed. The pending tutor screen reflects verification state and does not promise a review deadline. Existing tutor agreement wording has not been rewritten; its payment and timing statements require business review alongside the outstanding integrations listed in `technical-repair.md`.
