# UTC-F-082 — Label Open Access and Label Search — Unit Test Cases

Feature ID   : F-082
Feature Name : Label Open Access and Label Search
Framework    : Jest (backend) + Vitest / React Testing Library (frontend)

---

## Backend Unit Tests

---

### UTC-F082-B-001

```
Unit Test ID : UTC-F082-B-001
Title        : GetBoardItems_SearchByExactLabel_ReturnsMatchingItems
Layer        : Backend — WorkItemsService
Class / File : backend/src/work-items/work-items.service.spec.ts
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.findMany returning two items labelled ['Need to check']
  - filters = { search: 'Need to check' }

Act:
  - Call workItemsService.getBoardItems(projectId, filters)

Assert:
  - PrismaService.workItem.findMany called with where.OR containing
    { labels: { has: 'Need to check' } }
  - Returned array has length 2
```

---

### UTC-F082-B-002

```
Unit Test ID : UTC-F082-B-002
Title        : GetBoardItems_SearchByTitle_LabelArmDoesNotBreakExisting
Layer        : Backend — WorkItemsService
Class / File : backend/src/work-items/work-items.service.spec.ts
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.findMany
  - filters = { search: 'login bug' }

Act:
  - Call workItemsService.getBoardItems(projectId, filters)

Assert:
  - where.OR contains { title: { contains: 'login bug', mode: 'insensitive' } }
  - where.OR contains { displayId: { contains: 'login bug', mode: 'insensitive' } }
  - where.OR contains { labels: { has: 'login bug' } }
  - All three arms present — OR array length is 3
```

---

### UTC-F082-B-003

```
Unit Test ID : UTC-F082-B-003
Title        : GetBoardItems_NoSearch_LabelArmAbsent
Layer        : Backend — WorkItemsService
Class / File : backend/src/work-items/work-items.service.spec.ts
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.findMany
  - filters = {} (no search)

Act:
  - Call workItemsService.getBoardItems(projectId, filters)

Assert:
  - where does NOT contain OR key (search block not added when search is undefined)
```

---

### UTC-F082-B-004

```
Unit Test ID : UTC-F082-B-004
Title        : UpdateWorkItem_LabelChange_AuditLogWritten_ForAnyRole
Layer        : Backend — WorkItemsService
Class / File : backend/src/work-items/work-items.service.spec.ts
AC Covered   : AC-7
Framework    : Jest

Arrange:
  - Mock item with labels: ['existing-label'], owned by project
  - Mock user with project role DEVELOPER (not PM)
  - Mock AuditLogsService.create to capture calls

Act:
  - Call workItemsService.updateWorkItem(itemId, { labels: ['existing-label', 'new-label'] }, developerUser)

Assert:
  - AuditLogsService (or internal logWithParent) called with action 'label_added', newVal 'new-label'
  - No ForbiddenException thrown
```

---

## Frontend Unit Tests

---

### UTC-F082-F-001

```
Unit Test ID : UTC-F082-F-001
Title        : WorkItemModal_LabelsSection_RemoveButtonVisibleWithoutCanEditSidebar
Layer        : Frontend — WorkItemModal (edit mode)
Class / File : frontend/src/features/board/components/WorkItemModal.test.tsx
AC Covered   : AC-2
Framework    : Vitest + React Testing Library

Arrange:
  - Render WorkItemModal with canEditSidebar=false
  - item.labels = ['hotfix', 'needs-review']

Act:
  - Query for × buttons next to label chips

Assert:
  - × buttons are present (2 buttons found)
  - Remove buttons visible regardless of canEditSidebar value
```

---

### UTC-F082-F-002

```
Unit Test ID : UTC-F082-F-002
Title        : WorkItemModal_AddLabelButton_VisibleWithoutCanEditSidebar
Layer        : Frontend — WorkItemModal (edit mode)
Class / File : frontend/src/features/board/components/WorkItemModal.test.tsx
AC Covered   : AC-2
Framework    : Vitest + React Testing Library

Arrange:
  - Render WorkItemModal with canEditSidebar=false
  - item.labels = []

Act:
  - Query for '+ Add label' button

Assert:
  - Button is present in the DOM
  - Clicking it shows the label input field
```

---

### UTC-F082-F-003

```
Unit Test ID : UTC-F082-F-003
Title        : CreateWorkItemModal_LabelsField_Present_ForAllRoles
Layer        : Frontend — CreateWorkItemModal
Class / File : frontend/src/features/board/components/WorkItemModal.test.tsx
AC Covered   : AC-1
Framework    : Vitest + React Testing Library

Arrange:
  - Render CreateWorkItemModal with defaultType='TASK'

Act:
  - Query for Labels form section

Assert:
  - Labels label/input section is present in the DOM
  - Input accepts text entry
```

---

### UTC-F082-F-004

```
Unit Test ID : UTC-F082-F-004
Title        : CreateWorkItemModal_AddLabel_AppendsChipAndClearsInput
Layer        : Frontend — CreateWorkItemModal
Class / File : frontend/src/features/board/components/WorkItemModal.test.tsx
AC Covered   : AC-1
Framework    : Vitest + React Testing Library

Arrange:
  - Render CreateWorkItemModal
  - Find the label input

Act:
  - Type 'Need to check' into the label input
  - Press Enter (or click Add)

Assert:
  - A chip with text 'Need to check' appears in the labels area
  - Input field is cleared
```

---

### UTC-F082-F-005

```
Unit Test ID : UTC-F082-F-005
Title        : CreateWorkItemModal_LabelChip_RemoveOnClick
Layer        : Frontend — CreateWorkItemModal
Class / File : frontend/src/features/board/components/WorkItemModal.test.tsx
AC Covered   : AC-1
Framework    : Vitest + React Testing Library

Arrange:
  - Render CreateWorkItemModal with pre-added label 'hotfix'

Act:
  - Click the × on the 'hotfix' chip

Assert:
  - 'hotfix' chip is removed from the labels area
```

---

### UTC-F082-F-006

```
Unit Test ID : UTC-F082-F-006
Title        : CreateWorkItemModal_Submit_IncludesLabelsInPayload
Layer        : Frontend — CreateWorkItemModal
Class / File : frontend/src/features/board/components/WorkItemModal.test.tsx
AC Covered   : AC-3
Framework    : Vitest + React Testing Library

Arrange:
  - Mock boardApi.createWorkItem
  - Render CreateWorkItemModal, fill required fields
  - Add label 'Need to check'

Act:
  - Click 'Create Item'

Assert:
  - boardApi.createWorkItem called with payload.labels containing 'Need to check'
```

---

### UTC-F082-F-007

```
Unit Test ID : UTC-F082-F-007
Title        : ExportListToExcel_LabelsColumn_PresentInHeaders
Layer        : Frontend — ListView exportListToExcel
Class / File : frontend/src/features/board/components/ListView.test.tsx
AC Covered   : AC-6
Framework    : Vitest

Arrange:
  - Import exportListToExcel (or inspect HEADERS constant)

Act:
  - Check HEADERS array

Assert:
  - 'Labels' is present in HEADERS
  - HEADERS.length is 13 (was 12)
```

---

### UTC-F082-F-008

```
Unit Test ID : UTC-F082-F-008
Title        : ExportListToExcel_LabeledItem_CommaSeparatedInLabelsCell
Layer        : Frontend — ListView exportListToExcel
Class / File : frontend/src/features/board/components/ListView.test.tsx
AC Covered   : AC-6
Framework    : Vitest

Arrange:
  - Create mock WorkItem with labels: ['hotfix', 'Need to check']
  - Call exportListToExcel([mockItem], today)

Act:
  - Inspect the generated worksheet cell for the Labels column (last column)

Assert:
  - Cell value is 'hotfix, Need to check'
```

---

### UTC-F082-F-009

```
Unit Test ID : UTC-F082-F-009
Title        : ExportListToExcel_UnlabeledItem_EmptyLabelsCell
Layer        : Frontend — ListView exportListToExcel
Class / File : frontend/src/features/board/components/ListView.test.tsx
AC Covered   : AC-6
Framework    : Vitest

Arrange:
  - Create mock WorkItem with labels: []

Act:
  - Call exportListToExcel([mockItem], today)

Assert:
  - Labels cell value is '' (empty string)
```
