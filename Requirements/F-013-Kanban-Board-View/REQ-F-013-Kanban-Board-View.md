# F-013 — Kanban Board View

## Feature Overview
Add a Kanban board view to the Project Detail page, allowing users to see all tasks organised into four status columns side-by-side. A toggle in the Tasks section header lets users switch between the existing list view and the new board view.

## User Roles
| Role | Permissions |
|---|---|
| Super User | View & edit tasks in both views |
| Admin | View & edit tasks in both views |
| Employee | View tasks in both views (no edit) |

## Functional Requirements

### FR-013-001 — View Toggle
- A "List" and "Board" toggle is displayed in the Tasks section header.
- Clicking toggles between the existing grouped-list view and the new Kanban board.
- Default view is List.

### FR-013-002 — Kanban Columns
- The board renders exactly four columns, one per task status:
  - NOT_STARTED
  - IN_PROGRESS
  - ON_REVIEW
  - COMPLETED
- Column headers show the status label and the count of tasks in that column.

### FR-013-003 — Task Cards
- Each task appears as a card in the column matching its current status.
- Card content:
  - Task title (clickable — opens TaskDetailModal)
  - Priority badge (colour-coded)
  - Assignee name (or "Unassigned")
  - Task list name (sub-label)

### FR-013-004 — Empty Column State
- A column with no tasks shows a subtle "No tasks" placeholder message.

### FR-013-005 — TaskDetailModal Integration
- Clicking a task card in the board view opens the same TaskDetailModal used in list view.
- TaskDetailModal behaviour (tabs, attachments, comments, canEdit) is identical to list view.

### FR-013-006 — Add Task Button
- The "Add Task" button (admin/super-user only) remains visible in the Tasks header in both views.

## Non-Functional Requirements
- Board columns scroll independently if content overflows vertically.
- No backend changes — the Kanban board is a pure frontend reorganisation of the existing `GET /projects/:id/tasks` response.

## Out of Scope
- Drag-and-drop between columns (deferred).
- Filtering or searching within the board.
