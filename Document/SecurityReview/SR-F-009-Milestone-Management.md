# Security Review — F-009: Milestone Management

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-009-milestone-management  
**Status:** APPROVED

---

## Threat Model

| Asset | Risk |
|-------|------|
| Milestone records | Unauthorized create/edit/delete |
| `responsibleUserId` FK | Referencing a non-existent or foreign-tenant user |
| Date fields | Invalid ISO strings, logic bypass (dueDate < startDate) |
| Cascade delete | Milestone data loss when project is deleted |

---

## Authentication & Authorization

| Check | Result |
|-------|--------|
| All endpoints require JWT | PASS |
| `GET /projects/:id/milestones` open to all authenticated users | PASS |
| `POST`, `PATCH`, `DELETE` gated to SUPER_USER / ADMIN | PASS |
| Frontend `canEdit` hides add/edit/delete for non-admin users | PASS |

---

## Input Validation

| Field | Validation | Result |
|-------|-----------|--------|
| `description` | `@IsNotEmpty`, `@MaxLength(500)` | PASS |
| `deliveryNote` | `@IsOptional`, `@MaxLength(1000)` | PASS |
| `startDate` / `dueDate` | `@IsDateString` — rejects non-ISO strings | PASS |
| `responsibleUserId` | `@IsUUID` — rejects malformed IDs | PASS |
| `status` | `@IsEnum(MilestoneStatus)` — rejects unknown values | PASS |
| Date logic | `validateDates()` throws `BadRequestException` if dueDate < startDate | PASS |

---

## Injection & Data Safety

**SQL Injection:** Prisma parameterised queries — not vulnerable.

**XSS:** React escapes all interpolated content (description, deliveryNote, responsibleUser.fullName).

**responsibleUserId:** Passed directly to Prisma FK — if the UUID doesn't match a user, Prisma throws a foreign key constraint error (caught by global exception filter as 500; acceptable since @IsUUID validates format).

---

## Cascade Behaviour

- `onDelete: Cascade` on project FK — milestones deleted with project (correct).
- `onDelete: SetNull` on user FK — if responsible user is deleted, `responsibleUserId` is set to NULL; milestone is preserved (correct; user deletion is rare and shouldn't delete delivery data).

---

## Issues Found

None.

---

## Verdict

**APPROVED — No security issues identified.**
