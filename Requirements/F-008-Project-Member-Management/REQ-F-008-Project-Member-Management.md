# Requirements — F-008: Project Member Management

**Feature ID:** F-008  
**Epic:** Phase 4 — Projects & Milestones  
**Date:** 2026-05-26  
**Status:** Approved

---

## User Story

As a **Super User / Admin / Project Manager**, I want to view all members of a project, add new team members with a specific project role, change a member's role, and remove them from the project, so that the team composition is always accurate and role-based access is correctly scoped.

As any **authenticated user**, I want to view a project's detail page (including its member list) so I can understand who is working on the project and in what capacity.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Navigating to `/projects/:id` renders a project detail page showing: name, status, type, client, department, start/end dates, budget, description |
| AC-002 | The detail page includes a "Team Members" section listing all current members (name, project role, joined date) |
| AC-003 | SUPER_USER and ADMIN can add any active user as a project member with an assigned project role |
| AC-004 | A user cannot be added to the same project twice (unique constraint enforced) |
| AC-005 | SUPER_USER and ADMIN can change a member's project role |
| AC-006 | SUPER_USER and ADMIN can remove a member from the project |
| AC-007 | The "Add Member" form shows only active users not already in the project |
| AC-008 | Project roles available: Project Manager, Team Lead, Developer, QA, Designer, DevOps |
| AC-009 | Non-admin users can view the member list but not add/edit/remove |
| AC-010 | A "Back to Projects" link navigates back to `/projects` |

---

## Scope

### In Scope
- `ProjectRole` Prisma enum: PROJECT_MANAGER, TEAM_LEAD, DEVELOPER, QA, DESIGNER, DEVOPS
- `ProjectMember` Prisma model with unique `[projectId, userId]` constraint
- Backend: `GET /projects/:id/members`, `POST /projects/:id/members`, `PATCH /projects/:id/members/:userId`, `DELETE /projects/:id/members/:userId`
- Frontend: `ProjectDetailPage` at `/projects/:id` with project info header + member management panel

### Out of Scope
- Project-role-based access control enforcement (ProjectRoleGuard) — deferred to a later feature
- Milestone, task, and bug sub-pages on the detail page

---

## Project Role Definitions

| Role | Description |
|------|-------------|
| PROJECT_MANAGER | Owns the project; approves timesheets and leave |
| TEAM_LEAD | Manages sprint task lists; assigns developer tasks |
| DEVELOPER | Works on development tasks |
| QA | Tests features; logs and manages bugs |
| DESIGNER | Works on UI/UX tasks |
| DEVOPS | Infrastructure and deployment tasks |
