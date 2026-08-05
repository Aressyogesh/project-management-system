# OWASP Security Review — F-003: Holiday Calendar Configuration

**Reviewer:** Claude Code  
**Date:** 2026-05-25  
**Branch:** feature/F-001-user-login  
**Scope (files reviewed):**

```
backend/src/settings/settings.service.ts   (Holiday methods)
backend/src/settings/settings.controller.ts
frontend/src/features/settings/components/HolidaySection.tsx
frontend/src/features/settings/pages/PortalConfigPage.tsx
```

---

## Part A — OWASP Web Top 10

| # | Risk | Applicable? | Status | Evidence / Notes |
|---|------|-------------|--------|-----------------|
| A01 | Broken Access Control | Yes | PASS | `@Roles(SUPER_USER, ADMIN)` on POST/DELETE; GET is read-only for all authenticated users |
| A02 | Cryptographic Failures | No | N/A | Holiday data is non-confidential |
| A03 | Injection | Yes | PASS | Prisma ORM; `date` converted to `new Date()` before DB write; no raw SQL |
| A04 | Insecure Design | No | N/A | Standard CRUD; no elevated threat |
| A05 | Security Misconfiguration | No | N/A | No new config surfaces |
| A06 | Vulnerable & Outdated Components | Yes | NOTE | No new deps added; project-level audit unchanged |
| A07 | Authentication Failures | Yes | PASS | Global `JwtAuthGuard`; all settings routes require valid Bearer token |
| A08 | Software & Data Integrity Failures | No | N/A | |
| A09 | Logging & Monitoring Failures | Yes | NOTE | No audit log for holiday creation/deletion; deferred to Phase 11 |
| A10 | SSRF | No | N/A | No outbound HTTP calls |

---

## Part B — OWASP API Security Top 10

| # | Risk | Applicable? | Status | Evidence / Notes |
|---|------|-------------|--------|-----------------|
| API1 | Broken Object Level Authorization | No | N/A | Holidays are global org records |
| API2 | Broken Authentication | Yes | PASS | JWT validated; tokens expire per config |
| API3 | Broken Object Property Level Authorization | Yes | PASS | `CreateHolidayDto` exposes only `name`, `date`, `isRecurring`; `id`/`createdAt` not writable |
| API4 | Unrestricted Resource Consumption | Yes | NOTE | No pagination on GET holidays; no rate limit. Low risk — holiday list small by nature |
| API5 | Broken Function Level Authorization | Yes | PASS | Only SUPER_USER/ADMIN can create or delete holidays |
| API6 | Unrestricted Access to Sensitive Flows | No | N/A | |
| API7 | SSRF | No | N/A | |
| API8 | Security Misconfiguration | Yes | PASS | CORS and error filtering in place |
| API9 | Improper Inventory Management | Yes | PASS | All endpoints documented in Swagger |
| API10 | Unsafe API Consumption | No | N/A | |

---

## Part C — Feature-Specific Checks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| C1 | Input validated with `class-validator` on DTOs | NOTE | `CreateHolidayDto` uses plain interface; same deferred decorator issue as F-002 |
| C2 | No raw SQL — Prisma used exclusively | PASS | `date` string → `new Date()` → Prisma; no injection vector |
| C3 | Sensitive fields excluded from response | PASS | No sensitive fields in Holiday model |
| C4 | `@Roles` on all mutating endpoints | PASS | POST and DELETE both guarded |
| C5 | JWT guard active globally | PASS | |
| C6 | No secrets hardcoded | PASS | |
| C7 | File uploads | N/A | No uploads |
| C8 | Error responses hide internals | PASS | `GlobalExceptionFilter` active |
| C9 | Frontend stores only JWT in localStorage | PASS | Holiday data in React Query cache only |
| C10 | CORS restricted | PASS | |

---

## Part D — Dependency Audit

No new dependencies added for F-003.

| Scope | Critical | High | Moderate | Low | Action |
|-------|----------|------|----------|-----|--------|
| backend | 0 | 0 | — | — | No new deps |
| frontend | 0 | 0 | — | — | No new deps |

---

## Part E — SAST Notes

No findings from IDE static analysis.

---

## Summary

### Verdict
- [x] **Cleared with mitigations** — low-risk items noted, acceptable for current phase

### Open Risk Items
- **C1 — class-validator decorators missing on HolidayDto**: Same as F-002. Risk accepted; endpoint is role-guarded. Address in Phase 3 DTO refactor.
- **API4 — No rate limiting / pagination on GET holidays**: By design (small dataset). Revisit if bulk import is added.
- **A09 — No holiday change audit log**: Deferred to Phase 11.
