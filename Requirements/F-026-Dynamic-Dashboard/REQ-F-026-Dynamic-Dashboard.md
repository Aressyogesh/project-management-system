# REQ-F-026 — Dynamic Dashboard & Project-wise Team Progress

```
Feature ID   : F-026
Feature Name : Dynamic Dashboard & Project-wise Team Progress
Epic         : PMS Dashboard
Priority     : High
Roles        : Super User, Admin, Employee (Project Manager, Team Lead, Developer, QA)
```

---

## User Story

As a Super User or Admin, I want the dashboard overview page to show fully live data including a project-wise team progress panel, so that I can monitor every project's health, task completion rate, bug count, and team size at a glance without navigating into individual projects.

As an Employee, I want my dashboard stat cards, activity chart, and task progress to reflect real data from the database, so that I have an accurate view of my work state.

---

## Business Rules

| # | Rule |
|---|------|
| BR-1 | The activity chart must show real monthly task-completion data (tasks completed per month for the trailing 12 months) — no hardcoded values. |
| BR-2 | Super User and Admin see an aggregated "Projects Progress" panel with one row per active project. |
| BR-3 | Project progress percentage is calculated as: `(completed tasks / total tasks) * 100`, clamped to 0–100. Projects with zero tasks show 0%. |
| BR-4 | Only SUPER_USER and ADMIN may call `GET /dashboard/projects-progress`. EMPLOYEE receives 403. |
| BR-5 | The "Today's Task" widget must show the first task assigned to the current user that is due today and not yet completed; null if none. |
| BR-6 | Team performance score is calculated as the average task-completion ratio across all active projects (completed / total * 100), rounded to 1 decimal. |
| BR-7 | Stat cards remain role-scoped: Super User/Admin see system-wide counts; Employee sees own task counts. |
| BR-8 | The projects-progress endpoint returns only ACTIVE projects (status = ACTIVE). |
| BR-9 | Each project row includes: project name, client name, project manager full name, team member count, total tasks, completed tasks, open bugs, progress %. |

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | The Team Activity Summary chart shows real monthly task-completion counts for the last 12 months (no hardcoded values). |
| AC-2 | Super User and Admin see a "Projects Progress" panel on the dashboard with one card per active project. |
| AC-3 | Each project card shows: project name, client, project manager, team size, task completion (x/y), open bugs, and a progress bar. |
| AC-4 | Progress % is correct: `(completedTasks / totalTasks * 100)`, 0% when no tasks. |
| AC-5 | EMPLOYEE role does not see the Projects Progress panel. |
| AC-6 | `GET /dashboard/projects-progress` returns 403 for EMPLOYEE role. |
| AC-7 | "Today's Task" widget shows the first task due today assigned to the logged-in user, or "No tasks due today" if none. |
| AC-8 | Team performance score reflects real data (avg task completion % across active projects). |
| AC-9 | All dashboard stat cards continue to show accurate live counts for their role. |
| AC-10 | Loading and error states are handled gracefully on the frontend. |

---

## Dependencies

- Projects, Tasks, Bugs, ProjectMembers, Users, Clients tables must be seeded and accessible via Prisma.
- `JwtAuthGuard` global guard must be active.
- `RolesGuard` must enforce SUPER_USER / ADMIN for the new endpoint.

---

## Out of Scope

- Real-time dashboard updates via WebSocket (polling on page load is sufficient).
- Filtering or sorting the Projects Progress panel.
- Employee-specific project progress views (they navigate to the board instead).
- PDF/CSV export of the dashboard.

---

## Database / Schema Design (Step 4)

No new tables or schema changes are required. All data is derived from existing models:

| Data Point | Source |
|------------|--------|
| Activity chart (monthly completions) | `Task.updatedAt` WHERE `status = COMPLETED`, grouped by month |
| Projects progress | `Project`, `Task`, `Bug`, `ProjectMember`, `User`, `Client` |
| Today's task | `Task` WHERE `assignedToId = userId AND dueDate = today AND status != COMPLETED` |
| Team performance | Aggregate over active `Project` → `Task` completion ratios |

**Migration:** Not required.

---

## API Contract Design (Step 5)

### Endpoint 1 — Dynamic Stats (extended existing)

```
GET  /api/v1/dashboard/stats
Auth Required : Yes — any authenticated user
Roles Allowed : All

Success Response  HTTP 200
{
  "cards": [
    { "label": string, "value": number, "change": number, "trend": "up"|"down", "color": string }
  ],
  "activityData": [
    { "month": string, "high": number, "low": number }
  ],
  "tasksProgress": {
    "notStarted": number,
    "inProgress": number,
    "onReview": number,
    "completed": number
  },
  "myTasks": [
    { "id": string, "projectName": string, "taskName": string, "assignee": string, "priority": string, "status": string }
  ],
  "todayTask": { "name": string, "progress": number } | null,
  "teamPerformance": { "score": number, "change": number }
}

Error Responses
  401 — not authenticated
  500 — server error
```

### Endpoint 2 — Projects Progress (NEW)

```
GET  /api/v1/dashboard/projects-progress
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Success Response  HTTP 200
[
  {
    "id": string,
    "name": string,
    "clientName": string,
    "projectManager": string,
    "teamSize": number,
    "totalTasks": number,
    "completedTasks": number,
    "openBugs": number,
    "progress": number   // 0–100
  }
]

Error Responses
  401 — not authenticated
  403 — employee role
  500 — server error
```
