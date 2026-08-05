Feature ID   : F-056
Feature Name : Business Unit Head Role
Epic         : PMS — Role & Access Management
Priority     : High
Roles        : SUPER_USER, ADMIN (manage BU Heads); BU_HEAD (new role)

---

## User Story

As a Business Unit Head, I want a dedicated system role that scopes my access to only my
Business Unit, so that I can monitor projects, users, leaves, KPI, and reports within my BU
without seeing or modifying organisation-wide data outside my scope.

---

## Business Rules

BR-1: `BU_HEAD` is a new value in the `SystemRole` enum, sitting between `ADMIN` and `EMPLOYEE`.
BR-2: A BU_HEAD must have exactly one `managedBusinessUnitId` FK set on their `User` record.
      This field is nullable for all other roles.
BR-3: BU_HEAD data scope = all entities whose chain resolves to their managed Business Unit:
        Users   → user.department.businessUnitId === managedBusinessUnitId
        Projects → project.department.businessUnitId === managedBusinessUnitId
        Leaves  → leave.user.department.businessUnitId === managedBusinessUnitId
BR-4: BU_HEAD may view but not create/edit/delete Business Units or Departments.
BR-5: BU_HEAD may not access system settings (company settings, portal config, shifts, holidays).
BR-6: BU_HEAD may not access the Activity Log.
BR-7: BU_HEAD may approve and reject leave requests for users within their BU.
BR-8: BU_HEAD sees KPI and Reports scoped to their BU (always visible — no feature-flag gate).
BR-9: Only SUPER_USER and ADMIN may create or change a user's systemRole to BU_HEAD.
BR-10: The `managedBusinessUnitId` field is mandatory when creating a user with role BU_HEAD,
       and must be set to null when role is changed away from BU_HEAD.
BR-11: Dashboard stat cards for BU_HEAD are scoped to their BU's active projects:
         All Projects   (blue)  — active projects in BU
         Total Tasks    (rose)  — work items in BU projects
         Team Members   (purple)— distinct users in BU
         Completed Tasks (green)— QA_DONE work items in BU projects

---

## Acceptance Criteria

AC-1:  `BU_HEAD` exists as a valid `SystemRole` enum value in Prisma schema and is
       accepted by all endpoints that take `systemRole` as input.
AC-2:  `User` model has an optional `managedBusinessUnitId` FK referencing `BusinessUnit`.
AC-3:  Creating a user with role BU_HEAD without specifying `managedBusinessUnitId` returns
       HTTP 422 with message "managedBusinessUnitId is required for BU_HEAD role".
AC-4:  A BU_HEAD user logging in receives a JWT whose decoded payload includes
       `managedBusinessUnitId` so the frontend can scope UI without extra API calls.
AC-5:  `GET /users` called by a BU_HEAD returns only users whose department belongs to their BU.
AC-6:  `GET /dashboard/stats` called by a BU_HEAD returns stat cards scoped to their BU's projects.
AC-7:  `GET /dashboard/projects-progress` called by a BU_HEAD returns only BU-scoped projects.
AC-8:  `PATCH /leave-requests/:id/approve` and `/reject` succeed when called by a BU_HEAD
       and the leave belongs to a user in their BU; returns 403 when the user is outside their BU.
AC-9:  `GET /leave-requests` called by a BU_HEAD returns only leave requests for users in their BU.
AC-10: Endpoints gated to `[SUPER_USER, ADMIN]` return 403 when called by a BU_HEAD
       (business-units CRUD, departments CRUD, clients CRUD, settings, audit-logs).
AC-11: Sidebar navigation for BU_HEAD shows: Overview, Users, Projects, Timesheet,
       Leaves Management, KPI, Reports, Announcements.
       Hidden from BU_HEAD: Business Units, Departments, Clients, Org Structure, Activity Log.
AC-12: User creation / edit form exposes the "Managed Business Unit" dropdown when role
       BU_HEAD is selected, and hides it for all other roles.
AC-13: `useFeatureVisibility` returns `true` for KPI and REPORTS when the logged-in user
       is BU_HEAD (KPI and Reports are always visible to BU_HEAD, no feature flag needed).
AC-14: Existing SUPER_USER, ADMIN, and EMPLOYEE behaviour is unchanged after this migration.

---

## Dependencies

- Prisma schema (`SystemRole` enum + `managedBusinessUnitId` field on `User`)
- BusinessUnit module (already exists — F-054 Upskill / Business Units management)
- Leave Requests module (F-025)
- Dashboard module (F-026)
- Users module (F-004)

---

## Out of Scope

- BU_HEAD creating or editing Business Units or Departments (read-only access)
- BU_HEAD managing project members (still restricted to PM / TL / Admin)
- BU_HEAD having approval rights over timesheets (remains ADMIN / PM)
- BU_HEAD access to the AI Chat assistant
- Multi-BU assignment (one BU_HEAD → exactly one BU)
- Self-service BU assignment (only SUPER_USER / ADMIN can set managedBusinessUnitId)

---

## Database / Schema Design

### Modified Entities

**Enum: SystemRole**
```
Before: SUPER_USER | ADMIN | EMPLOYEE
After:  SUPER_USER | ADMIN | BU_HEAD | EMPLOYEE
```

**Model: User**
```
Add field:
  managedBusinessUnitId  String?   [nullable, FK → business_units.id, onDelete: SetNull]
```

Relation added to `BusinessUnit` model:
```
  managedByUsers  User[]  @relation("ManagedBusinessUnit")
```

### Migration

Name    : add_bu_head_role
Command : npx prisma migrate dev --name add_bu_head_role
(run from backend/ directory)

---

## API Contract

### Modified: POST /users — Create User

**New validation rule:**
- If `systemRole === 'BU_HEAD'`, `managedBusinessUnitId` must be provided (non-empty string).
- If `systemRole !== 'BU_HEAD'`, `managedBusinessUnitId` is ignored / set to null.

Error:
```
422  { "message": "managedBusinessUnitId is required for BU_HEAD role" }
```

---

### Modified: PATCH /users/:id — Update User

Same validation as POST. If role changes away from BU_HEAD, `managedBusinessUnitId` is set null.

---

### Modified: GET /users

**BU_HEAD caller:**
Returns only users whose `department.businessUnitId === caller.managedBusinessUnitId`.
Response shape unchanged.

---

### Modified: GET /dashboard/stats

**BU_HEAD caller:**
Stat cards scoped to projects in caller's BU (via department → businessUnit chain).
Response shape unchanged.

---

### Modified: GET /dashboard/projects-progress

**BU_HEAD caller:**
Returns only projects in caller's BU.
Response shape unchanged.

---

### Modified: GET /leave-requests

**BU_HEAD caller:**
Returns only leave requests for users in caller's BU.
Response shape unchanged.

---

### Modified: PATCH /leave-requests/:id/approve

**BU_HEAD caller:**
Allowed if `leave.user.department.businessUnitId === caller.managedBusinessUnitId`.
Returns 403 if outside BU scope.

---

### Modified: PATCH /leave-requests/:id/reject

Same as approve.

---

### Auth Response (no new endpoint — augmented existing)

`POST /auth/login` response `user` object gains:
```json
{
  "managedBusinessUnitId": "uuid-or-null"
}
```
