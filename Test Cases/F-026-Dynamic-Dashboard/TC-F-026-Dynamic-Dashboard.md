# TC-F-026 — E2E Test Cases: Dynamic Dashboard & Project-wise Team Progress

---

## TC-F026-001
```
Test Case ID : TC-F026-001
Title        : Super User sees Projects Progress panel with live project data
Feature      : F-026 — Dynamic Dashboard & Project-wise Team Progress
AC Covered   : AC-2, AC-3, AC-9
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : A Super User is logged in
  And  : At least 2 active projects exist with tasks and team members

When   : The user navigates to the dashboard (/)

Then   : A "Projects Progress" section is visible
  And  : Each project card shows the project name
  And  : Each card shows task completion count (x / y)
  And  : Each card shows a progress bar and percentage
  And  : Each card shows open bug count and team size

Expected Response : 200 OK, panels rendered
```

---

## TC-F026-002
```
Test Case ID : TC-F026-002
Title        : Employee does not see Projects Progress panel
Feature      : F-026 — Dynamic Dashboard & Project-wise Team Progress
AC Covered   : AC-5
Priority     : High
Type         : RBAC

Given  : An Employee is logged in

When   : The user navigates to the dashboard (/)

Then   : The "Projects Progress" section is NOT visible
  And  : The user sees their personal stat cards and task table

Expected Response : Dashboard loads, no projects panel
```

---

## TC-F026-003
```
Test Case ID : TC-F026-003
Title        : GET /dashboard/projects-progress returns 403 for Employee
Feature      : F-026 — Dynamic Dashboard & Project-wise Team Progress
AC Covered   : AC-6
Priority     : High
Type         : Security / RBAC
Framework    : Playwright / REST

Given  : An Employee JWT token is available

When   : A GET request is sent to /api/v1/dashboard/projects-progress with Employee token

Then   : The response status is 403 Forbidden

Expected Response : HTTP 403
```

---

## TC-F026-004
```
Test Case ID : TC-F026-004
Title        : Activity chart shows non-zero real values
Feature      : F-026 — Dynamic Dashboard & Project-wise Team Progress
AC Covered   : AC-1
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : A Super User is logged in
  And  : At least 5 tasks have been marked COMPLETED in the last 30 days

When   : The user navigates to the dashboard

Then   : The Team Activity Summary bar chart renders 12 months of data
  And  : At least one bar has a non-zero value for the current month

Expected Response : Chart renders with real data
```

---

## TC-F026-005
```
Test Case ID : TC-F026-005
Title        : Progress % is 0 for project with no tasks
Feature      : F-026 — Dynamic Dashboard & Project-wise Team Progress
AC Covered   : AC-4
Priority     : Medium
Type         : Edge Case
Framework    : Playwright

Given  : A Super User is logged in
  And  : An active project exists with zero tasks assigned

When   : The user views the Projects Progress panel

Then   : That project's card shows "0%" progress
  And  : No error or crash occurs

Expected Response : Card renders with 0% indicator
```

---

## TC-F026-006
```
Test Case ID : TC-F026-006
Title        : Today's Task widget shows correct task due today
Feature      : F-026 — Dynamic Dashboard & Project-wise Team Progress
AC Covered   : AC-7
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : A Developer is logged in
  And  : A task is assigned to the developer with dueDate = today and status = IN_PROGRESS

When   : The user navigates to the dashboard

Then   : The Today Task widget shows that task's name

Expected Response : Widget renders with task name visible
```

---

## TC-F026-007
```
Test Case ID : TC-F026-007
Title        : Today's Task widget shows "No tasks due today" when none exist
Feature      : F-026 — Dynamic Dashboard & Project-wise Team Progress
AC Covered   : AC-7
Priority     : Medium
Type         : Edge Case
Framework    : Playwright

Given  : A Developer is logged in
  And  : No tasks are assigned to them due today

When   : The user navigates to the dashboard

Then   : The widget shows "No tasks due today" or similar message

Expected Response : Empty state rendered gracefully
```

---

## TC-F026-008
```
Test Case ID : TC-F026-008
Title        : Unauthenticated request to /dashboard/projects-progress returns 401
Feature      : F-026 — Dynamic Dashboard & Project-wise Team Progress
AC Covered   : AC-6
Priority     : High
Type         : Security
Framework    : REST

Given  : No authorization header is provided

When   : GET /api/v1/dashboard/projects-progress is called

Then   : HTTP 401 is returned

Expected Response : HTTP 401 Unauthorized
```

---

## TC-F026-009
```
Test Case ID : TC-F026-009
Title        : Admin sees all active projects in the progress panel
Feature      : F-026 — Dynamic Dashboard & Project-wise Team Progress
AC Covered   : AC-2, AC-8
Priority     : High
Type         : RBAC / Happy Path
Framework    : Playwright

Given  : An Admin is logged in
  And  : 3 active projects and 1 archived project exist

When   : The user navigates to the dashboard

Then   : The Projects Progress panel shows exactly 3 projects
  And  : The archived project does NOT appear

Expected Response : Panel with 3 project cards
```
