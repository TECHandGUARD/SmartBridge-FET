# SmartBridge FET — South African legal counsel review pack

**Status: INTERNAL DRAFT — NOT LEGAL ADVICE — NOT APPROVED FOR PUBLICATION**  
Prepared: 17 October 2026 | Operator: TECH AND GUARD (Pty) Ltd | Platform: SmartBridge FET (CAPS Grades 10–12)  
**Exclusion:** No Yoco implementation, payment keys, webhook changes, settlement execution or checkout modification.

## Purpose and review instructions

This is a structured briefing for an appropriately qualified South African attorney and the business owner. It is **not** a certification of legal compliance or a replacement for legal advice. The 10 unpublished `public.legal_documents` records explicitly state that they are drafts. Do **not** change `is_published`, remove draft disclaimers, activate consent collection, or represent these documents as binding before counsel approves final versions and the owner signs off. Existing three published privacy notices remain unchanged.

Counsel should return: (1) redlined documents; (2) applicable legal requirements and any exceptions; (3) a risk ranking; (4) unresolved operational facts; (5) an approved publication/consent matrix; and (6) a written release recommendation. The owner should approve all commercial policies and factual representations before publication.

## Product facts to validate with owner

- A South African online learning platform and tutor marketplace serving Grades 10–12; may process minors' personal information.
- Student tutors and SACE tutors apply, submit credentials and undergo admin review; not every applicant is accepted.
- Profiles can contain public tutor photographs and introduction videos; private identity, professional credentials and parent consent must not be published.
- Learners and parents have separate roles. Linking a guardian to a learner needs verification; possession of an email address alone must not confer access.
- Subscriptions and tutor bookings are distinct products. Owner proposed 24-hour notice for full booking-fee refund and a tutor notification requirement. No blanket non-refundable clause can override statutory rights.
- Tutor commissions, actual settlement arrangements, pricing, subscriptions, paid service commencement and refund processes **must be confirmed against deployed behavior**. Draft wording alone is not proof.
- Web/PWA for Android and iOS; native app-store distribution has not been certified.
- Company particulars in drafts: CIPC 2026/155090/07, registered office 6 Marais Road, Stellenbosch, 7600, support aneleq@techandguard.co.za. **Verify against current CIPC/company records before public use.** Collect missing public phone, officers, service-of-process address and other disclosures as required.

## Existing legal-document inventory (read-only Supabase audit, 17 October 2026)

| Key | Document | Audience | Status |
| --- | --- | --- | --- |
| `privacy_student` | Privacy Policy — Student | public | published v1.0 |
| `privacy_parent` | Privacy Policy — Parent Addendum | public | published v1.0 |
| `privacy_tutor` | Privacy Policy — Tutor Addendum | public | published v1.0 |
| `terms_service` | Terms of Service | public | draft v1.1 |
| `terms_student` | Student Terms and Conditions | public | draft v1.1 |
| `terms_parent` | Parent and Guardian Terms of Service | parent | draft v1.1 |
| `terms_tutor` | Tutor Policies, Terms and Conditions | tutor | draft v1.1 |
| `refund_policy` | Subscription and Booking Cancellation Policy | public | draft v1.1 |
| `privacy_service_addendum` | Service, Media and AI Privacy Addendum | public | draft v1.1 |
| `guardian_consent` | Guardian Consent and Participation Form | parent | draft v1.1 |
| `indemnity_parent` | Parent/Guardian Participation and Limited Indemnity | parent | draft v1.1 |
| `indemnity_student` | Student Participation and Limited Indemnity | student | draft v1.1 |
| `indemnity_tutor` | Tutor Participation and Limited Indemnity | tutor | draft v1.1 |

All 13 records currently lack a PDF attachment. Published documents are Markdown text in the database; the responsive `/terms` reader is an interface, not legal approval.

## Counsel issue list — priority order

### Critical — minors, safety, authority and privacy

1. **POPIA children:** Determine the lawful basis for each category of processing, whether prior consent of a competent person is needed, the guardian's verified authority, and the exact steps for withdrawal, access, objection and deletion. Do not treat a child's checkbox or an unverified parent email as sufficient consent. Assess special personal information, biometrics, recorded sessions and AI prompts separately.
2. **Safeguarding:** Establish an operational child-protection policy covering tutor identity checks, safe communication channels, allegations, immediate suspension, escalation, response times, evidence retention, human review and appropriate reporting. Clarify applicable Children's Act and mandatory reporting duties with counsel.
3. **Data minimisation:** Define which tutor qualifications/SACE details are stored, who can see them, how long retained, encryption/storage access and document-deletion procedures. Public tutor photos/videos must be clearly labelled public. No public uploads of learner likenesses or ID documents without lawful basis.
4. **Privacy and processors:** Verify actual processors, hosting regions, transfers outside South Africa, notification wording, security measures, breach handling, retention schedules and contact details of the Information Officer. Do not assert a particular processor or data location without evidence.

### High — consumer rights, money terms and contracts

5. **ECTA online disclosures:** Verify section 43 supplier information, legal entity and contact details, all-inclusive pricing, service delivery, transaction record retention, payment/privacy safeguards, refund terms and a review/correct/withdraw step before order placement. Examine whether section 44 cooling-off rights and exceptions apply to each product, including when service begins.
6. **CPA fairness:** Review section 48 unfair terms and section 49 conspicuous notice/assent for limitations, indemnities and assumption of risk. Ensure no automatic blanket waiver or unlimited indemnity, particularly involving children. Review section 51 prohibited terms and section 14 fixed-term/renewal issues as applicable.
7. **Subscription refunds:** The current draft says 'ordinarily non-refundable after access starts', with mandatory-law exceptions. Counsel must confirm when access starts, how cancellation and renewal work, which cooling-off rights apply and how refunds for non-delivery, defective service or unlawful charges are handled. Do not justify non-refundability solely by server/database costs.
8. **Tutor bookings:** Review the 24-hour full-refund promise, what happens exactly at the cutoff, failed email delivery, late cancellation, no-show, tutor cancellation, inability to perform, chargebacks and exceptions. Ensure the UI and support process match the final policy. **Do not alter Yoco** as part of this review.
9. **Tutor status:** Examine independent contractor vs employment risks, income/tax representations, professional credential claims, student tutor suitability, any registration obligations and responsibility for quality, learner safety and cancellations.
10. **Liability:** Clarify the platform's responsibility for its own negligence, independent tutor acts, safeguarding incidents and contractual service failures. Draft terms already preserve mandatory rights; verify this is sufficient and conspicuous.

### Medium — acceptance, records and operational enforceability

11. **Contract formation:** Map each document to a specific audience and event. Record document key, approved version/hash, account, date/time, evidence of meaningful display and affirmative acceptance. Parent consent requires a distinct verified authority workflow, not just the ordinary `accept_legal_document` RPC.
12. **Version changes:** Define notice, grandfathering of existing bookings, when reacceptance is required, immutable archival, dispute evidence and rollback. Do not silently replace published text in place.
13. **Accessible notices:** Ensure legal pages are available before sign-up and in the logged-in mobile experience; legible at 320px, keyboard accessible, usable with VoiceOver/TalkBack, and downloadable or printable. Separate privacy notice (transparency) from contractual acceptance.
14. **Complaints:** Confirm an accessible support route, dispute escalation, consumer remedies and any regulator/ombud contacts that actually apply.
15. **Marketing:** Verify no guaranteed earnings, CAPS endorsement, teaching-practice credit, exam results or verified credentials without supporting evidence. Review referral consent and use of minors' testimonials.

## Draft-specific questions for counsel

- **`terms_service`:** Are the operator/service disclosures complete? Which representations about subscriptions, tutors, AI, hosting, liability and access need fact-checking? Does the platform act as a supplier, intermediary or both for each transaction?
- **`terms_student` and `terms_parent`:** What minimum age and competent-person authority rules apply? What is the verified process for linking a parent, handling disputed guardianship and withdrawing access?
- **`terms_tutor`:** Does the contractor language reflect actual control? What credentials must be checked? What is the approved commission, payout timing and dispute procedure? Avoid creating contractual promises unsupported by operations.
- **`refund_policy`:** Which statutory exceptions override 'non-refundable'? Is 24 hours a fair and lawful cutoff for each session type? Are tutor notifications a user obligation or an operational courtesy? What happens if a tutor fails to deliver?
- **`guardian_consent`:** What evidence of guardian authority is necessary? What granular choices must be separately opt-in (media, recordings, marketing, AI, progress sharing)? Is consent withdrawable and how is it recorded?
- **`indemnity_parent`, `indemnity_student`, `indemnity_tutor`:** Are the risks clearly and conspicuously disclosed? Which waivers/indemnities must be removed or limited? Are minors asked to sign any unenforceable promises?
- **`privacy_service_addendum` and published privacy notices:** Do they describe the *actual* data flows and cross-border processors? Is any notice outdated, incomplete or inconsistent with tutor media being public?

## Legal references for counsel to verify (not an exhaustive or authoritative opinion)

- POPIA Act 4 of 2013, particularly sections 34–35 (children): https://popia.co.za/section-35-general-authorisation-concerning-personal-information-of-children/
- Consumer Protection Act 68 of 2008, especially sections 48–49 (fair terms, conspicuous risk/indemnity notices): https://lawlibrary.org.za/akn/za/act/2008/68/eng%402015-03-13
- Electronic Communications and Transactions Act 25 of 2002, especially sections 43–44 (online disclosures and cooling off, subject to exceptions): https://www.saflii.org/za/legis/consol_act/ecata2002427/
- Verify the latest in-force consolidated legislation, regulations, regulator guidance, court decisions and any applicable Children's Act, Cybercrimes Act, education/professional or tax obligations at the date of advice.

## Proposed review workflow and release gate

1. **Owner fact check:** Confirm CIPC/office, responsible officer, phone and support contacts; active products, prices, recurring terms, booking service and tutor status; child consent and safety operations; processors, hosting and retention. Mark unknowns as unknown.
2. **Counsel redline:** Attorney edits all 13 documents, flags conflicts, determines if additional policies/forms are required, and specifies the exact audience, acceptance method and applicable statutory exceptions.
3. **Operational reconciliation:** Engineering maps each approved clause to a tested UI, database permission, notification, consent and support procedure. Do not promise what the platform cannot actually do.
4. **Approval record:** Owner and attorney record approved version/date and publication matrix. Separate any confidential forms from public terms. No automatic mass-publication.
5. **Staging test:** Anonymous, learner, parent, pending tutor, approved tutor and admin role tests; document version/hash acceptance; private form access denied to other users; mobile/iOS/Android accessibility; audit and rollback.
6. **Controlled release:** Explicit owner authorization for the final identified documents; publish only the approved versions and monitor acceptance and support. **Yoco excluded** from this workstream.

## Sign-off template (to be completed by humans)

- Reviewing attorney / firm and qualification: **[PENDING]**
- Review date and legal sources/currentness: **[PENDING]**
- Documents approved by exact key/version/hash: **[PENDING]**
- Outstanding conditions and risk acceptance: **[PENDING]**
- Operator's factual and commercial approval: **[PENDING]**
- Authorization to publish specified approved documents: **[PENDING]**
- Production publication evidence and rollback contact: **[PENDING]**

**Never treat this template, a green CI build, or owner permission to develop as a lawyer's legal sign-off.**
