# Security Review — F-008: Project Member Management

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-008-project-member-management  
**Status:** APPROVED

---

## Threat Model

| Asset | Risk |
|-------|------|
| ProjectMember records | Unauthorized add/remove/role-change |
| User IDs in request body | UUID injection, referencing another tenant's users |
| Project membership list | Unauthorized read of team composition |
| Cascade delete | Unintended data loss on user/project deletion |

---

## Authentication & Authorization

| Check | Result |
|-------|--------|
| All endpoints require JWT (`JwtAuthGuard` global) | PASS |
| `GET /projects/:id/members` open to all authenticated users | PASS — appropriate; team composition is not sensitive |
| `POST`, `PATCH`, `DELETE` member endpoints gated to SUPER_USER / ADMIN | PASS |
| Frontend `canEdit` hides edit controls from non-admin users | PASS — defence in depth |

---

## Input Validation

| Field | Validation | Result |
|-------|-----------|--------|
| `userId` | `@IsUUID` — rejects malformed or non-UUID strings | PASS |
| `projectRole` | `@IsEnum(ProjectRole)` — rejects unknown role strings | PASS |
| `projectId` (path param) | Checked via `requireProject` → NotFoundException if not found | PASS |
| Inactive user guard | `requireUser` checks `isActive === true` before adding | PASS |

---

## Injection & Data Safety

**SQL Injection:** Prisma uses parameterised queries — not vulnerable.

**XSS:** React escapes all interpolated user data (fullName, email, department name).

**UUID path params:** `projectId` and `userId` are used directly in Prisma `where` clauses which are parameterised — no injection risk.

---

## Data Exposure

- `MEMBER_SELECT` restricts user fields to: `id`, `fullName`, `email`, `profilePhoto`, `department.{id,name}`.
- `passwordHash`, `refreshTokens`, and other sensitive fields are never returned.

---

## Cascade Behaviour

- `onDelete: Cascade` on both FKs means: if a project is deleted, its member records are removed automatically. This is correct — orphaned member records would be a data integrity issue.
- No risk of unintended mass-deletion: project deletion is separately guarded at the projects controller level.

---

## Duplicate Member Protection

- `@@unique([projectId, userId])` at DB level + application-level `ConflictException` check — dual defence ensures no duplicate memberships even under race conditions (DB constraint is the final guard).

---

## Issues Found

None.

---

## Verdict

**APPROVED — No security issues identified.**
