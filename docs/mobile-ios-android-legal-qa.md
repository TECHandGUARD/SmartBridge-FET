# Android, iOS and legal-document release matrix

Status: **web/PWA compatibility work in progress; native app-store compliance is NOT certified**. SmartBridge FET is currently a Vite/React web application with a web app manifest. This repository has not been verified to contain native Android (Gradle/AAB) or iOS (Xcode/IPA) projects. PWA installation and App Store / Play Store publication are different release paths.

## Implemented in this PR

- The public `/terms` page is now a mobile-friendly, categorized document reader with clear version labels, PDF download where authorized, optional recorded acceptance, and a retry state.
- Privacy and legal links are visible in the signed-in **mobile layout**, including the verification-pending screen. They are not hidden behind a desktop-only footer.
- The PWA manifest no longer locks the application to portrait orientation. Android tablet, iPad, and landscape use should remain available.
- iOS home-screen metadata added. This does not make the site an App Store app.
- Browser tests cover legal-page readability at 320, 390 and 768px and visibility of pending/verified tutor legal links.
- Privacy download now truthfully exports text instead of labelling an HTML file as a PDF.

## Required physical-device acceptance tests (not yet performed)

| Device / mode | Minimum test | Pass evidence |
| --- | --- | --- |
| iPhone Safari (small screen) | Register, login, Google redirect, onboarding, legal page, privacy page, consent modal, back navigation, keyboard and safe-area bottom navigation | Device, iOS version, video/screenshots with no private information, pass/fail |
| iPhone home-screen PWA | Install, open, refresh, sign in/out, deep link, portrait/landscape, interrupted connection, resume after background | Device and iOS version, documented result |
| iPhone media upload | Photo picker JPEG/PNG/WebP, HEIC rejection/help, MP4 intro, MOV rejection/help, 20 MB limit, 30–60 sec video validation | Supported and unsupported formats tested on device |
| Android Chrome | Same registration, consent, legal and booking UI at 320–412px; download PDF; keyboard overlay and Back | Device and Android version, documented result |
| Android installed PWA | Install prompt where supported, icon, launch, offline/error state, deep link and session persistence | Device and Android version, documented result |
| Tablet/iPad | 768–1024px, landscape and portrait, text scaling, screen reader, pointer and keyboard | Device and OS, screenshots |
| Slow/offline network | 2G/3G throttling, request timeout, clear retry, no duplicate booking/application, no false payment confirmation | Test network and observed behavior |
| Accessibility | Screen reader (VoiceOver/TalkBack), 200% zoom, visible focus, minimum comfortable tap targets, no clipped legal paragraphs | Accessibility issue list and retest |

**Release blockers:** No app-store compliance claim without native package, store account, real-device testing, account deletion journey, child-safety and privacy review, and store-specific data disclosures. Do not imply the tutor media bucket is private: public tutor profile media is intentionally publicly accessible.

## Official store requirements to review before submission

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple account deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple App Review information, including demo accounts and tested devices: https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review
- Google Play account deletion (in-app path and web request link): https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play target API levels: https://support.google.com/googleplay/android-developer/answer/11926878
- Google Play technical quality: https://support.google.com/googleplay/android-developer/answer/17492799

As of 17 October 2026, Google Play's published policy requires new ordinary Android apps and updates to target **Android 16 / API 36** (subject to documented exceptions/extension). This target does not apply to a PWA hosted as a website; it applies to a submitted Android package.

## Legal review and authorization gates

**Developer can complete without account-level changes:** responsive document navigation, safe rendering, automated tests, accessibility improvements, and staging review.

**Owner authorization / access required before changes:**
1. **Publishing or replacing legal terms:** Owner-approved final documents and qualified South African legal review. The existing tutor agreement includes specific commission, subscription, payment gateway and Thursday payout promises; do not silently revise or publish them. **Yoco work is explicitly excluded.**
2. **Changing production authentication, domain, DNS or email sender:** owner-approved GoDaddy/Google Cloud/Supabase settings, verification and rollback plan.
3. **Native store distribution:** decision between website/PWA only versus Android and iOS app-store packages; if store distribution, developer accounts, bundle identifiers, brand assets, certificates/signing access and approved store disclosures are required.
4. **Real device QA:** access to actual iPhone/iPad and Android devices, or an authorized device-testing service; emulator/browser simulation is not a substitute for every native-device check.
5. **Production database security changes:** staging proof, backup and explicit review for policy/function changes that could restrict users or expose data.
6. **Child safeguarding and data handling:** owner-approved incident contact, moderation responsibilities, consent workflow and legal review before broad recruitment.

## Acceptance policy

- CI and browser automation must pass on the final PR commit.
- Verify `/terms`, `/privacy` and tutor-pending links while logged out, logged in, and on mobile.
- Check authorized vs unauthorized documents with real test identities. Client-side navigation is not a substitute for Supabase RLS and storage authorization.
- Do not merge or claim production readiness until tests and security review pass.
- No Yoco implementation, configuration or tests in this workstream.
