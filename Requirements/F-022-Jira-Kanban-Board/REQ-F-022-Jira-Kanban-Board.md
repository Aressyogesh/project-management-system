# REQ-F-022 — JIRA-like Kanban Board

**Date:** 2026-05-28
**Author:** Yogesh Lolage
**Status:** Approved

---

## 1. User Story

> As a project team member, I want a JIRA-style Kanban board per project so that I can create, track, and move work items (Epics, User Stories, Tasks, Sub Tasks, Bugs) across defined workflow columns, log time against tasks, and have all work data captured for KPI and reporting.

---

## 2. Business Requirements

| ID | Requirement |
|----|-------------|
| BR-1 | Board is project-contextual — accessed by clicking a project from the Projects list |
| BR-2 | Supports 5 work item types: Epic, User Story, Task, Sub Task, Bug |
| BR-3 | Six Kanban columns: TO DO → IN PROGRESS → BLOCKED → IN REVIEW → QA → QA DONE |
| BR-4 | Cards are drag-and-drop between columns |
| BR-5 | JIRA-equivalent fields on each item (see Section 6) |
| BR-6 | Sprint management: PM/Admin can create, edit, activate sprints per project |
| BR-7 | Time logging: any project member can log hours against a work item assigned to them |
| BR-8 | RBAC: Epic/Story creation restricted to PM/TL/Admin; Task/SubTask/Bug creation open to all project members |
| BR-9 | Bug items have additional fields: severity, classification, environment, steps to reproduce |
| BR-10 | Parent-child hierarchy: Epic → User Story → Task → Sub Task |
| BR-11 | Filters: by type, sprint, assignee, priority; full-text search |
| BR-12 | Navigation: sidebar Allocations/Timesheets/Bugs entries removed; board accessed via Projects |
| BR-13 | KPI tracking fields auto-captured: completedAt (when status→QA_DONE), reopenCount (backward moves) |
| BR-14 | All work item data feeds the F-023 dynamic KPI and Reports feature |

---

## 3. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | Clicking a project card navigates to `/projects/:id/board` showing 6 Kanban columns |
| AC-2 | ADMIN/PM/TL can create all 5 item types; DEV/QA/DESIGNER/DEVOPS can create Task/SubTask/Bug only |
| AC-3 | Dragging a card between columns persists the new status in DB |
| AC-4 | Moving a card to QA_DONE sets `completedAt` timestamp; moving backward increments `reopenCount` |
| AC-5 | Work item detail modal has 5 tabs: Details, Log Time, Comments, Attachments, Child Items |
| AC-6 | Log Time tab: employee logs date/hours/description; all entries summed and shown as total logged hours |
| AC-7 | Sprint selector in toolbar filters board to show only items in selected sprint |
| AC-8 | Type filter chips (Epic/Story/Task/SubTask/Bug) correctly filter visible cards |
| AC-9 | Bug items show severity, classification, environment, and steps-to-reproduce fields |
| AC-10 | SubTask parentId cannot reference an Epic (validated backend) |
| AC-11 | PM/Admin can create/edit/activate sprints from SprintManager panel |
| AC-12 | Sidebar no longer shows Allocations, Timesheets, or Bugs nav items |
| AC-13 | EMPLOYEE role sees own project boards; ADMIN/SUPER_USER sees all projects |

---

## 4. Dependencies

- F-001 through F-021 complete (auth, projects, RBAC, users all in place)
- `ProjectRoleGuard` and `@ProjectIdFrom` decorator in `backend/src/common/guards/`
- Existing `ProjectMember` model for project-role lookups
- `@hello-pangea/dnd` package (to be installed)

---

## 5. Out of Scope (F-022)

- Making KPI and Reports dynamic (F-023)
- Timesheet approval workflow
- Sprint burndown charts
- GitHub/GitLab PR integration
- Email notifications

---

## 6. DB Schema Design

### New Enums
```prisma
enum WorkItemType    { EPIC USER_STORY TASK SUB_TASK BUG }
enum BoardStatus     { TODO IN_PROGRESS BLOCKED IN_REVIEW QA QA_DONE }
enum BugSeverity     { BLOCKER CRITICAL MAJOR MINOR TRIVIAL }
enum BugClassification { UI_USABILITY NEW_BUG ENHANCEMENT PERFORMANCE OTHER }
```

### New Tables

| Table | Key Fields |
|-------|-----------|
| `sprints` | id, projectId, name, goal, startDate, endDate, isActive |
| `work_items` | id, projectId, parentId, sprintId, type, status, title, description, priority, assigneeId, reporterId, storyPoints, estimatedHours, labels[], components[], fixVersion, severity, bugClassification, environment, stepsToRepro, completedAt, reopenCount, position, startDate, dueDate |
| `timesheet_entries` | id, workItemId, userId, date, hours, description |
| `work_item_comments` | id, workItemId, content, authorId |
| `work_item_attachments` | id, workItemId, filename, originalName, mimeType, size, uploadedById |
| `kpi_records` | id, userId, period, metricId, points, notes, enteredById |
| `leave_logs` | id, userId, date, type, description |
| `learning_logs` | id, userId, period, topic, hours, description |
| `innovation_logs` | id, userId, period, title, impact, type |

---

## 7. API Contract Design

### Sprint Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:id/sprints` | Project member | List sprints for project |
| POST | `/projects/:id/sprints` | PM/TL/Admin | Create sprint |
| PATCH | `/sprints/:id` | PM/TL/Admin | Update sprint (name, goal, dates, isActive) |
| DELETE | `/sprints/:id` | PM/Admin | Delete sprint |

### Work Item Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:id/work-items` | Project member | Board data with filters |
| POST | `/projects/:id/work-items` | PM/TL/Admin/DEV (type-gated) | Create item |
| GET | `/work-items/:id` | Project member | Full detail |
| PATCH | `/work-items/:id` | PM/TL/Admin; own item for DEV | Edit fields |
| PATCH | `/work-items/:id/move` | Any project member | Status + position change |
| DELETE | `/work-items/:id` | PM/Admin/SuperUser | Delete item + children |
| POST | `/work-items/:id/comments` | Any project member | Add comment |
| DELETE | `/work-items/:id/comments/:cid` | Author/Admin | Delete comment |
| POST | `/work-items/:id/attachments` | PM/TL/Admin | Upload file |
| GET | `/work-items/:id/attachments/:fid` | Project member | Download file |
| DELETE | `/work-items/:id/attachments/:fid` | Author/Admin | Delete file |

### Timesheet Entry Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/work-items/:id/timesheet-entries` | Assigned member | Log time |
| GET | `/work-items/:id/timesheet-entries` | Project member | List entries |
| PATCH | `/timesheet-entries/:id` | Author only | Edit entry |
| DELETE | `/timesheet-entries/:id` | Author/PM/Admin | Delete entry |

---

## 8. Migration Status

**Required** — 9 new tables, 4 new enums. Run `npx prisma db push` locally.
