# REQ-F-033 — Project Role-Based Access Control (RBAC)

**Feature ID:** F-033  
**Epic:** PMS  
**Author:** Yogesh Lolage  
**Date:** 2026-06-03  
**Status:** Draft  

---

## 1. User Story

> As a **Project Manager**, I want feature access within a project to be governed by project roles, so that only authorised members can perform sensitive actions (delete, manage sprints, invite members, etc.) while all roles can still read and contribute to work they are responsible for.

---

## 2. Background

The system has two layers of roles:

| Layer | Enum | Used for |
|-------|------|----------|
| **System Role** | `SUPER_USER`, `ADMIN`, `EMPLOYEE` | Portal-wide access (settings, user management) |
| **Project Role** | `PROJECT_MANAGER`, `TEAM_LEAD`, `DEVELOPER`, `QA`, `DESIGNER`, `DEVOPS` | Per-project feature access |

`ProjectRoleGuard` already exists and is partially applied. This feature completes and standardises its application across all project-scoped features.

**Rule:** `SUPER_USER` and `ADMIN` always bypass project-role checks (already implemented in the guard).

---

## 3. Business Requirements

| ID | Requirement |
|----|-------------|
| BR-1 | Every mutating action on a project resource must be guarded by a project role |
| BR-2 | Read access to project resources is available to all project members regardless of role |
| BR-3 | KPI and Reports pages are accessible to all roles but data is scoped to the user's role |
| BR-4 | `SUPER_USER` and `ADMIN` system roles bypass all project-role checks |
| BR-5 | A user with no project membership cannot access any project resource |
| BR-6 | Role restrictions must be enforced at the API level, not only the frontend |

---

## 4. RBAC Matrix

### 4.1 Work Items

| Action | PM | TL | Developer | QA | Designer | DevOps |
|--------|----|----|-----------|-----|----------|--------|
| View board / list | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create work item | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update work item | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Move work item (status) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete work item | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add / delete comment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload / delete attachment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Log time (timesheet entry) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 4.2 Sprints

| Action | PM | TL | Developer | QA | Designer | DevOps |
|--------|----|----|-----------|-----|----------|--------|
| View sprints | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create sprint | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit sprint | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Activate sprint | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete sprint | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4.3 Milestones

| Action | PM | TL | Developer | QA | Designer | DevOps |
|--------|----|----|-----------|-----|----------|--------|
| View milestones | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create milestone | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit milestone | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete milestone | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4.4 Project Members

| Action | PM | TL | Developer | QA | Designer | DevOps |
|--------|----|----|-----------|-----|----------|--------|
| View members | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add member | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Change member role | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Remove member | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4.5 Task Allocations

| Action | PM | TL | Developer | QA | Designer | DevOps |
|--------|----|----|-----------|-----|----------|--------|
| View allocations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create allocation | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit allocation | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete allocation | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### 4.6 KPI & Reports (Data Scoping — not access control)

| Role | Sees |
|------|------|
| PROJECT_MANAGER | All team members' data for their projects |
| TEAM_LEAD | All team members' data for their projects |
| DEVELOPER | Own data only |
| QA | Own data only |
| DESIGNER | Own data only |
| DEVOPS | Own data only |

### 4.7 Board Column Configuration

| Action | PM | TL | Developer | QA | Designer | DevOps |
|--------|----|----|-----------|-----|----------|--------|
| View column config | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update column config | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-1 | A `DEVELOPER` or `QA` calling `DELETE /work-items/:id` receives `403 Forbidden` |
| AC-2 | A `DEVELOPER` calling `POST /projects/:id/sprints` receives `403 Forbidden` |
| AC-3 | A `QA` calling `DELETE /sprints/:id` receives `403 Forbidden` |
| AC-4 | A `DEVELOPER` calling `POST /project-members` receives `403 Forbidden` |
| AC-5 | A `PROJECT_MANAGER` can perform all actions in the RBAC matrix |
| AC-6 | An `ADMIN` system role bypasses all project-role checks |
| AC-7 | A user with no project membership receives `403 Forbidden` on any project resource |
| AC-8 | GET (read) endpoints remain accessible to all project members |
| AC-9 | KPI/Reports API returns full team data for `PROJECT_MANAGER`/`TEAM_LEAD`, own data for others |
| AC-10 | Frontend hides action buttons (Delete, Manage Sprint, Add Member) for roles that lack permission |

---

## 6. Out of Scope

- System-level role management (already handled by `RolesGuard`)
- User creation / deletion (handled in User Management — admin only)
- Audit logging of role changes (F-034)

---

## 7. Database / Schema Design

No schema changes required. The `ProjectMember` model with `projectRole: ProjectRole` already exists.

```prisma
model ProjectMember {
  id          String      @id @default(uuid())
  projectId   String
  userId      String
  projectRole ProjectRole   // existing field — drives all access decisions
  joinedAt    DateTime    @default(now())
}
```

---

## 8. API Contract Design

No new endpoints. All changes are guard additions on existing endpoints.

### Guards to add / update

| Endpoint | Current | Required |
|----------|---------|----------|
| `DELETE /work-items/:id` | `PROJECT_MANAGER` only | `PROJECT_MANAGER`, `TEAM_LEAD` |
| `POST /projects/:id/work-items` | None | All project members (membership check only) |
| `PATCH /work-items/:id` | None | All project members (membership check only) |
| `PATCH /work-items/:id/move` | None | All project members (membership check only) |
| `DELETE /sprints/:id` | `PROJECT_MANAGER`, `TEAM_LEAD` | `PROJECT_MANAGER` only |
| `POST /project-members` | `ADMIN`/`SUPER_USER` system role | Add `PROJECT_MANAGER` project role |
| `PATCH /project-members/:id` | `ADMIN`/`SUPER_USER` system role | Add `PROJECT_MANAGER` project role |
| `DELETE /project-members/:id` | `ADMIN`/`SUPER_USER` system role | Add `PROJECT_MANAGER` project role |
| `POST /projects/:id/milestones` | `PROJECT_MANAGER`, `TEAM_LEAD` | No change |
| `PATCH /milestones/:id` | `PROJECT_MANAGER`, `TEAM_LEAD` | No change |
| `DELETE /milestones/:id` | `PROJECT_MANAGER` only | No change |
| `GET /analytics/kpi` | All authenticated | Scope data by project role |
| All report endpoints | All authenticated | Scope data by project role |

### KPI / Reports scoping logic

```
if systemRole in [SUPER_USER, ADMIN] → return all users' data
if projectRole in [PROJECT_MANAGER, TEAM_LEAD] → return all project members' data
else → return only req.user.id data
```

---

## 9. Dependencies

- `ProjectRoleGuard` (already implemented — `src/common/guards/project-role.guard.ts`)
- `@ProjectRoles()` decorator (already implemented)
- `@ProjectIdFrom()` decorator (already implemented)
- Analytics / KPI services (existing — need query parameter scoping)

---

## 10. Migration

**Not required** — no schema changes.
