# REQ-F-034 — User Activity Audit Log

## Feature Overview

**Feature ID:** F-034  
**Feature Name:** User Activity Audit Log  
**Branch:** `feature/F-034-user-activity-audit-log`  
**Epic:** PMS  
**Priority:** High  
**Date:** 2026-06-03  

---

## User Story

> **As an Admin / Super User**, I want to see a complete log of every action performed by every user in the system, so that I can track what happened, when, and by whom.
>
> **As any logged-in user**, I want to view my own activity history within the portal, so that I can review my recent actions.

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-1 | Every significant user action (create, update, delete, status change, login) must be logged automatically — no manual step required. |
| BR-2 | Each log entry must capture: who, what action, on which entity, when, and optional context. |
| BR-3 | Admins and Super Users must be able to browse, filter, and search all user activity logs. |
| BR-4 | Regular employees can only view their own activity log. |
| BR-5 | Audit logs must be append-only — no log entry may be edited or deleted via the application. |
| BR-6 | Logs must be queryable by: user, action type, entity type, project, and date range. |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | When a work item is created, updated, status-changed, or deleted, an audit log entry is persisted with userId, action, entity=WORK_ITEM, entityId, entityTitle, and projectId. |
| AC-2 | When a sprint is created, activated, updated, or deleted, an audit log entry is persisted. |
| AC-3 | When a project member is added, removed, or has their role changed, an audit log entry is persisted. |
| AC-4 | When a user logs in successfully, an audit log entry with action=LOGIN is persisted. |
| AC-5 | When a user updates their profile (name / email / password / photo), an audit log entry is persisted. |
| AC-6 | `GET /audit-logs` returns paginated logs; SUPER_USER and ADMIN receive all logs; EMPLOYEE receives only their own. |
| AC-7 | The endpoint supports query filters: `userId`, `action`, `entity`, `projectId`, `startDate`, `endDate`, `page`, `limit`. |
| AC-8 | The frontend renders an **Activity Log** page at `/activity` accessible from the sidebar (Admin/Super User only). |
| AC-9 | EMPLOYEE users can view their own recent activity from a "My Activity" section (last 50 entries, no filters needed). |
| AC-10 | Each log row displays: actor avatar + name, human-readable action description, entity link (if applicable), relative timestamp ("2 mins ago"), and absolute timestamp on hover. |

---

## Out of Scope

- Real-time push notifications on new log entries (deferred to F-035 / Socket.io phase)
- Exporting audit logs to CSV (future enhancement)
- Logging read/view actions (only write/mutate actions are logged)
- Log retention policy / purging (infrastructure concern)
- Logging third-party API calls

---

## Dependencies

| Dependency | Status |
|-----------|--------|
| F-033 — ProjectRoleGuard | Done — guards already in place |
| JWT Auth (userId in token) | Done |
| Prisma / PostgreSQL | Done |

---

## Database / Schema Design

### New Model: `AuditLog`

```prisma
model AuditLog {
  id           String      @id @default(uuid())
  userId       String
  action       AuditAction
  entity       AuditEntity
  entityId     String?     @db.VarChar(100)
  entityTitle  String?     @db.VarChar(300)
  projectId    String?
  metadata     Json?
  ipAddress    String?     @db.VarChar(45)
  createdAt    DateTime    @default(now())

  user    User     @relation("UserAuditLogs", fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation("ProjectAuditLogs", fields: [projectId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([entity])
  @@index([projectId])
  @@index([createdAt])
  @@map("audit_logs")
}

enum AuditAction {
  // Auth
  LOGIN

  // Work Items
  WORK_ITEM_CREATED
  WORK_ITEM_UPDATED
  WORK_ITEM_STATUS_CHANGED
  WORK_ITEM_DELETED
  WORK_ITEM_ASSIGNED

  // Sprints
  SPRINT_CREATED
  SPRINT_UPDATED
  SPRINT_ACTIVATED
  SPRINT_DELETED

  // Project Members
  MEMBER_ADDED
  MEMBER_REMOVED
  MEMBER_ROLE_CHANGED

  // Profile
  PROFILE_UPDATED
}

enum AuditEntity {
  AUTH
  WORK_ITEM
  SPRINT
  PROJECT_MEMBER
  USER_PROFILE
}
```

### Migration

Required — adds `audit_logs` table and two new enums (`AuditAction`, `AuditEntity`).

---

## API Contract

### GET /audit-logs

**Auth:** JWT required  
**RBAC:** SUPER_USER / ADMIN → all logs; EMPLOYEE → own logs only (userId forced to req.user.id)

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| userId | string (UUID) | Filter by actor |
| action | AuditAction | Filter by action type |
| entity | AuditEntity | Filter by entity type |
| projectId | string (UUID) | Filter by project |
| startDate | ISO date string | From date (inclusive) |
| endDate | ISO date string | To date (inclusive) |
| page | number (default: 1) | Pagination page |
| limit | number (default: 20, max: 100) | Items per page |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "user": { "id": "uuid", "fullName": "Alice Smith", "profilePhoto": null },
      "action": "WORK_ITEM_CREATED",
      "entity": "WORK_ITEM",
      "entityId": "uuid",
      "entityTitle": "HOR10005 — Fix login bug",
      "projectId": "uuid",
      "metadata": {},
      "createdAt": "2026-06-03T10:30:00.000Z"
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

### POST /audit-logs (internal service only — not a public endpoint)

The `AuditLogService.log()` method is called from other services/interceptors. No public POST endpoint.

---

## Logging Integration Points

| Where logged | Service / File | Action(s) logged |
|-------------|---------------|-----------------|
| Work item create | `work-items.service.ts` → `create()` | `WORK_ITEM_CREATED` |
| Work item update | `work-items.service.ts` → `update()` | `WORK_ITEM_UPDATED` |
| Work item move (status change) | `work-items.service.ts` → `move()` | `WORK_ITEM_STATUS_CHANGED` |
| Work item delete | `work-items.service.ts` → `remove()` | `WORK_ITEM_DELETED` |
| Sprint create | `sprints.service.ts` → `create()` | `SPRINT_CREATED` |
| Sprint activate | `sprints.service.ts` → `setActive()` | `SPRINT_ACTIVATED` |
| Sprint update | `sprints.service.ts` → `update()` | `SPRINT_UPDATED` |
| Sprint delete | `sprints.service.ts` → `remove()` | `SPRINT_DELETED` |
| Member add | `project-members.service.ts` → `addMember()` | `MEMBER_ADDED` |
| Member remove | `project-members.service.ts` → `removeMember()` | `MEMBER_REMOVED` |
| Member role change | `project-members.service.ts` → `updateRole()` | `MEMBER_ROLE_CHANGED` |
| Login | `auth.service.ts` → `login()` | `LOGIN` |
| Profile update | `users.service.ts` → `updateProfile()` | `PROFILE_UPDATED` |

---

## Frontend Design

### Route: `/activity` (Admin / Super User only)

**Page: Activity Log**

- Sidebar entry under Admin section
- Full-width log feed with filters at top:
  - User dropdown (searchable)
  - Action type dropdown
  - Entity type dropdown
  - Project dropdown
  - Date range picker (start / end)
  - Clear filters button
- Each row shows:
  - Avatar + name (linked to user profile)
  - Action sentence: `"Alice created work item HOR10005 — Fix login bug"`
  - Project badge (if applicable)
  - Relative time (`2 mins ago`) + absolute on hover
- Infinite scroll or pagination (20 per page)
- Empty state: "No activity found matching your filters"

### My Activity (Employee — in Profile / Settings area)

- Simple list of last 50 of the user's own actions
- No filters required
- Accessible from the gear dropdown → "My Activity"

---

## RBAC Summary

| Role | Can see | Filters available |
|------|---------|------------------|
| SUPER_USER | All users' logs | All filters |
| ADMIN | All users' logs | All filters |
| EMPLOYEE | Own logs only | None (implicit userId filter) |

---

## Non-Functional Requirements

- Log write must be fire-and-forget (non-blocking) — use `setImmediate` or async call without awaiting in the service so it never slows down the main request
- Log entries must survive even if the calling service method fails (best-effort logging)
- Index on `createdAt` DESC for fast pagination
- Index on `userId`, `entity`, `projectId` for filter queries
