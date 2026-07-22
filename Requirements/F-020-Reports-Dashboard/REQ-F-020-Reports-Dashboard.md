# REQ-F-020 — Team Reports Dashboard (Phase 11)

**Date:** 2026-05-28  
**Feature ID:** F-020  
**Phase:** 11 — Dashboard & Reports  
**Author:** Claude Code  

---

## 1. User Story

> As an **Admin or Super User**, I want a dedicated Reports page that shows team productivity, KPI appraisal summaries, project activity, and bug statistics — using static data for all system users — so that I can assess team performance at a glance without needing a live backend reports API.

> As an **Employee**, I want to see my own performance metrics on the reports page so I can track my standing relative to the team.

---

## 2. Business Rules

| ID | Rule |
|----|------|
| BR-1 | Reports page is accessible at `/reports`; protected by `ProtectedRoute` |
| BR-2 | ADMIN and SUPER_USER see all 14 team members' data; EMPLOYEE sees only their own record highlighted |
| BR-3 | All data is static for May 2026, using the same 14 users as STATIC_KPI_DATA in kpiStaticData.ts |
| BR-4 | Four report sections: Team Productivity, KPI Appraisal, Project Summary, Bug Summary |
| BR-5 | Each section is accessible via a tab navigation at the top of the page |
| BR-6 | Charts use Recharts (BarChart, PieChart, LineChart, RadarChart) |
| BR-7 | An Announcements / What's New widget is added to the existing DashboardPage |
| BR-8 | Export buttons (PDF/CSV) are UI placeholders only — no download logic required in this phase |

---

## 3. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | `/reports` route renders ReportsPage within ProtectedRoute + AppLayout |
| AC-2 | Page has 4 tab buttons: Team Productivity, KPI Appraisal, Project Summary, Bug Summary |
| AC-3 | Team Productivity tab: bar chart of tasks completed per user + table with name, tasks, hours, on-time %, productivity score |
| AC-4 | KPI Appraisal tab: grade distribution pie chart, team average score card, top performers list, full employee table reusing STATIC_KPI_DATA |
| AC-5 | Project Summary tab: 3 static projects with task counts, completion %, team size, status badges |
| AC-6 | Bug Summary tab: bug counts by severity and classification (static), pie chart for severity distribution |
| AC-7 | ADMIN/SUPER_USER see all 14 users; EMPLOYEE view shows a personal summary card |
| AC-8 | Announcements widget added to DashboardPage below the existing charts row |
| AC-9 | Period selector present (May 2026 default, previous months available) |
| AC-10 | Sidebar nav item "Reports" links to `/reports` and shows active state |

---

## 4. Out of Scope

- Live API integration for reports (backend `GET /api/v1/reports/*` endpoints)
- Actual PDF/CSV file download
- Email delivery of reports
- Configurable date ranges beyond the static periods

---

## 5. Dependencies

- `STATIC_KPI_DATA` from `frontend/src/features/kpi/data/kpiStaticData.ts` (re-used for KPI tab)
- Recharts (already installed)
- Existing `ProtectedRoute`, `AppLayout`, `useAuthStore`
- Sidebar nav (existing component, needs Reports link)

---

## 6. DB / Schema Design

**Not required** — F-020 is a frontend-only static-data feature. No Prisma schema changes.

---

## 7. API Contract

**Not required** — all data is static. No new API endpoints.

Static data files to be created:
- `frontend/src/features/reports/data/reportsStaticData.ts` — productivity, project, bug static data
- Reuses `STATIC_KPI_DATA` for KPI appraisal tab

---

## 8. Static Data Design

### Team Productivity (14 users, May 2026)

| User | Tasks Done | Hours Logged | On-Time % | Score |
|------|-----------|-------------|-----------|-------|
| Hemant Atre | 28 | 168 | 96% | 94 |
| Yogesh Lolage | 24 | 152 | 92% | 89 |
| Pratiksha Khairnar | 22 | 144 | 90% | 86 |
| System Admin | 18 | 120 | 88% | 82 |
| Gaurav Patil | 20 | 136 | 85% | 80 |
| Shital Joshi | 19 | 130 | 84% | 79 |
| Deepali Jawharkar | 17 | 124 | 82% | 77 |
| Prashik Shirsat | 16 | 118 | 80% | 75 |
| John Developer | 14 | 104 | 72% | 68 |
| Ganesh Khalkar | 13 | 98 | 70% | 65 |
| Rohit More | 12 | 92 | 66% | 62 |
| Yash Boraste | 11 | 88 | 62% | 58 |
| Super Admin | 6 | 48 | 50% | 44 |
| Jayvant Bagul | 5 | 40 | 45% | 42 |

### Projects (static)

| Project | Tasks | Done | Team | Status |
|---------|-------|------|------|--------|
| PMS Web App | 48 | 36 | 8 | Active |
| Mobile CRM | 32 | 20 | 5 | Active |
| SalesForce Integration | 18 | 18 | 3 | Completed |

### Bug Summary (static, May 2026)

| Severity | Count |
|----------|-------|
| Show Stopper | 2 |
| Critical | 5 |
| Major | 12 |
| Minor | 21 |

| Classification | Count |
|----------------|-------|
| UI/Usability | 14 |
| New Bug | 10 |
| Enhancement | 8 |
| Performance | 4 |
| Other | 4 |
