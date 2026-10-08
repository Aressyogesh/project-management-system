# Code Review — F-011: Task Management

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-011-task-management  
**Status:** APPROVED

---

## Files Reviewed

| File | Type |
|------|------|
| `backend/prisma/schema.prisma` | Schema — TaskPriority / TaskStatus / BillingStatus enums + Task model |
| `backend/src/tasks/dto/task.dto.ts` | DTO / Validation |
| `backend/src/tasks/tasks.service.ts` | Business Logic |
| `backend/src/tasks/tasks.controller.ts` | HTTP Controller |
| `backend/src/tasks/tasks.module.ts` | Module |
| `backend/src/tasks/__tests__/tasks.service.spec.ts` | Unit Tests |
| `frontend/src/types/task.types.ts` | Types |
| `frontend/src/api/tasks.api.ts` | API Client |
| `frontend/src/features/projects/components/TaskFormModal.tsx` | UI Component |
| `frontend/src/features/projects/pages/ProjectDetailPage.tsx` | Page (extended) |
| `frontend/src/features/projects/__tests__/ProjectDetailTasks.test.tsx` | Frontend Tests |

---

## Review Summary

### Schema

- Three new enums: `TaskPriority` (LOW/MEDIUM/HIGH/CRITICAL), `TaskStatus` (NOT_STARTED/IN_PROGRESS/ON_REVIEW/COMPLETED), `BillingStatus` (BILLABLE/NON_BILLABLE).
- `Task` model: cascade delete on both project and task list FKs — task disappears with either parent. `SetNull` on milestone and assignedTo FKs — task preserved when milestone or user is deleted.
- Named relations `"AssignedTasks"` and `"CreatedTasks"` on User — correctly disambiguates the two User FK relationships.
- `estimatedHours` stored as `Decimal(6,2)` — precision over float for hour arithmetic.
- Three indexes: `projectId`, `taskListId`, `assignedToId` — covers the common query patterns.

### Backend

**DTO Layer**
- `title`: `@IsString`, `@IsNotEmpty`, `@MaxLength(300)` — required.
- `taskListId`, `milestoneId`, `assignedToId`: `@IsUUID` — rejects malformed IDs.
- `estimatedHours`: `@IsNumber({ maxDecimalPlaces: 2 })`, `@Min(0)`, `@Max(9999)` — no negatives, no excessive values.
- `priority`, `billingStatus`, `status`: `@IsEnum` — rejects unknown values.
- `startDate`, `dueDate`: `@IsDateString` — ISO format enforced.
- `UpdateTaskDto extends PartialType(CreateTaskDto)` — DRY.

**Service Layer**
- `requireProject`, `requireTaskList`, `requireMilestone` private helpers prevent cross-project data access.
- `requireTaskList` checks both existence and `projectId` match — prevents assigning a task to a task list from a different project.
- `requireMilestone` does the same — prevents milestone cross-project confusion.
- `update` spreads only defined fields — no accidental null-writes.
- `TASK_SELECT` excludes `updatedAt`, restricts related objects to minimal fields — clean response shape.
- `findAll` orders by `taskListId, priority, createdAt` — natural grouping for the frontend.

**Controller Layout**
- Flat `@Controller()` matching previous feature pattern.
- GET `/projects/:projectId/tasks` and GET `/tasks/:id` open to all authenticated users.
- POST/PATCH gated to SUPER_USER/ADMIN; DELETE same with 204 No Content.
- `@Request() req` used to pass `createdById` from JWT payload — no client-supplied creator field.

**Unit Tests** — 11 tests covering all service methods including cross-project taskList and milestone validation.

### Frontend

**Types** — `Task`, `TaskUser`, `TaskListRef`, `MilestoneRef`, `CreateTaskPayload` clean and matching API.

**API Client** — 5 methods: list, getById, create, update, remove.

**TaskFormModal**
- `dueDate` input has `min={startDate}` to prevent invalid selection.
- Assignee dropdown populated from `members` prop (project members only).
- Empty optional fields sent as absent from payload.
- Task list and milestone selectors populated from parent query data — no extra API calls.

**ProjectDetailPage (tasks section)**
- Tasks grouped by task list — `taskLists.map()` with `tasks.filter()` per list.
- Collapsible list groups via `collapsedLists` state record.
- "Add Task" button disabled (with tooltip) when no task lists exist — prevents orphan tasks.
- Priority, status, billing badges each have distinct colour mappings.
- Milestone reference shown as sub-label under task title.
- Separate `['tasks', projectId]` React Query key.

---

## Issues Found

None.

---

## Verdict

**APPROVED — Ready to merge.**
