Feature ID   : F-041
Feature Name : New User Welcome Email & Monthly KPI Digest
Phase        : 15 — Email Notifications & Automation
Author       : Claude Code
Date         : 2026-06-09
Status       : Approved

---

## User Story

**As an administrator**, I want new users to receive a branded welcome email when their account is created, so they know their account is active and how to log in.

**As an employee**, I want to receive a monthly KPI digest showing my performance metrics for the previous month, so I can track my progress.

**As a super-user/admin**, I want a monthly leave usage report showing all approved leave taken by team members in the previous month, so I can track leave consumption.

---

## Business Requirements

| ID   | Requirement |
|------|-------------|
| BR-1 | When a new user account is created via `UsersService.createUser()`, a welcome email must be sent to the new user. |
| BR-2 | The welcome email must include: the user's full name, their system role, and the PMS login URL. |
| BR-3 | On the 1st of each month at 08:00, a KPI digest email must be sent to each active employee who has KPI records for the previous month. |
| BR-4 | The KPI digest must include: metric IDs and their corresponding points for the previous month. |
| BR-5 | On the 1st of each month at 08:05, a leave usage report must be emailed to all active SUPER_USER and ADMIN users. |
| BR-6 | The leave report must include: each employee name, total approved leave days taken in the previous month. |
| BR-7 | Users with no KPI records for the previous month are skipped (no email). |
| BR-8 | SMTP failures must be caught per email, logged, and must not crash the server. |
| BR-9 | Welcome email failure must not abort the user creation — user is saved regardless. |

---

## Acceptance Criteria

| ID   | Criterion |
|------|-----------|
| AC-1 | After `createUser()` succeeds, a welcome email is sent to the new user's email address. |
| AC-2 | Welcome email subject contains "welcome". |
| AC-3 | Welcome email body contains the user's full name, their role, and the login URL. |
| AC-4 | SMTP failure on welcome email is caught and logged; user creation is not rolled back. |
| AC-5 | Monthly KPI cron fires on the 1st of each month at 08:00 (`0 8 1 * *`). |
| AC-6 | Each employee with KPI records for the previous month receives a KPI digest email. |
| AC-7 | Employees with no KPI records for the previous month are skipped. |
| AC-8 | Monthly leave cron fires on the 1st of each month at 08:05 (`5 8 1 * *`). |
| AC-9 | All active SUPER_USER and ADMIN users receive the monthly leave report. |
| AC-10 | Leave report includes each employee's total approved leave days for last month. |
| AC-11 | SMTP failures (cron) are caught per email; server remains running. |

---

## Out of Scope

- Sending password in welcome email (security concern).
- Unsubscribe mechanism for notification emails.
- KPI email to manager/PM (send to employee only for simplicity).
- Push/in-app notifications.

---

## Dependencies

| Dependency | Notes |
|------------|-------|
| F-038 — Email Notification Infrastructure | `EmailService.sendEmail()` and `wrapHtml()` |
| F-039/F-040 — Cron infrastructure | `@nestjs/schedule` already installed |
| `KpiRecord` model | Source of KPI data |
| `LeaveRequest` model | Source of leave data |
| `User` model | Email/name resolution; SystemRole filter |
| `APP_FRONTEND_URL` env var | Login URL in welcome email |

---

## Database / Schema Design

**No new schema changes required.** All data comes from existing tables.

---

## API Contract

| Trigger | Expression | Description |
|---------|------------|-------------|
| `createUser()` hook | Event | Welcome email sent post-user-creation |
| `handleMonthlyKpiDigest` | `0 8 1 * *` | 1st of month 08:00 — KPI digest per employee |
| `handleMonthlyLeaveReport` | `5 8 1 * *` | 1st of month 08:05 — Leave summary to admins |

---

## Migration Status

**Not required** — no schema changes.
