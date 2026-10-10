# ADR-0001: Authorization & Identity Architecture

**Status:** Accepted
**Date:** 2026-10-10
**Deciders:** CIO, Tech Lead
**Supersedes:** None
**Superseded by:** —

---

## Context

SmartBridge FET is a South African education platform serving students,
parents, tutors, and (imminently) school administrators and district
coordinators. It is subject to POPIA. It operates in a market with
long replacement cycles (schools sign 5–7 year commitments).

Prior architecture assumed: single-tenant, single-role, client-enforced
authorization. This ADR establishes principles that will remain valid
across all foreseeable growth paths.

---

## Decision

We adopt four architectural principles that govern all authorization
and identity work, now and in the future.

### Principle 1 — Server is the source of truth for authorization.

All authorization decisions are enforced by the database (RLS) or
server-side functions. The client *reflects* what the server *permits*.
The client *never* enforces. Client-side role checks exist solely for
UX (hiding buttons, routing users).

**Consequences:**
- Every table has RLS enabled. No exceptions.
- Every RLS policy references a role or capability source of truth,
  never a hard-coded list.
- Client bugs are UX bugs, not security bugs.
- Auditors are satisfied by inspecting the database alone.

**Reversal cost:** Low for UX; High for security if relaxed. Principle
is not subject to relaxation.

### Principle 2 — Capabilities are data. Roles are data.

A user's permissions are represented as a set of capability strings
(e.g. `manage:users`, `view:student_progress`). Roles are named
bundles of capabilities. Both are data, not code.

**Consequences:**
- Adding a new role is a configuration change, not a deployment.
- Users may hold multiple roles simultaneously.
- Users may hold different roles in different tenants.
- `role` (string) is a compatibility shim only; `can()` is the API.

**Reversal cost:** Medium. Migrating back to string roles would
require touching every `can()` call site. Accepted.

### Principle 3 — Every row, query, and session is tenant-scoped.

Every data row is associated with a tenant. Every query is filtered
by tenant. Every session is bound to a tenant. Even when today's
tenant count is one.

**Consequences:**
- Onboarding school #2 is a data operation, not an engineering one.
- The tenant model itself may evolve (school → district → province)
  because it is data, not schema.
- Cross-tenant data leakage is architecturally impossible, not
  merely policed.

**Reversal cost:** Very high once data exists. Principle is not
subject to relaxation.

### Principle 4 — Auth providers are swappable dependencies.

All auth-provider-specific code lives behind a single adapter
interface. No page, component, or context reaches into the auth
provider's SDK directly.

**Consequences:**
- Migrating from Supabase Auth to another provider touches one file.
- We have commercial leverage when negotiating with providers.
- We can run dual providers during a migration window.

**Reversal cost:** Low. This principle only constrains structure,
not behavior.

---

## Alternatives Considered

1. **Client-enforced authorization.** Rejected: fails POPIA,
   fails audit, unsafe by construction.
2. **Hard-coded role list.** Rejected: every new role requires a
   deployment, forecloses multi-tenant flexibility.
3. **Defer multi-tenancy until needed.** Rejected: retrofitting
   multi-tenancy is a 6–12 month project; deciding now costs a week.
4. **Deep integration with a single auth provider.** Rejected:
   creates lock-in and removes negotiating leverage.

---

## Compliance

- **POPIA:** Sections 19–22 (security safeguards) are satisfied by
  Principle 1. Section 14 (data subject access) is supported by
  audit logging (see ADR-0002).
- **FERPA-equivalent (future):** Principles 1 & 3 pre-position us
  for compliance without architectural change.

---

## Review

This ADR is reviewed annually. Any exception to a principle requires
explicit CIO approval and an accompanying superseding ADR.

**Immutability clause:** Principles 1 and 3 are non-negotiable.
Principles 2 and 4 may be revised only via a superseding ADR
with 90 days' notice.
