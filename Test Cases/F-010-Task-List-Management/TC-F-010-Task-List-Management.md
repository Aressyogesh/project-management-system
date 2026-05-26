# E2E Test Cases — F-010: Task List Management

| Test ID | Description | Actor | Steps | Expected |
|---------|-------------|-------|-------|----------|
| TC-F-010-001 | TaskListSection_AuthUser_SeesSection | EMPLOYEE | Navigate to project detail page | Task Lists section visible |
| TC-F-010-002 | TaskListSection_EmptyProject_ShowsEmptyState | SUPER_USER | Open project with no task lists | "No task lists yet" displayed |
| TC-F-010-003 | CreateTaskList_Admin_GeneralType_AppearsInList | ADMIN | Click Add Task List → fill name + select GENERAL → submit | New list appears with GENERAL badge |
| TC-F-010-004 | CreateTaskList_Admin_SprintType_WithSprintNumber | ADMIN | Select SPRINT type → enter sprint number → submit | List shows "Sprint 1" label |
| TC-F-010-005 | CreateTaskList_SprintType_NoNumber_ShowsError | ADMIN | Select SPRINT → leave sprint number empty → submit | Validation error shown |
| TC-F-010-006 | CreateTaskList_EmptyName_BlocksSubmit | ADMIN | Leave name empty → submit | Disabled or HTML required enforced |
| TC-F-010-007 | EditTaskList_Admin_UpdatesName_ReflectedInList | ADMIN | Click edit → change name → save | Updated name shown in list |
| TC-F-010-008 | DeleteTaskList_Admin_RemovedFromList | ADMIN | Click delete → row disappears | Task list no longer in list |
| TC-F-010-009 | TaskListActions_Employee_HiddenFromView | EMPLOYEE | View project detail | No Add / Edit / Delete controls visible |
