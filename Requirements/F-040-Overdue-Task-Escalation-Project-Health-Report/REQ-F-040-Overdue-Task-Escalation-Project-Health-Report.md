Feature ID   : F-040
Feature Name : Overdue Task Escalation & Project Health Report
Phase        : 15 — Email Notifications & Automation
Author       : Claude Code
Date         : 2026-06-09
Status       : Approved

---

## User Story

**As a Project Manager**, I want to receive a daily escalation email listing all overdue tasks in my projects, and a weekly Monday morning health summary for each project I manage, so that I can proactively address delays and track project progress without manually checking the system.

---

## Business Requirements

| ID   | Requirement |
|------|-------------|
| BR-1 | The system must send a daily email at 08:00 to each Project Manager listing tasks that are 2 or more days overdue in their projects. |
| BR-2 | The overdue escalation email must include: task title, assignee name, project name, original due date, and number of days overdue. |
| BR-3 | The system must send a weekly project health summary email to each Project Manager every Monday at 08:00. |
| BR-4 | The health summary must include: total tasks, completed tasks, pending tasks, overdue task count, open bug count, milestone status breakdown, and team size per project. |
| BR-5 | Projects with no assigned Project Manager (no ProjectMember with projectRole = PROJECT_MANAGER) must be skipped silently. |
| BR-6 | SMTP failures must be caught per email, logged, and must not crash the server or abort other emails. |
| BR-7 | Only active projects (status = ACTIVE) are included in health reports. |

---

## Acceptance Criteria

| ID   | Criterion |
|------|-----------|
| AC-1 | Daily cron fires at 08:00 every day (`0 8 * * *`). |
| AC-2 | For each project with a PM, overdue tasks (dueDate < today AND status NOT IN [QA_DONE, QA] AND days overdue ≥ 2) are emailed to the PM, grouped per project. |
| AC-3 | If a project has no PM, it is skipped (no email, no error). |
| AC-4 | If no projects have overdue tasks, no emails are sent. |
| AC-5 | Monday cron fires at 08:00 every Monday (`0 8 * * 1`). |
| AC-6 | Each health report email contains: project name, total/completed/pending/overdue task counts, open bug count, milestone status breakdown, and team size. |
| AC-7 | SMTP failures are caught per email; server remains running and other emails continue. |
| AC-8 | Both cron jobs use `EmailService.sendEmail()` and `EmailService.wrapHtml()` from F-038 infrastructure. |

---

## Out of Scope

- Push notifications or in-app notifications.
- Overdue subtasks (SUB_TASK type) — only TASK, USER_STORY, and BUG types escalated.
- Historical report storage (emails only — no database records of sent reports).
- Making cron schedules configurable via admin UI.

---

## Dependencies

| Dependency | Notes |
|------------|-------|
| F-038 — Email Notification Infrastructure | `EmailService.sendEmail()` and `wrapHtml()` required |
| F-039 — Task Deadline & Timesheet Reminders | `NotificationsCronService` exists; new methods added to same service |
| `@nestjs/schedule` | Already installed in F-039 |
| `ProjectMember` model | Used to find PM per project |
| `WorkItem` model | Source of overdue task data |
| `Milestone` model | Source of milestone status data for health report |
| `User` model | PM email and name resolution |

---

## Database / Schema Design

**No new schema changes required.** F-040 reads from existing tables:

| Table | Fields Used |
|-------|-------------|
| `work_items` | `id`, `title`, `type`, `dueDate`, `status`, `assigneeId`, `projectId` |
| `project_members` | `projectId`, `userId`, `projectRole` |
| `users` | `id`, `fullName`, `email`, `isActive` |
| `milestones` | `projectId`, `name`, `status` |
| `projects` | `id`, `name`, `status` |

---

## API Contract

**No new HTTP endpoints.** F-040 is exclusively cron-triggered.

| Cron | Expression | Description |
|------|------------|-------------|
| `handleOverdueTaskEscalation` | `0 8 * * *` | Daily 08:00 — escalates overdue tasks to PMs |
| `handleWeeklyProjectHealthReport` | `0 8 * * 1` | Monday 08:00 — sends project health summary to PMs |

---

## Migration Status

**Not required** — no schema changes.
