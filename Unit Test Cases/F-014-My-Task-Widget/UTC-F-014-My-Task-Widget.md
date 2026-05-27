# Unit Test Cases — F-014 My Task Widget (Live DB Data)

## Backend Unit Tests

| ID | Method | Description | Input | Expected Output |
|---|---|---|---|---|
| UTC-F-014-B-001 | getStats | Returns myTasks assigned to the requesting user | userId=user-001 (has 2 tasks), role=ADMIN | myTasks has 2 items matching userId |
| UTC-F-014-B-002 | getStats | myTasks is empty when user has no assigned tasks | userId=user-999 (no tasks) | myTasks = [] |
| UTC-F-014-B-003 | getStats | tasksProgress counts are correct | 3 NOT_STARTED, 2 IN_PROGRESS | notStarted=3, inProgress=2 |
| UTC-F-014-B-004 | getStats | Admin stat card Active Projects is live | 2 active projects in DB | cards[0].value = 2 |

## Frontend Unit Tests

| ID | Component | Description | Input | Expected Output |
|---|---|---|---|---|
| UTC-F-014-FE-001 | MyTaskTable | Renders task rows with projectName and taskName | tasks with 2 items | Both task project and name rendered |
| UTC-F-014-FE-002 | MyTaskTable | Shows priority badge with correct label | task with priority=CRITICAL | "critical" badge rendered |
| UTC-F-014-FE-003 | MyTaskTable | Shows status badge with correct label | task with status=COMPLETED | "Completed" badge rendered |
| UTC-F-014-FE-004 | MyTaskTable | Shows empty state when tasks=[] | tasks=[] | "No tasks assigned yet" message |
