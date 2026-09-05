# Requirements — F-031: Work Item Display ID

```
Feature ID   : F-031
Feature Name : Work Item Display ID
Epic         : PMS
Priority     : High
Roles        : All authenticated users (view); system (auto-generate on creation)
```

---

## User Story

As a project team member, I want each work item (Epic, Story, Task, Sub-Task, Bug) to have a
human-readable, project-scoped display ID (e.g. `HOR10001`) so that I can quickly reference,
search, and communicate about work items without using opaque UUIDs.

---

## Business Rules

BR-1: The display ID is auto-generated at work item creation time — it is never set manually.  
BR-2: The display ID is unique per project (no two work items in the same project share an ID).  
BR-3: The display ID consists of a 3-letter alphabetic prefix derived from the project name,
       followed by a 5-digit sequential number starting at 10001.  
BR-4: Prefix derivation rules (input: project name words W1, W2, W3 …):
       - 3 or more words : first letter of W1 + first letter of W2 + first letter of W3 (uppercase)
       - 2 words         : first 2 letters of W1 + first letter of W2 (uppercase)
       - 1 word          : first 3 letters of W1 (uppercase)  
BR-5: Non-alphabetic characters (numbers, symbols, spaces) are ignored when extracting letters.  
BR-6: The sequence is per-project. A second project named "Alpha Beta" starts its own counter
       at 10001 independently of any other project.  
BR-7: The display ID is immutable — it never changes after creation (even if the project is renamed).  
BR-8: The display ID is exposed in all API responses that return a work item.  
BR-9: Deleting a work item does NOT recycle its display ID; the sequence only increments.

---

## Acceptance Criteria

AC-1: On work item creation the system assigns a `displayId` formatted as `[PREFIX][NNNNN]`
      where PREFIX is the 3-letter project prefix and NNNNN is a 5-digit number ≥ 10001.  
AC-2: For a project with 3+ words (e.g. "HEMS One Rewrite") the prefix is the first letter of
      each of the first three words, uppercase: `HOR`.  
AC-3: For a project with exactly 2 words (e.g. "Task Board") the prefix is the first 2 letters
      of word 1 + first letter of word 2, uppercase: `TAB`.  
AC-4: For a project with exactly 1 word (e.g. "Horizon") the prefix is the first 3 letters,
      uppercase: `HOR`.  
AC-5: The numeric part of the first work item in a project is exactly `10001`; each subsequent
      item increments by 1 (`10002`, `10003`, …).  
AC-6: Two concurrent creation requests on the same project never produce duplicate display IDs
      (atomicity guaranteed via database transaction).  
AC-7: The `displayId` field is returned in all work item API responses
      (list, single item, create, update).  
AC-8: The Kanban board card displays the `displayId` alongside the item title.  
AC-9: The Work Item Modal header/title area displays the `displayId`.  
AC-10: The display ID field is read-only; no API endpoint accepts it as an input.

---

## Dependencies

- WorkItem model (`backend/prisma/schema.prisma`)
- Project model (`backend/prisma/schema.prisma`)
- WorkItemsService (`backend/src/work-items/work-items.service.ts`)
- WorkItem board card component (frontend)
- WorkItemModal component (frontend)

---

## Out of Scope

- Manual override of display IDs.
- Changing the prefix after a project is renamed.
- Displaying display IDs in the legacy Task model (non-WorkItem tasks).
- Search / filter by display ID (future feature).

---

## Database / Schema Design (Step 4)

### Modified Entities

**Entity: WorkItem** (`work_items` table)  
Changes:
- Add: `displayId  String  @unique  @db.VarChar(20)` — human-readable project-scoped ID

**Entity: Project** (`projects` table)  
Changes:
- Add: `workItemCounter  Int  @default(10000)` — tracks the last-used sequence number; first item gets `counter + 1`

### Migration

Name    : AddWorkItemDisplayId  
Command : `npx prisma migrate dev --name AddWorkItemDisplayId` (local)  
Prod    : `npx prisma migrate deploy` (auto on Render deploy)

---

## API Contract Design (Step 5)

All existing work item endpoints are unchanged in shape; the `displayId` field is **added** to
every WorkItem response object. No new endpoints are introduced.

### Modified Response Shape — WorkItem Object

All endpoints that return a WorkItem now include:

```json
{
  "id"        : "uuid",
  "displayId" : "HOR10001",
  "projectId" : "uuid",
  "type"      : "TASK",
  "title"     : "string",
  ...
}
```

### Affected Endpoints (response shape only — method/URL unchanged)

| Method | Path | Change |
|--------|------|--------|
| POST   | /projects/:projectId/work-items        | Response now includes `displayId` |
| GET    | /projects/:projectId/work-items        | Each item now includes `displayId` |
| GET    | /projects/:projectId/work-items/:id    | Response now includes `displayId` |
| PATCH  | /projects/:projectId/work-items/:id    | Response now includes `displayId` |
| DELETE | /projects/:projectId/work-items/:id    | No change |

### Error Cases (new)

| Code | Scenario |
|------|----------|
| 500  | Counter increment fails (DB error) — work item creation is rolled back |
