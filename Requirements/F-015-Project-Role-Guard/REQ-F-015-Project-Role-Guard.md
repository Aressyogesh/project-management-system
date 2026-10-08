Feature ID   : F-015
Feature Name : ProjectRoleGuard
Epic         : Project Management System — Phase 1 Foundation (RBAC)
Priority     : High
Roles        : EMPLOYEE users with project roles (Project Manager, Team Lead, Developer, QA, Designer, DevOps)

User Story
----------
As a Project Manager or Team Lead, I want to create and manage task lists, tasks,
and milestones within my project so that I can drive delivery without needing
SUPER_USER or ADMIN system privileges.

Business Rules
--------------
BR-1: A user's ability to write to project-scoped resources is determined by BOTH
      their system role AND their project role.
BR-2: SUPER_USER and ADMIN always pass the project role check (they bypass it).
BR-3: An EMPLOYEE user passes the check only if they are a member of the project
      AND their ProjectMember.projectRole is in the allowed set for that action.
BR-4: Project roles allowed for task/task-list write: PROJECT_MANAGER, TEAM_LEAD.
BR-5: Project roles allowed for milestone write: PROJECT_MANAGER only.
BR-6: A user who is a project member with role DEVELOPER / QA / DESIGNER / DEVOPS
      is read-only for tasks, task lists, and milestones (no write access).
BR-7: Users who are not members of the project at all are denied (403).

Acceptance Criteria
-------------------
AC-1: A SUPER_USER or ADMIN can create/update/delete tasks, task lists, and milestones.
AC-2: An EMPLOYEE with project role PROJECT_MANAGER can create/update/delete tasks,
      task lists, and milestones within their project.
AC-3: An EMPLOYEE with project role TEAM_LEAD can create/update/delete tasks and
      task lists but cannot create/update/delete milestones.
AC-4: An EMPLOYEE with project role DEVELOPER, QA, DESIGNER, or DEVOPS receives
      403 Forbidden when attempting any write operation on tasks, task lists,
      or milestones.
AC-5: A user who is NOT a member of the project receives 403 Forbidden.
AC-6: All read (GET) endpoints remain accessible to all authenticated users.
AC-7: The guard is reusable — wired by decorator, not copy-pasted per controller.

Dependencies
------------
- F-008: Project Member Management (ProjectMember table with projectRole field must exist)
- F-009: Milestone Management (milestones controller must be updated)
- F-010: Task List Management (task-lists controller must be updated)
- F-011: Task Management (tasks controller must be updated)
- PrismaService must be injectable into the guard

Out of Scope
------------
- Timesheet, leave, bug, KPI endpoint guards (handled in their own phases)
- Frontend UI changes (no new pages — guard is purely backend)
- Project-level read filtering (read endpoints already accessible to all authenticated users)

---

## Step 4 — Database / Schema Design

No new models or migrations required.
Uses existing `ProjectMember` model:
  - projectId : String  [FK → Project]
  - userId    : String  [FK → User]
  - projectRole : ProjectRole (enum)
    Values: PROJECT_MANAGER | TEAM_LEAD | DEVELOPER | QA | DESIGNER | DEVOPS

No migration needed.

---

## Step 5 — API Contract Design

No new endpoints. Existing endpoints are updated with the new guard:

─────────────────────────────────────────
POST   /api/v1/projects/:projectId/task-lists
PATCH  /api/v1/task-lists/:id
DELETE /api/v1/task-lists/:id
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN, PROJECT_MANAGER (project member), TEAM_LEAD (project member)

─────────────────────────────────────────
POST   /api/v1/projects/:projectId/tasks
PATCH  /api/v1/tasks/:id
DELETE /api/v1/tasks/:id
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN, PROJECT_MANAGER (project member), TEAM_LEAD (project member)

─────────────────────────────────────────
POST   /api/v1/projects/:projectId/milestones
PATCH  /api/v1/milestones/:id
DELETE /api/v1/milestones/:id
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN, PROJECT_MANAGER (project member)

Error Responses (all write endpoints)
  401  Unauthorized     — no/invalid JWT
  403  Forbidden        — authenticated but role/membership check fails
  404  Not Found        — project or resource does not exist
