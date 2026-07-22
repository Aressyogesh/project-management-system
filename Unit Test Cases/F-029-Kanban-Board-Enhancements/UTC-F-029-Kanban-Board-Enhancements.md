# UTC-F-029 — Unit Test Cases: Kanban Board Enhancements

**Feature ID:** F-029  
**Feature Name:** Kanban Board Enhancements  
**Date:** 2026-06-01  

---

## Backend Unit Tests

### UTC-F029-B-001 — WorkItemsService: findByProject filters by milestoneId

**AC:** AC-4  
**Arrange:** Mock `prisma.workItem.findMany`. Call `findByProject` with `milestoneId: 'mile-1'`.  
**Act:** Invoke `service.findByProject('proj-1', { milestoneId: 'mile-1' })`.  
**Assert:** `prisma.workItem.findMany` called with `where` containing `sprint: { milestoneId: 'mile-1' }`.

---

### UTC-F029-B-002 — WorkItemsService: create persists definitionOfDone

**AC:** AC-6  
**Arrange:** Mock `prisma.workItem.create` to return a work item with `definitionOfDone: 'All tests pass'`.  
**Act:** Call `service.create({ ..., definitionOfDone: 'All tests pass' })`.  
**Assert:** `prisma.workItem.create` called with `data` containing `definitionOfDone: 'All tests pass'`.

---

### UTC-F029-B-003 — WorkItemsService: update persists definitionOfDone

**AC:** AC-6  
**Arrange:** Mock `prisma.workItem.update`.  
**Act:** Call `service.update('wi-1', { definitionOfDone: 'Feature complete' })`.  
**Assert:** `prisma.workItem.update` called with `data.definitionOfDone: 'Feature complete'`.

---

### UTC-F029-B-004 — TestCasesService: findByWorkItem returns ordered list

**AC:** AC-7  
**Arrange:** Mock `prisma.testCase.findMany` returning two test cases ordered by `createdAt asc`.  
**Act:** Call `service.findByWorkItem('wi-1')`.  
**Assert:** Returns array of length 2; `prisma.testCase.findMany` called with `where: { workItemId: 'wi-1' }` and `orderBy: { createdAt: 'asc' }`.

---

### UTC-F029-B-005 — TestCasesService: create sets createdById from current user

**AC:** AC-7  
**Arrange:** Mock `prisma.testCase.create`. Provide `createdById: 'user-1'`.  
**Act:** Call `service.create('wi-1', 'user-1', { title: 'TC', steps: 'Step 1', expectedResult: 'Pass' })`.  
**Assert:** `prisma.testCase.create` called with `data.createdById: 'user-1'` and `data.workItemId: 'wi-1'`.

---

### UTC-F029-B-006 — TestCasesService: update patches status

**AC:** AC-8  
**Arrange:** Mock `prisma.testCase.update` to return the updated record.  
**Act:** Call `service.update('tc-1', { status: 'FAILED', actualResult: 'Error thrown' })`.  
**Assert:** `prisma.testCase.update` called with `where: { id: 'tc-1' }`, `data: { status: 'FAILED', actualResult: 'Error thrown' }`.

---

### UTC-F029-B-007 — TestCasesService: remove deletes record

**AC:** AC-7  
**Arrange:** Mock `prisma.testCase.delete`.  
**Act:** Call `service.remove('tc-1')`.  
**Assert:** `prisma.testCase.delete` called with `where: { id: 'tc-1' }`.

---

### UTC-F029-B-008 — BoardColumnConfigsService: getByProject returns configs

**AC:** AC-3  
**Arrange:** Mock `prisma.boardColumnConfig.findMany` returning 2 configs.  
**Act:** Call `service.getByProject('proj-1')`.  
**Assert:** `prisma.boardColumnConfig.findMany` called with `where: { projectId: 'proj-1' }`; result length 2.

---

### UTC-F029-B-009 — BoardColumnConfigsService: upsertMany upserts each config

**AC:** AC-3  
**Arrange:** Mock `prisma.boardColumnConfig.upsert`. Provide 2 config DTOs.  
**Act:** Call `service.upsertMany('proj-1', [{ status: 'TODO', label: 'Backlog' }, { status: 'IN_QA', label: 'Testing' }])`.  
**Assert:** `prisma.boardColumnConfig.upsert` called exactly twice, once for each status.

---

### UTC-F029-B-010 — DashboardService: onReview includes READY_FOR_QA and IN_QA

**AC:** AC-1  
**Arrange:** Mock `prisma.workItem.count` for `IN_REVIEW`, `READY_FOR_QA`, `IN_QA` statuses.  
**Act:** Call `dashboardService.getStats('proj-1')`.  
**Assert:** The `onReview` count includes items from all three statuses.

---

## Frontend Unit Tests

### UTC-F029-F-001 — GlobalProgressBar: renders bar when fetching > 0

**AC:** AC-13  
**Arrange:** Mock `useIsFetching` to return 1; `useIsMutating` to return 0.  
**Act:** Render `<GlobalProgressBar />`.  
**Assert:** The bar element has class `opacity-100` (not `opacity-0`).

---

### UTC-F029-F-002 — GlobalProgressBar: hides bar when all calls complete

**AC:** AC-13  
**Arrange:** Mock `useIsFetching` to return 0; `useIsMutating` to return 0.  
**Act:** Render `<GlobalProgressBar />`.  
**Assert:** The bar element has class `opacity-0`.

---

### UTC-F029-F-003 — GlobalProgressBar: renders bar when mutating > 0

**AC:** AC-13  
**Arrange:** Mock `useIsFetching` to return 0; `useIsMutating` to return 1.  
**Act:** Render `<GlobalProgressBar />`.  
**Assert:** The bar element has class `opacity-100`.

---

### UTC-F029-F-004 — BoardToolbar: milestone filter clears sprint when milestone changes

**AC:** AC-4  
**Arrange:** Render `BoardToolbar` with filters `{ milestoneId: 'mile-1', sprintId: 'sprint-A' }`. Sprint-A belongs to mile-1. Sprints list has sprint-A (mile-1) and sprint-B (mile-2).  
**Act:** Change milestone select to `mile-2`.  
**Assert:** `onFiltersChange` called with `sprintId: ''` because sprint-A does not belong to mile-2.

---

### UTC-F029-F-005 — BoardToolbar: product backlog toggle disables sprint selector

**AC:** AC-5  
**Arrange:** Render `BoardToolbar` with `filters.backlog: 'product'`.  
**Act:** Inspect the sprint `<select>` element.  
**Assert:** Sprint select has `disabled` attribute (or is visually/structurally disabled).

---

### UTC-F029-F-006 — AddMemberModal: department tab filters users by department

**AC:** AC-12  
**Arrange:** Mock users: user-A (dept-1), user-B (dept-2). Mock departments: dept-1, dept-2.  
**Act:** Render `AddMemberModal` in department tab; select dept-1.  
**Assert:** Only user-A appears in the checklist.

---

### UTC-F029-F-007 — AddMemberModal: select all fills selectedUserIds

**AC:** AC-12  
**Arrange:** Two users in selected department, none pre-selected.  
**Act:** Click "Select all" button.  
**Assert:** Both users are checked; counter shows "2 selected".

---

### UTC-F029-F-008 — AddMemberModal: submit calls addMember for each selected user

**AC:** AC-12  
**Arrange:** Mock `projectsApi.addMember`. Select two users. Click submit.  
**Act:** Submit form.  
**Assert:** `projectsApi.addMember` called twice (once per user) with the same role.

---

### UTC-F029-F-009 — ClientsPage: client name renders as link to /projects?clientId=

**AC:** AC-10  
**Arrange:** Render `ClientsPage` with a mocked client `{ id: 'c-1', name: 'Acme' }`.  
**Act:** Find the client name element.  
**Assert:** Element is an anchor (`<a>`) with `href` containing `/projects?clientId=c-1`.

---

### UTC-F029-F-010 — useBoard: backlog 'product' maps to sprintId 'backlog'

**AC:** AC-5  
**Arrange:** Spy on `boardApi.getItems`. Set filters with `backlog: 'product'`.  
**Act:** Hook calls API.  
**Assert:** API called with `sprintId: 'backlog'` and no `backlog` key in the query.
