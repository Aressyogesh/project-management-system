Feature ID   : F-039
Feature Name : Task Deadline & Timesheet Reminders
Framework    : Jest (integration / manual)

---

Test Case ID : TC-F039-001
Title        : DeadlineReminder_TaskDueTomorrow_EmailReceived
AC Covered   : AC-1, AC-2
Type         : Happy Path
Given  : A WorkItem exists with dueDate = tomorrow, status = IN_PROGRESS, assignee = active user
When   : handleDeadlineReminders() is invoked manually (or cron fires at 09:00)
Then   : Email arrives in assignee's inbox
  And  : Subject contains "deadline" or "due tomorrow"
  And  : Email body lists the task title and project name

---

Test Case ID : TC-F039-002
Title        : TimesheetReminder_ZeroHoursEmployee_EmailReceived
AC Covered   : AC-3, AC-4
Type         : Happy Path
Given  : Active employee has logged 0 TimesheetEntry hours for the current week
When   : handleTimesheetReminders() is invoked manually (or cron fires Friday 16:00)
Then   : Email arrives in employee's inbox
  And  : Subject contains "timesheet"
  And  : Email body contains employee name and current week date range

---

Test Case ID : TC-F039-003
Title        : DeadlineReminder_NoTasksDue_NoEmailSent
AC Covered   : AC-5
Type         : Edge Case
Given  : No WorkItems have dueDate = tomorrow
When   : handleDeadlineReminders() is invoked
Then   : No emails are sent
  And  : No errors thrown

---

Test Case ID : TC-F039-004
Title        : CronJob_ServerError_DoesNotCrashServer
AC Covered   : AC-7
Type         : Negative
Given  : SMTP is unreachable
When   : handleDeadlineReminders() or handleTimesheetReminders() is invoked
Then   : Error is logged
  And  : NestJS application remains running (PM2 shows no restarts)
