# REQ-F-021 — Phase 11 Complete: Task Allocation, Timesheet & Export Reports

**Date:** 2026-05-28  
**Feature ID:** F-021  
**Phase:** 11 — Dashboard & Reports (Completion)  
**Author:** Claude Code  

---

## 1. User Story

> As an **Admin or Super User**, I want two additional report tabs (Task Allocation and Timesheet) on the Reports page, along with functional CSV export for all report tabs, so I can view team workload distribution and logged hours without needing a live backend integration.

> As an **Employee**, I want to see my own task allocation and timesheet summary in the reports view.

---

## 2. Business Rules

| ID | Rule |
|----|------|
| BR-1 | Two new tabs added to the existing ReportsPage: "Task Allocation" and "Timesheet" |
| BR-2 | All data is static for May 2026, using the same 14 users as STATIC_KPI_DATA / STATIC_PRODUCTIVITY_DATA |
| BR-3 | Task Allocation tab shows: employee name, role, allocated tasks, total hours, utilisation % |
| BR-4 | Timesheet tab shows: employee name, hours logged per project, submission status, approval status |
| BR-5 | CSV export is functional for every tab — clicking "Export CSV" downloads a real `.csv` file via browser Blob API |
| BR-6 | PDF export button remains a UI placeholder (no download logic) in this phase |
| BR-7 | ADMIN/SUPER_USER see all 14 employees; EMPLOYEE sees only their own row highlighted |
| BR-8 | Dashboard live-data items (stat cards, activity chart, my task table, today task widget, tasks progress chart) are already built and are marked complete in FEATURES.md |
| BR-9 | Period selector (May 2026) applies to both new tabs |

---

## 3. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | ReportsPage renders 6 tabs: Team Productivity, KPI Appraisal, Project Summary, Bug Summary, Task Allocation, Timesheet |
| AC-2 | Task Allocation tab: bar chart of allocated hours per employee + table with name, role, tasks, hours, utilisation % |
| AC-3 | Timesheet tab: table with name, project, hours logged, status (Approved/Submitted/Draft); total hours summary card |
| AC-4 | "Export CSV" button on every tab downloads a real `.csv` file named `<tab>-report-may-2026.csv` |
| AC-5 | CSV content matches the data shown in the active tab's table |
| AC-6 | ADMIN/SUPER_USER see all 14 employees in both new tabs; EMPLOYEE sees personal summary |
| AC-7 | STATIC_ALLOCATION_DATA has 14 entries (one per user) |
| AC-8 | STATIC_TIMESHEET_DATA has 14 entries (one per user) |
| AC-9 | Total allocated hours across all employees sums to a known value (verifiable in unit tests) |
| AC-10 | FEATURES.md Phase 11 dashboard items marked as complete (~~strikethrough~~) |

---

## 4. Out of Scope

- Live API integration for task allocation or timesheet data
- PDF file generation
- Email delivery
- Configurable date ranges beyond static May 2026

---

## 5. Dependencies

- Existing `ReportsPage` at `frontend/src/features/reports/pages/ReportsPage.tsx`
- Existing `reportsStaticData.ts` — to be extended with allocation and timesheet data
- Same 14 users as `STATIC_KPI_DATA`

---

## 6. DB / Schema Design

**Not required** — F-021 is a frontend-only static-data feature.

---

## 7. API Contract

**Not required** — all data is static.

New static data to be added to `reportsStaticData.ts`:
- `STATIC_ALLOCATION_DATA` — 14 records (userId, name, role, tasks allocated, hours allocated, utilisation %)
- `STATIC_TIMESHEET_DATA` — 14 records (userId, name, entries per project, hours logged, status)

---

## 8. Static Data Design

### Task Allocation (14 users, May 2026)

| User | Tasks Allocated | Hours Allocated | Utilisation % |
|------|----------------|----------------|---------------|
| Hemant Atre | 30 | 176 | 110% |
| Yogesh Lolage | 26 | 160 | 100% |
| Pratiksha Khairnar | 24 | 152 | 95% |
| System Admin | 20 | 128 | 80% |
| Gaurav Patil | 22 | 144 | 90% |
| Shital Joshi | 21 | 136 | 85% |
| Deepali Jawharkar | 19 | 128 | 80% |
| Prashik Shirsat | 18 | 120 | 75% |
| John Developer | 15 | 104 | 65% |
| Ganesh Khalkar | 14 | 96 | 60% |
| Rohit More | 13 | 88 | 55% |
| Yash Boraste | 12 | 80 | 50% |
| Super Admin | 7 | 48 | 30% |
| Jayvant Bagul | 6 | 40 | 25% |

### Timesheet Summary (14 users, May 2026)

| User | Project | Hours Logged | Status |
|------|---------|-------------|--------|
| Hemant Atre | PMS Web App | 168 | Approved |
| Yogesh Lolage | PMS Web App | 152 | Approved |
| Pratiksha Khairnar | PMS Web App | 144 | Approved |
| System Admin | PMS Web App | 120 | Approved |
| Gaurav Patil | Mobile CRM | 136 | Approved |
| Shital Joshi | Mobile CRM | 130 | Approved |
| Deepali Jawharkar | PMS Web App | 124 | Submitted |
| Prashik Shirsat | PMS Web App | 118 | Submitted |
| John Developer | Mobile CRM | 104 | Submitted |
| Ganesh Khalkar | SalesForce Integration | 98 | Approved |
| Rohit More | Mobile CRM | 92 | Submitted |
| Yash Boraste | PMS Web App | 88 | Draft |
| Super Admin | SalesForce Integration | 48 | Approved |
| Jayvant Bagul | SalesForce Integration | 40 | Draft |
