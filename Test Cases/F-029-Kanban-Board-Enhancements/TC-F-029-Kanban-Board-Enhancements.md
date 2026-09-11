# TC-F-029 — E2E Test Cases: Kanban Board Enhancements

**Feature ID:** F-029  
**Feature Name:** Kanban Board Enhancements  
**Date:** 2026-06-01  

---

## Group 1: Kanban Board Structure

### TC-F029-001 — READY_FOR_QA and IN_QA columns appear on board

**Type:** Happy Path  
**AC:** AC-1  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User is logged in and on the Kanban board for a project | Page loads | Columns "Ready for QA" and "In QA" are visible |
| 2 | — | User drags a card to "Ready for QA" | Card status updates to READY_FOR_QA in the DB |
| 3 | — | User drags that card to "In QA" | Card status updates to IN_QA in the DB |

---

### TC-F029-002 — Column headers remain sticky while cards scroll

**Type:** Happy Path  
**AC:** AC-2  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | A column has more cards than the visible height | User scrolls down within the column | The column header ("To Do", "In Progress", etc.) remains visible at the top |

---

### TC-F029-003 — Custom column labels are saved and displayed

**Type:** Happy Path  
**AC:** AC-3  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User is on the Kanban board | User clicks the pencil (Columns) button | Edit Column Labels modal opens with all 7 columns listed |
| 2 | Modal is open | User changes "Ready for QA" to "QA Queue" and clicks Save | Modal closes; column header now shows "QA Queue" |
| 3 | User refreshes the page | — | Column still shows "QA Queue" (persisted to DB) |

---

### TC-F029-004 — Custom label edit does not affect other projects

**Type:** Negative  
**AC:** AC-3  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User sets custom label for Project A | User navigates to Project B board | Project B still shows the default column labels |

---

## Group 2: Board Filters

### TC-F029-005 — Milestone filter narrows sprint dropdown

**Type:** Happy Path  
**AC:** AC-4  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Project has milestones M1 (sprint S1) and M2 (sprint S2) | User selects milestone M1 | Sprint dropdown shows only S1 |
| 2 | — | User selects milestone M2 | Sprint dropdown shows only S2 |

---

### TC-F029-006 — Changing milestone clears a sprint from the other milestone

**Type:** Negative  
**AC:** AC-4  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Sprint S1 (milestone M1) is selected | User switches milestone to M2 | Sprint dropdown is cleared (shows "All sprints") |

---

### TC-F029-007 — Product Backlog toggle shows unassigned items only

**Type:** Happy Path  
**AC:** AC-5  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Board has items with and without sprints | User clicks "Product Backlog" | Only items with no sprint assigned appear on the board |
| 2 | — | User clicks "All" | All items appear |

---

### TC-F029-008 — Sprint Backlog disables when Product Backlog is active

**Type:** Happy Path  
**AC:** AC-5  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User selects "Product Backlog" | — | Sprint dropdown is disabled/greyed out |

---

## Group 3: Work Item Enhancements

### TC-F029-009 — Definition of Done appears on User Story and saves

**Type:** Happy Path  
**AC:** AC-6  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User opens a USER_STORY work item modal | — | "Definition of Done" textarea is visible below Description |
| 2 | User types "All ACs met, reviewed by PM" and clicks away (blur) | — | Text is saved; re-opening the modal shows the saved text |

---

### TC-F029-010 — Definition of Done is NOT shown on BUG or TASK items

**Type:** Negative  
**AC:** AC-6  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User opens a BUG work item modal | — | No "Definition of Done" section is visible |
| 2 | User opens a TASK work item modal | — | No "Definition of Done" section is visible |

---

### TC-F029-011 — Test Cases tab adds and lists test cases

**Type:** Happy Path  
**AC:** AC-7  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User opens a USER_STORY work item, clicks "Test Cases" tab | — | Empty state or existing test case list is shown |
| 2 | User fills title, steps, expected result and clicks "Add Test Case" | — | New test case appears in the list with status NOT_RUN |

---

### TC-F029-012 — Test case status can be changed to PASSED/FAILED/BLOCKED

**Type:** Happy Path  
**AC:** AC-8  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Test case with status NOT_RUN exists | User changes status to PASSED via dropdown | Status badge updates to PASSED (green) |
| 2 | User changes status to FAILED | — | Status badge updates to FAILED (red); "+ Bug" button appears |

---

### TC-F029-013 — Bug from failed test case pre-fills title and steps

**Type:** Happy Path  
**AC:** AC-9  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Test case is FAILED | User clicks "+ Bug" | Create Work Item modal opens with type BUG |
| 2 | — | Modal is pre-filled | Title field contains test case title; Steps to Reproduce field contains test case steps |
| 3 | User submits bug | — | New BUG work item is created; bug appears on the board |

---

### TC-F029-014 — Test Cases tab is NOT shown on BUG or TASK items

**Type:** Negative  
**AC:** AC-7  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User opens a BUG work item modal | — | No "Test Cases" tab in activity tabs |

---

## Group 4: Client & Projects

### TC-F029-015 — Client name links to filtered projects page

**Type:** Happy Path  
**AC:** AC-10  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User is on the Clients page | User clicks on client name "Acme Corp" | Browser navigates to `/projects?clientId=<acme-id>` |
| 2 | Projects page loads | — | Client filter dropdown shows "Acme Corp" selected; only Acme's projects are listed |

---

### TC-F029-016 — Client filter on Projects page filters cards

**Type:** Happy Path  
**AC:** AC-11  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Projects page shows projects from multiple clients | User selects "Acme Corp" in the client dropdown | Only Acme's projects are shown |
| 2 | User selects "All clients" | — | All projects are shown again |

---

### TC-F029-017 — Client filter and search/archive filter work together

**Type:** Happy Path  
**AC:** AC-11  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Client filter is set to "Acme Corp" | User types a project name in search | Results are both from Acme and matching the search term |

---

## Group 5: Add Team Members by Department

### TC-F029-018 — Department tab shows available users

**Type:** Happy Path  
**AC:** AC-12  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User is on a project, clicks "Add Member" | — | Modal opens with "Add Individual" and "Add by Department" tabs |
| 2 | User clicks "Add by Department" and selects "Engineering" dept | — | Checklist of available Engineering users appears |
| 3 | Users already on the project | — | Are NOT shown in the checklist |

---

### TC-F029-019 — Select all and submit adds all department members

**Type:** Happy Path  
**AC:** AC-12  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Engineering department has 3 available users | User clicks "Select all" | All 3 checkboxes are checked; "Add 3 Members" shown on submit button |
| 2 | User clicks "Add 3 Members" | — | All 3 are added; modal closes; member list refreshes |

---

### TC-F029-020 — Submit with no selection shows validation error

**Type:** Negative  
**AC:** AC-12  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Department tab is active, no users selected | User clicks submit | Error message: "Select at least one team member" |

---

## Group 6: Global Progress Bar

### TC-F029-021 — Progress bar appears during page data load

**Type:** Happy Path  
**AC:** AC-13  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User navigates to any page | Page is loading data | A thin coloured bar is visible at the very top of the viewport |
| 2 | All data loads | — | The bar fades out and is no longer visible |

---

### TC-F029-022 — Progress bar appears during mutations

**Type:** Happy Path  
**AC:** AC-13  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | User is on the board page | User drags a card to a new column | Progress bar is visible during the PATCH request |
| 2 | PATCH completes | — | Progress bar disappears |

---

## RBAC Tests

### TC-F029-RBAC-001 — Only authenticated users can access board column config endpoints

**AC:** AC-3  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Unauthenticated request | GET `/board-column-configs/proj-1` | Response: 401 Unauthorized |

---

### TC-F029-RBAC-002 — Only authenticated users can create test cases

**AC:** AC-7  

| Step | Given | When | Then |
|------|-------|------|------|
| 1 | Unauthenticated request | POST `/work-items/wi-1/test-cases` | Response: 401 Unauthorized |
