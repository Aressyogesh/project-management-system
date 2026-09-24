# REQ-F-024 — JIRA Board Enhancement + Bug Management (Phase 9) + Leaves Management Rename

**Feature ID:** F-024  
**Branch:** feature/F-024-jira-board-bug-management  
**Epic:** PMS  
**Date:** 2026-05-29  
**Author:** Yogesh Lolage  

---

## 1. User Story

> As a project team member, I want to create and manage Epics, User Stories, Tasks, Sub-tasks, and Bugs on the JIRA-style Kanban board with full Phase 9 bug details (flag, reproducibility, build versions, status lifecycle, responsible developer), so that all work items are tracked end-to-end in the board and saved to the database for reporting and KPI computation.

---

## 2. Business Requirements

| ID | Requirement |
|----|------------|
| BR-1 | The Kanban board WorkItem modal must follow JIRA-style two-panel layout (main left panel + properties sidebar right) |
| BR-2 | Assignee field in the WorkItem modal must be an editable dropdown showing project members |
| BR-3 | Child items (Tasks, Sub-tasks, Bugs) must be creatable inline from within a User Story's Child Items tab |
| BR-4 | When creating a Task, Sub-task, or Bug, a parent selector must allow linking to an Epic or User Story |
| BR-5 | Bugs must include all Phase 9 fields: flag (Internal/External), reproducibility, module, responsible developer, billing status, build versions, reminder type, bug-specific 8-status lifecycle, full classification list |
| BR-6 | The "Task Lists", "Tasks", and "Task Allocations" sections must be removed from the Project Detail page; the Kanban board is the single source for work item management |
| BR-7 | "Leave & OT" must be renamed to "Leaves Management" in the Sidebar, Reports, and all UI labels application-wide |
| BR-8 | All work item data (including bug Phase 9 fields) must persist to the PostgreSQL/Supabase database |
| BR-9 | Settings Gear icon changes (Portal Config working days, business hours) must be reflected in capacity and timesheet modules |

---

## 3. Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-1 | User opens a Work Item on the board | The WorkItemModal renders | It shows a two-column JIRA layout: left panel (title, description, child items, comments) and right sidebar (status, assignee dropdown, reporter, sprint, story points, priority, due date, labels, parent) |
| AC-2 | User clicks Assignee field | Dropdown opens | It shows all project members with avatar + name; selecting one calls `PATCH /work-items/:id` with `assigneeId` |
| AC-3 | User views a User Story modal | Child Items tab is open | An inline "Add child" row with type selector (Task / Sub-task / Bug) and title input is present; submitting creates the child item linked to the Story |
| AC-4 | User creates a new Work Item from board toolbar | CreateWorkItemModal opens | When type is TASK, SUB_TASK, or BUG, a "Parent" dropdown appears showing all Epics and User Stories in the project |
| AC-5 | User creates a Bug work item | Bug creation form | It includes fields: Module, Bug Flag (Internal/External), Reproducibility, Responsible Developer, Billing Status, Affected Build Version, Fixed Build Version, Reminder, Release Milestone, Affected Milestone, Steps to Reproduce, Environment, plus Bug Status (8-value lifecycle) separate from the Kanban column |
| AC-6 | User views a Bug work item | Details panel renders | Bug-specific fields are grouped in a "Bug Details" section: Flag, Reproducibility, Module, Responsible Developer, Billing Status, Bug Status (lifecycle), Build Versions, Reminder, Milestones |
| AC-7 | User navigates to Project Detail page | Page renders | "Task Lists", "Tasks", and "Task Allocations" sections are absent; only Project Header, Team Members, and Milestones remain |
| AC-8 | User views Sidebar | Navigation renders | The nav item formerly "Leave & OT" now shows "Leaves Management" |
| AC-9 | User views Reports page | Any tab | No label reads "Leave & OT"; all references show "Leaves Management" |
| AC-10 | Bug is saved with all Phase 9 fields | POST/PATCH `/api/v1/work-items` | Response includes all new bug fields correctly persisted |

---

## 4. Out of Scope

- Dedicated standalone `/bugs` page (bugs live on the board)
- Reminder notification Socket.io gateway (notifications are a later phase)
- Leaves Management functional page (still shows "Coming Soon" — only label rename in scope)
- Timesheet approval workflow
- Settings reflection beyond label rename (Portal Config integration deferred)

---

## 5. Dependencies

- F-022 (JIRA Kanban Board) — WorkItem model, board API, WorkItemModal
- Prisma `WorkItem` model must be extended with Phase 9 bug fields
- `ProjectMember` list must be passed to WorkItemModal for assignee dropdown
- `Milestone` list must be available in board context for bug milestone selectors

---

## 6. DB / Schema Design

### 6.1 New Enums

```prisma
enum BugFlag {
  INTERNAL
  EXTERNAL
}

enum BugReproducibility {
  ALWAYS
  SOMETIMES
  RARELY
  UNABLE
  NEVER_TRIED
  NOT_APPLICABLE
}

enum BugReminderType {
  NONE
  DAILY
  ONE_DAY
  TWO_DAYS
  THREE_DAYS
}

enum BugStatus {
  OPEN
  REOPEN
  TO_BE_TESTED
  IN_PROGRESS
  CLOSED
  ACKNOWLEDGED
  DEFERRED
  ON_HOLD
}
```

### 6.2 Updated Enums

```prisma
// Extend BugSeverity (add SHOW_STOPPER, keep existing values)
enum BugSeverity {
  SHOW_STOPPER   // NEW
  BLOCKER        // kept for backward compat
  CRITICAL
  MAJOR
  MINOR
  TRIVIAL        // kept for backward compat
}

// Extend BugClassification with full Phase 9 values
enum BugClassification {
  SECURITY           // NEW
  CRASH_HANG         // NEW
  DATA_LOSS          // NEW
  PERFORMANCE
  UI_USABILITY
  OTHER_BUG          // NEW (replaces OTHER)
  OTHER              // kept for backward compat
  FEATURE_NEW        // NEW
  ENHANCEMENT
  DESIGN             // NEW
  NEW_BUG
  CODE_REVIEW        // NEW
  UNIT_TESTING       // NEW
  SUGGESTION         // NEW
  PROJECT_MANAGEMENT // NEW
  EXISTING_APPLICATION // NEW
}
```

### 6.3 WorkItem Model — New Optional Fields

```prisma
model WorkItem {
  // ... existing fields ...

  // Phase 9 Bug Management fields (all optional, only populated when type = BUG)
  bugFlag              BugFlag?
  bugReproducibility   BugReproducibility?
  bugStatus            BugStatus?          // separate 8-status lifecycle
  module               String?             @db.VarChar(100)
  responsibleUserId    String?
  billingStatus        BillingStatus?
  affectedBuildVersion String?             @db.VarChar(50)
  fixedBuildVersion    String?             @db.VarChar(50)
  reminderType         BugReminderType?    @default(NONE)
  releaseMilestoneId   String?
  affectedMilestoneId  String?

  // Relations (new)
  responsibleUser    User?      @relation("ResponsibleWorkItems", fields: [responsibleUserId], references: [id])
  releaseMilestone   Milestone? @relation("ReleaseMilestoneItems", fields: [releaseMilestoneId], references: [id])
  affectedMilestone  Milestone? @relation("AffectedMilestoneItems", fields: [affectedMilestoneId], references: [id])
}
```

**Migration:** All new fields are nullable with no defaults (except `reminderType` defaults to NONE). Migration is additive — no existing data is affected.

---

## 7. API Contract

### 7.1 Modified Endpoints

#### PATCH /api/v1/work-items/:id

Extended to accept all new Phase 9 bug fields:

```json
{
  "bugFlag": "INTERNAL",
  "bugReproducibility": "ALWAYS",
  "bugStatus": "OPEN",
  "module": "Authentication",
  "responsibleUserId": "uuid",
  "billingStatus": "BILLABLE",
  "affectedBuildVersion": "v1.2.3",
  "fixedBuildVersion": "v1.2.4",
  "reminderType": "ONE_DAY",
  "releaseMilestoneId": "uuid",
  "affectedMilestoneId": "uuid"
}
```

#### POST /api/v1/work-items (create)

Extended DTO includes all new fields as optional.

#### GET /api/v1/work-items/:id

Response now includes all Phase 9 fields plus expanded relations:
- `responsibleUser: { id, fullName, profilePhoto }`
- `releaseMilestone: { id, description }`
- `affectedMilestone: { id, description }`

### 7.2 No New Endpoints

All changes are extensions to the existing `work-items` module.
