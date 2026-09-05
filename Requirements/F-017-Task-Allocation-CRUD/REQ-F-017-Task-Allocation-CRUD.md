# REQ-F-017: Task Allocation CRUD + 8-Hour Daily Cap Validation

```
Feature ID   : F-017
Feature Name : Task Allocation CRUD + 8-Hour Daily Cap Validation
Epic         : Task Allocation Tracking (Phase 6)
Priority     : High
Roles        : SUPER_USER, ADMIN (full); PROJECT_MANAGER, TEAM_LEAD (create/edit/delete within project); EMPLOYEE (read own)
```

---

## User Story

As a Project Manager or Team Lead, I want to assign a specific number of hours to a team member for a task on a given date, so that workload is planned and no employee is over-allocated beyond their 8-hour shift capacity.

---

## Business Rules

BR-1: An allocation record ties together: a task, a user, a date, and allocated hours.  
BR-2: A user's total allocated hours across ALL tasks on a single date must not exceed 8 hours.  
BR-3: When creating or updating an allocation, the system computes `existingHours + newHours` for that user+date. If the total exceeds 8, return HTTP 422 with the message `"Over-allocation: {user} already has {existing}h allocated on {date}. Only {remaining}h remaining."`.  
BR-4: `allocatedHours` must be > 0 and ≤ 8 (validated at DTO level).  
BR-5: Only SUPER_USER, ADMIN, PROJECT_MANAGER, or TEAM_LEAD may create, update, or delete allocations.  
BR-6: Any authenticated user may read allocations; employees see only their own.  
BR-7: The same user may be allocated to the same task on multiple different dates.  
BR-8: A user+task+date combination must be unique (one allocation record per user per task per date).  
BR-9: The `GET /task-allocations/check` endpoint returns `allocatedHours` (current total for user on date) and `remainingHours` (8 − allocated) for pre-validation on the frontend.

---

## Acceptance Criteria

AC-1: `POST /api/v1/task-allocations` creates an allocation and returns HTTP 201 with the created record.  
AC-2: Creating an allocation that would push a user over 8h on a date returns HTTP 422.  
AC-3: `PATCH /api/v1/task-allocations/:id` updates hours; re-validates cap (excluding current record's hours).  
AC-4: `DELETE /api/v1/task-allocations/:id` removes the allocation and returns HTTP 204.  
AC-5: `GET /api/v1/projects/:projectId/task-allocations` returns all allocations for the project.  
AC-6: `GET /api/v1/task-allocations/user/:userId` returns all allocations for the user (calendar data).  
AC-7: `GET /api/v1/task-allocations/check?userId=&date=` returns `{ allocatedHours, remainingHours }`.  
AC-8: EMPLOYEE role cannot create/update/delete allocations — returns HTTP 403.  
AC-9: The frontend allocation form shows a warning when `remainingHours < requestedHours` and blocks submit when cap would be exceeded.  
AC-10: Allocation form fields: Task (dropdown from project tasks), User (dropdown from project members), Date (date picker), Hours (number input 0.5–8 step 0.5).

---

## Dependencies

- F-011 (Task Management) — `Task` model with `projectId` FK exists.
- F-007 (Project Member Management) — `ProjectMember` model exists.
- F-015 (ProjectRoleGuard) — RBAC guard available for write endpoints.

---

## Out of Scope

- Allocation calendar view (F-018).
- Team capacity view (F-019).
- Allocation report (F-020).
- Leave/overtime integration (handled in a later phase).

---

## Schema Design

### New Model: `TaskAllocation`

```
model TaskAllocation {
  id             String   @id @default(uuid())
  taskId         String
  userId         String
  date           DateTime @db.Date
  allocatedHours Float

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([taskId, userId, date])
  @@index([userId, date])
  @@map("task_allocations")
}
```

### Modified Models

**Task** — add relation:
```
taskAllocations TaskAllocation[]
```

**User** — add relation:
```
taskAllocations TaskAllocation[]
```

### Migration

```
Name    : add_task_allocation
Command : npx prisma migrate dev --name add_task_allocation
```

---

## API Contract

### POST /api/v1/task-allocations
Auth: Bearer JWT | Roles: SUPER_USER, ADMIN, PROJECT_MANAGER, TEAM_LEAD

Request Body:
```json
{ "taskId": "uuid", "userId": "uuid", "date": "2026-06-10", "allocatedHours": 4 }
```
Success: HTTP 201 — allocation object  
Errors: 400 validation | 403 forbidden | 409 duplicate (same task+user+date) | 422 over-allocation

---

### PATCH /api/v1/task-allocations/:id
Auth: Bearer JWT | Roles: SUPER_USER, ADMIN, PROJECT_MANAGER, TEAM_LEAD

Request Body:
```json
{ "allocatedHours": 6 }
```
Success: HTTP 200 — updated allocation  
Errors: 400 | 403 | 404 | 422 over-allocation

---

### DELETE /api/v1/task-allocations/:id
Auth: Bearer JWT | Roles: SUPER_USER, ADMIN, PROJECT_MANAGER, TEAM_LEAD  
Success: HTTP 204  
Errors: 403 | 404

---

### GET /api/v1/projects/:projectId/task-allocations
Auth: Bearer JWT | Any authenticated user  
Success: HTTP 200 — array of allocations with task and user details

---

### GET /api/v1/task-allocations/user/:userId
Auth: Bearer JWT | Owner or PM/TL/Admin  
Query params: `?from=YYYY-MM-DD&to=YYYY-MM-DD` (optional)  
Success: HTTP 200 — array of allocations

---

### GET /api/v1/task-allocations/check
Auth: Bearer JWT | Roles: SUPER_USER, ADMIN, PROJECT_MANAGER, TEAM_LEAD  
Query params: `?userId=uuid&date=YYYY-MM-DD`  
Success: HTTP 200
```json
{ "allocatedHours": 5, "remainingHours": 3 }
```
