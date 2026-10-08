# TC-F-022 — E2E Test Cases: JIRA Kanban Board

**Date:** 2026-05-28  
**Framework:** Manual / Playwright (future)

---

## TC-F022-001 — Board Navigation via Project Card

**Given** I am logged in as any role  
**When** I click on a project card on the Projects page  
**Then** I am redirected to `/projects/:id/board`  
**And** the board shows 6 columns: To Do, In Progress, Blocked, In Review, QA, QA Done

---

## TC-F022-002 — Create Epic (PM role)

**Given** I am a Project Manager on the project  
**When** I click "+ Create" → "Epic"  
**And** I fill in Title, Description, Priority, Sprint, Story Points  
**Then** a new Epic card appears in the "To Do" column  
**And** the card shows a purple "Epic" badge

---

## TC-F022-003 — DEVELOPER cannot create Epic

**Given** I am a Developer on the project  
**When** I click "+ Create"  
**Then** "Epic" and "User Story" options are NOT shown in the dropdown  
**And** only Task, Sub Task, Bug are available

---

## TC-F022-004 — Create Bug with all fields

**Given** I am any project member  
**When** I create a Bug item  
**And** I fill in Severity=Critical, Classification=New Bug, Environment, Steps to Reproduce  
**Then** the Bug card appears with a red "Bug" badge  
**And** opening the detail modal shows all bug-specific fields

---

## TC-F022-005 — Drag card between columns

**Given** a Task card exists in "To Do"  
**When** I drag it to "In Progress"  
**Then** the card moves to the "In Progress" column  
**And** refreshing the page shows it still in "In Progress"  
**And** the status in DB is IN_PROGRESS

---

## TC-F022-006 — Moving to QA Done sets completedAt

**Given** a Task is in "QA" column  
**When** I drag it to "QA Done"  
**Then** the card moves to "QA Done"  
**And** the detail modal shows a "Completed" timestamp

---

## TC-F022-007 — Moving backward increments rework count

**Given** a Task is in "In Review"  
**When** I drag it back to "In Progress"  
**Then** the card moves to "In Progress"  
**And** the item's detail shows "Reopens: 1"

---

## TC-F022-008 — Log Time against a work item

**Given** I am assigned to a Task  
**When** I open the task modal → "Log Time" tab  
**And** I enter Date=today, Hours=3, Description="Bug fix"  
**And** I click "Log Time"  
**Then** a new entry appears in the Previous Logs list  
**And** Total logged shows "3h"

---

## TC-F022-009 — Multiple time logs accumulate

**Given** I have already logged 3h on a task  
**When** I log another 2.5h  
**Then** Total logged shows "5.5h"  
**And** Remaining shows "Estimated - 5.5h"

---

## TC-F022-010 — Filter by type

**Given** the board has Epics, Tasks, and Bugs  
**When** I click the "Bug" type filter chip  
**Then** only Bug cards are visible  
**And** Epic and Task cards are hidden

---

## TC-F022-011 — Sprint filter

**Given** Sprint 1 and Sprint 2 exist with items  
**When** I select "Sprint 1" from the sprint dropdown  
**Then** only Sprint 1 items are shown  
**And** items with no sprint (Backlog) are hidden

---

## TC-F022-012 — Create sprint (PM only)

**Given** I am a PM  
**When** I open the Sprint Manager  
**And** create "Sprint 3" with start/end dates  
**Then** Sprint 3 appears in the sprint dropdown  
**And** activating it deactivates the previously active sprint

---

## TC-F022-013 — Sidebar no longer shows Allocations/Timesheets/Bugs

**Given** I am logged in as any role  
**Then** the sidebar does NOT contain Allocations, Timesheets, or Bugs nav items

---

## TC-F022-014 — Parent-child hierarchy: SubTask under Task

**Given** a Task exists  
**When** I open the Task modal → "Child Items" tab  
**And** I create a Sub Task  
**Then** the Sub Task appears under the Task  
**And** the Sub Task's parentId points to the Task

---

## TC-F022-015 — RBAC: EMPLOYEE sees only own project boards

**Given** I am an EMPLOYEE assigned only to Project A  
**When** I navigate to Projects  
**Then** I only see Project A  
**And** clicking it opens the board for Project A only

---

## Negative Test Cases

**TC-F022-N01** — Non-project member cannot access board  
Given user not in project → GET /projects/:id/work-items returns 403

**TC-F022-N02** — DEVELOPER cannot delete items  
Given a DEVELOPER → DELETE /work-items/:id returns 403

**TC-F022-N03** — Non-assignee cannot log time  
Given user not assigned to item → POST /work-items/:id/timesheet-entries returns 403

**TC-F022-N04** — SubTask with Epic parent rejected  
POST /projects/:id/work-items with type=SUB_TASK, parentId=Epic → 400 Bad Request
