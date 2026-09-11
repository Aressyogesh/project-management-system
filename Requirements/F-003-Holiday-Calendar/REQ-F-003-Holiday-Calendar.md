# REQ-F-003 — Holiday Calendar Configuration

Feature ID   : F-003
Feature Name : Holiday Calendar Configuration
Epic         : PMS Settings & Foundation
Priority     : Medium
Roles        : Super User, Admin (manage); All (read)

---

## User Story
As a Super User or Admin, I want to define public/company holidays in the Portal Configuration page so that the system can exclude those days from timesheet tracking and task allocation.

---

## Business Rules

BR-1: Only Super User and Admin may add or delete holidays.
BR-2: A holiday has a name and a specific date. Two holidays may not share the same date.
BR-3: Holidays can be marked as recurring (same name/date repeats every year automatically).
BR-4: The holiday list is filterable by year.
BR-5: All authenticated users may read the holiday list.
BR-6: A holiday may be deleted (hard delete) by Super User or Admin.

---

## Acceptance Criteria

AC-1: GET /api/v1/settings/holidays returns all holidays, optionally filtered by ?year=YYYY.
AC-2: POST /api/v1/settings/holidays creates a holiday; returns 409 if date already has a holiday.
AC-3: DELETE /api/v1/settings/holidays/:id removes the holiday permanently.
AC-4: Only SUPER_USER and ADMIN may POST and DELETE; others receive 403.
AC-5: The Portal Configuration page shows a collapsible "Holidays" section replacing the placeholder button.
AC-6: The Holidays section has a year selector dropdown (current year ± 2 years).
AC-7: Holidays for the selected year are listed with date, name, and a delete button.
AC-8: An "Add Holiday" inline form lets the user pick a date and enter a name.
AC-9: Recurring holidays show a badge and auto-appear in future year views.
AC-10: Success and error feedback shown inline.

---

## Dependencies
- PortalConfigPage.tsx already has a "Configure Holidays" placeholder button — replace it.
- Auth module (JWT guard, RolesGuard) — ✅ done

---

## Out of Scope
- Integrating holidays into timesheet or task allocation logic (Phase 6–7)
- iCal / public holiday API integration

---

## Database / Schema Design

### New Model: Holiday

| Field       | Type     | Constraints                        |
|-------------|----------|------------------------------------|
| id          | String   | UUID PK, auto                      |
| name        | String   | required, max 100                  |
| date        | DateTime | required, @db.Date, unique         |
| isRecurring | Boolean  | default false                      |
| createdAt   | DateTime | auto                               |

### Migration
Name   : add_holidays_table
Command: npx prisma migrate dev --name add_holidays_table

---

## API Contract

### GET /api/v1/settings/holidays
Auth Required : Yes (any authenticated user)
Query Params  : year (optional, integer e.g. 2026)

Success Response  HTTP 200
```json
[
  {
    "id": "uuid",
    "name": "Republic Day",
    "date": "2026-01-26",
    "isRecurring": true
  }
]
```

---

### POST /api/v1/settings/holidays
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body
```json
{
  "name": "Republic Day",
  "date": "2026-01-26",
  "isRecurring": true
}
```

Success Response  HTTP 201
Error Responses
  400 — validation failed
  403 — insufficient role
  409 — holiday already exists on that date

---

### DELETE /api/v1/settings/holidays/:id
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Success Response  HTTP 204 No Content
Error Responses
  403 — insufficient role
  404 — holiday not found
