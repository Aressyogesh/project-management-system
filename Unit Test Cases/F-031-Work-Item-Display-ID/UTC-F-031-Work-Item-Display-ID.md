# Unit Test Cases — F-031: Work Item Display ID

---

## Backend Unit Tests

---

```
Unit Test ID : UTC-F031-B-001
Title        : generatePrefix_ThreeWordName_ReturnsFirstLetterOfEachWord
Layer        : Backend — Utility
File         : backend/src/work-items/work-items.utils.ts
AC Covered   : AC-2
Framework    : Jest

Arrange:
  - projectName = "HEMS One Rewrite"

Act:
  - result = generateWorkItemPrefix("HEMS One Rewrite")

Assert:
  - result === "HOR"
```

---

```
Unit Test ID : UTC-F031-B-002
Title        : generatePrefix_TwoWordName_ReturnsFirstTwoLettersOfWord1PlusFirstLetterOfWord2
Layer        : Backend — Utility
File         : backend/src/work-items/work-items.utils.ts
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - projectName = "Task Board"

Act:
  - result = generateWorkItemPrefix("Task Board")

Assert:
  - result === "TAB"
```

---

```
Unit Test ID : UTC-F031-B-003
Title        : generatePrefix_OneWordName_ReturnsFirstThreeLetters
Layer        : Backend — Utility
File         : backend/src/work-items/work-items.utils.ts
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - projectName = "Horizon"

Act:
  - result = generateWorkItemPrefix("Horizon")

Assert:
  - result === "HOR"
```

---

```
Unit Test ID : UTC-F031-B-004
Title        : generatePrefix_OutputIsAlwaysUpperCase
Layer        : Backend — Utility
File         : backend/src/work-items/work-items.utils.ts
AC Covered   : AC-2, AC-3, AC-4
Framework    : Jest

Arrange:
  - names = ["alpha beta gamma", "ab cd", "xyz"]

Act:
  - results = names.map(generateWorkItemPrefix)

Assert:
  - results[0] === "ABC"
  - results[1] === "ABC"   // first 2 of "ab" + first of "cd"
  - results[2] === "XYZ"
```

---

```
Unit Test ID : UTC-F031-B-005
Title        : generatePrefix_MoreThanThreeWords_UsesOnlyFirstThree
Layer        : Backend — Utility
File         : backend/src/work-items/work-items.utils.ts
AC Covered   : AC-2
Framework    : Jest

Arrange:
  - projectName = "Alpha Beta Gamma Delta"

Act:
  - result = generateWorkItemPrefix("Alpha Beta Gamma Delta")

Assert:
  - result === "ABG"
```

---

```
Unit Test ID : UTC-F031-B-006
Title        : generatePrefix_ProjectNameWithExtraSpaces_HandledGracefully
Layer        : Backend — Utility
File         : backend/src/work-items/work-items.utils.ts
AC Covered   : AC-2, AC-3, AC-4
Framework    : Jest

Arrange:
  - projectName = "  Task   Board  "

Act:
  - result = generateWorkItemPrefix("  Task   Board  ")

Assert:
  - result === "TAB"
```

---

```
Unit Test ID : UTC-F031-B-007
Title        : create_AssignsDisplayIdWithCorrectPrefixAndStartingNumber
Layer        : Backend — Service
File         : backend/src/work-items/work-items.service.ts
AC Covered   : AC-1, AC-5
Framework    : Jest + Prisma mock

Arrange:
  - Mock prisma.$transaction to simulate:
      - project.update (counter 10000 → 10001) returning { workItemCounter: 10001, name: "HEMS One Rewrite" }
      - workItem.create returning a work item with displayId "HOR10001"
  - dto = { type: "TASK", title: "First item", ... }

Act:
  - result = await workItemsService.create("project-id", "reporter-id", dto)

Assert:
  - result.displayId === "HOR10001"
```

---

```
Unit Test ID : UTC-F031-B-008
Title        : create_SecondItemIncrementsByOne
Layer        : Backend — Service
File         : backend/src/work-items/work-items.service.ts
AC Covered   : AC-5
Framework    : Jest + Prisma mock

Arrange:
  - Mock transaction for counter 10001 → 10002, project name "HEMS One Rewrite"
  - Mock workItem.create returning displayId "HOR10002"

Act:
  - result = await workItemsService.create("project-id", "reporter-id", dto)

Assert:
  - result.displayId === "HOR10002"
```

---

```
Unit Test ID : UTC-F031-B-009
Title        : create_DisplayIdFieldIsUniquePerProject
Layer        : Backend — Service
File         : backend/src/work-items/work-items.service.ts
AC Covered   : AC-6
Framework    : Jest + Prisma mock

Arrange:
  - Mock prisma.$transaction — simulates atomic increment; two concurrent calls
    return counter 10001 and 10002 respectively

Act:
  - Call create() twice with the same projectId

Assert:
  - First result displayId !== second result displayId
  - Both follow format /^HOR1000[12]$/
```

---

```
Unit Test ID : UTC-F031-B-010
Title        : create_DisplayIdIsNotAcceptedAsInput
Layer        : Backend — DTO
File         : backend/src/work-items/dto/work-item.dto.ts
AC Covered   : AC-10
Framework    : Jest + class-validator

Arrange:
  - dto includes an explicit displayId field "CUSTOM001"

Act:
  - Validate CreateWorkItemDto with the extra field

Assert:
  - displayId property does not exist on CreateWorkItemDto class
  - The extra field is stripped (whitelist validation)
```

---

## Frontend Unit Tests

---

```
Unit Test ID : UTC-F031-F-001
Title        : WorkItemCard_RendersDisplayId_WhenProvided
Layer        : Frontend — Component
File         : frontend/src/features/board/components/WorkItemCard.tsx (or equivalent)
AC Covered   : AC-8
Framework    : Vitest + React Testing Library

Arrange:
  - workItem = { displayId: "HOR10001", title: "Fix login bug", type: "BUG", ... }

Act:
  - render(<WorkItemCard workItem={workItem} />)

Assert:
  - screen.getByText("HOR10001") is in the document
```

---

```
Unit Test ID : UTC-F031-F-002
Title        : WorkItemModal_ShowsDisplayIdInHeader_WhenProvided
Layer        : Frontend — Component
File         : frontend/src/features/board/components/WorkItemModal.tsx (or equivalent)
AC Covered   : AC-9
Framework    : Vitest + React Testing Library

Arrange:
  - workItem = { displayId: "HOR10001", title: "My Task", type: "TASK", ... }

Act:
  - render(<WorkItemModal workItem={workItem} isOpen={true} onClose={() => {}} />)

Assert:
  - screen.getByText("HOR10001") is in the document
```

---

```
Unit Test ID : UTC-F031-F-003
Title        : WorkItemCard_DoesNotCrash_WhenDisplayIdIsUndefined
Layer        : Frontend — Component
File         : frontend/src/features/board/components/WorkItemCard.tsx
AC Covered   : AC-8
Framework    : Vitest + React Testing Library

Arrange:
  - workItem = { displayId: undefined, title: "Old item", type: "TASK", ... }

Act:
  - render(<WorkItemCard workItem={workItem} />)

Assert:
  - Component renders without throwing
  - No text matching /undefined/ appears in the DOM
```
