# E2E Test Cases — F-016: Milestone Progress Tracking

---

```
Test Case ID : TC-F016-001
Title        : Milestone list returns progress stats for milestone with tasks
Feature      : F-016 — Milestone Progress Tracking
AC Covered   : AC-1, AC-3
Priority     : High
Type         : Happy Path

Given  : A project exists with one milestone linked to 5 tasks (3 COMPLETED, 2 NOT_STARTED)
When   : GET /api/v1/projects/:projectId/milestones is called with valid JWT
Then   : Response is HTTP 200
  And  : The milestone object contains totalTasks: 5
  And  : completedTasks: 3
  And  : progressPercent: 60
```

---

```
Test Case ID : TC-F016-002
Title        : Milestone with no linked tasks returns zero progress
Feature      : F-016 — Milestone Progress Tracking
AC Covered   : AC-2, AC-7
Priority     : High
Type         : Edge Case

Given  : A project exists with one milestone that has no tasks linked to it
When   : GET /api/v1/projects/:projectId/milestones is called
Then   : Response is HTTP 200
  And  : totalTasks: 0, completedTasks: 0, progressPercent: 0
```

---

```
Test Case ID : TC-F016-003
Title        : All tasks completed returns 100% progress
Feature      : F-016 — Milestone Progress Tracking
AC Covered   : AC-4
Priority     : High
Type         : Happy Path

Given  : A milestone has 4 tasks all with status COMPLETED
When   : GET /api/v1/projects/:projectId/milestones is called
Then   : progressPercent: 100, completedTasks: 4, totalTasks: 4
```

---

```
Test Case ID : TC-F016-004
Title        : Frontend progress bar renders correct width for partial progress
Feature      : F-016 — Milestone Progress Tracking
AC Covered   : AC-5, AC-6
Priority     : High
Type         : Happy Path

Given  : A project milestone has progressPercent: 60 and totalTasks: 5, completedTasks: 3
  And  : User is logged in and navigates to the project detail page
When   : The milestones section loads
Then   : A progress bar is visible with width reflecting 60%
  And  : The task count label shows "3 / 5 tasks"
```

---

```
Test Case ID : TC-F016-005
Title        : Unauthenticated request to milestones endpoint returns 401
Feature      : F-016 — Milestone Progress Tracking
AC Covered   : AC-1
Priority     : High
Type         : Security

Given  : No JWT token is provided
When   : GET /api/v1/projects/:projectId/milestones is called
Then   : Response is HTTP 401 Unauthorized
```
