# F-014 — My Task Widget (Live DB Data)

## Feature Overview
Replace the placeholder/empty data returned by the Dashboard stats endpoint with live data from the database. Specifically: the "My Task" table on the dashboard must show tasks assigned to the currently logged-in user, the Tasks Progress donut must reflect real task counts, and the stat cards must show real Active Projects / Total Tasks / Completed Tasks counts.

## User Roles
| Role | Behaviour |
|---|---|
| Super User / Admin | myTasks = tasks assigned to themselves; stat cards show system-wide counts |
| Employee | myTasks = tasks assigned to themselves; tasksProgress = system-wide counts |

## Functional Requirements

### FR-014-001 — My Tasks live data
- `DashboardStats.myTasks` is populated with tasks where `assignedToId` equals the authenticated user's ID.
- Each task entry includes: `id`, `projectName` (via task's task list → project), `taskName` (task title), `assignee` (assignedTo.fullName or "—"), `priority`, `status`.
- Results are ordered by `createdAt DESC`, limited to the 10 most recent.

### FR-014-002 — Tasks Progress live data
- `tasksProgress` is populated with system-wide counts per status:
  - `notStarted` → tasks with status `NOT_STARTED`
  - `inProgress` → tasks with status `IN_PROGRESS`
  - `onReview` → tasks with status `ON_REVIEW`
  - `completed` → tasks with status `COMPLETED`

### FR-014-003 — Stat Cards live data (Admin / Super User)
- `Active Projects` card value = `project.count({ where: { status: 'ACTIVE' } })`
- `Total Tasks` card value = `task.count()`
- `Completed Tasks` card value = `task.count({ where: { status: 'COMPLETED' } })`
- `Total Users` card value = `user.count({ where: { isActive: true } })` (already live)

### FR-014-004 — Frontend
- No frontend component changes required — `DashboardPage`, `MyTaskTable`, `TasksProgressChart` are already wired to consume `DashboardStats` from `dashboardApi.getStats()`.

## Non-Functional Requirements
- All DB queries run in parallel with `Promise.all` to minimise response latency.
- No N+1 queries — use Prisma `select` with nested relation selects.

## Out of Scope
- Pagination on the My Task widget (deferred — it already limits to 10).
- Employee-specific stat card values (deferred to a future iteration).
