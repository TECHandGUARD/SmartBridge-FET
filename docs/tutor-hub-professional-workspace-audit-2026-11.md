# SmartBridge FET Tutor Hub — Professional Workspace Audit

**Review date:** 14 November 2026  
**Repository:** `TECHandGUARD/SmartBridge-FET`  
**Scope:** Tutor dashboard UI, tutor-facing workflows, Supabase row-level security and storage boundaries.

## Executive assessment

The Tutor Hub has a solid functional base, but the inspected implementation does **not yet justify a 10/10 or independently security-certified rating**. It already provides scheduling, bookings, messaging, learner records, lesson planning, resource uploads, reviews, earnings and profile management. The audit identified two important live RLS weaknesses, one credential-status presentation defect, and workflow/navigation gaps. Remediation is being prepared in a reviewable branch; production database policies have not been changed by this audit.

## Role-based workspace coverage

| Audience | Existing strengths | Remaining professional-workspace gaps |
|---|---|---|
| SACE-registered / qualified teachers | Tutor profile, verification state, learner progress, booking management, lesson planning, assessments, marking, resource publishing and communication | Stronger evidence-based learner intervention history, accessible assessment rubrics, moderation/appeal visibility, and clearer safeguarding/escalation workflows |
| University student tutors | Guided lesson studio, learner feedback, structured assessments, bookings, reviews and admin verification | A more explicit supervised-practice pathway, reflective teaching journal, mentor feedback, observation records and CPD/skills progression |
| Experienced tutors | Scheduling, CRM, bookings, messages, reviews, resources and earnings tools | Better workload and retention insights, transparent payout reconciliation, calendar interoperability, repeat-session planning and business reporting |

## Confirmed findings

### High priority — learner-note privacy

The live `public.student_notes` table had a student SELECT policy based only on `auth.uid() = student_id`. It did not check `is_shared_with_student` or `is_confidential`. As a result, any note attached to a learner could be readable by that learner even if the tutor intended it to remain confidential.

The live table currently contained **zero notes** at the time of inspection, so no existing note records were exposed in the count queried. The policy was nevertheless unsafe for future use.

**Remediation prepared:** students can read only notes explicitly shared with them and marked non-confidential; tutors can create/update notes only for learners with a confirmed or completed booking; tutor and learner IDs/emails are bound to authenticated records; the UI now defaults to private and provides an explicit sharing control.

### High priority — tutor availability privacy

The live `public.tutor_availability` table had an unrestricted SELECT policy. Its rows contain tutor email addresses and free-text notes, alongside scheduling metadata. The inspected frontend uses this table in the tutor availability manager; public tutor discovery has a separate restricted directory.

**Remediation prepared:** remove public availability reads; allow verified tutors to manage their own availability and administrators to read it. The tutor availability manager now queries and subscribes by authenticated tutor UUID rather than email.

### Medium priority — resource ownership and deletion

The tutor dashboard offered a delete action, but the live resource policies only allowed administrators to delete resources. This made the tutor-side delete action inconsistent with database authorization. The action also deleted the database row without cleaning up its private storage object.

**Remediation prepared:** permit verified tutors to delete only their own unapproved resources; approved resources remain administrator-managed; the UI hides deletion for approved resources and attempts private-file cleanup after record deletion.

### Medium priority — credential status presentation

The profile editor displayed “SACE Verified” whenever a SACE number was present in the editable form. A supplied number is not proof of a verified SACE credential.

**Remediation prepared:** show “SACE Verified” only when the account role is `sace_tutor`, the profile is admin-verified, and a SACE number is present. Other approved tutor profiles display “Admin Verified”; unverified profiles display “Verification Pending”.

### Medium priority — assessment workflow discoverability

The Assessment Centre already supports tutor-created assessments, moderation, publishing, submissions, marking and feedback, but it was not surfaced alongside the main Tutor Hub professional tools.

**Remediation prepared:** add an accessible Assessment Centre link to the Tutor Hub tool navigation.

## Database security review notes

The live Supabase Security Advisor reported:
- 34 tables with RLS enabled but no policies. Many are internal/private or intentionally deny all client access; this is not automatically a vulnerability, but each table's grants and intended server-only use should be verified.
- One anonymous-executable `public_tutors(uuid)` SECURITY DEFINER function. Its inspected return shape is limited to public tutor-directory fields (name, bio, avatar, subjects, grades, rate and free-introduction availability), so anonymous access appears intentional for public discovery.
- 27 SECURITY DEFINER functions callable by authenticated users. This is an advisor warning, not proof of exploitation. The inspected examples `admin_assessment_review_queue()`, `mark_tutor_assessment(...)` and `my_tutor_assessments()` contain role/ownership checks. Remaining functions still require a complete function-by-function authorization review.

Existing positive controls observed include:
- Restrictive active-account policies on key tutor tables.
- Tutor profile owner/admin SELECT restrictions and a trigger protecting verification and ownership fields.
- Booking update/financial boundaries and server-managed payment/payout fields.
- Private resource storage with owner-path checks and premium-resource access checks.
- Direct-message participant checks and rate limiting.
- Assessment policies limiting tutors to their own assessments and assigned learners; answer keys are removed from the learner-facing assessment RPC.

## Standards used

- OWASP Application Security Verification Standard (ASVS) 5.0 — authorization, data protection, validation, secure design, logging and error handling.
- WCAG 2.2 AA — keyboard access, visible focus, reflow, labels, contrast and accessible interactions.
- NIST SP 800-218 Secure Software Development Framework — secure design, implementation, verification and vulnerability remediation.

## Verification status and limitations

- Repository source and live database policies were inspected.
- The current production database was queried read-only for the relevant policies, triggers, columns and note counts.
- A remediation branch is being prepared for review.
- **The migration has not been applied to production.**
- Authenticated browser testing with separate tutor, learner and administrator test accounts has not yet been completed.
- A full WCAG 2.2 AA audit, independent penetration test, dependency/SCA review, edge-function authorization review and backup/restore exercise remain outstanding.
- This review is not a legal compliance opinion, SACE endorsement or third-party security certification.

## Implementation note

The production app uses React, JavaScript/TypeScript, Tailwind CSS and Supabase SQL. C++ is not part of the current web application stack and should not be introduced merely to satisfy a technology checklist. The appropriate quality bar is semantic HTML, accessible CSS/UI, tested React workflows and server-enforced database authorization.
