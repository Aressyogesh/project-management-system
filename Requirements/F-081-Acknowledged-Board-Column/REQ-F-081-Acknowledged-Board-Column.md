# REQ-F-081 — Acknowledged Board Column

```
Feature ID   : F-081
Feature Name : Acknowledged Board Column
Epic         : PMS — Kanban Board
Priority     : Medium
Roles        : All project members (view + move); all roles can transition items to/from ACKNOWLEDGED
```

---

## User Story

As a project team member, I want an **Acknowledged** column on the Kanban board positioned between QA Done and Closed, so that the team can explicitly signal that reported issues have been noted and are queued for resolution — without marking them as closed or impacting any KPI calculations.

---

## Business Rules

**BR-1:** `ACKNOWLEDGED` must be added as a valid value of the `BoardStatus` PostgreSQL enum. The addition is non-destructive (additive `ALTER TYPE … ADD VALUE`).

**BR-2:** The `ACKNOWLEDGED` status must be positioned between `QA_DONE` and `CLOSED` in all ordering sequences (`STATUS_ORDER` array, `STATUS_RANK` map, `DEFAULT_BOARD_COLUMNS` array).

**BR-3:** `ACKNOWLEDGED` must **not** be added to `TERMINAL_STATUSES`. Moving a work item to `ACKNOWLEDGED` must never set `completedAt`, never count toward velocity/throughput KPIs, and never trigger the auto-close-parent logic.

**BR-4:** The overdue highlight and the age counter in list view must remain active for `ACKNOWLEDGED` items (same behaviour as any active status).

**BR-5:** Overdue reminder notifications must continue firing for items in `ACKNOWLEDGED` status.

**BR-6:** The status filter dropdown on the board toolbar must include `ACKNOWLEDGED` automatically (it is derived from `DEFAULT_BOARD_COLUMNS`).

**BR-7:** Drag-and-drop on the Kanban board must accept `ACKNOWLEDGED` as a valid destination column.

**BR-8:** The Excel export from list view must display `Acknowledged` (human label) in the Status column for such items.

---

## Acceptance Criteria

**AC-1:** The `ACKNOWLEDGED` value exists in the `BoardStatus` Prisma enum and is applied to the database via a migration.

**AC-2:** The board displays an `Acknowledged` column between `QA Done` and `Closed`; work items can be dragged into and out of it.

**AC-3:** The status filter dropdown includes `Acknowledged` as a selectable option and correctly filters the board/list to show only acknowledged items.

**AC-4:** List view displays `Acknowledged` items with an orange badge (`bg-orange-100 text-orange-700`), sorts them correctly between QA Done and Closed, and the age counter is visible (not suppressed).

**AC-5:** Moving a work item to `ACKNOWLEDGED` does not set `completedAt`, does not increment any KPI "done" counter, and does not auto-close any parent item.

**AC-6:** The Excel export includes `Acknowledged` as the label in the Status column for items in `ACKNOWLEDGED` status.

**AC-7:** Items in `ACKNOWLEDGED` status are highlighted as overdue (red row) in list view when their due date is past — same as any active status.

**AC-8:** The `STATUS_ORDER` in the backend service places `ACKNOWLEDGED` at index 7 (after `QA_DONE`, before `CLOSED`), so forward/backward transition validation is correct.

---

## Dependencies

- `BoardStatus` enum in `backend/prisma/schema.prisma`
- `STATUS_ORDER` and `TERMINAL_STATUSES` in `backend/src/work-items/work-items.service.ts`
- `DEFAULT_BOARD_COLUMNS` and `BoardStatus` type in `frontend/src/features/board/types/board.types.ts`
- `STATUS_STYLES`, `STATUS_LABELS`, `STATUS_RANK` in `frontend/src/features/board/components/ListView.tsx`
- Existing Prisma migration toolchain (`npx prisma migrate dev`)

---

## Out of Scope

- Any change to KPI scoring, velocity, throughput, or milestone completion calculations.
- Any change to the `BugStatus` enum (which already has an unrelated `ACKNOWLEDGED` value).
- Adding `ACKNOWLEDGED` to `TERMINAL_STATUSES` (explicitly excluded).
- Changes to notification reminder logic — items in `ACKNOWLEDGED` continue receiving reminders unchanged.
- Any new backend endpoint (status transition uses the existing `PATCH /work-items/:id` endpoint).

---

## Database / Schema Design (Step 4)

### Modified Enum

```
Enum         : BoardStatus
Change       : Add value ACKNOWLEDGED between QA_DONE and CLOSED
Before       : TODO | IN_PROGRESS | BLOCKED | IN_REVIEW | READY_FOR_QA | IN_QA | QA_DONE | CLOSED | QA
After        : TODO | IN_PROGRESS | BLOCKED | IN_REVIEW | READY_FOR_QA | IN_QA | QA_DONE | ACKNOWLEDGED | CLOSED | QA
```

PostgreSQL `ALTER TYPE … ADD VALUE` is non-destructive. Existing rows are unaffected.

### Migration

```
Name    : add_acknowledged_board_status
Command : npx prisma migrate dev --name add_acknowledged_board_status
          (run from backend/ directory)
```

No new tables, no new columns, no relationship changes.

---

## API Contract Design (Step 5)

No new endpoints. `ACKNOWLEDGED` is a valid value for the existing `status` field on work items. All existing endpoints that accept or return `status: BoardStatus` automatically support the new value once the enum is extended.

### Affected endpoints (no signature change — value set extended only)

```
PATCH  /work-items/:id
  Body field  : status  (BoardStatus)
  Change      : ACKNOWLEDGED now accepted as a valid value
  Auth        : JWT required; project member

GET    /projects/:id/board
  Response field : items[].status  (BoardStatus)
  Change         : ACKNOWLEDGED may now appear in results

GET    /projects/:id/board (with ?status=ACKNOWLEDGED filter)
  Change : filter now returns items in ACKNOWLEDGED status
```

### Validation

The existing `MoveWorkItemDto` / `UpdateWorkItemDto` uses `@IsEnum(BoardStatus)` — it will accept `ACKNOWLEDGED` automatically once the Prisma enum is updated and `@prisma/client` is regenerated.
