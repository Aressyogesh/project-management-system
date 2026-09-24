# TC-F-082 — Label Open Access and Label Search — E2E Test Cases

Feature ID   : F-082
Feature Name : Label Open Access and Label Search
Framework    : Playwright
Environment  : http://localhost:5173 (local dev) / http://203.193.165.229:5173 (staging)

---

## TC-F082-001 — Developer Can Add Label on Existing Work Item

```
Test Case ID : TC-F082-001
Title        : Developer Role Can Add Label Without canEditSidebar
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-2
Priority     : High
Type         : RBAC

Given  : A user with project role DEVELOPER is logged in
  And  : A work item modal is open

When   : The user clicks "+ Add label" in the Labels sidebar row
  And  : Types "Need to check" and presses Enter

Then   : A label chip "Need to check" appears in the sidebar
  And  : The change persists on page refresh (PATCH /work-items/:id called successfully)

Expected Response : HTTP 200; item.labels includes "Need to check"
```

---

## TC-F082-002 — Developer Can Remove Label on Existing Work Item

```
Test Case ID : TC-F082-002
Title        : Developer Role Can Remove Label Without canEditSidebar
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-2
Priority     : High
Type         : RBAC

Given  : A DEVELOPER is logged in
  And  : A work item has label "hotfix"
  And  : The work item modal is open

When   : The user clicks the × button on the "hotfix" chip

Then   : The "hotfix" chip disappears from the sidebar
  And  : Change persists on refresh

Expected Response : HTTP 200; item.labels does not include "hotfix"
```

---

## TC-F082-003 — Labels Available on Create Modal for All Roles

```
Test Case ID : TC-F082-003
Title        : Labels Field Present in Create Work Item Modal for All Roles
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-1
Priority     : High
Type         : Happy Path

Given  : Any logged-in project member opens the Create Work Item modal

When   : The modal is displayed (any work item type)

Then   : A Labels section is visible in the form
  And  : The user can type a label and add it as a chip
  And  : Multiple labels can be added before submitting

Expected Response : Labels field rendered and interactive
```

---

## TC-F082-004 — Labels Persisted on Work Item Creation

```
Test Case ID : TC-F082-004
Title        : Labels Added at Creation Are Saved and Displayed in Edit Modal
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-3
Priority     : High
Type         : Happy Path

Given  : A logged-in user opens the Create Work Item modal
  And  : Fills required fields

When   : The user adds labels "Need to check" and "hotfix"
  And  : Clicks Create Item

Then   : The work item is created successfully
  And  : Opening the new item's modal shows both labels in the sidebar

Expected Response : POST /work-items returns 201; item.labels = ["Need to check", "hotfix"]
```

---

## TC-F082-005 — Search by Label Name Returns Matching Items

```
Test Case ID : TC-F082-005
Title        : Typing Exact Label Name in Search Box Returns Labelled Items
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-4
Priority     : High
Type         : Happy Path

Given  : Several work items exist; two are tagged with label "Need to check"
  And  : The user is on the board page

When   : The user types "Need to check" in the search box

Then   : Only the two items tagged with "Need to check" are shown
  And  : Items without this label are not shown
  And  : This works in both Kanban and List views

Expected Response : Filtered board shows only labelled items
```

---

## TC-F082-006 — Label Search Does Not Break Title Search

```
Test Case ID : TC-F082-006
Title        : Title Search Still Works After Label Search Addition
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-5
Priority     : High
Type         : Regression

Given  : Work items exist with various titles and labels

When   : The user searches for a term that matches a title but not any label

Then   : Items with matching titles are returned
  And  : No regression in title/displayId search behaviour

Expected Response : Same results as before F-082 for non-label searches
```

---

## TC-F082-007 — Excel Export Includes Labels Column

```
Test Case ID : TC-F082-007
Title        : Exported Excel File Contains Labels Column with Comma-Separated Values
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-6
Priority     : High
Type         : Happy Path

Given  : List view shows items including one with labels ["hotfix", "Need to check"]
  And  : One item has no labels

When   : The user clicks Export to Excel

Then   : Downloaded .xlsx has a "Labels" column (rightmost)
  And  : Labelled item row shows "hotfix, Need to check"
  And  : Unlabelled item row shows an empty cell in that column

Expected Response : Valid .xlsx with Labels column at correct position
```

---

## TC-F082-008 — Label Search Results Are Exportable

```
Test Case ID : TC-F082-008
Title        : Search by Label Then Export Shows Only Filtered Labelled Items
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-4, AC-6
Priority     : Medium
Type         : Happy Path

Given  : User has searched for "Need to check" in list view
  And  : Only labelled items are shown

When   : User clicks Export to Excel

Then   : Only the visible (filtered) items are exported
  And  : The Labels column shows "Need to check" for each exported row

Expected Response : Exported file contains only search-filtered items with labels
```

---

## TC-F082-009 — Audit Log Written When Developer Adds Label

```
Test Case ID : TC-F082-009
Title        : label_added Audit Entry Created When Developer Adds Label
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-7
Priority     : Medium
Type         : Happy Path

Given  : A DEVELOPER adds label "regression" to a work item

When   : The PATCH call completes

Then   : An audit log entry with action 'label_added' and newValue 'regression' is created
  And  : The activity tab in the work item modal shows the label addition

Expected Response : Activity log shows "added label regression"
```

---

## TC-F082-010 — Empty Search Does Not Filter by Label (Negative)

```
Test Case ID : TC-F082-010
Title        : Clearing Search Box Shows All Items — Label Filter Not Applied
Feature      : F-082 — Label Open Access and Label Search
AC Covered   : AC-4, AC-5
Priority     : Medium
Type         : Negative

Given  : User had searched for a label and results were filtered

When   : User clears the search box

Then   : All work items are displayed again
  And  : No label filter persists

Expected Response : Full unfiltered item list restored
```
