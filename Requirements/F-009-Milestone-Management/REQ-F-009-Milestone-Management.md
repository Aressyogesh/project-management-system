# Requirements — F-009: Milestone Management

**Feature ID:** F-009  
**Epic:** Phase 4 — Projects & Milestones  
**Date:** 2026-05-26  
**Status:** Approved

---

## User Story

As a **Super User / Admin**, I want to create, edit, and delete milestones for a project so that delivery targets are tracked with named checkpoints, responsible owners, and statuses.

As any **authenticated user**, I want to view the milestone list for a project so I understand the delivery plan.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Milestones section visible on the project detail page (`/projects/:id`) below the Team Members panel |
| AC-002 | Milestone list shows: description, delivery note, start date, due date, responsible user, status badge |
| AC-003 | SUPER_USER and ADMIN can create a milestone (description required; other fields optional) |
| AC-004 | SUPER_USER and ADMIN can edit any milestone field |
| AC-005 | SUPER_USER and ADMIN can delete a milestone |
| AC-006 | Status transitions: NOT_STARTED → IN_PROGRESS → COMPLETED / DELAYED |
| AC-007 | Responsible user dropdown shows all active users |
| AC-008 | Due date must be on or after start date (validated client-side and server-side) |
| AC-009 | Non-admin users can view the milestone list but cannot create/edit/delete |
| AC-010 | Empty state shown when a project has no milestones |

---

## Scope

### In Scope
- `MilestoneStatus` Prisma enum: NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED
- `Milestone` Prisma model: id, projectId, description, deliveryNote, startDate, dueDate, responsibleUserId, status, createdAt
- Backend: `GET /projects/:id/milestones`, `POST /projects/:id/milestones`, `PATCH /milestones/:id`, `DELETE /milestones/:id`
- Frontend: Milestones section on `ProjectDetailPage` + `MilestoneFormModal`

### Out of Scope
- Linking milestones to tasks or bugs (future features)
- Milestone progress tracking via task completion percentage (future)

---

## Milestone Status Definitions

| Status | Description |
|--------|-------------|
| NOT_STARTED | Work has not begun |
| IN_PROGRESS | Milestone is actively being worked on |
| COMPLETED | Milestone has been delivered |
| DELAYED | Milestone missed its due date |
