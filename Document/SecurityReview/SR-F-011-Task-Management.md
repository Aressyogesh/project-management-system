# Security Review — F-011: Task Management

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-011-task-management  
**Status:** APPROVED

---

## Threat Model

| Asset | Risk |
|-------|------|
| Task records | Unauthorised create/edit/delete |
| `taskListId` / `milestoneId` | Cross-project data access via FK manipulation |
| `assignedToId` | Assigning to a user outside the project |
| `createdById` | Client-supplied creator spoofing |
| Cascade delete | Task data loss when project or task list is deleted |

---

## Authentication & Authorization

| Check | Result |
|-------|--------|
| All endpoints require JWT | PASS |
| `GET /projects/:id/tasks` and `GET /tasks/:id` open to all auth users | PASS |
| `POST`, `PATCH` gated to SUPER_USER / ADMIN | PASS |
| `DELETE` gated to SUPER_USER / ADMIN | PASS |
| Frontend `canEdit` hides add/edit/delete for non-admin users | PASS |
| `createdById` taken from JWT payload — not from request body | PASS |

---

## Input Validation

| Field | Validation | Result |
|-------|-----------|--------|
| `title` | `@IsNotEmpty`, `@MaxLength(300)` | PASS |
| `taskListId` / `milestoneId` / `assignedToId` | `@IsUUID` — malformed IDs rejected | PASS |
| `estimatedHours` | `@Min(0)`, `@Max(9999)`, `maxDecimalPlaces: 2` | PASS |
| `priority` / `billingStatus` / `status` | `@IsEnum` — unknown values rejected | PASS |
| `startDate` / `dueDate` | `@IsDateString` — non-ISO rejected | PASS |

---

## Cross-Project Access Prevention

- `requireTaskList(taskListId, projectId)` verifies `taskList.projectId === projectId` — prevents assigning task to a list from another project.
- `requireMilestone(milestoneId, projectId)` applies the same check.
- Both checks throw `BadRequestException` on mismatch.

---

## Injection & Data Safety

**SQL Injection:** Prisma parameterised queries — not vulnerable.

**XSS:** React escapes all interpolated content (title, description, assignee name, milestone description).

**Creator spoofing:** `createdById` is always set from `req.user.id` (JWT); no body field accepted.

---

## Cascade Behaviour

- `onDelete: Cascade` on project FK and task list FK — task deleted with either parent.
- `onDelete: SetNull` on milestone FK — task preserved when milestone is deleted.
- `onDelete: SetNull` on assignedTo FK — task preserved when user is deleted (unassigned).
- `createdBy` has no `onDelete` action — `RESTRICT` default prevents deleting a user who created tasks (acceptable; deactivation is preferred).

---

## Issues Found

None.

---

## Verdict

**APPROVED — No security issues identified.**
