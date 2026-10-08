# Code Review — F-014 My Task Widget (Live DB Data)

**Feature:** F-014 — My Task Widget — Live DB Data
**Reviewer:** Senior Fullstack Engineer
**Date:** 2026-05-26
**Status:** APPROVED

## Files Reviewed

| File | Change Type |
|---|---|
| `backend/src/dashboard/dashboard.service.ts` | Modified |
| `backend/src/dashboard/__tests__/dashboard.service.spec.ts` | New |
| `frontend/src/features/dashboard/__tests__/MyTaskTable.test.tsx` | New |

## Review Findings

### dashboard.service.ts
- All nine DB queries run concurrently in a single `Promise.all` — correct; avoids waterfall latency.
- `task.findMany` uses a `select` projection — no `SELECT *`; only the fields needed for `MyTask` are fetched.
- `task.project` relation used directly (Task model has a direct `projectId` FK) — no N+1 via `taskList → project`.
- `take: 10` enforced at DB level — widget bounded correctly.
- Employee stat cards now show `rawMyTasks.length` for "My Tasks" / "Assigned To Me" — live data.
- `completedTaskCount` and `completedCount` both query `status = COMPLETED` — minor: they could be unified. Not a bug; query cost is trivial and keeps the code readable.

### Tests
- Backend: 4 tests cover live myTasks, empty case, tasksProgress counts, and admin stat card value. `Promise.all` mock ordering matches service implementation.
- Frontend: 4 tests for `MyTaskTable` cover row rendering, priority badge, status badge, and empty state. Tests are independent of API layer.

## Verdict
**APPROVED — ready to merge.**
