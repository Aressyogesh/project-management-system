# Unit Test Cases — F-013 Kanban Board View

## Frontend Unit Tests

| ID | Component | Description | Input | Expected Output |
|---|---|---|---|---|
| UTC-F-013-FE-001 | TaskKanbanBoard | Renders four status columns | tasks=[] | Four column headers rendered: NOT STARTED, IN PROGRESS, ON REVIEW, COMPLETED |
| UTC-F-013-FE-002 | TaskKanbanBoard | Places task in correct column | task with status=IN_PROGRESS | Task card appears under IN PROGRESS column |
| UTC-F-013-FE-003 | TaskKanbanBoard | Displays priority badge on card | task with priority=HIGH | HIGH badge rendered with correct class |
| UTC-F-013-FE-004 | TaskKanbanBoard | Clicking card calls onTaskClick | click task card | onTaskClick called with the task object |
| UTC-F-013-FE-005 | TaskKanbanBoard | Empty column shows placeholder | all tasks in NOT_STARTED | Other three columns show "No tasks" message |

## Notes
- No backend unit tests — F-013 is frontend-only; existing `/projects/:id/tasks` endpoint is reused.
- Tests use `@testing-library/react` with mocked task data (no API calls).
