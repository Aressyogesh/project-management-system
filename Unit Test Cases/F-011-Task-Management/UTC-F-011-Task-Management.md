# Unit Test Cases — F-011: Task Management

## Backend Unit Tests (TasksService)

| Test ID | Description | Method | Expected |
|---------|-------------|--------|----------|
| UTC-F-011-B-001 | CreateTask_ValidData_ReturnsTask | `create()` | Task created with correct title and defaults |
| UTC-F-011-B-002 | CreateTask_ProjectNotFound_ThrowsNotFoundException | `create()` | NotFoundException |
| UTC-F-011-B-003 | CreateTask_TaskListNotInProject_ThrowsBadRequest | `create()` | BadRequestException |
| UTC-F-011-B-004 | CreateTask_MilestoneNotInProject_ThrowsBadRequest | `create()` | BadRequestException |
| UTC-F-011-B-005 | UpdateTask_ValidData_ReturnsUpdatedTask | `update()` | Returns task with new title |
| UTC-F-011-B-006 | UpdateTask_NotFound_ThrowsNotFoundException | `update()` | NotFoundException |
| UTC-F-011-B-007 | UpdateTask_StatusChange_ReturnsUpdatedStatus | `update()` | Status updated to IN_PROGRESS |
| UTC-F-011-B-008 | DeleteTask_ValidId_DeletesTask | `remove()` | Prisma delete called once |
| UTC-F-011-B-009 | DeleteTask_NotFound_ThrowsNotFoundException | `remove()` | NotFoundException; delete never called |
| UTC-F-011-B-010 | ListTasks_ValidProject_ReturnsList | `findAll()` | Returns array of tasks |
| UTC-F-011-B-011 | GetTask_ValidId_ReturnsTask | `findOne()` | Returns single task with full detail |

## Frontend Unit Tests

| Test ID | Description | Component | Expected |
|---------|-------------|-----------|----------|
| UTC-F-011-FE-001 | TasksSection_LoadsTasks_DisplaysTitle | ProjectDetailPage | Task title visible |
| UTC-F-011-FE-002 | TasksSection_EmptyState_ShowsMessage | ProjectDetailPage | "No tasks" message shown |
| UTC-F-011-FE-003 | TasksSection_AdminRole_ShowsAddButton | ProjectDetailPage | "Add Task" visible for ADMIN |
| UTC-F-011-FE-004 | TasksSection_EmployeeRole_HidesAddButton | ProjectDetailPage | "Add Task" hidden for EMPLOYEE |
| UTC-F-011-FE-005 | TasksSection_AddButton_OpensModal | ProjectDetailPage | Modal with h2 heading rendered |
