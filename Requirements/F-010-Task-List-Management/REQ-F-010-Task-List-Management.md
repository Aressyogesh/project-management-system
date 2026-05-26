# Requirements — F-010: Task List Management

**Feature ID:** F-010  
**Phase:** 5  
**Branch:** feature/F-010-task-list-management  
**Status:** In Development

---

## User Story

As a Project Manager or Team Lead, I want to create and manage task lists within a project so that tasks can be organised into logical groups (General, Sprint, QA, Development, PM).

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | `GET /projects/:projectId/task-lists` returns all task lists for a project ordered by type then createdAt; open to all authenticated users |
| AC-002 | `POST /projects/:projectId/task-lists` creates a task list; restricted to SUPER_USER, ADMIN, PROJECT_MANAGER, TEAM_LEAD |
| AC-003 | `PATCH /task-lists/:id` updates name, type, sprintNumber, description; same role restriction |
| AC-004 | `DELETE /task-lists/:id` deletes a task list; restricted to SUPER_USER, ADMIN, PROJECT_MANAGER |
| AC-005 | `type` must be one of: GENERAL, PROJECT_MANAGEMENT, DEVELOPMENT, QA, SPRINT |
| AC-006 | `sprintNumber` is required when type is SPRINT; forbidden for other types |
| AC-007 | Task list is cascade-deleted when its project is deleted |
| AC-008 | Task list name is required (max 200 chars); description is optional (max 500 chars) |
| AC-009 | Frontend shows a Task Lists section on ProjectDetailPage listing all task lists with type badge and sprint number |
| AC-010 | SUPER_USER and ADMIN see Add / Edit / Delete controls; EMPLOYEE sees read-only list |
| AC-011 | Creating a SPRINT list without sprintNumber returns 400 Bad Request |
| AC-012 | Attempting to access a non-existent task list returns 404 Not Found |

---

## Data Model

```
TaskList
  id           UUID (PK)
  projectId    UUID (FK → Project, onDelete: Cascade)
  name         VARCHAR(200)
  type         TaskListType enum
  sprintNumber INT? (required when type = SPRINT)
  description  VARCHAR(500)?
  createdAt    DateTime
  updatedAt    DateTime
```

### TaskListType Enum
`GENERAL | PROJECT_MANAGEMENT | DEVELOPMENT | QA | SPRINT`

---

## API Contract

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:projectId/task-lists` | Any auth | List task lists for project |
| POST | `/projects/:projectId/task-lists` | SUPER_USER, ADMIN, PROJECT_MANAGER, TEAM_LEAD | Create task list |
| PATCH | `/task-lists/:id` | SUPER_USER, ADMIN, PROJECT_MANAGER, TEAM_LEAD | Update task list |
| DELETE | `/task-lists/:id` | SUPER_USER, ADMIN, PROJECT_MANAGER | Delete task list |

---

## UI Behaviour

- Task Lists section sits below Milestones on ProjectDetailPage
- Each row shows: name, type badge (colour-coded), sprint number (if SPRINT type), description excerpt, created date, edit/delete icons (admin only)
- "Add Task List" button top-right (admin only)
- Modal form: name (required), type selector, sprint number (shown only when SPRINT selected), description (optional textarea)
- Delete is immediate (no confirm modal) with button disabled during pending
- Empty state: "No task lists yet. Add one to get started."
