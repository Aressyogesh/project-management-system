Feature ID   : F-040
Feature Name : Overdue Task Escalation & Project Health Report
Framework    : Jest (integration / manual)

---

Test Case ID : TC-F040-001
Title        : OverdueEscalation_TasksOverdueByTwoDays_PmReceivesEscalationEmail
AC Covered   : AC-1, AC-2
Type         : Happy Path
Given  : A WorkItem exists with dueDate = 2 days ago, status = IN_PROGRESS
  And  : The project has a ProjectMember with projectRole = PROJECT_MANAGER
When   : handleOverdueTaskEscalation() is invoked
Then   : Email arrives in PM's inbox
  And  : Subject contains "overdue"
  And  : Email body lists the task title, assignee name, and days overdue

---

Test Case ID : TC-F040-002
Title        : WeeklyHealthReport_ActiveProject_PmReceivesHealthSummary
AC Covered   : AC-5, AC-6
Type         : Happy Path
Given  : An active project exists with at least one WorkItem and one Milestone
  And  : The project has a ProjectMember with projectRole = PROJECT_MANAGER
When   : handleWeeklyProjectHealthReport() is invoked (or cron fires Monday 08:00)
Then   : Email arrives in PM's inbox
  And  : Subject contains "project health" or "weekly"
  And  : Email body contains task counts (completed, pending, overdue) and milestone status

---

Test Case ID : TC-F040-003
Title        : OverdueEscalation_NoOverdueTasks_NoEmailSent
AC Covered   : AC-4
Type         : Edge Case
Given  : No WorkItems have dueDate < today by 2+ days
When   : handleOverdueTaskEscalation() is invoked
Then   : No emails are sent
  And  : No errors thrown

---

Test Case ID : TC-F040-004
Title        : OverdueEscalation_ProjectNoPm_SkippedSilently
AC Covered   : AC-3
Type         : Edge Case
Given  : A project has overdue tasks but no ProjectMember with role = PROJECT_MANAGER
When   : handleOverdueTaskEscalation() is invoked
Then   : No emails are sent for that project
  And  : No errors thrown

---

Test Case ID : TC-F040-005
Title        : CronJob_SmtpDown_DoesNotCrashServer
AC Covered   : AC-7
Type         : Negative
Given  : SMTP is unreachable
When   : handleOverdueTaskEscalation() or handleWeeklyProjectHealthReport() is invoked
Then   : Error is logged
  And  : NestJS application remains running (PM2 shows no restarts)
