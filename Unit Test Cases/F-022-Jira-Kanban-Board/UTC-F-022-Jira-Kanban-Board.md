# UTC-F-022 — Unit Test Cases: JIRA Kanban Board

**Date:** 2026-05-28  
**Framework:** Vitest + React Testing Library (Frontend) | Jest (Backend)

---

## Frontend Unit Tests

### Suite: WorkItemCard

**UTC-F022-FE-001** — Renders type badge with correct label  
Arrange: mount `<WorkItemCard>` with `type=EPIC`  
Act: render  
Assert: screen contains "Epic" badge with purple colour class

**UTC-F022-FE-002** — Renders BUG type card with red badge  
Arrange: mount with `type=BUG`  
Assert: badge has red colour class

**UTC-F022-FE-003** — Shows story points when provided  
Arrange: `storyPoints=5`  
Assert: "5" visible on card

**UTC-F022-FE-004** — Shows assignee initials when assignee provided  
Arrange: `assignee={ fullName: 'Hemant Atre' }`  
Assert: "HA" avatar visible

**UTC-F022-FE-005** — Shows "Unassigned" when no assignee  
Arrange: `assigneeId=null`  
Assert: "Unassigned" text visible

### Suite: KanbanColumn

**UTC-F022-FE-006** — Renders column header with correct label  
Arrange: mount `<KanbanColumn status="TODO">`  
Assert: "To Do" header visible

**UTC-F022-FE-007** — Shows correct item count in header  
Arrange: pass 3 items  
Assert: count badge shows "3"

**UTC-F022-FE-008** — Empty state shown when no items  
Arrange: pass empty items array  
Assert: "No items" placeholder visible

**UTC-F022-FE-009** — BLOCKED column has red header class  
Arrange: `status="BLOCKED"`  
Assert: header has red CSS class

### Suite: BoardToolbar

**UTC-F022-FE-010** — Renders all 5 type filter chips  
Arrange: mount `<BoardToolbar>`  
Assert: Epic, Story, Task, Sub Task, Bug chips all present

**UTC-F022-FE-011** — Clicking type chip calls onTypeFilter callback  
Arrange: mock `onTypeFilter`  
Act: click "Bug" chip  
Assert: `onTypeFilter` called with `["BUG"]`

**UTC-F022-FE-012** — Create button visible for PM role  
Arrange: mock auth store with `projectRole=PROJECT_MANAGER`  
Assert: "+ Create" button visible

**UTC-F022-FE-013** — Epic/Story create option hidden for DEVELOPER role  
Arrange: mock auth store with `projectRole=DEVELOPER`  
Act: click "+ Create"  
Assert: "Epic" and "User Story" options not in dropdown

**UTC-F022-FE-014** — Task/SubTask/Bug create option visible for DEVELOPER role  
Arrange: same as above  
Assert: "Task", "Sub Task", "Bug" options visible

### Suite: WorkItemModal — Log Time tab

**UTC-F022-FE-015** — Log Time tab renders date, hours, description fields  
Arrange: mount modal with activeTab="logTime"  
Assert: date input, hours input, description textarea all present

**UTC-F022-FE-016** — Previous log entries listed  
Arrange: pass `timesheetEntries=[{date:'2026-05-27', hours:3, description:'test'}]`  
Assert: "3h" and "2026-05-27" visible in entries list

**UTC-F022-FE-017** — Total logged hours computed correctly  
Arrange: entries with hours [2, 3, 2.5]  
Assert: "Total logged: 7.5h" visible

**UTC-F022-FE-018** — Remaining hours = estimatedHours - loggedHours  
Arrange: `estimatedHours=10`, logged=7.5  
Assert: "Remaining: 2.5h" visible

### Suite: TypeBadge

**UTC-F022-FE-019** — EPIC renders purple  
Assert: `className` includes purple variant

**UTC-F022-FE-020** — USER_STORY renders blue  
Assert: blue variant

**UTC-F022-FE-021** — BUG renders red  
Assert: red variant

---

## Backend Unit Tests

### Suite: WorkItemsService

**UTC-F022-BE-001** — move() sets completedAt when status transitions to QA_DONE  
Arrange: existing item with status=QA, mock prisma.workItem.update  
Act: `service.move(id, { status: 'QA_DONE', position: 0 })`  
Assert: update called with `completedAt: expect.any(Date)`

**UTC-F022-BE-002** — move() increments reopenCount on backward transition  
Arrange: item with status=IN_REVIEW  
Act: move to IN_PROGRESS  
Assert: update called with `reopenCount: { increment: 1 }`

**UTC-F022-BE-003** — move() does NOT increment reopenCount on forward transition  
Arrange: item with status=TODO  
Act: move to IN_PROGRESS  
Assert: update called WITHOUT reopenCount increment

**UTC-F022-BE-004** — move() clears completedAt when moving backward from QA_DONE  
Arrange: item with status=QA_DONE  
Act: move to QA  
Assert: update called with `completedAt: null`

**UTC-F022-BE-005** — create() rejects SUB_TASK with EPIC parent  
Arrange: dto with `type=SUB_TASK`, `parentId` pointing to an EPIC item  
Act: `service.create()`  
Assert: throws `BadRequestException`

**UTC-F022-BE-006** — create() allows TASK with USER_STORY parent  
Arrange: dto with `type=TASK`, parent is USER_STORY  
Assert: does not throw

**UTC-F022-BE-007** — create() allows EPIC with no parent  
Arrange: dto with `type=EPIC`, `parentId=undefined`  
Assert: does not throw

### Suite: SprintsService

**UTC-F022-BE-008** — setActive() deactivates all other sprints in project before activating new one  
Arrange: 2 existing sprints (both isActive=false), mock updateMany  
Act: `service.setActive(sprintId, projectId)`  
Assert: `prisma.sprint.updateMany` called with `{ where: { projectId }, data: { isActive: false } }` first

**UTC-F022-BE-009** — setActive() then activates the target sprint  
Assert: `prisma.sprint.update` called with `{ where: { id: sprintId }, data: { isActive: true } }`

### Suite: TimesheetEntriesService

**UTC-F022-BE-010** — create() succeeds for the assigned user  
Arrange: workItem with `assigneeId=user1`, requesting userId=user1  
Assert: entry created successfully

**UTC-F022-BE-011** — create() throws ForbiddenException when non-assignee tries to log time  
Arrange: workItem with `assigneeId=user1`, requesting userId=user2 (no PM role)  
Assert: throws `ForbiddenException`
