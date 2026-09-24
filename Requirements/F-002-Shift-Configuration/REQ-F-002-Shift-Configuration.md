# REQ-F-002 — Shift Configuration

Feature ID   : F-002
Feature Name : Shift Configuration
Epic         : PMS Settings & Foundation
Priority     : High
Roles        : Super User, Admin (manage); All (read)

---

## User Story
As a Super User or Admin, I want to configure work shifts (Day, Afternoon, Night) with their start/end times so that the system can enforce the 8-hour daily task allocation cap per employee.

---

## Business Rules

BR-1: Only Super User and Admin may create or update shifts.
BR-2: There are exactly three shift types: DAY, AFTERNOON, NIGHT. Each type may have at most one active shift record.
BR-3: startTime and endTime must be valid HH:MM strings (24-hour).
BR-4: workHours defaults to 8 and must be between 1 and 24.
BR-5: A shift cannot be deleted — it can only be deactivated (isActive = false).
BR-6: All authenticated users may read the shift list (needed for user assignment dropdowns).

---

## Acceptance Criteria

AC-1: GET /api/v1/settings/shifts returns all shifts (active + inactive) for admins; active only for others.
AC-2: POST /api/v1/settings/shifts creates a new shift; returns 409 if that shiftType already exists.
AC-3: PUT /api/v1/settings/shifts/:id updates an existing shift's times and workHours.
AC-4: Only SUPER_USER and ADMIN may call POST and PUT; other roles receive 403.
AC-5: The Settings UI shows a "Shifts" tab listing all three shift types with editable time fields.
AC-6: Inline save per shift row — no full-page reload.
AC-7: A "Reset to Default" restores Day 10:00–19:00, Afternoon 15:00–00:00, Night 23:00–08:00.
AC-8: Success and error feedback shown inline.

---

## Dependencies
- Auth module (JWT guard, RolesGuard) must be in place — ✅ done
- SettingsModule already exists — shifts endpoints will be added there

---

## Out of Scope
- Assigning shifts to users (Phase 3 — User Management)
- Shift-based overtime calculation (Phase 6 — Timesheet)
- Deleting shift records

---

## Database / Schema Design

### New Model: Shift

| Field     | Type        | Constraints                          |
|-----------|-------------|--------------------------------------|
| id        | String UUID | PK, auto                             |
| name      | String      | required, max 50                     |
| shiftType | ShiftType   | unique enum (DAY/AFTERNOON/NIGHT)    |
| startTime | String      | required, HH:MM format               |
| endTime   | String      | required, HH:MM format               |
| workHours | Int         | default 8, range 1–24               |
| isActive  | Boolean     | default true                         |
| createdAt | DateTime    | auto                                 |
| updatedAt | DateTime    | auto                                 |

### New Enum: ShiftType
Values: DAY | AFTERNOON | NIGHT

### Migration
Name   : add_shifts_table
Command: npx prisma migrate dev --name add_shifts_table

---

## API Contract

### GET /api/v1/settings/shifts
Auth Required : Yes (any authenticated user)
Roles Allowed : All

Success Response  HTTP 200
```json
[
  {
    "id": "uuid",
    "name": "Day",
    "shiftType": "DAY",
    "startTime": "10:00",
    "endTime": "19:00",
    "workHours": 8,
    "isActive": true
  }
]
```

---

### POST /api/v1/settings/shifts
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body
```json
{
  "name": "Day",
  "shiftType": "DAY",
  "startTime": "10:00",
  "endTime": "19:00",
  "workHours": 8
}
```

Success Response  HTTP 201
Error Responses
  400 — validation failed
  403 — insufficient role
  409 — shiftType already exists

---

### PUT /api/v1/settings/shifts/:id
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body (all optional)
```json
{
  "name": "Day",
  "startTime": "10:00",
  "endTime": "19:00",
  "workHours": 8,
  "isActive": true
}
```

Success Response  HTTP 200 (updated shift)
Error Responses
  400 — validation failed
  403 — insufficient role
  404 — shift not found
