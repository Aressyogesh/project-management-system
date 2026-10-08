# Code Review — F-010: Task List Management

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-010-task-list-management  
**Status:** APPROVED

---

## Files Reviewed

| File | Type |
|------|------|
| `backend/prisma/schema.prisma` | Schema — TaskListType enum + TaskList model |
| `backend/src/task-lists/dto/task-list.dto.ts` | DTO / Validation |
| `backend/src/task-lists/task-lists.service.ts` | Business Logic |
| `backend/src/task-lists/task-lists.controller.ts` | HTTP Controller |
| `backend/src/task-lists/task-lists.module.ts` | Module |
| `backend/src/task-lists/__tests__/task-lists.service.spec.ts` | Unit Tests |
| `frontend/src/types/taskList.types.ts` | Types |
| `frontend/src/api/taskLists.api.ts` | API Client |
| `frontend/src/features/projects/components/TaskListFormModal.tsx` | UI Component |
| `frontend/src/features/projects/pages/ProjectDetailPage.tsx` | Page (extended) |
| `frontend/src/features/projects/__tests__/ProjectDetailTaskLists.test.tsx` | Frontend Tests |

---

## Review Summary

### Schema

- `TaskListType` enum: GENERAL, PROJECT_MANAGEMENT, DEVELOPMENT, QA, SPRINT — matches plan exactly.
- `TaskList` model: `onDelete: Cascade` on project FK — task list auto-deleted with project.
- `@@index([projectId])` — fast per-project queries.
- `sprintNumber Int?` — nullable at DB level; service enforces presence when type is SPRINT.

### Backend

**DTO Layer**
- `name`: `@IsString`, `@IsNotEmpty`, `@MaxLength(200)` — required.
- `type`: `@IsEnum(TaskListType)` — rejects unknown values.
- `sprintNumber`: `@ValidateIf((o) => o.type === TaskListType.SPRINT)` + `@IsInt`, `@Min(1)` — conditionally required.
- `description`: `@IsOptional`, `@IsString`, `@MaxLength(500)`.
- `UpdateTaskListDto extends PartialType(CreateTaskListDto)` — clean DRY approach.

**Service Layer**
- `validateSprintNumber` called in both `create` and `update`; in `update`, resolves `type` from existing record when not provided in the partial DTO — prevents false positives.
- `create` sets `sprintNumber: null` explicitly when type is not SPRINT — prevents stale data.
- `update` handles the `type` change case (e.g., switching from SPRINT to GENERAL clears `sprintNumber`).
- `TASK_LIST_SELECT` excludes `updatedAt` — clean response shape.
- `findAll` orders by `type asc, sprintNumber asc, createdAt asc` — Sprint lists appear grouped and numbered.

**Controller Layout**
- Flat `@Controller()` with full route paths (same pattern as MilestonesController).
- GET open to all authenticated users; POST/PATCH gated to SUPER_USER/ADMIN; DELETE same.
- DELETE returns 204 No Content.

**Unit Tests** — 9 tests; all service paths covered including sprint validation, non-sprint sprintNumber clearing, and update with partial type.

### Frontend

**Types** — `TaskListType`, `TaskList`, `CreateTaskListPayload` clean and matching API response.

**API Client** — 4 methods: list, create, update, remove. All project-scoped or id-scoped appropriately.

**TaskListFormModal**
- Sprint number input shown conditionally when type = SPRINT.
- Client-side sprint validation mirrors server logic.
- Clears sprintNumber when switching away from SPRINT type.
- Empty description sent as absent from payload (not as empty string).

**ProjectDetailPage (task lists section)**
- Reuses `canEdit` flag.
- Type badges use five distinct colour mappings.
- Sprint number shown as sub-label under name column.
- Edit opens modal pre-filled; delete calls `removeTaskListMutation`.
- Separate `['task-lists', projectId]` React Query key — isolated from milestones/members cache.

---

## Issues Found

None.

---

## Verdict

**APPROVED — Ready to merge.**
