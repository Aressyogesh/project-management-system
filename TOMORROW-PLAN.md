# Tomorrow's Plan: Full Application Testing + Live Data (Step by Step)

## Priority Order
1. **Test entire application** — every feature, every role, every form saves to DB correctly
2. **Fix any bugs found** during testing before moving to live data
3. **Make Overview / KPI / Reports dynamic** — step by step, one tab at a time
4. **Goal**: Every user action captured in DB → accurate data flows into all report parameters

---

## Phase 1 — Full Application Smoke Test

Work through every feature in the browser. Test as three roles: SUPER_USER, ADMIN, EMPLOYEE.

### Auth & Navigation
- [ ] Login / logout works for all roles
- [ ] Sidebar links and RBAC gating correct (EMPLOYEE cannot see admin-only pages)
- [ ] JWT token refresh works (stay logged in after 15 min)

### Settings & Master Data
- [ ] Company settings save and reload correctly
- [ ] Departments: create, edit, deactivate → appear in project/user dropdowns
- [ ] Clients: create, edit, deactivate → appear in project form
- [ ] Users: create, assign role, deactivate → appear in member/assignee dropdowns
- [ ] Holidays: create recurring holiday → appears in capacity grid

### Projects
- [ ] Create project (DEDICATED / T&M / FIXED) — data saves in DB
- [ ] Ongoing checkbox (DEDICATED) — saves `endDate = null`, card shows teal "Ongoing" badge
- [ ] Archive / restore project — hidden from default list, visible via "Show Archived"
- [ ] Summary cards (Active/Archive/On Hold/Dedicated/T&M/Fixed/Overdue) are clickable filters
- [ ] Rich-text description renders on project card with correct formatting
- [ ] Project members: add member, change role, remove

### Milestones
- [ ] Create milestone with start date, due date, responsible user, status
- [ ] Edit and delete milestone
- [ ] Milestone appears in task and work item dropdowns

### Task Lists & Tasks (Project Detail)
- [ ] Create task list (General / Sprint / QA etc.)
- [ ] Create task with all fields: title, description, assignee, priority, billing, status, dates
- [ ] Kanban and list view toggle
- [ ] Task attachments upload and download
- [ ] Task comments add and delete
- [ ] Task allocation calendar shows logged hours

### JIRA Board (Work Items)
- [ ] Create Sprint, activate, close
- [ ] Create Epic → User Story → Task → SubTask → Bug
- [ ] All work item fields save: type, priority, status, assignee, sprint, milestone, story points, labels
- [ ] Bug-specific fields save: severity, classification, flag, reproducibility, reminder
- [ ] Drag work item between columns → status updates in DB and in open modal
- [ ] Milestone fields visible on ALL work item types (not just BUG)
- [ ] Log time on work item → saves to `timesheet_entries` table
- [ ] Attachments and comments on work items
- [ ] Child items (sub-tasks, bugs under a story)

### Timesheet
- [ ] Employee logs hours → entry saves in DB
- [ ] Manager approves/rejects timesheet entries
- [ ] Approved hours visible in Timesheet report later

### KPI Page (currently static — just verify UI works, data accuracy comes in Phase 3)
- [ ] Page loads without errors
- [ ] Period selector, department filter, search all work
- [ ] Admin can open score entry modal
- [ ] Charts render correctly

### Reports Page (currently static — just verify UI works)
- [ ] All 7 tabs load without errors
- [ ] Period and project filters change displayed data (from static source)
- [ ] CSV export downloads correct data for each tab
- [ ] Capacity grid renders with colour coding

### Dashboard / Overview
- [ ] Stat cards show correct live counts (active projects, tasks, users)
- [ ] My Tasks table shows tasks assigned to logged-in user
- [ ] Progress donut chart matches task status counts

---

## Phase 2 — Data Capture Audit

Before making reports dynamic, confirm every report parameter has a data source in the DB.
Check each metric used in reports and trace it back to the feature that creates the data:

| Report Parameter | Source Table | Feature That Creates It |
|-----------------|-------------|------------------------|
| Tasks completed | `work_items` (status=QA_DONE/DONE) | JIRA Board — close work item |
| Hours logged | `timesheet_entries` | Log time on work item / Task |
| On-time completion | `work_items` (dueDate vs completedAt) | Work item due date + close |
| Bug severity counts | `work_items` (type=BUG, severity field) | Create bug on board |
| Sprint story points | `work_items` (storyPoints, sprintId) | Work item in sprint |
| Hours allocated | `task_allocations` | Task Allocation calendar |
| Approved timesheet hours | `timesheet_entries` (status=APPROVED) | Timesheet approval |
| Leave days | `leave_logs` | **No UI yet** — need Self-Log panel |
| Learning hours | `learning_logs` | **No UI yet** — need Self-Log panel |
| Innovation entries | `innovation_logs` | **No UI yet** — need Self-Log panel |
| Manual KPI scores | `kpi_records` | KPI score entry modal (admin) |
| Capacity: holidays | `holidays` table | Holiday calendar in Settings |
| Capacity: leave | `leave_logs` | **No UI yet** — need Self-Log panel |
| Capacity: occupied | `timesheet_entries` | Log time on work item |

**Gaps to fix before going live:**
- Self-Log Panel (leave / learning / innovation) — backend exists, no frontend UI
- KPI score entry modal needs to actually POST to `/kpi-records` (currently has no save action)

---

## Phase 3 — Make Overview Dynamic

**File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx`  
Dashboard already uses `dashboardApi.getStats()` — verify live data is correct:
- [ ] Stat cards match actual DB counts
- [ ] My Tasks table shows real assigned tasks
- [ ] Fix: Team performance score hardcoded as `0` → compute from KPI avg for current period
- [ ] Fix: Activity Chart uses mock data → wire to productivity data by month

---

## Phase 4 — Make Reports Dynamic (One Tab at a Time)

**File:** `frontend/src/features/reports/pages/ReportsPage.tsx`  
Replace each static import with `useQuery` keyed on `[tab, period, projectId]`.

Work through tabs in this order (simplest → most complex):

1. **Projects tab** → `analyticsApi.getProjects(period, projectId)` — straightforward count data
2. **Timesheet tab** → `analyticsApi.getTimesheet(period, projectId)` — approved hours
3. **Task Allocation tab** → `analyticsApi.getAllocation(period, projectId)` — allocated hours
4. **Productivity tab** → `analyticsApi.getProductivity(period, projectId)` — needs timesheet + work items
5. **Bugs tab** → `analyticsApi.getBugs(period, projectId)` — needs bug work items
6. **Capacity tab** → `analyticsApi.getCapacity(period)` — needs leave_logs + timesheet + holidays
7. **KPI Appraisal tab** → `analyticsApi.getKpi(period)` — most complex (13 metrics)

For each tab:
- Replace static import with `useQuery`
- Pass `period` and `projectId` from the existing UI selectors
- Add loading spinner (`isLoading`) and empty state (`No data for this period`)
- Verify CSV export still works with live data array

---

## Phase 5 — Make KPI Page Dynamic

**File:** `frontend/src/features/kpi/pages/KpiPage.tsx`

1. Replace `STATIC_KPI_DATA` with `useQuery(() => analyticsApi.getKpi(period, userId?))`
2. Map `LiveEmployeeKpiRecord[]` → internal `EmployeeKpiData` shape (keep `KPI_METRICS`, `computeGrade`, `computeCategoryScores` helpers — only remove the hardcoded data array)
3. Wire period selector → passes `YYYY-MM` to query
4. Department filter + search → client-side filter on live data
5. Admin score entry modal → call `analyticsApi.upsertKpiRecord(...)` on save, invalidate `['kpi', period]`
6. Add loading and error states

---

## Phase 6 — Self-Log Panel (New UI)

Needed for KPI metrics: attendance, learning_velocity, automation_innovation.

**New file:** `frontend/src/features/kpi/components/SelfLogPanel.tsx`  
3-tab panel added to KPI page (visible to all roles for own data):

- **Leave tab**: date picker, type (SICK/CASUAL/OTHER), notes → `POST /leave-logs`
- **Learning tab**: period, topic, hours, description → `POST /learning-logs`
- **Innovation tab**: period, title, impact description, type → `POST /innovation-logs`

Show existing logs for the selected period with delete option.

---

## Key Files Reference

| File | What It Does |
|------|-------------|
| `frontend/src/features/kpi/pages/KpiPage.tsx` | KPI dashboard — currently static |
| `frontend/src/features/reports/pages/ReportsPage.tsx` | 7-tab reports — currently static |
| `frontend/src/api/analyticsApi.ts` | All API calls ready, not yet used by pages |
| `backend/src/analytics/analytics.service.ts` | All 7 live DB endpoints implemented |
| `backend/src/kpi-records/kpi-records.service.ts` | Manual score save/fetch |
| `backend/src/self-logs/self-logs.service.ts` | Leave/learning/innovation log CRUD |
| `backend/src/dashboard/dashboard.service.ts` | Live dashboard stats (team score = 0, fix it) |
| `frontend/src/features/kpi/data/kpiStaticData.ts` | Keep helpers, remove STATIC_KPI_DATA array |
| `frontend/src/features/reports/data/reportsStaticData.ts` | Delete after all tabs are live |

---

## Definition of Done
- Every form saves data that appears in DB (verify via test create → check report)
- Overview stat cards show correct live counts
- Each Reports tab shows data that changes when DB data changes
- KPI scores reflect actual work items, timesheets, and manual entries
- No hardcoded static arrays driving any UI that the user sees as "live" data
