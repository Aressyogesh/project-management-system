# TC-F-024 — E2E Test Cases: JIRA Board Enhancement + Bug Management

**Feature:** F-024  
**Date:** 2026-05-29  

---

## Happy Path

| ID | Given | When | Then |
|----|-------|------|------|
| TC-01 | User is on `/projects/:id/board` | User clicks "Create" and selects type BUG | CreateWorkItemModal opens with full Phase 9 bug fields visible (flag, module, reproducibility, responsible dev, build versions, reminder, bug status) |
| TC-02 | Bug creation form is open | User fills all mandatory fields and clicks Submit | Bug WorkItem appears on board in correct column; DB record has all Phase 9 fields saved |
| TC-03 | User clicks a Bug card on board | WorkItemModal opens | Bug Details section shows Flag, Reproducibility, Module, Responsible Developer, Bug Status (8-lifecycle), Build Versions, Reminder |
| TC-04 | User edits Bug Status in modal | User changes bugStatus from OPEN to TO_BE_TESTED | PATCH request fires; modal reflects new bugStatus immediately; Kanban column (BoardStatus) is unchanged |
| TC-05 | User views a User Story modal | User clicks "Child Items" tab | Inline "Add child" form appears with type selector (Task/Sub-task/Bug) and title input |
| TC-06 | User creates a child Task from User Story modal | User selects type=Task, enters title, clicks Add | New Task WorkItem created with parentId pointing to User Story; appears in Child Items list |
| TC-07 | User creates a Bug linked to User Story | User creates Bug, selects parent = User Story | Bug shows parent breadcrumb "Story: [title]" in its modal header |
| TC-08 | User is on Project Detail page | Page loads | "Task Lists", "Tasks", and "Task Allocations" sections are absent |
| TC-09 | User checks Sidebar | Any page | Nav item shows "Leaves Management" |
| TC-10 | User visits Reports page | Any tab | No "Leave & OT" text anywhere on page |

---

## Negative / Edge Cases

| ID | Given | When | Then |
|----|-------|------|------|
| TC-11 | Bug form is open | User submits without required title | Validation error shown; no API call made |
| TC-12 | User tries to set parent of EPIC | CreateWorkItemModal with type=EPIC | No parent selector visible |
| TC-13 | User creates Bug without bugFlag | Bug is saved | bugFlag stored as null; no error |
| TC-14 | User changes assignee to "Unassigned" | Clears assignee dropdown | PATCH fires with assigneeId=null; modal shows "Unassigned" |
| TC-15 | Board has no sprints | User opens WorkItemModal | Sprint dropdown shows only "Backlog" option |

---

## RBAC

| ID | Given | When | Then |
|----|-------|------|------|
| TC-16 | EMPLOYEE (not project member) | Tries to access board | Redirected or items shown read-only |
| TC-17 | ADMIN user | Opens bug form | All Phase 9 fields are editable |
| TC-18 | EMPLOYEE (project member, developer role) | Opens bug form | Can create bugs; responsible developer field editable |
