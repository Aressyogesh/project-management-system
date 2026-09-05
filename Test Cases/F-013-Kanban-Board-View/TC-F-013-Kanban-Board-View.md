# E2E Test Cases — F-013 Kanban Board View

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| TC-F-013-001 | Default view is List | Open Project Detail page | Tasks section shows grouped list; "List" toggle is active |
| TC-F-013-002 | Switch to Board view | Click "Board" toggle | Kanban board renders with four columns |
| TC-F-013-003 | Switch back to List view | While in Board view, click "List" toggle | Grouped list reappears; Kanban board hidden |
| TC-F-013-004 | Task in correct column | Create task with status IN_PROGRESS; switch to Board | Task card appears in "In Progress" column |
| TC-F-013-005 | Task card content | Board view with a task | Card shows title, priority badge, assignee name, task list name |
| TC-F-013-006 | Open TaskDetailModal from board | Click task card in Board view | TaskDetailModal opens with correct task info |
