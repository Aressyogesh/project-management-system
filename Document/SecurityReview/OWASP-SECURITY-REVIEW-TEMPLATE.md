# OWASP Security Review — [Feature ID]: [Feature Name]

**Reviewer:**  
**Date:**  
**Branch:**  
**Scope (files reviewed):**

```
backend/src/...
frontend/src/...
```

**References:**
- OWASP Top 10 Web (2021): https://owasp.org/Top10/
- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/

---

## Part A — OWASP Web Top 10

| # | Risk | Applicable? | Status | Evidence / Notes |
|---|------|-------------|--------|-----------------|
| A01 | **Broken Access Control** — unauthenticated access to protected resources | Yes/No | | |
| A02 | **Cryptographic Failures** — sensitive data exposed in transit or at rest | Yes/No | | |
| A03 | **Injection** — SQL, NoSQL, OS, LDAP injection via untrusted input | Yes/No | | |
| A04 | **Insecure Design** — missing threat modelling, insecure patterns | Yes/No | | |
| A05 | **Security Misconfiguration** — default creds, verbose errors, open ports | Yes/No | | |
| A06 | **Vulnerable & Outdated Components** — unpatched libraries | Yes/No | | |
| A07 | **Identification & Authentication Failures** — weak sessions, missing auth | Yes/No | | |
| A08 | **Software & Data Integrity Failures** — untrusted deserialisation, CI/CD | Yes/No | | |
| A09 | **Security Logging & Monitoring Failures** — no audit trail for critical ops | Yes/No | | |
| A10 | **SSRF** — server-side requests to untrusted URLs from user input | Yes/No | | |

---

## Part B — OWASP API Security Top 10

| # | Risk | Applicable? | Status | Evidence / Notes |
|---|------|-------------|--------|-----------------|
| API1 | **Broken Object Level Authorization** — user can access another user's objects | Yes/No | | |
| API2 | **Broken Authentication** — missing/weak token validation | Yes/No | | |
| API3 | **Broken Object Property Level Authorization** — mass assignment of restricted fields | Yes/No | | |
| API4 | **Unrestricted Resource Consumption** — no rate limiting / pagination | Yes/No | | |
| API5 | **Broken Function Level Authorization** — admin functions accessible to lower roles | Yes/No | | |
| API6 | **Unrestricted Access to Sensitive Business Flows** — no throttle on sensitive ops | Yes/No | | |
| API7 | **Server Side Request Forgery** — API fetches attacker-controlled URL | Yes/No | | |
| API8 | **Security Misconfiguration** — CORS, headers, error verbosity | Yes/No | | |
| API9 | **Improper Inventory Management** — undocumented/shadow endpoints | Yes/No | | |
| API10 | **Unsafe Consumption of APIs** — trusting external API responses without validation | Yes/No | | |

---

## Part C — Feature-Specific Checks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| C1 | Input validated with `class-validator` on all incoming DTOs | | |
| C2 | No raw SQL queries — Prisma ORM used exclusively (prevents SQLi) | | |
| C3 | Sensitive fields excluded from API responses (e.g. `passwordHash`) | | |
| C4 | Role guard (`@Roles`) applied to all mutating endpoints (POST/PUT/DELETE) | | |
| C5 | JWT guard (`@UseGuards(JwtAuthGuard)`) active globally or per controller | | |
| C6 | No secrets hardcoded in source files (use `process.env`) | | |
| C7 | File uploads (if any) validated for type and size | | |
| C8 | Error responses do not expose stack traces or internal paths | | |
| C9 | Frontend does not store sensitive data beyond JWT in localStorage | | |
| C10 | CORS restricted to known origins (`http://localhost:5173` in dev) | | |

---

## Part D — Dependency Audit

```bash
# Run before each release cycle:
cd backend  && npm audit --audit-level=high
cd frontend && npm audit --audit-level=high
```

| Scope | Critical | High | Moderate | Low | Action |
|-------|----------|------|----------|-----|--------|
| backend | | | | | |
| frontend | | | | | |

---

## Part E — SAST Notes

> Record any static analysis findings from IDE or `eslint-plugin-security`, `@typescript-eslint/no-explicit-any`, etc.

| File | Line | Finding | Severity | Resolution |
|------|------|---------|----------|------------|
| | | | | |

---

## Summary

### Verdict
- [ ] **Cleared** — no security issues found
- [ ] **Cleared with mitigations** — low-risk items noted, acceptable for current phase
- [ ] **Blocked** — high/critical issues must be fixed before merge

### Open Risk Items
> Any accepted risks with planned remediation (e.g. rate limiting deferred to Phase X)

-
-

---

*Status values: **PASS** / **FAIL** / **N/A** / **NOTE***  
*Applicable values: **Yes** / **No***
