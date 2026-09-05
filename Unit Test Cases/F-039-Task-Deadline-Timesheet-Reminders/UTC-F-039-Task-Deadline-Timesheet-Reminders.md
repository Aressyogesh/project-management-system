Feature ID   : F-039
Feature Name : Task Deadline & Timesheet Reminders
Layer        : Backend
Framework    : Jest (NestJS Testing)

---

Unit Test ID : UTC-F039-B-001
Title        : HandleDeadlineReminders_TasksDueTomorrow_SendsGroupedEmailPerAssignee
AC Covered   : AC-1, AC-2
Arrange:
  - Mock PrismaService.workItem.findMany → returns 2 tasks assigned to userA, 1 task assigned to userB
  - Mock EmailService.sendEmail + wrapHtml
Act:
  - await service.handleDeadlineReminders()
Assert:
  - EmailService.sendEmail called twice (once per unique assignee)
  - First call to email: userA's email with both tasks in the html
  - Second call: userB's email with their task

---

Unit Test ID : UTC-F039-B-002
Title        : HandleDeadlineReminders_NoTasksDueTomorrow_SendsNoEmails
AC Covered   : AC-5
Arrange:
  - Mock PrismaService.workItem.findMany → returns []
  - Mock EmailService.sendEmail
Act:
  - await service.handleDeadlineReminders()
Assert:
  - EmailService.sendEmail not called

---

Unit Test ID : UTC-F039-B-003
Title        : HandleDeadlineReminders_SmtpFails_LogsErrorAndDoesNotThrow
AC Covered   : AC-7
Arrange:
  - Mock PrismaService.workItem.findMany → returns 1 task
  - Mock EmailService.sendEmail → rejects with Error('SMTP down')
  - Spy on Logger.error
Act:
  - await expect(service.handleDeadlineReminders()).resolves.not.toThrow()
Assert:
  - Logger.error called once
  - No unhandled rejection

---

Unit Test ID : UTC-F039-B-004
Title        : HandleTimesheetReminders_EmployeesWithZeroHours_SendsReminderEmail
AC Covered   : AC-3, AC-4
Arrange:
  - Mock PrismaService.user.findMany → returns [userA, userB] (active employees)
  - Mock PrismaService.timesheetEntry.aggregate → returns { _sum: { hours: 0 } } for both
  - Mock EmailService.sendEmail + wrapHtml
Act:
  - await service.handleTimesheetReminders()
Assert:
  - EmailService.sendEmail called twice (once per zero-hours employee)
  - Email html contains employee name and week date range

---

Unit Test ID : UTC-F039-B-005
Title        : HandleTimesheetReminders_AllEmployeesLoggedHours_SendsNoEmails
AC Covered   : AC-6
Arrange:
  - Mock PrismaService.user.findMany → returns [userA]
  - Mock PrismaService.timesheetEntry.aggregate → returns { _sum: { hours: 8 } }
  - Mock EmailService.sendEmail
Act:
  - await service.handleTimesheetReminders()
Assert:
  - EmailService.sendEmail not called

---

Unit Test ID : UTC-F039-B-006
Title        : HandleTimesheetReminders_SmtpFails_LogsErrorAndDoesNotThrow
AC Covered   : AC-7
Arrange:
  - Mock PrismaService.user.findMany → returns [userA]
  - Mock aggregate → returns 0 hours
  - Mock EmailService.sendEmail → rejects
  - Spy on Logger.error
Act:
  - await expect(service.handleTimesheetReminders()).resolves.not.toThrow()
Assert:
  - Logger.error called
  - No crash
