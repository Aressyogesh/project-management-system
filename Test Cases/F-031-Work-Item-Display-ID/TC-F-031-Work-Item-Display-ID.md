# E2E Test Cases — F-031: Work Item Display ID

---

```
Test Case ID : TC-F031-001
Title        : Create work item — response contains correct displayId
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-1, AC-2, AC-5
Priority     : High
Type         : Happy Path
Framework    : Playwright / REST

Given  : A project "HEMS One Rewrite" exists with no work items
  And  : The caller is authenticated as an ADMIN

When   : POST /projects/:projectId/work-items with valid body
           { type: "TASK", title: "First task" }

Then   : HTTP 201 is returned
  And  : Response body contains displayId === "HOR10001"
```

---

```
Test Case ID : TC-F031-002
Title        : Sequential IDs increment correctly on each creation
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-5
Priority     : High
Type         : Happy Path
Framework    : Playwright / REST

Given  : A project "HEMS One Rewrite" already has one work item (displayId "HOR10001")

When   : POST /projects/:projectId/work-items is called a second time

Then   : HTTP 201 is returned
  And  : Response body contains displayId === "HOR10002"
```

---

```
Test Case ID : TC-F031-003
Title        : Two-word project name generates correct prefix
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-3
Priority     : High
Type         : Happy Path
Framework    : Playwright / REST

Given  : A project named "Task Board" exists with no work items

When   : POST /projects/:projectId/work-items with { type: "BUG", title: "Bug 1" }

Then   : Response displayId starts with "TAB"
  And  : displayId === "TAB10001"
```

---

```
Test Case ID : TC-F031-004
Title        : One-word project name generates correct prefix
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-4
Priority     : High
Type         : Happy Path
Framework    : Playwright / REST

Given  : A project named "Horizon" exists with no work items

When   : POST /projects/:projectId/work-items with { type: "EPIC", title: "Epic 1" }

Then   : Response displayId === "HOR10001"
```

---

```
Test Case ID : TC-F031-005
Title        : displayId visible on Kanban board card
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-8
Priority     : High
Type         : Happy Path
Framework    : Playwright (UI)

Given  : A work item "HOR10001" exists in project "HEMS One Rewrite"
  And  : The user navigates to /projects/:projectId/board

When   : The board renders

Then   : The text "HOR10001" is visible on the work item card
```

---

```
Test Case ID : TC-F031-006
Title        : displayId visible in Work Item Modal header
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-9
Priority     : High
Type         : Happy Path
Framework    : Playwright (UI)

Given  : A work item "HOR10001" exists and the board is open

When   : The user clicks on the work item card to open the modal

Then   : The modal header contains the text "HOR10001"
```

---

```
Test Case ID : TC-F031-007
Title        : displayId is immutable — PATCH cannot override it
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-10
Priority     : High
Type         : Negative
Framework    : Playwright / REST

Given  : A work item "HOR10001" exists

When   : PATCH /projects/:projectId/work-items/:id with body { displayId: "HACK99999" }

Then   : HTTP 200 or 400 is returned
  And  : The work item's displayId remains "HOR10001" (not "HACK99999")
```

---

```
Test Case ID : TC-F031-008
Title        : Two different projects maintain independent counters
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-5, AC-6
Priority     : High
Type         : Edge Case
Framework    : Playwright / REST

Given  : Project A "HEMS One Rewrite" has items HOR10001–HOR10003
  And  : Project B "Task Board" has no items

When   : POST /projects/:projectBId/work-items creates a new item in Project B

Then   : The new item's displayId === "TAB10001" (not TAB10004)
```

---

```
Test Case ID : TC-F031-009
Title        : Unauthenticated request is rejected
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-7 (security)
Priority     : High
Type         : Security
Framework    : Playwright / REST

Given  : No Authorization header is sent

When   : POST /projects/:projectId/work-items

Then   : HTTP 401 Unauthorized is returned
  And  : No work item is created
```

---

```
Test Case ID : TC-F031-010
Title        : EMPLOYEE role can create a work item and receives displayId
Feature      : F-031 — Work Item Display ID
AC Covered   : AC-7
Priority     : Medium
Type         : RBAC
Framework    : Playwright / REST

Given  : The user has EMPLOYEE system role and is a project member

When   : POST /projects/:projectId/work-items with valid body

Then   : HTTP 201 is returned
  And  : Response contains a valid displayId matching /^[A-Z]{3}\d{5}$/
```
