# REQ-F-029 — Kanban Board Enhancements

**Feature ID:** F-029  
**Feature Name:** Kanban Board Enhancements  
**Epic:** PMS  
**Author:** Yogesh Lolage  
**Date:** 2026-06-01  
**Status:** Implemented  
**Branch:** `feature/F-029-kanban-board-enhancements`

---

## 1. User Story

As a **project team member**, I want the Kanban board to support an extended QA workflow (Ready for QA → In QA → QA Done), configurable column labels, milestone-scoped filters, a Product Backlog toggle, Definition of Done on user stories, test cases with bug creation, clickable client names, a client filter on the projects list, bulk team add by department, and a global API loading indicator — so that the board reflects our real sprint and QA process and the UI feels faster and more responsive.

---

## 2. Business Requirements

| BR-ID | Requirement |
|-------|-------------|
| BR-1 | Replace the legacy `QA` board status with `READY_FOR_QA`; add new `IN_QA` column between Ready for QA and QA Done. |
| BR-2 | Column headers must remain visible (sticky) while cards scroll within each column. |
| BR-3 | Project managers can configure custom labels for each board column per project. |
| BR-4 | The board toolbar must include a milestone filter that narrows the sprint dropdown to sprints belonging to the selected milestone. |
| BR-5 | A toggle allows switching between "All", "Sprint Backlog", and "Product Backlog" views. |
| BR-6 | User Story work items must have a Definition of Done text field. |
| BR-7 | User Story work items must have a Test Cases tab for creating and managing test cases (title, steps, expected result, actual result, status). |
| BR-8 | When a test case is marked FAILED, a "Create Bug" shortcut pre-fills a new Bug work item with the test case title and steps. |
| BR-9 | Client names on the Clients page must be clickable links that navigate to the Projects page pre-filtered to that client. |
| BR-10 | The Projects page must have a client filter dropdown. |
| BR-11 | The Add Team Member modal must support adding members by department (multi-select). |
| BR-12 | A global progress bar at the top of the page must be visible whenever any API call (fetch or mutation) is in flight. |

---

## 3. Acceptance Criteria

| AC-ID | Criterion |
|-------|-----------|
| AC-1 | Kanban board shows `READY_FOR_QA`, `IN_QA`, and `QA_DONE` columns; `QA` status is migrated to `READY_FOR_QA` in the database. |
| AC-2 | Column headers stay visible while cards in that column scroll; no header scrolls off screen. |
| AC-3 | A "Columns" pencil icon button in the board header opens an edit modal where each column label can be customised and saved per project. |
| AC-4 | The board toolbar shows a Milestone dropdown; selecting a milestone filters the Sprint dropdown to that milestone's sprints only. |
| AC-5 | The board toolbar shows All / Sprint Backlog / Product Backlog toggle; selecting "Product Backlog" loads work items with no sprint assigned; selecting "Sprint Backlog" enables the sprint dropdown; All shows everything. |
| AC-6 | A User Story's work item modal has a "Definition of Done" textarea below the Description; changes are saved on blur. |
| AC-7 | A User Story's work item modal has a "Test Cases" activity tab listing all test cases; new test cases can be added with title, preconditions, steps, and expected result. |
| AC-8 | Each test case supports recording an actual result and changing its status (NOT_RUN / PASSED / FAILED / BLOCKED). |
| AC-9 | A FAILED test case shows a "+ Bug" button; clicking it opens the Create Work Item modal pre-filled with the test title and steps. |
| AC-10 | Each client name on the Clients page is a link that opens the Projects page and pre-selects that client in the filter. |
| AC-11 | The Projects page client dropdown filters the displayed project cards; selecting "All clients" or clearing clears the filter. |
| AC-12 | The Add Member modal has an "Add by Department" tab; selecting a department shows available users; checkboxes and "Select all" allow bulk selection; submit adds all selected members with a shared role. |
| AC-13 | A thin progress bar appears at the top of every page during any active API fetch or mutation and disappears when all calls complete. |

---

## 4. Dependencies

- `@tanstack/react-query` — `useIsFetching`, `useIsMutating` (Group 6)
- `@hello-pangea/dnd` — drag-and-drop on the Kanban board (existing)
- Prisma PostgreSQL — schema changes for `BoardStatus` enum, `TestCase` model, `BoardColumnConfig` model, `definitionOfDone` field
- Existing `departmentsApi`, `projectsApi`, `clientsApi`, `boardColumnConfigsApi`, `testCasesApi`

---

## 5. Out of Scope

- Real-time board updates via WebSocket
- Automated test execution or CI integration for test cases
- Exporting test case results to PDF/CSV
- Custom column ordering (only labels are configurable)

---

## 6. DB / Schema Design

### 6.1 `BoardStatus` Enum Extension

```prisma
enum BoardStatus {
  TODO
  IN_PROGRESS
  BLOCKED
  IN_REVIEW
  READY_FOR_QA   // renamed from QA
  IN_QA          // new
  QA_DONE
  QA             // kept for backward compatibility; data migrated to READY_FOR_QA
}
```

**Migration SQL (data):**
```sql
UPDATE work_items SET status = 'READY_FOR_QA' WHERE status = 'QA';
```

### 6.2 `WorkItem` — New Field

```prisma
definitionOfDone String? @db.VarChar(3000)
```

### 6.3 `TestCase` Model (new)

```prisma
model TestCase {
  id             String         @id @default(uuid())
  workItemId     String
  title          String         @db.VarChar(300)
  preconditions  String?        @db.VarChar(1000)
  steps          String         @db.VarChar(3000)
  expectedResult String         @db.VarChar(1000)
  actualResult   String?        @db.VarChar(1000)
  status         TestCaseStatus @default(NOT_RUN)
  createdById    String
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  workItem  WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  createdBy User     @relation("CreatedTestCases", fields: [createdById], references: [id])
  @@index([workItemId])
  @@map("test_cases")
}

enum TestCaseStatus {
  NOT_RUN
  PASSED
  FAILED
  BLOCKED
}
```

### 6.4 `BoardColumnConfig` Model (new)

```prisma
model BoardColumnConfig {
  id        String      @id @default(uuid())
  projectId String
  status    BoardStatus
  label     String      @db.VarChar(100)
  updatedAt DateTime    @updatedAt
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@unique([projectId, status])
  @@index([projectId])
  @@map("board_column_configs")
}
```

---

## 7. API Contract

### Board Column Configs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/board-column-configs/:projectId` | JWT | List custom column labels for a project |
| PUT | `/board-column-configs/:projectId` | JWT | Upsert all column labels for a project |

**PUT body:**
```json
[{ "status": "READY_FOR_QA", "label": "QA Ready" }, ...]
```

### Test Cases

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/work-items/:workItemId/test-cases` | JWT | List test cases for a work item |
| POST | `/work-items/:workItemId/test-cases` | JWT | Create a new test case |
| PATCH | `/test-cases/:id` | JWT | Update test case fields |
| DELETE | `/test-cases/:id` | JWT | Delete test case (204) |

**POST/PATCH body:**
```json
{
  "title": "Login with valid credentials",
  "preconditions": "User account exists",
  "steps": "1. Navigate to /login\n2. Enter credentials\n3. Submit",
  "expectedResult": "User is redirected to dashboard",
  "actualResult": "As expected",
  "status": "PASSED"
}
```

### Work Items — milestoneId filter

Added `milestoneId` query parameter to `GET /work-items?projectId=&milestoneId=` — filters by sprint's milestone.

---

## 8. Migration Status

**Required.** Schema changed via `npx prisma db push` (local). Production applies via `npx prisma migrate deploy` on Render deploy.

Changes:
- `BoardStatus` enum: added `READY_FOR_QA`, `IN_QA`
- `WorkItem`: added `definitionOfDone` field
- New tables: `test_cases`, `board_column_configs`
- Data migration: `UPDATE work_items SET status = 'READY_FOR_QA' WHERE status = 'QA'`
