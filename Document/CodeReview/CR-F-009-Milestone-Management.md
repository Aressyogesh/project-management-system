# Code Review — F-009: Milestone Management

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-009-milestone-management  
**Status:** APPROVED

---

## Files Reviewed

| File | Type |
|------|------|
| `backend/prisma/schema.prisma` | Schema — MilestoneStatus enum + Milestone model |
| `backend/src/milestones/dto/milestone.dto.ts` | DTO / Validation |
| `backend/src/milestones/milestones.service.ts` | Business Logic |
| `backend/src/milestones/milestones.controller.ts` | HTTP Controller |
| `backend/src/milestones/milestones.module.ts` | Module |
| `backend/src/milestones/__tests__/milestones.service.spec.ts` | Unit Tests |
| `frontend/src/types/milestones.types.ts` | Types |
| `frontend/src/api/milestones.api.ts` | API Client |
| `frontend/src/features/projects/components/MilestoneFormModal.tsx` | UI Component |
| `frontend/src/features/projects/pages/ProjectDetailPage.tsx` | Page (extended) |
| `frontend/src/features/projects/__tests__/ProjectDetailMilestones.test.tsx` | Frontend Tests |

---

## Review Summary

### Schema

- `MilestoneStatus` enum: NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED — matches plan exactly.
- `Milestone` model: `onDelete: Cascade` on project FK (milestone auto-deleted with project); `onDelete: SetNull` on user FK (milestone preserved, responsibleUser cleared if user deleted).
- `@@index([projectId])` — fast per-project queries.
- `dueDate` stored as `@db.Date` — no time-zone ambiguity.

### Backend

**DTO Layer**
- `description`: `@IsNotEmpty`, `@MaxLength(500)` — required.
- `deliveryNote`: `@IsOptional`, `@MaxLength(1000)`.
- `startDate`/`dueDate`: `@IsOptional`, `@IsDateString` — ISO format enforced.
- `responsibleUserId`: `@IsOptional`, `@IsUUID`.
- `status`: `@IsOptional`, `@IsEnum(MilestoneStatus)`.
- `UpdateMilestoneDto extends PartialType(CreateMilestoneDto)` — clean DRY approach.

**Service Layer**
- `validateDates` called in both `create` and `update`; in `update` it merges the existing dates with the incoming partial to correctly catch cross-field conflicts even when only one date is updated.
- `update` spreads only defined fields using `...(field !== undefined && { field })` — prevents accidental null-writes.
- `remove` guards with `findUnique` before deleting — clean NotFoundException.
- `MILESTONE_SELECT` excludes updatedAt and restricts `responsibleUser` to `{id, fullName, profilePhoto}`.
- Orders by `dueDate asc, createdAt asc` — milestones without a dueDate sort to the end naturally.

**Controller Layout**
- Uses a flat `@Controller()` with full route paths `projects/:projectId/milestones` and `milestones/:id` — clean REST hierarchy matching the plan.
- GET (list/read) open to all authenticated users; POST/PATCH/DELETE gated to SUPER_USER/ADMIN.
- DELETE returns 204 No Content.

**Unit Tests** — 8 tests; all service paths covered including date-validation in both create and update paths.

### Frontend

**Types** — `MilestoneStatus`, `Milestone`, `MilestoneUser`, `CreateMilestonePayload` all clean, matching the API response shape.

**API Client** — 4 methods: list, create (project-scoped), update (id-scoped), remove (id-scoped).

**MilestoneFormModal**
- `dueDate` input has `min={startDate}` to prevent invalid selection in the date picker.
- Client-side date validation mirrors server logic.
- Empty string sent as `undefined` for optional fields.
- Fetches all active users for the responsible user dropdown.

**ProjectDetailPage (milestones section)**
- Reuses the same `canEdit` flag from the members section.
- Status badges use four distinct colour mappings (gray/blue/green/red).
- Edit icon opens the modal pre-filled with the existing milestone via `editMilestone` state.
- Delete calls `removeMilestoneMutation`; button disabled during pending.
- Separate `['milestones', projectId]` React Query key — isolated from members cache.

---

## Issues Found

None.

---

## Verdict

**APPROVED — Ready to merge.**
