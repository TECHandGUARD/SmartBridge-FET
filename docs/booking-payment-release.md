# Booking payment release

## Combined workflows

- Payments & pricing: student, parent and tutor subscription labels use subscription_prices, with realtime invalidation and polling fallback. Existing order amounts remain immutable.
- Tutor bookings: paid sessions create a 30-minute reservation and open the server-selected Yoco/Paystack gateway. Only signed, amount/currency/mode-matched receipts fund a session. Tutor acceptance remains separate. Test receipts are visibly labelled and never become actual cash receipts or payout eligibility.
- Free introductions: one active 30-minute introduction per learner/tutor pair, offered only by opted-in tutors. Tutors accept/decline through Booking Requests, or propose a new date/time for the learner to accept. Administrators have oversight. Approved linked parents can book for their learner.
- Booking management: in-app notifications, immutable fee/net snapshots and separate tutor transfer records appear under Admin → Booking Payments. Full Yoco refunds of eligible cancelled bookings use a stable idempotency key and are marked complete only after provider confirmation. A tutor transfer is recorded only after an administrator verifies it with their bank.

## Deployment order

1. Apply booking_checkout_and_introductions migration to the existing SmartBridge FET project.
2. Deploy create-checkout and yoco-webhook using their prepared bundles. Preserve handler authentication and webhook signature checks.
3. Merge the PR after Application checks pass and verify the main Amplify build.
4. Keep Yoco in its configured test mode for hands-on testing. No live credentials or real payment mode are changed by this release.

## Validation

Local database replay includes ownership, price/amount, test/live isolation, replay protection, parent payer, introductory scheduling and refund settlement fixtures. Edge tests cover booking callbacks and client-price/admin-refund rejection. Browser fixtures exercise hosted-checkout navigation, cancelled-checkout retry, both introductory request entry points, and mobile/desktop tutor editing. These fixture tests do not represent a real hosted Yoco transaction.

## Hands-on checks after deployment

1. Change each plan price in Admin → Subscription Pricing; verify the corresponding dashboard and Premium page.
2. As a student, choose a paid tutor session and continue to Yoco test checkout. Cancel, return to Bookings and retry the same reservation.
3. Complete a Yoco test payment and verify the test receipt on student, tutor and administrator screens. The tutor accepts the funded request separately.
4. Request a free introduction. As tutor, accept/decline, or propose another time; as learner, accept the proposal.
5. Repeat a booking as a parent with an approved learner link.
6. Cancel an eligible paid test booking and use Admin → Booking Payments to exercise provider refund handling.

Real tutor bank transfers are outside checkout: this release tracks the verified transfer reference; it does not initiate bank payouts. Test payments do not activate real subscription entitlements.
