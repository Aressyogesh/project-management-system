# Security Review (OWASP) — F-004: User Management

```
Feature ID : F-004
Feature    : User Management
Reviewer   : Claude Sonnet 4.6 (AI Security Review)
Date       : 2026-05-26
Verdict    : Cleared
```

---

## SEC-1: Broken Access Control (OWASP A01) — PASS

- [x] `@Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)` applied at controller class level — all endpoints protected
- [x] Global `RolesGuard` enforces role check on every request
- [x] Self-deactivation prevented in service layer (BR-6)
- [x] Frontend sidebar hides `/users` for EMPLOYEE via role filter in Sidebar.tsx
- [x] Backend enforces RBAC independently of frontend visibility

## SEC-2: Cryptographic Failures (OWASP A02) — PASS

- [x] bcrypt with cost factor 10 used for all new passwords
- [x] `passwordHash` field excluded from all API responses via `USER_SELECT`
- [x] No secrets hardcoded — JWT secret and DB URL come from environment variables

## SEC-3: Injection (OWASP A03) — PASS

- [x] All DB queries use Prisma parameterised queries — no string concatenation
- [x] Search query uses Prisma `contains` with `mode: 'insensitive'` — not raw SQL
- [x] React renders user data as JSX text nodes — no `dangerouslySetInnerHTML`
- [x] File upload limited by extension pattern and size (2 MB cap via Multer)

## SEC-4: Insecure Design (OWASP A04) — PASS

- [x] No business logic bypass possible — status change and update go through service layer
- [x] Rate limiting on login endpoint (inherited from auth module)
- [x] Email normalised to lowercase on create/update — prevents case-variant duplicate accounts

## SEC-5: Security Misconfiguration (OWASP A05) — PASS

- [x] CORS configured in `main.ts` to allow only `http://localhost:5173`
- [x] Multer `dest` stores files outside web root (`./uploads/avatars`)
- [x] Global `ValidationPipe` rejects unknown fields via `whitelist: true` (existing config)

## SEC-6: Vulnerable & Outdated Components (OWASP A06) — PASS

- [x] No new dependencies introduced — uses existing bcrypt, multer, class-validator versions
- [x] Existing `npm audit` baseline from F-001 applies

## SEC-7: Identification & Authentication Failures (OWASP A07) — PASS

- [x] JWT access/refresh token lifecycle unchanged — inherits F-001 implementation
- [x] All new endpoints require valid JWT via global `JwtAuthGuard`

## SEC-8: Software & Data Integrity (OWASP A08) — PASS

- [x] No new third-party integrations introduced
- [x] `package-lock.json` integrity maintained

## SEC-9: Security Logging & Monitoring (OWASP A09) — PASS

- [x] `GlobalExceptionFilter` logs all 4xx/5xx responses with context
- [x] No passwords, tokens, or PII written to logs

## SEC-10: SSRF (OWASP A10) — N/A

- No server-side URL fetching in this feature.

## SEC-11: API-Specific Checks — PASS

- [x] API01: Resource IDs validated by Prisma lookup before update/delete
- [x] API02: All endpoints require JWT
- [x] API03: `USER_SELECT` omits `passwordHash` — response shape is role-appropriate
- [x] API04: Pagination enforced (default 25, query params validated)
- [x] API05: Admin-only endpoints blocked for EMPLOYEE role (403)
- [x] API08: `GlobalExceptionFilter` strips stack traces from prod responses
- [x] API09: All endpoints declared in controller — no shadow routes

---

## SAST Findings

No CRITICAL or HIGH findings identified during manual static review.

## Dependency Audit

No new dependencies introduced in this feature.

## Open Risk Items

| Risk | Severity | Planned Remediation |
|------|----------|---------------------|
| Profile photo served via `/api/` prefix needs static file middleware | LOW | Confirm `NestJS ServeStaticModule` or equivalent is configured before deployment |
| Profile photo file type not validated by MIME type (only Multer file size cap) | LOW | Add `fileFilter` to Multer config to verify MIME type in next iteration |

## Sign-off

Reviewer: Claude Sonnet 4.6
Date: 2026-05-26
Verdict: **Cleared — 2 LOW risk items logged, no CRITICAL or HIGH findings**
