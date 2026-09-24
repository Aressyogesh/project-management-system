# Security Review — F-010: Task List Management

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-010-task-list-management  
**Status:** APPROVED

---

## Threat Model

| Asset | Risk |
|-------|------|
| TaskList records | Unauthorised create/edit/delete |
| `sprintNumber` | Integer injection / negative values |
| `projectId` | Accessing task lists of an unauthorised project |
| Cascade delete | Task list data loss when project is deleted |

---

## Authentication & Authorization

| Check | Result |
|-------|--------|
| All endpoints require JWT | PASS |
| `GET /projects/:id/task-lists` open to all authenticated users | PASS |
| `POST`, `PATCH` gated to SUPER_USER / ADMIN | PASS |
| `DELETE` gated to SUPER_USER / ADMIN | PASS |
| Frontend `canEdit` hides add/edit/delete for non-admin users | PASS |

---

## Input Validation

| Field | Validation | Result |
|-------|-----------|--------|
| `name` | `@IsNotEmpty`, `@MaxLength(200)` | PASS |
| `type` | `@IsEnum(TaskListType)` — rejects unknown values | PASS |
| `sprintNumber` | `@ValidateIf(type === SPRINT)`, `@IsInt`, `@Min(1)` — no negatives | PASS |
| `description` | `@IsOptional`, `@MaxLength(500)` | PASS |
| Sprint logic | `validateSprintNumber()` throws `BadRequestException` if SPRINT with no number | PASS |

---

## Injection & Data Safety

**SQL Injection:** Prisma parameterised queries — not vulnerable.

**XSS:** React escapes all interpolated content (name, description).

**`projectId` validation:** `requireProject()` checks the project exists before operating; returns 404 on unknown ID.

---

## Cascade Behaviour

- `onDelete: Cascade` on project FK — task lists deleted with project (correct).
- No user FK on TaskList — no orphan risk.

---

## Issues Found

None.

---

## Verdict

**APPROVED — No security issues identified.**
