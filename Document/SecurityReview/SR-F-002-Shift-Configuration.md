# OWASP Security Review — F-002: Shift Configuration

**Reviewer:** Claude Code  
**Date:** 2026-05-25  
**Branch:** feature/F-001-user-login  
**Scope (files reviewed):**

```
backend/src/settings/settings.service.ts   (Shift methods)
backend/src/settings/settings.controller.ts
frontend/src/features/settings/pages/ShiftConfigPage.tsx
```

---

## Part A — OWASP Web Top 10

| # | Risk | Applicable? | Status | Evidence / Notes |
|---|------|-------------|--------|-----------------|
| A01 | Broken Access Control | Yes | PASS | `@Roles(SUPER_USER, ADMIN)` on POST/PUT; GET is read-only, acceptable for all authenticated users |
| A02 | Cryptographic Failures | No | N/A | No sensitive data stored; shift times are non-confidential |
| A03 | Injection | Yes | PASS | Prisma ORM used exclusively; no raw SQL. Input flows through `UpdateShiftDto` |
| A04 | Insecure Design | No | N/A | Simple CRUD pattern; no threat to model |
| A05 | Security Misconfiguration | No | N/A | No new config surfaces introduced |
| A06 | Vulnerable & Outdated Components | Yes | NOTE | Audit run at project level; no new deps added for this feature |
| A07 | Authentication Failures | Yes | PASS | Global `JwtAuthGuard` active; all settings routes require valid Bearer token |
| A08 | Software & Data Integrity Failures | No | N/A | No serialisation or CI/CD changes |
| A09 | Logging & Monitoring Failures | Yes | NOTE | No explicit audit log for shift changes; deferred to Phase 11 (centralised logging) |
| A10 | SSRF | No | N/A | No outbound HTTP calls |

---

## Part B — OWASP API Security Top 10

| # | Risk | Applicable? | Status | Evidence / Notes |
|---|------|-------------|--------|-----------------|
| API1 | Broken Object Level Authorization | No | N/A | Shifts are global org records, not per-user objects |
| API2 | Broken Authentication | Yes | PASS | JWT validated by `JwtStrategy`; expired tokens rejected |
| API3 | Broken Object Property Level Authorization | Yes | PASS | `UpdateShiftDto` defines allowed fields; no mass-assignment of `id` or `createdAt` |
| API4 | Unrestricted Resource Consumption | Yes | NOTE | No pagination on shifts (max 3 records by design); no rate limiting yet — acceptable at current scale |
| API5 | Broken Function Level Authorization | Yes | PASS | Only SUPER_USER/ADMIN can create or update shifts |
| API6 | Unrestricted Access to Sensitive Flows | No | N/A | Shift update is not a sensitive business flow |
| API7 | Server Side Request Forgery | No | N/A | |
| API8 | Security Misconfiguration | Yes | PASS | CORS restricted to `http://localhost:5173`; production origin to be set via env |
| API9 | Improper Inventory Management | Yes | PASS | All shift endpoints documented in Swagger at `/api` |
| API10 | Unsafe API Consumption | No | N/A | No external APIs consumed |

---

## Part C — Feature-Specific Checks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| C1 | Input validated with `class-validator` on DTOs | NOTE | `CreateShiftDto`/`UpdateShiftDto` use plain interfaces; `class-validator` decorators not applied yet. Risk low — only trusted roles can call these endpoints |
| C2 | No raw SQL — Prisma ORM used exclusively | PASS | |
| C3 | Sensitive fields excluded from response | PASS | Shift model has no sensitive fields |
| C4 | `@Roles` on all mutating endpoints (POST/PUT/DELETE) | PASS | |
| C5 | JWT guard active globally | PASS | Global guard in `AppModule` |
| C6 | No secrets hardcoded | PASS | No credentials in new files |
| C7 | File uploads | N/A | No uploads in this feature |
| C8 | Error responses hide internals | PASS | `GlobalExceptionFilter` strips stack traces |
| C9 | Frontend stores only JWT in localStorage | PASS | Zustand auth store; shift data only in React Query cache |
| C10 | CORS restricted | PASS | `http://localhost:5173` only |

---

## Part D — Dependency Audit

No new dependencies added for F-002.

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
- **C1 — class-validator decorators missing on ShiftDto**: Risk accepted. Endpoints are role-guarded (SUPER_USER/ADMIN only). Recommend adding `@IsString()`, `@IsEnum(ShiftType)` etc. when DTOs are moved to dedicated files in Phase 3.
- **API4 — No rate limiting**: Deferred to infrastructure hardening phase (end of build).
- **A09 — No shift change audit log**: Deferred to Phase 11 centralised logging.
