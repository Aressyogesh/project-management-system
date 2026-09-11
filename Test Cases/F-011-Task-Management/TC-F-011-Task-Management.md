# E2E Test Cases — F-011: Task Management

| Test ID | Description | Actor | Steps | Expected |
|---------|-------------|-------|-------|----------|
| TC-F-011-001 | TasksSection_AuthUser_SeesSection | EMPLOYEE | Navigate to project detail | Tasks section visible |
| TC-F-011-002 | TasksSection_NoTaskLists_ShowsGuidanceMessage | SUPER_USER | Open project with no task lists | "Create a task list first" shown |
| TC-F-011-003 | CreateTask_Admin_ValidData_AppearsInList | ADMIN | Add Task → fill title + select task list → submit | Task appears in correct task list group |
| TC-F-011-004 | CreateTask_EmptyTitle_BlocksSubmit | ADMIN | Leave title empty → submit | HTML required prevents submit |
| TC-F-011-005 | CreateTask_WithMilestone_MilestoneShownInRow | ADMIN | Select milestone → submit | Milestone name visible in task detail |
| TC-F-011-006 | EditTask_Admin_UpdatesTitle_ReflectedInList | ADMIN | Click edit → change title → save | Updated title in task row |
| TC-F-011-007 | EditTask_ChangeStatus_BadgeUpdates | ADMIN | Change status to IN_PROGRESS → save | Blue "In Progress" badge shown |
| TC-F-011-008 | EditTask_AssignMember_ShowsAvatar | ADMIN | Assign team member → save | Assignee avatar/name visible |
| TC-F-011-009 | DeleteTask_Admin_RemovedFromList | ADMIN | Click delete → task row disappears | Task no longer in list |
| TC-F-011-010 | TasksSection_Employee_HidesAddEditDelete | EMPLOYEE | View task section | No Add / Edit / Delete controls |
