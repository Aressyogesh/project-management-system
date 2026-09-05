# E2E Test Cases — F-056: Business Unit Head Role

Feature ID   : F-056
Feature Name : Business Unit Head Role
Framework    : Playwright
Environment  : Seeded PMS DB with BU_HEAD user assigned to 'Engineering' BU

---

## TC-F056-001

Test Case ID : TC-F056-001
Title        : BU Head login returns managedBusinessUnitId in auth response
AC Covered   : AC-4
Priority     : High
Type         : Happy Path

Given  : A user exists with systemRole BU_HEAD and managedBusinessUnitId set to Engineering BU
When   : POST /auth/login with valid credentials
Then   : HTTP 200 returned
  And  : response.user.systemRole === 'BU_HEAD'
  And  : response.user.managedBusinessUnitId is a non-null UUID

Expected Response : HTTP 200 with user.managedBusinessUnitId set

---

## TC-F056-002

Test Case ID : TC-F056-002
Title        : BU Head dashboard shows only BU-scoped stat cards
AC Covered   : AC-6
Priority     : High
Type         : Happy Path

Given  : BU Head user is logged in (managedBusinessUnitId = Engineering BU)
  And  : Engineering BU has 3 active projects
  And  : Another BU has 5 active projects
When   : GET /dashboard/stats (no filters)
Then   : HTTP 200 returned
  And  : cards[0].label === 'All Projects' and value === 3 (Engineering only)
  And  : cards[0].color === 'blue'
  And  : cards[1].color === 'rose'
  And  : cards[2].color === 'purple'
  And  : cards[3].color === 'green'

Expected Response : HTTP 200, stat cards scoped to BU

---

## TC-F056-003

Test Case ID : TC-F056-003
Title        : BU Head GET /users returns only users in their BU
AC Covered   : AC-5
Priority     : High
Type         : Happy Path

Given  : BU Head user is logged in (managedBusinessUnitId = Engineering BU)
  And  : Engineering BU has 8 users
  And  : Another BU has 5 users
When   : GET /users
Then   : HTTP 200 returned
  And  : All returned users belong to departments under Engineering BU
  And  : No users from other BUs are present

Expected Response : HTTP 200, array length = 8

---

## TC-F056-004

Test Case ID : TC-F056-004
Title        : BU Head can approve leave for a user in their BU
AC Covered   : AC-8
Priority     : High
Type         : Happy Path

Given  : BU Head user is logged in
  And  : A pending leave request exists for a user in the Engineering BU
When   : PATCH /leave-requests/:id/approve
Then   : HTTP 200 returned
  And  : leave status === 'APPROVED'

Expected Response : HTTP 200 with updated leave record

---

## TC-F056-005

Test Case ID : TC-F056-005
Title        : BU Head cannot approve leave for a user outside their BU
AC Covered   : AC-8
Priority     : High
Type         : RBAC / Negative

Given  : BU Head user is logged in (managedBusinessUnitId = Engineering BU)
  And  : A pending leave request exists for a user in a different BU (Sales BU)
When   : PATCH /leave-requests/:id/approve
Then   : HTTP 403 returned
  And  : error message indicates insufficient scope

Expected Response : HTTP 403 Forbidden

---

## TC-F056-006

Test Case ID : TC-F056-006
Title        : BU Head cannot access business-units management endpoint
AC Covered   : AC-10
Priority     : High
Type         : RBAC

Given  : BU Head user is logged in with valid JWT
When   : POST /business-units (create a new BU)
Then   : HTTP 403 returned

Expected Response : HTTP 403 Forbidden

---

## TC-F056-007

Test Case ID : TC-F056-007
Title        : BU Head cannot access settings endpoint
AC Covered   : AC-10
Priority     : High
Type         : RBAC

Given  : BU Head user is logged in
When   : GET /settings/company
Then   : HTTP 403 returned

Expected Response : HTTP 403 Forbidden

---

## TC-F056-008

Test Case ID : TC-F056-008
Title        : BU Head cannot access audit logs endpoint
AC Covered   : AC-10
Priority     : High
Type         : RBAC

Given  : BU Head user is logged in
When   : GET /audit-logs
Then   : HTTP 403 returned

Expected Response : HTTP 403 Forbidden

---

## TC-F056-009

Test Case ID : TC-F056-009
Title        : Creating BU Head user without managedBusinessUnitId returns 422
AC Covered   : AC-3
Priority     : High
Type         : Negative

Given  : Admin user is logged in
When   : POST /users with { systemRole: 'BU_HEAD' } and no managedBusinessUnitId
Then   : HTTP 422 returned
  And  : error message contains 'managedBusinessUnitId is required for BU_HEAD role'

Expected Response : HTTP 422 Unprocessable Entity

---

## TC-F056-010

Test Case ID : TC-F056-010
Title        : Creating BU Head user with managedBusinessUnitId succeeds
AC Covered   : AC-1, AC-2, AC-3
Priority     : High
Type         : Happy Path

Given  : Admin user is logged in
  And  : A Business Unit with id 'bu-uuid' exists
When   : POST /users with { systemRole: 'BU_HEAD', managedBusinessUnitId: 'bu-uuid', ...fields }
Then   : HTTP 201 returned
  And  : response.systemRole === 'BU_HEAD'
  And  : response.managedBusinessUnitId === 'bu-uuid'

Expected Response : HTTP 201 Created

---

## TC-F056-011

Test Case ID : TC-F056-011
Title        : Employee role behaviour unchanged after BU_HEAD migration
AC Covered   : AC-14
Priority     : High
Type         : Regression

Given  : An EMPLOYEE user logs in
When   : GET /users
Then   : HTTP 403 returned (employees cannot list all users — unchanged behaviour)

Expected Response : HTTP 403 Forbidden

---

## TC-F056-012

Test Case ID : TC-F056-012
Title        : Admin role behaviour unchanged after BU_HEAD migration
AC Covered   : AC-14
Priority     : High
Type         : Regression

Given  : An ADMIN user logs in
When   : GET /users
Then   : HTTP 200 returned with ALL users across all BUs (unchanged behaviour)

Expected Response : HTTP 200 with full user list

---

## TC-F056-013

Test Case ID : TC-F056-013
Title        : BU Head sidebar shows correct nav items in browser
AC Covered   : AC-11
Priority     : High
Type         : Happy Path (UI)

Given  : BU Head user is logged in and on the dashboard
When   : Sidebar is visible (expanded mode)
Then   : Nav shows: Overview, Users, Projects, Timesheet, Leaves Management,
         KPI, Reports, Announcements
  And  : Nav does NOT show: Business Units, Departments, Clients,
         Org Structure, Activity Log

Expected UI : Correct role-scoped navigation

---

## TC-F056-014

Test Case ID : TC-F056-014
Title        : User form shows Managed Business Unit field only for BU_HEAD role
AC Covered   : AC-12
Priority     : Medium
Type         : Happy Path (UI)

Given  : Admin is on the Create User modal
When   : Admin selects 'BU Head' in the System Role dropdown
Then   : A 'Managed Business Unit' dropdown appears
When   : Admin changes role to 'Employee'
Then   : The 'Managed Business Unit' dropdown disappears

Expected UI : Conditional field visibility

---

## TC-F056-015

Test Case ID : TC-F056-015
Title        : GET /dashboard/projects-progress for BU Head returns only BU projects
AC Covered   : AC-7
Priority     : Medium
Type         : Happy Path

Given  : BU Head user is logged in (Engineering BU)
  And  : Engineering BU has 2 active projects; another BU has 3 projects
When   : GET /dashboard/projects-progress
Then   : HTTP 200 returned
  And  : Response array length === 2 (Engineering projects only)

Expected Response : HTTP 200 with 2 project records
