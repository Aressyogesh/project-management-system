# F-005 — Department Management

```
Feature ID   : F-005
Feature Name : Department Management
Epic         : Project Management System
Priority     : High
Roles        : Super User, Admin

User Story
----------
As a Super User or Admin, I want to create, edit, and deactivate departments
so that I can organise employees and projects by their business unit.

Business Rules
--------------
BR-1: Only Super User and Admin can access the Department Management module.
BR-2: Department names must be unique (case-insensitive).
BR-3: A deactivated department retains its data and existing user assignments.
BR-4: A department cannot be deleted — only deactivated.
BR-5: Department names are trimmed and stored with original casing.
BR-6: At least one character is required for a department name (max 100).

Acceptance Criteria
-------------------
AC-1: The /departments route is accessible only to SUPER_USER and ADMIN.
AC-2: The department list shows all departments (active and inactive) with name and status.
AC-3: An admin can create a new department with a unique name.
AC-4: An admin can edit an existing department's name.
AC-5: An admin can toggle a department's active/inactive status.
AC-6: Duplicate department name (case-insensitive) returns a 409 Conflict error.
AC-7: Empty or missing name returns a 400 Bad Request error.
AC-8: EMPLOYEE role receives 403 Forbidden on all department endpoints.

Dependencies
------------
- F-001 (User Login) — JWT auth, roles guard
- Department model already exists in schema (added in F-004)

Out of Scope
------------
- Deleting departments
- Assigning users to departments from this page (handled in User Management)
- Department-level reporting
```

---

## Step 4 — Database / Schema Design

```
No schema changes required — Department model already exists from F-004 migration.

Existing model:
  Department { id, name (unique), isActive, createdAt, updatedAt }
```

---

## Step 5 — API Contract Design

```
Base URL: /api/v1

─────────────────────────────────────────
Endpoint : GET  /departments
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN
Query Params  : includeInactive=true (returns all; default returns active only)

Success Response  HTTP 200
  [{ "id": string, "name": string, "isActive": boolean, "createdAt": string }]

Error Responses  401, 403

─────────────────────────────────────────
Endpoint : POST  /departments
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body
  { "name": string }   // required, max 100

Success Response  HTTP 201
  { "id": string, "name": string, "isActive": boolean, "createdAt": string }

Error Responses  400 (validation), 401, 403, 409 (duplicate name)

─────────────────────────────────────────
Endpoint : PATCH  /departments/:id
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body
  { "name": string }   // optional

Success Response  HTTP 200  { ...department }
Error Responses  400, 401, 403, 404, 409

─────────────────────────────────────────
Endpoint : PATCH  /departments/:id/status
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body
  { "isActive": boolean }

Success Response  HTTP 200  { ...department }
Error Responses  401, 403, 404
```
