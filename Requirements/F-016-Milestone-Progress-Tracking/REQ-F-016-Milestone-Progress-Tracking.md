# REQ-F-016: Milestone Progress Tracking

```
Feature ID   : F-016
Feature Name : Milestone Progress Tracking via Linked Tasks
Epic         : Project Management System
Priority     : High
Roles        : All authenticated users (read); Project Manager (write — unchanged)
```

---

## User Story

As a Project Manager or Team Lead, I want to see the completion progress of each milestone based on its linked tasks, so that I can quickly assess whether deliverables are on track without manually counting tasks.

---

## Business Rules

BR-1: Progress is computed as `(COMPLETED tasks linked to milestone / total tasks linked to milestone) × 100`, rounded to the nearest integer.  
BR-2: Milestones with no linked tasks show `progressPercent: 0`, `totalTasks: 0`, `completedTasks: 0`.  
BR-3: Progress is derived in real-time on every `GET /projects/:projectId/milestones` request — it is **not** stored as a column in the DB.  
BR-4: Only tasks whose `status = COMPLETED` count as completed; IN_PROGRESS, NOT_STARTED, ON_REVIEW do not.  
BR-5: The three computed fields (`totalTasks`, `completedTasks`, `progressPercent`) are appended to every milestone object in the list response.  
BR-6: `create` and `update` milestone responses do not need to include progress stats (the frontend re-fetches the list after mutation).

---

## Acceptance Criteria

AC-1: `GET /api/v1/projects/:projectId/milestones` returns `totalTasks`, `completedTasks`, and `progressPercent` on every milestone object.  
AC-2: A milestone with no linked tasks returns `progressPercent: 0`, `completedTasks: 0`, `totalTasks: 0`.  
AC-3: A milestone with 3 COMPLETED tasks out of 5 total returns `progressPercent: 60`.  
AC-4: A milestone where all tasks are COMPLETED returns `progressPercent: 100`.  
AC-5: The frontend milestone row displays a progress bar reflecting `progressPercent`.  
AC-6: The frontend milestone row displays a task count label (e.g. "3 / 5 tasks").  
AC-7: A milestone with 0 tasks displays the progress bar at 0% and label "0 / 0 tasks".

---

## Dependencies

- F-010 (Milestone Management) — `Milestone` model and `GET /projects/:id/milestones` endpoint already exist.
- F-011 (Task Management) — `Task` model with `milestoneId` FK already exists.

---

## Out of Scope

- Automatically updating `milestone.status` based on progress percentage.
- Bug progress tracking on milestones.
- Notifications when a milestone reaches 100%.
- Storing `progressPercent` as a DB column.

---

## Schema Design

No new models or migrations required.

**Relationship used:**  
`Task.milestoneId` → `Milestone.id` (already exists, nullable)

**Query strategy:**  
In `MilestonesService.findAll`, use Prisma's `_count` and filtered `include` on `tasks` in a single query:

```
milestone.findMany({
  select: {
    <existing fields>,
    _count:  { select: { tasks: true } },           // totalTasks
    tasks:   { where: { status: 'COMPLETED' },       // completedTasks
               select: { id: true } },
  }
})
```

Map result: `progressPercent = totalTasks > 0 ? round((completedTasks / totalTasks) * 100) : 0`

---

## API Contract

### Enhanced: `GET /api/v1/projects/:projectId/milestones`

**Auth:** Bearer JWT (any authenticated user)  
**Guard:** `JwtAuthGuard` only (read endpoint — no project role required)

**Success Response — HTTP 200**

```json
[
  {
    "id": "uuid",
    "description": "Phase-1 Admin Module",
    "deliveryNote": null,
    "startDate": "2026-06-01",
    "dueDate": "2026-06-30",
    "status": "IN_PROGRESS",
    "createdAt": "2026-05-01T10:00:00.000Z",
    "responsibleUser": { "id": "uuid", "fullName": "Alice", "profilePhoto": null },
    "totalTasks": 5,
    "completedTasks": 3,
    "progressPercent": 60
  }
]
```

**Error Responses**

| Code | Reason |
|------|--------|
| 401  | Missing or invalid JWT |
| 404  | Project not found |

No other endpoints are changed.
