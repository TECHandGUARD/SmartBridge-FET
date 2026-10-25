# SmartBridge FET — AI Executive Suite Phase 1
Status: development specification, NOT a live feature. Scope: existing and incoming accounts.

## Executive responsibilities
- CEO: prioritize strategy, reconcile departmental reports, escalate decisions.
- COO: tutor onboarding, booking readiness, operational checklists.
- CFO: read-only financial metrics, cash flow and commission reconciliation; never execute transfers.
- CMO: approved lifecycle email templates, marketing preferences and opt-outs.
- CIO: security posture, deployment reliability, incident triage; no autonomous production changes.
- General Manager: support queues, customer experience, escalations.

## Phase 1 delivery gates
1. Administrator-only boardroom route with server-enforced role checks.
2. Real read-only account review, paginated and filtered by role, with no simulated metrics.
3. Idempotent onboarding tasks for existing accounts (one-time baseline) and incoming accounts (event-driven).
4. Approved email templates and verified delivery integration, preference enforcement, deduplication, rate limits, bounce/unsubscribe handling.
5. Accessible role-specific tour; optional marketing off by default where consent is required.
6. Audit log for all decisions, executions and delivery provider IDs.
7. Automated authorization, duplicate-trigger and regression tests.
8. Deploy only after checks pass and end-to-end admin validation; no bulk email during smoke tests.

## Safety contract
- Each agent uses least-privilege tools and validated database views; LLM output cannot directly invoke SQL or email sending.
- Approval required for payments, refunds, prices, legal policy, account suspension, sensitive or mass communications, and production infrastructure changes.
- Avoid including children's personal information in prompts and email content.
- Every result is marked PROPOSED, APPROVED, EXECUTED or FAILED with timestamp and evidence.
- For existing users, perform baseline audit first; no retrospective welcome emails without appropriate messaging rules.
- Use an outbox with idempotency keys (event type, account ID, template version) to avoid duplicates.
- Never describe a queued email as delivered.
