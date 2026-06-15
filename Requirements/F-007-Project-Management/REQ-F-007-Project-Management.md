# F-007: Project Management

Feature ID   : F-007
Feature Name : Project Management
Epic         : Project Management System
Priority     : High
Roles        : SUPER_USER, ADMIN (create/edit/archive); all roles (view)

---

## User Story

As an Admin, I want to create and manage projects so that work can be organised, assigned to clients and departments, and tracked through their lifecycle.

---

## Business Rules

BR-1: Project name is required and must not exceed 200 characters.
BR-2: Project type is required: DEDICATED, T_AND_M, or FIXED.
BR-3: Project status defaults to ACTIVE on creation.
BR-4: If endDate is set, it must be on or after startDate.
BR-5: Budget must be a positive number if provided.
BR-6: Archiving a project sets its status to ARCHIVE; it remains visible in the list.
BR-7: Only SUPER_USER and ADMIN can create, edit, or archive projects.
BR-8: All roles can view the project list.
BR-9: A project can be linked to an existing Client and/or Department (both optional).
BR-10: Overdue = status is ACTIVE and endDate < today.

---

## Acceptance Criteria

AC-1: Admin can create a project with name, type, and optional client, department, description, dates, budget.
AC-2: Project appears on the card grid immediately after creation.
AC-3: Summary panel shows live counts: Active, Archive, Dedicated, T&M, Fixed, Overdue.
AC-4: Admin can edit any field of a project.
AC-5: Admin can archive a project; its status badge changes to Archive.
AC-6: Admin can restore an archived project back to Active.
AC-7: Each card shows: name, client, type badge, status badge, date range, budget.
AC-8: EMPLOYEE can view the project list but cannot create or edit.
AC-9: Empty state shown when no projects exist.
AC-10: End date before start date is rejected with a validation error.

---

## Dependencies

- F-001: JWT auth
- F-005: Department model (optional FK)
- F-006: Client model (optional FK)

---

## Out of Scope

- Task count and completion % on cards (Phase 5)
- Bug count on cards (Phase 9)
- Project member management (F-008)
- Milestone management (F-009)

---

## Database / Schema Design

### New Enums

```
ProjectType   : DEDICATED | T_AND_M | FIXED
ProjectStatus : ACTIVE | ARCHIVE | ON_HOLD
```

### New Entity: Project

| Field         | Type          | Constraints                          |
|---------------|---------------|--------------------------------------|
| id            | String (UUID) | PK, auto-generated                   |
| name          | String        | required, max 200                    |
| clientId      | String?       | FK → clients.id, nullable            |
| departmentId  | String?       | FK → departments.id, nullable        |
| description   | String?       | optional, max 1000                   |
| startDate     | DateTime?     | optional, Date only                  |
| endDate       | DateTime?     | optional, Date only                  |
| budget        | Decimal?      | optional, positive                   |
| projectType   | ProjectType   | required                             |
| status        | ProjectStatus | default ACTIVE                       |
| createdAt     | DateTime      | auto UTC                             |
| updatedAt     | DateTime      | auto updated                         |

Migration name: `add_projects_table`

---

## API Contract

### GET /projects?status=ACTIVE&type=DEDICATED
Auth: Required | Roles: All
Response 200: Array of project objects with client and department names

### POST /projects
Auth: Required | Roles: SUPER_USER, ADMIN
Body: `{ name, projectType, clientId?, departmentId?, description?, startDate?, endDate?, budget? }`
Response 201: Created project

### PATCH /projects/:id
Auth: Required | Roles: SUPER_USER, ADMIN
Body: any subset of project fields
Response 200: Updated project

### PATCH /projects/:id/status
Auth: Required | Roles: SUPER_USER, ADMIN
Body: `{ status: ProjectStatus }`
Response 200: Updated project

### GET /projects/summary
Auth: Required | Roles: All
Response 200: `{ active, archive, onHold, dedicated, tAndM, fixed, overdue }`
