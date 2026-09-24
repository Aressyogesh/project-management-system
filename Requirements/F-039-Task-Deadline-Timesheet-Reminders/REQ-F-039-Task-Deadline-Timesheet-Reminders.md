Feature ID   : F-039
Feature Name : Task Deadline & Timesheet Reminders
Epic         : PMS — Smart Email Notifications & Workflow Automation (Phase 15)
Priority     : High
Roles        : System (cron-triggered); recipients: EMPLOYEE, PROJECT_MANAGER, TEAM_LEAD, DEVELOPER, QA, DESIGNER, DEVOPS

User Story
----------
As a PMS system administrator, I want the system to automatically send email reminders
to employees about upcoming task deadlines and missing timesheet entries so that work
items are completed on time and timesheets are submitted without manual chasing.

Business Rules
--------------
BR-1: The deadline reminder cron runs daily at 09:00 AM server time.
BR-2: A deadline reminder is sent for every WorkItem where:
      - dueDate falls on tomorrow (next calendar day)
      - status is NOT DONE / QA_DONE (i.e. not completed)
      - assigneeId is not null
      - the assignee user is active (isActive = true)
BR-3: Each assignee receives one email listing ALL their tasks due tomorrow (not one
      email per task) to avoid inbox flooding.
BR-4: The timesheet reminder cron runs every Friday at 16:00 (4 PM) server time.
BR-5: A timesheet reminder is sent to every active employee who has logged 0 hours
      of TimesheetEntry for the current ISO week (Monday–Friday).
BR-6: Both jobs must use EmailService.sendEmail() + wrapHtml() from F-038.
BR-7: Cron jobs must NOT throw unhandled exceptions — errors are caught and logged.
BR-8: Both jobs are active only when NODE_ENV is not 'test'.
BR-9: Emails are sent only to users with a non-null email address.

Acceptance Criteria
-------------------
AC-1: Daily at 09:00 the system queries WorkItems due tomorrow with incomplete status
      and sends one grouped email per assignee listing all their due tasks.
AC-2: The deadline reminder email includes task title, project name, and due date for
      each task in a formatted list.
AC-3: Every Friday at 16:00 the system queries active employees with 0 timesheet hours
      logged for the current week and sends each a timesheet reminder email.
AC-4: The timesheet reminder email includes the employee's name and the week date range.
AC-5: If no tasks are due tomorrow, the deadline cron runs silently without sending emails.
AC-6: If all employees have logged hours, the timesheet cron runs silently without sending emails.
AC-7: Cron job errors (e.g. SMTP failure) are logged as ERROR but do not crash the server.
AC-8: Both cron services are registered in a new NotificationsModule and the module is
      imported in AppModule.

Dependencies
------------
- F-038 — EmailService with sendEmail() and wrapHtml() (complete)
- WorkItem model with dueDate, status, assigneeId fields (exists)
- TimesheetEntry model with userId, date, hours fields (exists)
- @nestjs/schedule package (to be installed)
- Active users queryable via PrismaService

Out of Scope
------------
- Push notifications or in-app notifications
- User opt-out / unsubscribe preferences
- Configurable cron schedules via UI
- Retry logic on email failure
- Reminder for sub-tasks specifically (all WorkItem types covered)

---

## Database / Schema Design (Step 4)

No schema changes required. F-039 queries existing models:
- `WorkItem` — dueDate, status, assigneeId (+ relation to User, Project)
- `TimesheetEntry` — userId, date, hours
- `User` — email, fullName, isActive

No new Prisma models. No migrations needed.

---

## API Contract Design (Step 5)

F-039 is a background service — no new HTTP endpoints.
Internal methods exposed by NotificationsCronService:

```typescript
// Called by @Cron('0 9 * * *')
handleDeadlineReminders(): Promise<void>

// Called by @Cron('0 16 * * 5')
handleTimesheetReminders(): Promise<void>
```

No REST API changes.
