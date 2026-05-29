# Plan: Wire Live DB Data to KPI & Reports Pages + Full Feature Testing

## Context
All features F-001 through F-024 are built. However, **KpiPage and ReportsPage are 100% static** — they import hardcoded arrays from `kpiStaticData.ts` and `reportsStaticData.ts` instead of calling the backend. The backend `analytics.service.ts` is fully implemented with 7 live DB endpoints, and `analyticsApi.ts` on the frontend has all the API calls ready — they just aren't wired to the UI yet. Tomorrow's session replaces static data with live API calls, runs a full smoke-test of every feature, and fixes any bugs found.

---

## Part 1 — Wire KpiPage to Live Data

**File:** `frontend/src/features/kpi/pages/KpiPage.tsx`

### What changes
1. **Remove** `import { STATIC_KPI_DATA, ... } from '../data/kpiStaticData'`
2. **Add** `useQuery` calling `analyticsApi.getKpi(period, userId?)`:
   - Admin/SuperUser: no `userId` → receives all employees
   - Employee: passes own `user.id` → receives only their record
3. **Map** the `LiveEmployeeKpiRecord` API response to the existing component's internal `EmployeeKpiData` shape (the interface currently used by charts/tables)
4. **Wire period selector** — pass selected `YYYY-MM` string as `period` query param
5. **Wire department filter & search** — apply client-side on the live data array (same logic as today)
6. **Wire KPI score entry panel (admin)** — the modal currently has no save action; call `analyticsApi.upsertKpiRecord({ userId, period, metricId, points })` on submit, then invalidate the `['kpi', period]` query
7. **Add loading skeleton + error state** for the whole page

**API:** `GET /analytics/kpi?period=2026-05&userId=optional`  
**Response type:** `LiveEmployeeKpiRecord[]` (already in `analyticsApi.ts`)

---

## Part 2 — Wire ReportsPage Tabs to Live Data

**File:** `frontend/src/features/reports/pages/ReportsPage.tsx`

Replace each static import with a `useQuery` keyed on `[tab, period, projectId]`. One query fires at a time (only the active tab).

| Tab | Replace import | API call |
|-----|---------------|----------|
| Productivity | `STATIC_PRODUCTIVITY_DATA` | `analyticsApi.getProductivity(period, projectId)` |
| KPI Appraisal | `STATIC_KPI_DATA` | `analyticsApi.getKpi(period)` |
| Projects | `STATIC_PROJECT_DATA` | `analyticsApi.getProjects(period, projectId)` |
| Bugs | `BUG_SEVERITY_BY_PROJECT` etc. | `analyticsApi.getBugs(period, projectId)` |
| Task Allocation | `STATIC_ALLOCATION_DATA` | `analyticsApi.getAllocation(period, projectId)` |
| Timesheet | `STATIC_TIMESHEET_DATA` | `analyticsApi.getTimesheet(period, projectId)` |
| Capacity | `capacityStaticData` | `analyticsApi.getCapacity(period)` |

- Period selector and project filter already exist in UI — pass their values to each query
- CSV export functions receive the live data array (same logic, different source)
- Add per-tab loading spinner and `No data for this period` empty state

---

## Part 3 — Self-Log Entry Forms (New UI)

The backend already has POST endpoints for leave/learning/innovation logs but there is **no frontend UI** for employees to submit them. Without entries in these tables, KPI metrics for attendance, learning_velocity, and automation_innovation will always show 0.

Create a small **"My Logs"** section (can be on the KPI page sidebar or a modal):
- **Leave Log form**: date, type (SICK/CASUAL/OTHER), description → `POST /leave-logs`
- **Learning Log form**: period, topic, hours, description → `POST /learning-logs`
- **Innovation Log form**: period, title, impact, type → `POST /innovation-logs`

**Files to create:**
- `frontend/src/features/kpi/components/SelfLogPanel.tsx` (3-tab panel: Leave / Learning / Innovation)
- Wire to existing `analyticsApi.ts` or add self-log calls to it

---

## Part 4 — Dashboard Live Data Fixes

**File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx`

Dashboard already calls live API but has two known gaps:
1. **Team performance score** is hardcoded as `0` in `dashboard.service.ts` — wire it to `analyticsApi.getKpi(currentPeriod)` → compute avg score
2. **Activity Chart** uses mock monthly data — wire to `analyticsApi.getProductivity(period)` aggregated by month

---

## Part 5 — Full Feature Smoke-Test Checklist

Work through each feature in the browser after wiring is done:

| Area | Test |
|------|------|
| Auth | Login as SUPER_USER, ADMIN, EMPLOYEE — verify RBAC |
| Projects | Create, edit, archive, restore; Ongoing checkbox saves null endDate |
| Board | Drag item → status updates in open modal; milestone fields visible on all types |
| Sprints | Create / activate / close sprint |
| Work Items | Create Epic → Story → Task → Bug; all fields save correctly |
| Timesheet | Log hours on a work item; approval flow |
| KPI page | Period selector loads different data; admin can enter manual scores; scores persist on refresh |
| Reports tabs | Each tab shows live data; period/project filter narrows results; CSV export downloads correct rows |
| Capacity tab | Grid shows correct colour for leave/holiday/occupied days |
| Self-logs | Employee submits leave/learning/innovation log; reflected in KPI score on next load |
| Rich-text editor | Bold/italic/color/image upload works in project form |

---

## Critical Files

| File | Change |
|------|--------|
| `frontend/src/features/kpi/pages/KpiPage.tsx` | Replace static with `useQuery(analyticsApi.getKpi)` |
| `frontend/src/features/reports/pages/ReportsPage.tsx` | Replace 7 static imports with `useQuery` per tab |
| `frontend/src/features/kpi/components/SelfLogPanel.tsx` | New — leave/learning/innovation log forms |
| `frontend/src/api/analyticsApi.ts` | Add self-log POST calls if missing |
| `backend/src/dashboard/dashboard.service.ts` | Wire team performance score to live KPI avg |

## Reusable Utilities (no new code needed)
- `analyticsApi.ts` — all 9 endpoints already defined
- `KPI_METRICS`, `computeGrade`, `computeCategoryScores` from `kpiStaticData.ts` — keep these pure helpers, only remove the `STATIC_KPI_DATA` array
- Existing `useQuery`/`useMutation` patterns from any other page

---

## Verification

1. **Seed test data**: Create 2–3 work items, log timesheet hours, close a sprint → KPI and Productivity tabs should show non-zero values
2. **KPI manual score**: Admin enters scores for a user → refresh KPI page → score updates
3. **Self-log**: Employee submits a learning log (4+ hours) → KPI `learning_velocity` metric gains points
4. **Reports CSV**: Download CSV for Productivity tab → rows match what is shown in the table
5. **Capacity grid**: Add a leave entry for a date → that day's cell turns pink for that employee
