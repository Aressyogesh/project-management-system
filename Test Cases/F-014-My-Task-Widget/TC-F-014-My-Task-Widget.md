# E2E Test Cases — F-014 My Task Widget (Live DB Data)

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| TC-F-014-001 | My Task table shows assigned tasks | Login as user with tasks assigned; open Dashboard | My Task table shows at least 1 row with project and task name |
| TC-F-014-002 | My Task empty state | Login as user with no tasks assigned; open Dashboard | My Task table shows "No tasks assigned yet" |
| TC-F-014-003 | Tasks Progress reflects real counts | Create a task with status IN_PROGRESS; open Dashboard | Tasks Progress donut shows nonzero IN_PROGRESS segment |
| TC-F-014-004 | Stat card Active Projects is live | Archive all projects; open Dashboard as Admin | "Active Projects" card shows 0 |
| TC-F-014-005 | Stat card Total Tasks is live | Create a new task; open Dashboard as Admin | "Total Tasks" card count increments |
| TC-F-014-006 | My Task limited to 10 items | Assign 15 tasks to a user; open Dashboard | My Task table shows exactly 10 rows |
