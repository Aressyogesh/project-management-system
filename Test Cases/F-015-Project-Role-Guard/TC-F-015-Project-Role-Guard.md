Feature ID   : F-015
Feature Name : ProjectRoleGuard
Framework    : Jest + Supertest (NestJS E2E)

---

TC-F-015-001
Title        : Project Manager Creates Task — Returns 201
AC Covered   : AC-2
Priority     : High
Type         : Happy Path

Given  : A seeded project with a task list
  And  : A user with systemRole=EMPLOYEE and projectRole=PROJECT_MANAGER on that project
  And  : A valid JWT for that user
When   : POST /api/v1/projects/:projectId/tasks with valid body
Then   : HTTP 201 Created
  And  : Response body contains the new task

---

TC-F-015-002
Title        : Team Lead Creates Task List — Returns 201
AC Covered   : AC-3
Priority     : High
Type         : Happy Path

Given  : A seeded project
  And  : A user with systemRole=EMPLOYEE and projectRole=TEAM_LEAD on that project
  And  : A valid JWT
When   : POST /api/v1/projects/:projectId/task-lists with valid body
Then   : HTTP 201 Created

---

TC-F-015-003
Title        : Team Lead Creates Milestone — Returns 403
AC Covered   : AC-3
Priority     : High
Type         : RBAC

Given  : A seeded project
  And  : A user with systemRole=EMPLOYEE and projectRole=TEAM_LEAD
  And  : A valid JWT
When   : POST /api/v1/projects/:projectId/milestones with valid body
Then   : HTTP 403 Forbidden
  And  : Response message contains "Insufficient permissions"

---

TC-F-015-004
Title        : Developer Cannot Create Task — Returns 403
AC Covered   : AC-4
Priority     : High
Type         : RBAC

Given  : A seeded project
  And  : A user with systemRole=EMPLOYEE and projectRole=DEVELOPER
  And  : A valid JWT
When   : POST /api/v1/projects/:projectId/tasks with valid body
Then   : HTTP 403 Forbidden

---

TC-F-015-005
Title        : Non-Member Cannot Create Task — Returns 403
AC Covered   : AC-5
Priority     : High
Type         : Security

Given  : A seeded project
  And  : A user with systemRole=EMPLOYEE who is NOT a member of the project
  And  : A valid JWT
When   : POST /api/v1/projects/:projectId/tasks with valid body
Then   : HTTP 403 Forbidden

---

TC-F-015-006
Title        : Super User Creates Task Without Project Membership — Returns 201
AC Covered   : AC-1
Priority     : High
Type         : RBAC

Given  : A seeded project
  And  : A user with systemRole=SUPER_USER who is NOT a project member
  And  : A valid JWT
When   : POST /api/v1/projects/:projectId/tasks with valid body
Then   : HTTP 201 Created

---

TC-F-015-007
Title        : GET Tasks Accessible To Any Authenticated User — Returns 200
AC Covered   : AC-6
Priority     : Medium
Type         : Happy Path

Given  : A seeded project with tasks
  And  : Any authenticated user (EMPLOYEE, no project role)
When   : GET /api/v1/projects/:projectId/tasks
Then   : HTTP 200 OK
  And  : Response contains array of tasks
