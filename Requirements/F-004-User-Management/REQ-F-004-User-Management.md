# F-004 — User Management

```
Feature ID   : F-004
Feature Name : User Management
Epic         : Project Management System
Priority     : High
Roles        : Super User, Admin

User Story
----------
As a Super User or Admin, I want to create, view, edit, and deactivate system users
so that I can manage who has access to the PMS and control their roles and assignments.

Business Rules
--------------
BR-1: Only Super User and Admin can access the User Management module.
BR-2: Email addresses must be unique across all users.
BR-3: Passwords must be hashed using bcrypt — never stored in plain text.
BR-4: A deactivated user cannot log in; their data is retained.
BR-5: System role changes take effect immediately on the user's next request.
BR-6: A user cannot deactivate their own account.
BR-7: Department assignment is optional at creation; can be set later.
BR-8: Shift assignment is optional at creation; defaults to none.
BR-9: Profile photo must be an image file (JPG/PNG) ≤ 2 MB — stored on disk.
BR-10: The list must support search by name/email and pagination (25 records/page).

Acceptance Criteria
-------------------
AC-1: The /users route is only visible and accessible to SUPER_USER and ADMIN roles.
AC-2: The user list shows all users with name, email, department, shift, role, and status.
AC-3: An admin can create a new user with required fields: Full Name, Email, Password, System Role.
AC-4: An admin can edit an existing user's Full Name, Phone, Join Date, Department, Shift, System Role, and Profile Photo.
AC-5: An admin can toggle a user's active/inactive status (cannot deactivate own account).
AC-6: Duplicate email on create or edit returns a 409 Conflict error.
AC-7: Invalid or missing required fields return a 400 Bad Request with field-level errors.
AC-8: The user list supports search by name or email (case-insensitive, partial match).
AC-9: The user list is paginated (25 per page) with total count and page navigation.
AC-10: Available departments appear in a dropdown when creating/editing a user.
AC-11: Available shifts (DAY, AFTERNOON, NIGHT) appear in a dropdown.
AC-12: An EMPLOYEE role user receives 403 Forbidden on any User Management endpoint.

Dependencies
------------
- F-001 (User Login) — JWT auth infrastructure, roles guard
- Shift model (added in F-002) — for shift assignment dropdown
- Department model — added in this feature (F-004 schema migration)

Out of Scope
------------
- Password reset / change password for another user
- Bulk import of users (CSV upload)
- User invitation via email
- Project-level role assignment (handled per project in a future feature)
```

---

## Step 4 — Database / Schema Design

```
Feature ID   : F-004
Feature Name : User Management

New Entities / Tables
---------------------
Entity / Table : Department
Fields:
  - id        : String (UUID)  [PK, auto-generated]
  - name      : String         [required, unique, max 100]
  - isActive  : Boolean        [default: true]
  - createdAt : DateTime       [auto UTC]
  - updatedAt : DateTime       [auto updated]

Modified Entities / Tables
--------------------------
Entity / Table : User
Changes (additions):
  - phone        : String?    [nullable, max 20]
  - joinDate     : DateTime?  [nullable, date only]
  - profilePhoto : String?    [nullable — file path on disk]
  - departmentId : String?    [FK → Department, nullable]
  - shiftId      : String?    [FK → Shift, nullable]

Relationships
-------------
  Department has many Users via departmentId
  Shift has many Users via shiftId (Shift model already exists from F-002)
  User belongs to one Department (optional)
  User belongs to one Shift (optional)

Enumerations
------------
  (none new — SystemRole enum already exists)

Migration
---------
  Name   : add_departments_and_extend_users
  Type   : Auto-generated via Prisma
  Command: npx prisma migrate dev --name add_departments_and_extend_users
```

---

## Step 5 — API Contract Design

```
Base URL: /api/v1

─────────────────────────────────────────
Endpoint : GET  /users
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request
  Query Params:
    page   : number  // default 1
    limit  : number  // default 25
    search : string  // optional — partial match on fullName or email

Success Response  HTTP 200
  {
    "data": [
      {
        "id"           : string,
        "fullName"     : string,
        "email"        : string,
        "systemRole"   : "SUPER_USER" | "ADMIN" | "EMPLOYEE",
        "phone"        : string | null,
        "joinDate"     : string | null,
        "profilePhoto" : string | null,
        "isActive"     : boolean,
        "createdAt"    : string,
        "department"   : { "id": string, "name": string } | null,
        "shift"        : { "id": string, "name": string, "shiftType": string } | null
      }
    ],
    "total" : number,
    "page"  : number,
    "limit" : number
  }

Error Responses
  401  Unauthorized  — missing or invalid token
  403  Forbidden     — role not permitted

─────────────────────────────────────────
Endpoint : POST  /users
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body (multipart/form-data for photo upload, or JSON without photo):
  {
    "fullName"     : string   // required, max 100
    "email"        : string   // required, valid email
    "password"     : string   // required, min 8 chars
    "systemRole"   : string   // required — SUPER_USER | ADMIN | EMPLOYEE
    "phone"        : string?  // optional
    "joinDate"     : string?  // optional — ISO date
    "departmentId" : string?  // optional — UUID
    "shiftId"      : string?  // optional — UUID
  }

Success Response  HTTP 201
  { ...user object as above }

Error Responses
  400  Bad Request  — validation failed (field errors)
  401  Unauthorized
  403  Forbidden
  409  Conflict     — email already exists

─────────────────────────────────────────
Endpoint : GET  /users/:id
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Success Response  HTTP 200  { ...user object }
Error Responses
  401, 403, 404 Not Found

─────────────────────────────────────────
Endpoint : PATCH  /users/:id
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body (all fields optional):
  {
    "fullName"     : string?
    "email"        : string?
    "systemRole"   : string?
    "phone"        : string?
    "joinDate"     : string?
    "departmentId" : string?
    "shiftId"      : string?
  }

Success Response  HTTP 200  { ...updated user object }
Error Responses
  400, 401, 403, 404, 409

─────────────────────────────────────────
Endpoint : PATCH  /users/:id/status
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body:
  { "isActive": boolean }

Success Response  HTTP 200  { ...updated user object }
Error Responses
  400  — attempting to deactivate own account
  401, 403, 404

─────────────────────────────────────────
Endpoint : GET  /departments
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Success Response  HTTP 200
  [{ "id": string, "name": string, "isActive": boolean }]

─────────────────────────────────────────
Endpoint : GET  /settings/shifts
─────────────────────────────────────────
Auth Required : Yes  (already exists — reused for dropdown)
Roles Allowed : SUPER_USER, ADMIN
```
