# REQ-F-082 — Label Open Access and Label Search

```
Feature ID   : F-082
Feature Name : Label Open Access and Label Search
Epic         : PMS — Kanban Board
Priority     : Medium
Roles        : All authenticated project members (all system and project roles)
```

---

## User Story

As any project member, I want to add and remove labels on work items during both creation and editing — regardless of my role — and I want the board search to find items by label name so I can quickly filter relevant work and export the results with labels included.

---

## Business Rules

**BR-1:** Any authenticated project member (all system roles and project roles) can add labels to a work item at creation time and on any existing work item. The `canEditSidebar` gate must NOT apply to label add/remove.

**BR-2:** Any authenticated project member can remove labels from an existing work item. Label removal is not restricted to PM/Admin roles.

**BR-3:** Labels on the create form accept a comma-separated tag input. Users can add multiple labels before submitting.

**BR-4:** The backend search (`?search=`) must include a third OR arm: `labels: { has: searchTerm }` (exact match against the stored string array). This complements the existing title and displayId substring search.

**BR-5:** Label search is case-sensitive and exact-match. Users must type the label exactly as it was saved (e.g. "Need to check"). This is acceptable because labels are short, user-defined tags with known exact values.

**BR-6:** The Excel export from list view must include a `Labels` column (rightmost column) containing the comma-separated label values for each work item. Items with no labels export an empty cell.

**BR-7:** No DB schema change is required — labels are already stored as `String[]` on `work_items`.

---

## Acceptance Criteria

**AC-1:** On the Create Work Item modal, a Labels field is present for all roles and all work item types. The user can type a label and press Enter or click Add to tag it; multiple labels can be added before submitting.

**AC-2:** On the Edit Work Item modal (sidebar), the `×` remove button on each label chip and the `+ Add label` button are visible and functional for ALL logged-in project members, regardless of role (`canEditSidebar` restriction removed from the Labels section only).

**AC-3:** Labels entered in the create modal are persisted to the work item on creation and appear in the sidebar when the item is subsequently opened.

**AC-4:** Searching for an exact label name in the board search box (e.g. "Need to check") returns all work items tagged with that label in both Kanban and List views.

**AC-5:** The existing title and displayId search behaviour is unchanged — label search is additive (OR).

**AC-6:** The Excel export includes a `Labels` column showing comma-separated label values. Items with no labels show an empty cell.

**AC-7:** Audit log entries for `label_added` and `label_removed` continue to be written for all label changes, regardless of the role that made the change.

---

## Dependencies

- `WorkItemModal.tsx` — `canEditSidebar` prop, label state, `addLabel`/`removeLabel` functions
- `CreateWorkItemModal` (inside `WorkItemModal.tsx`) — labels state and create payload
- `work-items.service.ts` — `getBoardItems` search OR clause
- `ListView.tsx` — `exportListToExcel` HEADERS and cells arrays

---

## Out of Scope

- Case-insensitive label search (exact match is sufficient for the current use case)
- A label autocomplete/suggestion dropdown (free-text only)
- Label colour assignment (labels are plain text)
- Restricting which labels exist — labels are free-form strings per work item
- Any change to `canEditSidebar` restrictions on fields other than Labels

---

## Database / Schema Design (Step 4)

No schema changes required. Labels are already stored as `String[]` on the `work_items` table (`labels String[]` at `schema.prisma:650`). No migration needed.

---

## API Contract Design (Step 5)

No new endpoints. Changes are within existing endpoint contracts:

### `GET /projects/:id/board?search=<term>`
- **Change:** Search now matches on `labels: { has: searchTerm }` in addition to `title` and `displayId`
- **Auth:** Unchanged — JWT required, project member

### `POST /projects/:id/work-items`
- **Change:** `labels` field already accepted in `CreateWorkItemDto` — no DTO change needed
- **Behaviour:** Labels submitted at creation time are now surfaced in the create form UI

### `PATCH /work-items/:id`
- **Change:** No backend change — `UpdateWorkItemDto.labels` already accepted; the frontend restriction is frontend-only
- **Auth:** Unchanged — all project members may call this endpoint
