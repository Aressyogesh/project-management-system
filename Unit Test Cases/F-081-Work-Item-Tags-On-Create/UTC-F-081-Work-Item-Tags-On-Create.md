Feature ID   : F-081
Feature Name : Work Item Tags on Create
Layer(s)     : Frontend (React component logic) — no backend logic changed, so no new backend
                unit tests are required; existing backend tests for `labels` on create/update
                (work-items.service.spec.ts) already cover the persistence path and remain
                unmodified/passing.

─────────────────────────────────────────
UTC-F081-F-001
─────────────────────────────────────────
Title        : addPendingLabel_ValidText_AppendsChipAndClearsInput
Layer        : Frontend
Class / File : CreateWorkItemModal (WorkItemModal.tsx)
AC Covered   : AC-2
Framework    : Vitest + React Testing Library

Arrange:
  - Render <CreateWorkItemModal /> with minimal required props (projectId, members incl.
    a PROJECT_MANAGER, empty sprints/milestones)
  - Locate the Labels text input by placeholder/label

Act:
  - Type "hotfix" into the Labels input
  - Press Enter

Assert:
  - A chip with text "hotfix" is rendered
  - The Labels input value is now empty string

─────────────────────────────────────────
UTC-F081-F-002
─────────────────────────────────────────
Title        : addPendingLabel_EmptyOrWhitespace_NoChipAdded
Layer        : Frontend
Class / File : CreateWorkItemModal (WorkItemModal.tsx)
AC Covered   : AC-6
Framework    : Vitest + React Testing Library

Arrange:
  - Render <CreateWorkItemModal />
  - Locate the Labels input

Act:
  - Type "   " (whitespace only) into the Labels input
  - Press Enter

Assert:
  - No chip is rendered
  - Chip container remains empty

─────────────────────────────────────────
UTC-F081-F-003
─────────────────────────────────────────
Title        : addPendingLabel_DuplicateText_DoesNotAddSecondChip
Layer        : Frontend
Class / File : CreateWorkItemModal (WorkItemModal.tsx)
AC Covered   : AC-7
Framework    : Vitest + React Testing Library

Arrange:
  - Render <CreateWorkItemModal />
  - Add label "hotfix" (type + Enter)

Act:
  - Type "hotfix" again into the Labels input
  - Press Enter

Assert:
  - Exactly one chip with text "hotfix" exists (not two)

─────────────────────────────────────────
UTC-F081-F-004
─────────────────────────────────────────
Title        : removePendingLabel_ClickChipX_RemovesOnlyThatChip
Layer        : Frontend
Class / File : CreateWorkItemModal (WorkItemModal.tsx)
AC Covered   : AC-3
Framework    : Vitest + React Testing Library

Arrange:
  - Render <CreateWorkItemModal />
  - Add labels "hotfix" and "tech-debt"

Act:
  - Click the × button on the "hotfix" chip

Assert:
  - "hotfix" chip is no longer rendered
  - "tech-debt" chip is still rendered

─────────────────────────────────────────
UTC-F081-F-005
─────────────────────────────────────────
Title        : handleSubmit_WithLabels_IncludesLabelsArrayInCreatePayload
Layer        : Frontend
Class / File : CreateWorkItemModal (WorkItemModal.tsx)
AC Covered   : AC-5, AC-6
Framework    : Vitest + React Testing Library (mock boardApi.createWorkItem)

Arrange:
  - Mock `boardApi.createWorkItem` to resolve with a created item
  - Render <CreateWorkItemModal type=TASK with a valid parent/assignee/dates already set>
  - Fill required fields (title, assignee, dates, billing status, estimated hours)
  - Add labels "hotfix" and "urgent"

Act:
  - Click "Create Item"

Assert:
  - `boardApi.createWorkItem` was called once with a payload whose `labels` field equals
    `["hotfix", "urgent"]`

─────────────────────────────────────────
UTC-F081-F-006
─────────────────────────────────────────
Title        : handleSubmit_NoLabelsAdded_OmitsOrSendsEmptyLabelsArray
Layer        : Frontend
Class / File : CreateWorkItemModal (WorkItemModal.tsx)
AC Covered   : AC-4
Framework    : Vitest + React Testing Library (mock boardApi.createWorkItem)

Arrange:
  - Mock `boardApi.createWorkItem`
  - Render <CreateWorkItemModal /> and fill only the required fields, adding no labels

Act:
  - Click "Create Item"

Assert:
  - `boardApi.createWorkItem` was called with a payload where `labels` is either `undefined`
    or `[]` (no regression — matches pre-feature behaviour of the rest of the payload)

─────────────────────────────────────────
UTC-F081-F-007
─────────────────────────────────────────
Title        : saveAndAddNew_AfterCreateWithLabels_ResetsLabelsField
Layer        : Frontend
Class / File : CreateWorkItemModal (WorkItemModal.tsx)
AC Covered   : AC-8
Framework    : Vitest + React Testing Library (mock boardApi.createWorkItem)

Arrange:
  - Mock `boardApi.createWorkItem` to resolve successfully
  - Render <CreateWorkItemModal />, fill required fields, add label "hotfix"

Act:
  - Click "Save & Add New"

Assert:
  - After the mutation resolves, the Labels chip list is empty again (along with title/
    description already asserted by existing reset test coverage)

Execution Gate
--------------
Run unit tests:   cd frontend && npm test
Result:           ALL PASS  →  proceed to Step 3b
                  ANY FAIL  →  fix failures before continuing
