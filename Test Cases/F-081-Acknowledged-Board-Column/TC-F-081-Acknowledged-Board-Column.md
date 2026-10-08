# TC-F-081 — Acknowledged Board Column — E2E Test Cases

Feature ID   : F-081
Feature Name : Acknowledged Board Column
Framework    : Playwright
Environment  : http://localhost:5173 (local dev) / http://203.193.165.229:5173 (staging)

---

## TC-F081-001 — Acknowledged Column Visible on Board

```
Test Case ID : TC-F081-001
Title        : Acknowledged Column Is Rendered Between QA Done and Closed
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-2
Priority     : High
Type         : Happy Path

Given  : A logged-in project member is on the Kanban board page
  And  : The project has work items in various statuses

When   : The user views the board in Kanban mode

Then   : An "Acknowledged" column header is visible
  And  : The column appears to the right of "QA Done"
  And  : The column appears to the left of "Closed"

Expected Response : Column rendered with label "Acknowledged"; positional order confirmed
```

---

## TC-F081-002 — Drag Work Item to Acknowledged Column

```
Test Case ID : TC-F081-002
Title        : Drag and Drop Work Item into Acknowledged Column
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-2
Priority     : High
Type         : Happy Path

Given  : A logged-in PM is on the Kanban board
  And  : A work item exists in the "QA Done" column

When   : The user drags the work item card into the "Acknowledged" column

Then   : The work item moves to the "Acknowledged" column
  And  : The status badge on the card displays "Acknowledged"
  And  : The change is persisted (page refresh retains the new status)

Expected Response : PATCH /work-items/:id returns 200; item.status === 'ACKNOWLEDGED'
```

---

## TC-F081-003 — Status Filter Includes Acknowledged

```
Test Case ID : TC-F081-003
Title        : Status Filter Dropdown Contains Acknowledged Option
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-3
Priority     : High
Type         : Happy Path

Given  : A logged-in user is on the board page
  And  : At least one work item has status ACKNOWLEDGED

When   : The user opens the Status filter dropdown
  And  : Selects "Acknowledged"

Then   : Only work items with ACKNOWLEDGED status are shown
  And  : Items with other statuses are hidden
  And  : The filter chip or selected value shows "Acknowledged"

Expected Response : Board filtered correctly; URL or state reflects status=ACKNOWLEDGED
```

---

## TC-F081-004 — List View Shows Orange Badge for Acknowledged

```
Test Case ID : TC-F081-004
Title        : List View Displays Acknowledged Status with Orange Badge
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-4
Priority     : High
Type         : Happy Path

Given  : A logged-in user switches to List view on the board
  And  : At least one item has status ACKNOWLEDGED

When   : The user views the status column for that item

Then   : The status badge shows "Acknowledged"
  And  : The badge has an orange background (bg-orange-100 text-orange-700)
  And  : The Age column shows a day count (not blank)

Expected Response : Badge rendered with correct label and colour class
```

---

## TC-F081-005 — Acknowledged Item Does Not Affect KPI Counts

```
Test Case ID : TC-F081-005
Title        : Moving Item to Acknowledged Does Not Change Completed Count in Dashboard
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-5
Priority     : High
Type         : Happy Path

Given  : A logged-in PM has the dashboard open showing completed work item count N
  And  : A work item is currently in QA Done status

When   : The item is moved to Acknowledged on the board

Then   : The completed work item count on the dashboard remains N (unchanged)
  And  : The item's completedAt field is null (verified via API or DB)
  And  : KPI score is unaffected

Expected Response : Dashboard stats unchanged; PATCH response item.completedAt === null
```

---

## TC-F081-006 — Overdue Highlight Active for Acknowledged Items

```
Test Case ID : TC-F081-006
Title        : Overdue Row Highlight Is Applied to Past-Due Acknowledged Items
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-7
Priority     : Medium
Type         : Edge Case

Given  : A work item exists with status ACKNOWLEDGED and dueDate = yesterday

When   : The user views the list view

Then   : The row for that item has the overdue highlight (red background class)
  And  : The age counter shows a positive day count

Expected Response : Row has overdue styling; age cell non-empty
```

---

## TC-F081-007 — Excel Export Contains Acknowledged Label

```
Test Case ID : TC-F081-007
Title        : Export to Excel Writes "Acknowledged" in Status Column
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-6
Priority     : Medium
Type         : Happy Path

Given  : A logged-in user is on the list view with at least one ACKNOWLEDGED item

When   : The user clicks the Export to Excel button

Then   : An .xlsx file is downloaded
  And  : The Status column for the acknowledged item reads "Acknowledged" (not raw "ACKNOWLEDGED")

Expected Response : Downloaded file parseable; cell value === 'Acknowledged'
```

---

## TC-F081-008 — Sort by Status Places Acknowledged Correctly

```
Test Case ID : TC-F081-008
Title        : Sorting by Status Column Orders Acknowledged Between QA Done and Closed
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-4, AC-8
Priority     : Medium
Type         : Edge Case

Given  : The list view contains items in TODO, QA_DONE, ACKNOWLEDGED, and CLOSED statuses

When   : The user clicks the Status column header to sort ascending

Then   : Items appear in order: … QA Done → Acknowledged → Closed
  And  : Clicking again (descending) reverses: Closed → Acknowledged → QA Done → …

Expected Response : Sort order matches STATUS_RANK values (QA_DONE:7, ACKNOWLEDGED:8, CLOSED:9)
```

---

## TC-F081-009 — RBAC: Any Project Member Can Move Item to Acknowledged

```
Test Case ID : TC-F081-009
Title        : Developer Role Can Move Work Item to Acknowledged
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-2
Priority     : Medium
Type         : RBAC

Given  : A user with project role DEVELOPER is logged in on the board
  And  : A work item is in QA Done column

When   : The developer drags the item to the Acknowledged column

Then   : The move succeeds (HTTP 200)
  And  : The item appears in the Acknowledged column

Expected Response : Status updated; no 403 Forbidden
```

---

## TC-F081-010 — Acknowledged Not Present in Terminal Check (Negative)

```
Test Case ID : TC-F081-010
Title        : Moving Item to Acknowledged Does Not Trigger Parent Auto-Close
Feature      : F-081 — Acknowledged Board Column
AC Covered   : AC-5
Priority     : Medium
Type         : Negative

Given  : A USER_STORY has two child TASKs — one in QA_DONE, one in IN_PROGRESS
  And  : The IN_PROGRESS task is moved to ACKNOWLEDGED

When   : The backend processes the status change

Then   : The parent USER_STORY status remains unchanged (not auto-closed to CLOSED/QA_DONE)
  And  : ACKNOWLEDGED is not treated as a terminal status in any parent evaluation

Expected Response : Parent status unchanged; only the moved item's status changes
```
