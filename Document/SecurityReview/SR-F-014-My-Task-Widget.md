# Security Review — F-014 My Task Widget (Live DB Data)

**Feature:** F-014 — My Task Widget — Live DB Data
**Reviewer:** Security Engineer
**Date:** 2026-05-26
**Status:** APPROVED

## Scope
Changes to `DashboardService.getStats` — reads tasks from DB scoped to `assignedToId = userId` (taken from JWT `sub` claim via `@CurrentUser()` decorator, not from user-controlled input).

## Findings

| # | Area | Finding | Severity | Resolution |
|---|---|---|---|---|
| 1 | Data scoping | `findMany({ where: { assignedToId: userId } })` — userId sourced from verified JWT, not query param | None | N/A — scoping is correct |
| 2 | Data exposure | `select` projection limits fields returned; no password, token, or PII beyond fullName | None | N/A |
| 3 | Injection | Prisma parameterised queries — no raw SQL | None | N/A |
| 4 | Auth | `GET /dashboard/stats` protected by global `JwtAuthGuard` | None | N/A |
| 5 | Rate limiting | No rate limiting on stats endpoint | Low | Deferred to infrastructure hardening phase |

## Verdict
**APPROVED — no critical or high severity findings.**
