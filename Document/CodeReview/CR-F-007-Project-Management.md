# Code Review — F-007: Project Management

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-007-project-management  
**Status:** APPROVED

---

## Files Reviewed

| File | Type |
|------|------|
| `backend/src/projects/dto/project.dto.ts` | DTO / Validation |
| `backend/src/projects/projects.service.ts` | Business Logic |
| `backend/src/projects/projects.controller.ts` | HTTP Controller |
| `backend/src/projects/projects.module.ts` | Module |
| `backend/src/projects/__tests__/projects.service.spec.ts` | Unit Tests |
| `frontend/src/types/projects.types.ts` | Types |
| `frontend/src/api/projects.api.ts` | API Client |
| `frontend/src/features/projects/components/ProjectFormModal.tsx` | UI Component |
| `frontend/src/features/projects/pages/ProjectsPage.tsx` | Page |
| `frontend/src/features/projects/__tests__/ProjectsPage.test.tsx` | Frontend Tests |

---

## Review Summary

### Backend

**DTO Layer (`project.dto.ts`)**
- `CreateProjectDto` uses `@IsNotEmpty`, `@MaxLength(200)`, `@IsEnum` and `@IsDateString` — appropriate validators for all fields.
- `budget` uses `@Transform` with `Number()` coercion; decorated with `@IsPositive` and `@IsNumber` — prevents negative values.
- `UpdateProjectDto extends PartialType(CreateProjectDto)` — clean DRY approach.
- `SetProjectStatusDto` validates only the status enum, isolating the status-change endpoint.
- `ProjectsQueryDto` is optional-filtered, enabling GET /projects to work with or without query params.

**Service Layer (`projects.service.ts`)**
- `PROJECT_SELECT` constant ensures consistent shape; avoids `updatedAt` leaking to client.
- `validateDates()` throws `BadRequestException` when `endDate < startDate` — validated before DB write.
- `getSummary()` computes `overdue` in-memory using JS Date comparison (status === ACTIVE && endDate < now).
- `findAll` builds the `where` clause conditionally — no extra keys added if filters are absent.
- `findOne` throws `NotFoundException` for missing records — consistent with other services.
- `update` and `setStatus` both guard with a `findOne` pre-check before writing.

**Controller Layer (`projects.controller.ts`)**
- Read endpoints (`GET /projects`, `GET /projects/summary`, `GET /projects/:id`) are open to all authenticated users — correct; viewing projects is not restricted.
- Write endpoints (`POST`, `PATCH /:id`, `PATCH /:id/status`) are guarded with `@Roles(SUPER_USER, ADMIN)` — correct RBAC.
- `/projects/summary` is declared before `/:id` to prevent route shadowing — good ordering.
- `@ApiTags` and `@ApiBearerAuth` present for Swagger documentation.

**Unit Tests (`projects.service.spec.ts`)**
- 7 tests covering: create, date-validation, update, not-found, setStatus, getSummary counts, findAll filter.
- Mocks `PrismaService` with `jest.fn()` — no real DB hit.
- `jest.clearAllMocks()` in `beforeEach` — no cross-test contamination.

### Frontend

**Types (`projects.types.ts`)**
- `ProjectType` and `ProjectStatus` as string literal unions — matches backend enums exactly.
- `Project` interface covers all fields including nullable `client`, `department`, `startDate`, `endDate`, `budget`.
- `ProjectSummary` matches the backend `getSummary()` return shape.

**API Client (`projects.api.ts`)**
- All methods typed with the correct response type.
- `list()` accepts optional params object — enables status and type filtering.
- `setStatus` sends `{ status }` body to `PATCH /:id/status` — correct endpoint.

**ProjectFormModal**
- Client-side date validation (endDate >= startDate) mirrors server-side validation.
- Empty optional fields sent as `undefined` (not empty string) — prevents `""` from overwriting existing values.
- `budget` coerced to `Number` before send.
- Invalidates both `['projects']` and `['projects-summary']` on success — keeps summary cards fresh.

**ProjectsPage**
- `isOverdue` helper correctly guards: `status === 'ACTIVE' && endDate !== null && new Date(endDate) < new Date()`.
- `canEdit` derived from `useAuthStore` — read-only users never see edit/archive buttons.
- Cards are clickable to `/projects/:id` — `onClick` stops propagation on the action buttons to prevent double-navigate.
- Status filter drives the React Query key `['projects', filterStatus]` — correct cache isolation per filter value.
- Summary panel only renders when `summary` is truthy — no flash of zeros.

---

## Issues Found

None. All code follows established patterns from F-005 and F-006.

---

## Verdict

**APPROVED — Ready to merge.**
