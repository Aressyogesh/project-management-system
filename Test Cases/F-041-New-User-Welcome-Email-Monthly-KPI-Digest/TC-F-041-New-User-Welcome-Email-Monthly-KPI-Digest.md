Feature ID   : F-041
Feature Name : New User Welcome Email & Monthly KPI Digest
Framework    : Jest (integration / manual)

---

Test Case ID : TC-F041-001
Title        : WelcomeEmail_NewUserCreated_EmailReceivedInInbox
AC Covered   : AC-1, AC-2, AC-3
Type         : Happy Path
Given  : Admin creates a new user account via POST /users
When   : The user account is saved successfully
Then   : A welcome email arrives in the new user's inbox
  And  : Subject contains "welcome"
  And  : Email body includes the user's name, their role, and the PMS login URL

---

Test Case ID : TC-F041-002
Title        : MonthlyKpiDigest_EmployeeHasKpiRecords_ReceivesDigestEmail
AC Covered   : AC-5, AC-6
Type         : Happy Path
Given  : An active employee has KPI records for the previous calendar month
When   : handleMonthlyKpiDigest() is invoked (or cron fires on 1st at 08:00)
Then   : Employee receives a KPI digest email
  And  : Subject contains "KPI"
  And  : Body lists metric IDs and points

---

Test Case ID : TC-F041-003
Title        : MonthlyKpiDigest_NoKpiRecords_NoEmailSent
AC Covered   : AC-7
Type         : Edge Case
Given  : An active employee has no KPI records for the previous month
When   : handleMonthlyKpiDigest() is invoked
Then   : No email is sent to that employee
  And  : No error is thrown

---

Test Case ID : TC-F041-004
Title        : MonthlyLeaveReport_ApprovedLeaveInMonth_AdminReceivesReport
AC Covered   : AC-8, AC-9, AC-10
Type         : Happy Path
Given  : At least one employee has approved leave requests in the previous month
  And  : At least one active SUPER_USER or ADMIN exists
When   : handleMonthlyLeaveReport() is invoked (or cron fires on 1st at 08:05)
Then   : Admin receives a leave report email
  And  : Subject contains "leave"
  And  : Body lists employee names and total days taken

---

Test Case ID : TC-F041-005
Title        : WelcomeEmail_SmtpFails_UserAccountStillCreated
AC Covered   : AC-4
Type         : Negative
Given  : SMTP is unreachable
When   : createUser() is called
Then   : The user account is created successfully (no rollback)
  And  : SMTP error is logged
  And  : No exception is thrown to the caller
