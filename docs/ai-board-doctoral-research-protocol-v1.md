# SmartBridge FET — Advanced Research Protocol for AI Executive Board
Date: 2026-10-26 | Status: research and engineering standard, not deployed governance.

## Research approach
Use a doctoral-level evidence hierarchy: (1) South African binding statutes and regulators; (2) official governance/technical standards; (3) peer-reviewed organizational and management research; (4) independently corroborated operational evidence; (5) internal product data only after validation. Separate observed facts from assumptions, choices and projections. Evidence of no data is not proof of no risk. Record source, publication/version/date, applicability, limitations and conflicts. A research document is not legal advice or a qualified audit.

## Applicable governance sources and interpretation
- IoDSA, King V (released 2025-10-31; for financial years beginning on/after 2026-01-01). Governance, accountability, ethical and effective leadership; King V principles are guidance and do not give AI a company director's legal status. https://www.iodsa.co.za/page/king-v
- NIST AI RMF Core Govern/Map/Measure/Manage and Generative AI Profile AI 600-1 (2024). Lifecycle risk and verifiable evaluation. https://airc.nist.gov/airmf-resources/airmf/5-sec-core/ ; https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
- COSO Enterprise Risk Management (2017): integrate risk with strategy, performance, and information reporting. https://www.coso.org/enterprise-risk-management
- Kaplan & Norton (1992), Balanced Scorecard, Harvard Business Review; PubMed 10119714. Four balanced perspectives rather than financial-only KPIs. https://pubmed.ncbi.nlm.nih.gov/10119714/
- South African POPIA, section 35 and associated restrictions on personal information of children; consult qualified legal counsel for lawful basis and privacy impact. https://popia.co.za/section-35-general-authorisation-concerning-personal-information-of-children/

## Research questions and falsifiable hypotheses
RQ1: Does a single CEO coordination protocol reduce unresolved cross-executive issues vs independent executive responses? Metric: % cases correctly delegated and reported with clear accountable owner.
RQ2: Can read-only CFO financial reconciliation exceed deterministic baseline accuracy without invented figures? Baseline: SQL and arithmetic reconciliation; forbid language-model-generated authoritative financial totals.
RQ3: Can the COO respect tutor opt-outs and send permissions in 100% of high-risk synthetic scenarios? Critical failure threshold: zero.
RQ4: Do AI recommendations improve customer experience without exposure of minors' personal information? Test with simulated privacy scenarios first.
RQ5: Can all executive actions be reconstructed from auditable evidence and explicit founder approval? Test replay and tamper resistance.

## Operating model — decision rights
Founder retains ultimate authority for all financial mutations and all high-impact company decisions. The CFO can review, calculate, prepare recommendations and report directly to founder, but cannot change finance settings, prices, discounts, commissions, budgets, payments, refunds, invoices or records without founder's exact approval. General CEO approval, historical permission, silence or timeout are insufficient. Technical implementation must enforce approval server-side, bound to exact action and parameters, expiring and single-use or otherwise explicitly scoped, with server-side role verification, auditable identity and outcome. No implementation is claimed yet. Policies enforced only in prompts are insufficient.
CEO orchestrates read-only prioritization and controlled hand-offs, does not impersonate board directors.
COO owns tutoring process reliability and consent-aware follow-ups.
CMO designs campaigns but does not send unsolicited commercial messages.
CIO manages risk findings and deployment proposals but never bypasses change control.
General Manager triages service quality and learner safeguarding.

## Evaluation methodology
Create 30+ synthetic cases per role with ground-truth reference or acceptable response range; blinded grading by separate reviewer when possible; stratify standard, rare, contradictory, prompt-injection, missing data, and legal/privacy cases. Record accuracy, evidence traceability, calibration of uncertainty, safety/consent compliance, approval routing, reproducibility and task completion.
Use deterministic property tests for approval, monetary arithmetic, opt-outs, rate limits and isolation of each executive's tools. Use prompt-based evaluations only for judgement and explanation; combine with qualified human review.
Acceptance proposal: zero severe violations in critical scenario sets; >=90% evidence-grounded operational decisions, >=95% correct approval routing, and documented limitations. These are suggested pilot thresholds, not validated targets. Track confidence intervals and repeat tests across prompt/model versions.

## Research and implementation deliverables
1. Evidence matrix with sources, relevance, weaknesses, and company policy decisions.
2. Role competency matrix and scenario bank, training prompts versioned in code.
3. Typed decision objects: question, data provenance, recommendation, impact, risks, necessary approval, owner, evidence timestamps.
4. Server-side signed founder approval for all financial modifications and immutable audit trail.
5. Read-only pilot connected to verified SmartBridge data, with tenant/role isolation and minors' data minimization.
6. Release-readiness memo: tests, provider connection, data lineage, performance, cost, regression outcomes, residual risks.
7. Human founder sign-off prior to any production activation.

## Open questions before implementation
Current financial tables, authorization and identity mapping, admin/founder role membership, production logs, API/model cost constraints, child privacy risk assessment, company governance delegations and actual payment gateway status must be inspected. Do not infer these from historical plans.
