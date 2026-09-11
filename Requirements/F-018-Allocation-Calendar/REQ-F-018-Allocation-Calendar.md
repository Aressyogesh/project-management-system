# REQ-F-018 — Employee Allocation Calendar View

## Feature ID
F-018

## Feature Name
Employee Allocation Calendar View

## Branch
`feature/F-018-allocation-calendar`

## Date
2026-05-27

---

## 1. User Story

> As an **employee**, I want to view my task allocations on a monthly calendar so that I can see which days I have hours assigned and plan my workload.
>
> As a **Project Manager or Admin**, I want to view any team member's allocation calendar so that I can monitor individual workload and identify over- or under-allocated employees.

---

## 2. Business Requirements

| ID   | Requirement |
|------|-------------|
| BR-1 | The calendar must display the current user's task allocations by default. |
| BR-2 | SUPER_USER and ADMIN can select any active user from a dropdown to view that user's calendar. |
| BR-3 | Each calendar day must show the total allocated hours and task chips (up to 3; "+N more" for overflow). |
| BR-4 | Days must be colour-coded by total hours: green (< 6h), yellow (6–7.5h), red (8h / full capacity). |
| BR-5 | A progress bar (proportional to 8h max) must appear on each day with allocations. |
| BR-6 | Today's date must be visually highlighted with a distinct marker. |
| BR-7 | Summary cards above the calendar must show: total hours for the month, number of days with allocations, and average hours per allocated day. |
| BR-8 | The user can navigate to previous and next months, and jump to the current month with a "Today" button. |
| BR-9 | The calendar grid starts on Monday (ISO week). |
| BR-10 | Weekend columns (Saturday, Sunday) must have a distinct background. |

---

## 3. Acceptance Criteria

| AC   | Description |
|------|-------------|
| AC-1 | The page loads at `/allocations` and is accessible to all authenticated users. |
| AC-2 | The calendar shows the current month on first load and highlights today's date. |
| AC-3 | Each occupied calendar cell shows total hours, a colour-coded background (green/yellow/red), and a proportional progress bar. |
| AC-4 | Up to 3 task chips are shown per day (task title + hours); days with > 3 allocations show "+N more". |
| AC-5 | Navigating prev/next month changes the calendar month and re-fetches allocations from the API. |
| AC-6 | SUPER_USER and ADMIN see a user dropdown; selecting a different user loads that user's allocations. |
| AC-7 | Non-privileged users (EMPLOYEE) do not see the user dropdown; the calendar always shows their own allocations. |
| AC-8 | Summary cards (total hours, days allocated, avg hours/day) update when the month or selected user changes. |
| AC-9 | Empty months display an empty calendar (no error or crash). |
| AC-10 | Sidebar shows an "Allocations" nav item linking to `/allocations`. |

---

## 4. Out of Scope

- Editing or deleting allocations from the calendar (handled in F-017 Project Detail page).
- Day-level drill-down modal.
- Export to PDF/CSV (deferred to Phase 11 reports).
- Filtering by project within the calendar view.

---

## 5. Dependencies

| Dependency | Status |
|-----------|--------|
| F-017 Task Allocation CRUD (backend + API) | Complete — merged to main |
| `GET /task-allocations/user/:userId?from=&to=` endpoint | Available |
| `taskAllocationsApi.listByUser()` frontend wrapper | Available |
| `usersApi.list()` for user dropdown (privileged only) | Available |

---

## 6. DB / Schema Design

No new Prisma model or migration required. This feature reads from the existing `TaskAllocation` model introduced in F-017:

```
TaskAllocation {
  id             String
  taskId         String
  userId         String
  date           DateTime
  allocatedHours Float
  task           Task     (relation — title used in chips)
}
```

---

## 7. API Contract

### Existing endpoint used (no new backend):

```
GET /api/v1/task-allocations/user/:userId?from=YYYY-MM-DD&to=YYYY-MM-DD
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "taskId": "uuid",
    "userId": "uuid",
    "date": "2026-05-15T00:00:00.000Z",
    "allocatedHours": 4,
    "task": { "id": "uuid", "title": "Design DB schema" },
    "user": { "id": "uuid", "fullName": "John Doe" }
  }
]
```

- `from` and `to` are inclusive date strings (YYYY-MM-DD).
- The component sets `from` to the first day of the viewed month and `to` to the last day.

---

## 8. Frontend Components

| File | Description |
|------|-------------|
| `frontend/src/features/taskAllocations/pages/AllocationCalendarPage.tsx` | Full-page monthly calendar component |
| `frontend/src/App.tsx` | Route: `<Route path="/allocations" element={<AllocationCalendarPage />} />` |
| `frontend/src/components/layout/Sidebar.tsx` | Nav item: "Allocations" at `/allocations` |

### Key Helper Functions (pure / testable)

| Function | Purpose |
|----------|---------|
| `buildCalendarWeeks(year, month)` | Returns `(Date \| null)[][]` — ISO week-aligned calendar grid |
| `toLocalDateStr(date)` | Returns `YYYY-MM-DD` string from a Date without UTC shift |
| `dayColor(totalHours)` | Returns Tailwind CSS class string for cell background |
| `hoursBarColor(totalHours)` | Returns Tailwind CSS class string for progress bar colour |
