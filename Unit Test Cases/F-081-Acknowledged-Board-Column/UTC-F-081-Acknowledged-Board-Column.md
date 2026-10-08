# UTC-F-081 — Acknowledged Board Column — Unit Test Cases

Feature ID   : F-081
Feature Name : Acknowledged Board Column
Framework    : Jest (backend — NestJS) + Vitest / React Testing Library (frontend)

---

## Backend Unit Tests

---

### UTC-F081-B-001

```
Unit Test ID : UTC-F081-B-001
Title        : StatusOrder_AcknowledgedPresent_PlacedBetweenQaDoneAndClosed
Layer        : Backend — WorkItemsService
Class / File : backend/src/work-items/work-items.service.spec.ts
AC Covered   : AC-8
Framework    : Jest

Arrange:
  - Import STATUS_ORDER (or expose via a getter / inspect the constant)

Act:
  - Find index of BoardStatus.ACKNOWLEDGED in STATUS_ORDER
  - Find index of BoardStatus.QA_DONE in STATUS_ORDER
  - Find index of BoardStatus.CLOSED in STATUS_ORDER

Assert:
  - indexOf(ACKNOWLEDGED) > indexOf(QA_DONE)
  - indexOf(ACKNOWLEDGED) < indexOf(CLOSED)
  - indexOf(ACKNOWLEDGED) === 7
```

---

### UTC-F081-B-002

```
Unit Test ID : UTC-F081-B-002
Title        : TerminalStatuses_AcknowledgedAbsent_NotTerminal
Layer        : Backend — WorkItemsService
Class / File : backend/src/work-items/work-items.service.spec.ts
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - Import or inspect TERMINAL_STATUSES set

Act:
  - Call TERMINAL_STATUSES.has(BoardStatus.ACKNOWLEDGED)

Assert:
  - Result is false
```

---

### UTC-F081-B-003

```
Unit Test ID : UTC-F081-B-003
Title        : MoveWorkItem_ToAcknowledged_DoesNotSetCompletedAt
Layer        : Backend — WorkItemsService
Class / File : backend/src/work-items/work-items.service.spec.ts
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.findUnique → returns item with status IN_QA, completedAt null
  - Mock PrismaService.workItem.update → capture the data argument
  - Mock NotificationsService, AuditLogsService, AutomationService

Act:
  - Call workItemsService.moveWorkItem(itemId, { status: BoardStatus.ACKNOWLEDGED }, mockUser)

Assert:
  - The update call's data argument does NOT include completedAt field
  - PrismaService.workItem.update was called once
```

---

### UTC-F081-B-004

```
Unit Test ID : UTC-F081-B-004
Title        : MoveWorkItem_ToAcknowledged_DoesNotAutoCloseParent
Layer        : Backend — WorkItemsService
Class / File : backend/src/work-items/work-items.service.spec.ts
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - Mock item with status QA_DONE, parentId = 'parent-uuid'
  - Mock parent item with all children in QA_DONE/ACKNOWLEDGED
  - Mock PrismaService

Act:
  - Call workItemsService.moveWorkItem(itemId, { status: BoardStatus.ACKNOWLEDGED }, mockUser)

Assert:
  - Parent workItem.update was NOT called with status: CLOSED
  - Auto-close logic is not triggered (ACKNOWLEDGED is not terminal)
```

---

### UTC-F081-B-005

```
Unit Test ID : UTC-F081-B-005
Title        : GetBoardItems_WithAcknowledgedFilter_ReturnsOnlyAcknowledgedItems
Layer        : Backend — WorkItemsService
Class / File : backend/src/work-items/work-items.service.spec.ts
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.findMany → returns two items with status ACKNOWLEDGED
  - Filters object: { status: BoardStatus.ACKNOWLEDGED }

Act:
  - Call workItemsService.getBoardItems(projectId, filters)

Assert:
  - PrismaService.workItem.findMany called with where.status = ACKNOWLEDGED
  - Returned array has length 2
  - Both items have status ACKNOWLEDGED
```

---

## Frontend Unit Tests

---

### UTC-F081-F-001

```
Unit Test ID : UTC-F081-F-001
Title        : DefaultBoardColumns_ContainsAcknowledged_BetweenQaDoneAndClosed
Layer        : Frontend — board.types.ts
Class / File : frontend/src/features/board/types/board.types.test.ts (or in component test)
AC Covered   : AC-2
Framework    : Vitest

Arrange:
  - Import DEFAULT_BOARD_COLUMNS from board.types.ts

Act:
  - Find index of entry with status 'ACKNOWLEDGED'
  - Find index of entry with status 'QA_DONE'
  - Find index of entry with status 'CLOSED'

Assert:
  - ACKNOWLEDGED entry exists (index !== -1)
  - index(ACKNOWLEDGED) > index(QA_DONE)
  - index(ACKNOWLEDGED) < index(CLOSED)
  - entry.label === 'Acknowledged'
```

---

### UTC-F081-F-002

```
Unit Test ID : UTC-F081-F-002
Title        : StatusStyles_AcknowledgedEntry_HasOrangeClasses
Layer        : Frontend — ListView.tsx
Class / File : frontend/src/features/board/components/ListView.test.tsx
AC Covered   : AC-4
Framework    : Vitest + React Testing Library

Arrange:
  - Import STATUS_STYLES constant from ListView.tsx (or render the component
    with a mock item having status 'ACKNOWLEDGED')

Act:
  - Look up STATUS_STYLES['ACKNOWLEDGED']

Assert:
  - Value equals 'bg-orange-100 text-orange-700'
```

---

### UTC-F081-F-003

```
Unit Test ID : UTC-F081-F-003
Title        : StatusRank_AcknowledgedAt8_ClosedAt9
Layer        : Frontend — ListView.tsx
Class / File : frontend/src/features/board/components/ListView.test.tsx
AC Covered   : AC-4, AC-8
Framework    : Vitest

Arrange:
  - Import STATUS_RANK from ListView.tsx

Act:
  - Read STATUS_RANK['ACKNOWLEDGED']
  - Read STATUS_RANK['CLOSED']

Assert:
  - STATUS_RANK['ACKNOWLEDGED'] === 8
  - STATUS_RANK['CLOSED'] === 9
```

---

### UTC-F081-F-004

```
Unit Test ID : UTC-F081-F-004
Title        : StatusLabels_AcknowledgedEntry_ReturnsHumanLabel
Layer        : Frontend — ListView.tsx
Class / File : frontend/src/features/board/components/ListView.test.tsx
AC Covered   : AC-6
Framework    : Vitest

Arrange:
  - Import STATUS_LABELS from ListView.tsx

Act:
  - Read STATUS_LABELS['ACKNOWLEDGED']

Assert:
  - Value equals 'Acknowledged'
```

---

### UTC-F081-F-005

```
Unit Test ID : UTC-F081-F-005
Title        : AcknowledgedItem_NotInTerminalSet_ShowsAgeColumn
Layer        : Frontend — ListView.tsx
Class / File : frontend/src/features/board/components/ListView.test.tsx
AC Covered   : AC-4, AC-7
Framework    : Vitest + React Testing Library

Arrange:
  - Render ListView with one mock item:
      status: 'ACKNOWLEDGED'
      createdAt: 10 days ago
      dueDate: yesterday (overdue)

Act:
  - Query rendered table row

Assert:
  - Age cell is NOT empty (shows a day count)
  - Row has overdue highlight class (red background)
```

---

### UTC-F081-F-006

```
Unit Test ID : UTC-F081-F-006
Title        : BoardStatusType_IncludesAcknowledged
Layer        : Frontend — TypeScript compile-time check
Class / File : frontend/src/features/board/types/board.types.test.ts
AC Covered   : AC-1
Framework    : Vitest (type assertion)

Arrange:
  - Import BoardStatus type

Act:
  - Assign const s: BoardStatus = 'ACKNOWLEDGED'

Assert:
  - TypeScript compiles without error (no type error on assignment)
  - Runtime: s === 'ACKNOWLEDGED'
```
