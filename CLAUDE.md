# Claude Code Instructions — PMS Project

## MANDATORY: Follow PROCEDURE.md for Every Feature

**PROCEDURE.md must be followed in full, in strict order, for every feature. No exceptions.**

Before starting any feature work, re-read both `PLAN.md` and `PROCEDURE.md`.

### The 7 Steps — All Required, In Order

| Step | What | Output Location |
|------|------|-----------------|
| **Step 2** | Requirements doc (user story, BRs, ACs, dependencies, out of scope) | `Requirements/F-XXX-Feature-Name/REQ-F-XXX-Feature-Name.md` |
| **Step 3a** | Unit test case specs (Arrange/Act/Assert, one per AC) | `Unit Test Cases/F-XXX-Feature-Name/UTC-F-XXX-Feature-Name.md` |
| **Step 3b** | E2E test case specs (Given/When/Then, happy + negative + RBAC) | `Test Cases/F-XXX-Feature-Name/TC-F-XXX-Feature-Name.md` |
| **Step 4** | DB/Schema design (inside the requirements doc) | `Requirements/F-XXX-Feature-Name/REQ-F-XXX-Feature-Name.md` |
| **Step 5** | API contract design (inside the requirements doc) | `Requirements/F-XXX-Feature-Name/REQ-F-XXX-Feature-Name.md` |
| **Step 6a** | Backend implementation | `backend/src/` |
| **Step 6b** | Frontend implementation | `frontend/src/` |
| **Step 6c** | Code review (CR-1 through CR-8) | `TestReports/F-XXX-Feature-Name/code-review-report.html` |
| **Step 6d** | Security review (OWASP SEC-1 through SEC-11) | `TestReports/F-XXX-Feature-Name/security-review-report.html` |
| **Step 7a** | HTML test reports + consolidated report | `TestReports/F-XXX-Feature-Name/` + `TestReports/consolidated-report.html` |
| **Step 7b** | Create branch, commit, push | `feature/F-XXX-kebab-name` |
| **Step 7c** | Raise PR using full PROCEDURE.md template | GitHub PR |
| **Step 7d** | Notify developer with results summary | Console output |

### Hard Rules

- **Never push to GitHub before Steps 2–6d are complete and all unit tests pass.**
- **Never skip or reorder steps** — no matter how simple the feature seems.
- **No PR without HTML reports** in `TestReports/F-XXX-Feature-Name/`.
- **Always state migration status** at the end of every feature (required or not required).
- **Always use the full PROCEDURE.md PR template** — not a shortened body.

### Before Starting Each Feature

1. Read `PLAN.md` — it evolves and defines what to build.
2. Read `PROCEDURE.md` — full 7-step procedure.
3. Check `FEATURES.md` — to pick up the correct feature ID.
4. Create branch: `feature/F-XXX-kebab-name` from `main`.
5. Then start Step 2 (requirements) — no code before requirements are written.

### PR Body Template (from PROCEDURE.md Step 7c)

```markdown
## Feature
**F-XXX — Feature Name**
Epic: PMS

## Summary
- bullet
- bullet

## Test Results
| Layer          | Total | Passed | Failed |
|----------------|-------|--------|--------|
| Unit (Backend) |       |        |        |
| Unit (Frontend)|       |        |        |
| E2E            |       |        |        |
| **Total**      |       |        |        |

## Reports
| Report | Path |
|--------|------|
| Test Summary | `TestReports/F-XXX-Feature-Name/test-summary-report.html` |
| Code Review | `TestReports/F-XXX-Feature-Name/code-review-report.html` |
| Security Review | `TestReports/F-XXX-Feature-Name/security-review-report.html` |
| Consolidated | `TestReports/consolidated-report.html` |

## Acceptance Criteria
- [ ] AC-1: ...
- [ ] AC-2: ...

## Migration
Required / Not required — reason.

## How to Test Locally
1. ...
```

---

## Project Context

- **Stack:** NestJS (backend) + React 18 + Vite + TypeScript + Tailwind CSS (frontend) + Prisma + PostgreSQL
- **Auth:** JWT access + refresh tokens; `JwtAuthGuard` global; `RolesGuard` for system roles; `ProjectRoleGuard` for project-level roles
- **Remote repo:** https://github.com/Aressyogesh/project-management-system.git
- **Deployed:** Backend on Render (`pms-backend-zhez.onrender.com`), Frontend on Vercel, DB on Supabase
- **Local DB:** `postgresql://postgres:postgres@localhost:5432/pms_db` (both `DATABASE_URL` and `DIRECT_URL`)
- **Migration note:** Local — `npx prisma db push`; Production — auto via `npx prisma migrate deploy` on Render deploy

## Retroactive Documentation Status

Features F-012 through F-017 were built before strict PROCEDURE.md compliance was enforced. Their retroactive documentation must be created in:
- `Requirements/F-XXX-Feature-Name/`
- `Unit Test Cases/F-XXX-Feature-Name/`
- `Test Cases/F-XXX-Feature-Name/`
- `TestReports/F-XXX-Feature-Name/`
- `TestReports/consolidated-report.html`
