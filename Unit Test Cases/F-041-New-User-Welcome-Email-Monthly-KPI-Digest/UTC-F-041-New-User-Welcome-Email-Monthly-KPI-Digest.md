Feature ID   : F-041
Feature Name : New User Welcome Email & Monthly KPI Digest
Framework    : Jest
Test Layer   : Unit (Backend)

---

## UsersService — Welcome Email

---

Test Case ID : UTC-F041-B-001
Title        : CreateUser_NewUser_SendsWelcomeEmail
AC Covered   : AC-1, AC-2, AC-3
Type         : Happy Path

Arrange:
  - prisma.user.findUnique returns null (no conflict)
  - prisma.user.create returns { id, fullName: 'Alice', email: 'alice@pms.com', systemRole: 'EMPLOYEE', ... }
  - email.sendEmail resolves
  - APP_FRONTEND_URL = 'http://localhost:5173'

Act:
  - Call service.createUser({ fullName: 'Alice', email: 'alice@pms.com', password: '...', systemRole: 'EMPLOYEE' })

Assert:
  - email.sendEmail called once
  - Called with 'alice@pms.com'
  - Subject contains 'welcome' (case-insensitive)

---

Test Case ID : UTC-F041-B-002
Title        : CreateUser_SmtpFails_UserCreatedAndErrorLogged
AC Covered   : AC-4
Type         : Negative

Arrange:
  - prisma.user.create returns valid user
  - email.sendEmail rejects with Error('SMTP down')

Act:
  - Call service.createUser(dto)

Assert:
  - Does not throw
  - Returns created user object (user creation succeeds despite email failure)

---

## NotificationsCronService — Monthly KPI Digest

---

Test Case ID : UTC-F041-B-003
Title        : HandleMonthlyKpiDigest_UsersWithKpiRecords_SendsDigestEmail
AC Covered   : AC-5, AC-6
Type         : Happy Path

Arrange:
  - prisma.user.findMany returns [alice]
  - prisma.kpiRecord.findMany returns [{metricId: 'QUALITY', points: 90, period: '2026-05'}]

Act:
  - Call service.handleMonthlyKpiDigest()

Assert:
  - email.sendEmail called once with 'alice@pms.com'
  - Subject contains 'kpi' (case-insensitive)

---

Test Case ID : UTC-F041-B-004
Title        : HandleMonthlyKpiDigest_UserHasNoKpiRecords_SkipsEmail
AC Covered   : AC-7
Type         : Edge Case

Arrange:
  - prisma.user.findMany returns [alice]
  - prisma.kpiRecord.findMany returns []

Act:
  - Call service.handleMonthlyKpiDigest()

Assert:
  - email.sendEmail not called

---

Test Case ID : UTC-F041-B-005
Title        : HandleMonthlyKpiDigest_SmtpFails_LogsErrorAndDoesNotThrow
AC Covered   : AC-11
Type         : Negative

Arrange:
  - User has KPI records
  - email.sendEmail rejects

Act:
  - Call service.handleMonthlyKpiDigest()

Assert:
  - Does not throw

---

## NotificationsCronService — Monthly Leave Report

---

Test Case ID : UTC-F041-B-006
Title        : HandleMonthlyLeaveReport_ApprovedLeaveExists_SendsReportToAdmins
AC Covered   : AC-8, AC-9, AC-10
Type         : Happy Path

Arrange:
  - prisma.user.findMany (admins) returns [adminUser]
  - prisma.leaveRequest.groupBy returns [{userId, _sum.totalDays: 5}]
  - prisma.user.findMany (name lookup) returns [{id, fullName: 'Alice'}]

Act:
  - Call service.handleMonthlyLeaveReport()

Assert:
  - email.sendEmail called once with admin's email
  - Subject contains 'leave' (case-insensitive)

---

Test Case ID : UTC-F041-B-007
Title        : HandleMonthlyLeaveReport_SmtpFails_LogsErrorAndDoesNotThrow
AC Covered   : AC-11
Type         : Negative

Arrange:
  - Admin user exists, leave data exists
  - email.sendEmail rejects

Act:
  - Call service.handleMonthlyLeaveReport()

Assert:
  - Does not throw
