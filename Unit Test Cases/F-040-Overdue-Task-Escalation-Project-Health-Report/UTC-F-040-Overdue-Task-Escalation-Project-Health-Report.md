Feature ID   : F-040
Feature Name : Overdue Task Escalation & Project Health Report
Framework    : Jest
Test Layer   : Unit (Backend)

---

## handleOverdueTaskEscalation

---

Test Case ID : UTC-F040-B-001
Title        : HandleOverdueTaskEscalation_OverdueTasksWithPm_SendsEscalationEmailToPm
AC Covered   : AC-1, AC-2
Type         : Happy Path

Arrange:
  - projectA has PM = alice@pms.com
  - Two work items in projectA both have dueDate = 3 days ago, status = IN_PROGRESS
  - prisma.workItem.findMany returns these two tasks
  - prisma.projectMember.findFirst returns PM record linked to alice

Act:
  - Call service.handleOverdueTaskEscalation()

Assert:
  - email.sendEmail called once (one PM for projectA)
  - Called with 'alice@pms.com'
  - Subject contains 'overdue'

---

Test Case ID : UTC-F040-B-002
Title        : HandleOverdueTaskEscalation_NoOverdueTasks_SendsNoEmails
AC Covered   : AC-4
Type         : Edge Case

Arrange:
  - prisma.workItem.findMany returns []

Act:
  - Call service.handleOverdueTaskEscalation()

Assert:
  - email.sendEmail not called

---

Test Case ID : UTC-F040-B-003
Title        : HandleOverdueTaskEscalation_ProjectHasNoPm_SkipsProject
AC Covered   : AC-3
Type         : Edge Case

Arrange:
  - One overdue work item exists in projectA
  - prisma.projectMember.findFirst returns null (no PM)

Act:
  - Call service.handleOverdueTaskEscalation()

Assert:
  - email.sendEmail not called

---

Test Case ID : UTC-F040-B-004
Title        : HandleOverdueTaskEscalation_SmtpFails_LogsErrorAndDoesNotThrow
AC Covered   : AC-7
Type         : Negative

Arrange:
  - One overdue task, PM exists
  - email.sendEmail rejects with Error('SMTP down')

Act:
  - Call service.handleOverdueTaskEscalation()

Assert:
  - Does not throw
  - Resolves normally

---

## handleWeeklyProjectHealthReport

---

Test Case ID : UTC-F040-B-005
Title        : HandleWeeklyProjectHealthReport_ActiveProjectsWithPm_SendsHealthEmailPerPm
AC Covered   : AC-5, AC-6
Type         : Happy Path

Arrange:
  - Two active projects, each with a PM
  - prisma.project.findMany returns both projects
  - prisma.projectMember.findFirst returns PM for each
  - prisma.workItem.groupBy returns task count aggregations
  - prisma.milestone.findMany returns milestone list
  - prisma.projectMember.count returns team size

Act:
  - Call service.handleWeeklyProjectHealthReport()

Assert:
  - email.sendEmail called twice (once per PM)
  - Subjects contain 'project health' or 'weekly'

---

Test Case ID : UTC-F040-B-006
Title        : HandleWeeklyProjectHealthReport_ProjectHasNoPm_SkipsProject
AC Covered   : AC-3, AC-5
Type         : Edge Case

Arrange:
  - One active project, no PM (prisma.projectMember.findFirst returns null)

Act:
  - Call service.handleWeeklyProjectHealthReport()

Assert:
  - email.sendEmail not called

---

Test Case ID : UTC-F040-B-007
Title        : HandleWeeklyProjectHealthReport_SmtpFails_LogsErrorAndDoesNotThrow
AC Covered   : AC-7
Type         : Negative

Arrange:
  - One active project with PM
  - email.sendEmail rejects with Error('SMTP down')

Act:
  - Call service.handleWeeklyProjectHealthReport()

Assert:
  - Does not throw
  - Resolves normally
