# Unit Test Cases — F-010: Task List Management

## Backend Unit Tests (MilestonesService)

| Test ID | Description | Method | Expected |
|---------|-------------|--------|----------|
| UTC-F-010-B-001 | CreateTaskList_ValidData_ReturnsTaskList | `create()` | Returns task list with correct type |
| UTC-F-010-B-002 | CreateTaskList_ProjectNotFound_ThrowsNotFoundException | `create()` | NotFoundException |
| UTC-F-010-B-003 | CreateTaskList_SprintType_NoSprintNumber_ThrowsBadRequest | `create()` | BadRequestException |
| UTC-F-010-B-004 | CreateTaskList_NonSprintType_SprintNumberIgnored | `create()` | sprintNumber set to null |
| UTC-F-010-B-005 | UpdateTaskList_ValidData_ReturnsUpdated | `update()` | Returns updated task list |
| UTC-F-010-B-006 | UpdateTaskList_NotFound_ThrowsNotFoundException | `update()` | NotFoundException |
| UTC-F-010-B-007 | DeleteTaskList_ValidId_Deletes | `remove()` | Prisma delete called once |
| UTC-F-010-B-008 | DeleteTaskList_NotFound_ThrowsNotFoundException | `remove()` | NotFoundException |
| UTC-F-010-B-009 | ListTaskLists_ValidProject_ReturnsList | `findAll()` | Returns array ordered by type, createdAt |

## Frontend Unit Tests

| Test ID | Description | Component | Expected |
|---------|-------------|-----------|----------|
| UTC-F-010-FE-001 | TaskListsSection_LoadsLists_DisplaysList | ProjectDetailPage | Task list name visible |
| UTC-F-010-FE-002 | TaskListsSection_EmptyState_ShowsMessage | ProjectDetailPage | "No task lists yet" shown |
| UTC-F-010-FE-003 | TaskListsSection_AdminRole_ShowsAddButton | ProjectDetailPage | "Add Task List" visible for ADMIN |
| UTC-F-010-FE-004 | TaskListsSection_EmployeeRole_HidesAddButton | ProjectDetailPage | "Add Task List" hidden for EMPLOYEE |
| UTC-F-010-FE-005 | TaskListsSection_AddButton_OpensModal | ProjectDetailPage | Modal with h2 heading rendered |
