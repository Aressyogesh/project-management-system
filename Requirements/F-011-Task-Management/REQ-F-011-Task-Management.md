# Requirements — F-011: Task Management

**Feature ID:** F-011  
**Phase:** 5  
**Branch:** feature/F-011-task-management  
**Status:** In Development

---

## User Story

As a Project Manager or Team Lead, I want to create and manage tasks within a project's task lists so that work can be tracked, prioritised, and assigned to team members.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | `GET /projects/:projectId/tasks` returns all tasks for a project ordered by taskList then priority; open to all authenticated users |
| AC-002 | `GET /tasks/:id` returns a single task with full detail; open to all authenticated users |
| AC-003 | `POST /projects/:projectId/tasks` creates a task; restricted to SUPER_USER, ADMIN |
| AC-004 | `PATCH /tasks/:id` updates a task including status changes; restricted to SUPER_USER, ADMIN |
| AC-005 | `DELETE /tasks/:id` deletes a task; restricted to SUPER_USER, ADMIN |
| AC-006 | `title` is required (max 300 chars); all other fields are optional |
| AC-007 | `taskListId` must reference a task list belonging to the same project |
| AC-008 | `milestoneId` is optional; when provided must belong to the same project |
| AC-009 | `assignedToId` is optional; when provided must be an active project member |
| AC-010 | `priority` defaults to MEDIUM; `status` defaults to NOT_STARTED; `billingStatus` defaults to BILLABLE |
| AC-011 | Task cascade-deleted when its task list or project is deleted |
| AC-012 | Frontend shows a Tasks section on ProjectDetailPage grouped by task list (collapsible) |
| AC-013 | Each task row shows: title, priority badge, status badge, assignee avatar, due date, edit/delete |
| AC-014 | SUPER_USER and ADMIN see Add / Edit / Delete controls; EMPLOYEE sees read-only list |
| AC-015 | TaskFormModal: title, task list selector, milestone selector, description, assignee (project members), estimated hours, priority, billing status, start/due dates, status |

---

## Data Model

```
Task
  id             UUID (PK)
  projectId      UUID (FK → Project, onDelete: Cascade)
  taskListId     UUID (FK → TaskList, onDelete: Cascade)
  milestoneId    UUID? (FK → Milestone, onDelete: SetNull)
  title          VARCHAR(300)
  description    VARCHAR(2000)?
  assignedToId   UUID? (FK → User, onDelete: SetNull)
  createdById    UUID (FK → User)
  estimatedHours DECIMAL(6,2)?
  priority       TaskPriority  default MEDIUM
  billingStatus  BillingStatus default BILLABLE
  status         TaskStatus    default NOT_STARTED
  startDate      Date?
  dueDate        Date?
  createdAt      DateTime
  updatedAt      DateTime
```

### New Enums
- `TaskPriority`: LOW, MEDIUM, HIGH, CRITICAL
- `TaskStatus`: NOT_STARTED, IN_PROGRESS, ON_REVIEW, COMPLETED
- `BillingStatus`: BILLABLE, NON_BILLABLE

---

## API Contract

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:projectId/tasks` | Any auth | List all tasks for project |
| GET | `/tasks/:id` | Any auth | Get single task |
| POST | `/projects/:projectId/tasks` | SUPER_USER, ADMIN | Create task |
| PATCH | `/tasks/:id` | SUPER_USER, ADMIN | Update task / change status |
| DELETE | `/tasks/:id` | SUPER_USER, ADMIN | Delete task (204) |

---

## UI Behaviour

- Tasks section below Task Lists on ProjectDetailPage
- Tasks grouped by task list; each group header is collapsible (default expanded)
- Task row: title, priority badge (colour-coded), status badge, assignee avatar+name, due date
- "Add Task" button in section header (admin only)
- TaskFormModal selectors for task list and milestone populate from project data
- Assignee dropdown shows only active project members
- Empty group shows "No tasks in this list yet"
- Global empty state if no task lists exist: "Create a task list first"
