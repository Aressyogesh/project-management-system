Feature ID   : F-081
Feature Name : Work Item Tags on Create
Epic         : PMS — JIRA Kanban Board
Priority     : Low
Roles        : All roles that can create a work item (Project Manager, Team Lead, Developer, QA, Designer, DevOps — subject to existing create permissions per work item type)

User Story
----------
As a project team member creating a work item (Epic / User Story / Task / Bug), I want to
add free-form tags (labels) at the moment of creation, so that I don't have to reopen the
item afterwards just to categorise it (e.g. `hotfix`, `needs-design`, `tech-debt`).

Background / Current State
---------------------------
Labels already exist end-to-end in the system:
  - `WorkItem.labels String[]` — Prisma schema (no change needed)
  - `CreateWorkItemDto.labels?: string[]` and `UpdateWorkItemDto.labels?: string[]` — backend
    DTOs already accept the field (`backend/src/work-items/dto/work-item.dto.ts:38`)
  - `WorkItemsService.create()` already persists `dto.labels ?? []`
    (`backend/src/work-items/work-items.service.ts:246`)
  - `WorkItemsService.update()` already diffs old/new labels and writes
    `label_added` / `label_removed` activity log entries
    (`backend/src/work-items/work-items.service.ts:552-559`)
  - The **edit/detail modal** (`WorkItemModal`, the JIRA-style two-panel view) already has a
    working "Labels" control in the right sidebar — add via free-text input + Enter, remove
    via × on each chip — gated by the existing `canEditSidebar` prop
    (`frontend/src/features/board/components/WorkItemModal.tsx:1793-1828`)

The only gap: **`CreateWorkItemModal`** (the "Create Work Item" dialog, all types) has no
Labels input, so a tag can only be added after the item exists, via the edit sidebar.

Business Rules
--------------
BR-1: Labels are free-form strings — no predefined list, no per-project label registry (matches
      existing edit-sidebar behaviour; explicitly out of scope, see below).
BR-2: A label is added to the create form's local pending list by typing text and pressing
      Enter (or clicking "Add"); it is not persisted until the item itself is created.
BR-3: Duplicate labels (case-sensitive exact match) are not added twice to the same item.
BR-4: Empty / whitespace-only label text is not added.
BR-5: Each pending label can be removed (×) before submitting, same as the edit-sidebar chip.
BR-6: On submit, the full `labels` array is sent as part of the existing
      `POST /api/v1/work-items` (create) payload — no new endpoint.
BR-7: Anyone permitted to create a given work item type today is permitted to tag it at
      creation — no additional RBAC beyond the existing create-permission check per type.
BR-8: The field applies uniformly to all four creatable types (Epic, User Story, Task, Bug).

Acceptance Criteria
-------------------
AC-1: The "Create Work Item" modal shows a "Labels" field (below Attachments, above the
      Priority/core-fields grid) for every work item type (Epic, User Story, Task, Bug).
AC-2: Typing a value into the label input and pressing Enter adds it as a removable chip
      below the input; the input clears and stays focused for the next tag.
AC-3: Clicking the × on a pending chip removes only that chip.
AC-4: Submitting the form with no labels behaves exactly as before (empty array / omitted —
      no regression to existing create flow).
AC-5: Submitting the form with one or more labels creates the work item with those labels
      persisted — confirmed by reopening the created item and seeing the same chips in the
      edit sidebar.
AC-6: Attempting to add an empty/whitespace-only value is a no-op (no chip created).
AC-7: Attempting to add a label that duplicates one already pending is a no-op (no duplicate
      chip; existing chip order unchanged).
AC-8: "Save & Add New" resets the labels field along with the rest of the form, exactly like
      title/description/etc. already reset.
AC-9: A user without permission to create a given work item type still cannot create it
      (unchanged) — the Labels field carries no independent permission of its own.

Dependencies
------------
- Existing `labels` field on `WorkItem` model, `CreateWorkItemDto`, and
  `WorkItemsService.create()` (all already implemented — F-022/F-024 JIRA Board work).
- Existing `CreateWorkItemModal` component and its `handleSubmit` → `createMut.mutate(...)` flow.

Out of Scope
------------
- Project-level predefined/managed label registry (name + colour, PM+ create/rename/delete) —
  that is the larger backlog item **F-051 — Custom Labels / Tags** and is not built here.
- Autocomplete/suggestions from labels already used elsewhere in the project.
- Label chips on Kanban board cards (currently labels are only visible inside the item detail
  modal sidebar; this feature does not change board card rendering).
- Any backend/schema/API change — this is a frontend-only wiring of an existing capability.

─────────────────────────────────────────
Step 4 — Database / Schema Design
─────────────────────────────────────────
No changes. `WorkItem.labels String[]` already exists and already supports being set at
create time via the existing DTO/service path. No migration required.

─────────────────────────────────────────
Step 5 — API Contract Design
─────────────────────────────────────────
No new endpoint. Reuses the existing contract:

Endpoint : POST /api/v1/work-items
Auth Required : Yes
Roles Allowed : Existing per-type create permission (ProjectRoleGuard), unchanged

Request Body (relevant field only — already implemented, documented here for completeness)
  {
    ...existing fields...,
    "labels" : string[]   // optional; defaults to [] server-side if omitted
  }

Success Response   HTTP 201 — unchanged, `labels` already included in the returned WorkItem.

Error Responses — unchanged (400/401/403/404/409/422/500 as already defined for this endpoint).
