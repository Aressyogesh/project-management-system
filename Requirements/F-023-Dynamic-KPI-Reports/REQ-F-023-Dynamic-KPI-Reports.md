# REQ-F-023 — Dynamic KPI + Reports + Monthly Capacity

**Feature ID:** F-023  
**Feature Name:** Dynamic KPI & Reports (+ Monthly Capacity Tab)  
**Author:** Yogesh Lolage  
**Date:** 2026-05-28  
**Status:** In Development  

---

## 1. User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|----------|
| US-1 | Admin | See all 13 KPI metrics auto-computed from real work-item and timesheet data | I don't need to manually update static numbers |
| US-2 | Admin | Enter the 3 manual KPI scores (Engineering Hygiene, Reporting, Positive Behaviour) for each employee each month | All 13 metrics are represented in the final score |
| US-3 | Employee | See my own KPI score computed from my actual DB data | I have a fair, evidence-based appraisal |
| US-4 | Admin | View live Team Productivity, Project Summary, Bug Summary, Allocation, and Timesheet reports | Decision-making is data-driven |
| US-5 | Admin | See a Monthly Capacity matrix showing employee availability per day | I can plan resource allocation |
| US-6 | Employee | Self-log leave days, learning activities, and innovation contributions | My self-service inputs are counted in KPI |

---

## 2. Business Requirements

| BR-# | Requirement |
|------|-------------|
| BR-1 | All 7 auto-computed KPI metrics derive from `WorkItem`, `TimesheetEntry`, and `Sprint` tables |
| BR-2 | 3 manual KPI metrics (Engineering Hygiene, Reporting, Positive Behaviour) are stored in `KpiRecord` table, entered by ADMIN/PM |
| BR-3 | 3 employee self-service KPI metrics (Attendance, Learning Velocity, Automation & Innovation) derive from `LeaveLog`, `LearningLog`, `InnovationLog` |
| BR-4 | Reports endpoints return live DB data; static arrays are removed from frontend |
| BR-5 | Monthly Capacity Report is a matrix of employees × days; each cell colour-coded by availability status |
| BR-6 | Capacity cell priority: holiday > weekly off > leave > hours ≥ 8 > hours 1–7.9 > available |
| BR-7 | CSV export on all 7 report tabs uses live data |

---

## 3. Acceptance Criteria

| AC-# | Criterion |
|------|-----------|
| AC-1 | `GET /analytics/kpi?period=2026-05` returns a valid `EmployeeKpiRecord[]` for all active users |
| AC-2 | Sprint Reliability = (QA_DONE story points) / (committed story points in sprint) × 15 |
| AC-3 | Delivery Timeliness = (items completed on or before dueDate) / (total assigned items with dueDate) × 15 |
| AC-4 | Estimation Accuracy uses variance bands: ≤15%=10, 16–30%=7, 31–50%=4, >50%=0 |
| AC-5 | Throughput = (QA_DONE items / total assigned items in sprint) × 10 |
| AC-6 | Internal Rework Ratio uses stepped scoring from `reopenCount` |
| AC-7 | Defect Leakage uses BUG severity stepping |
| AC-8 | Dependency & Agile Mgmt uses BLOCKED item proactive-flag ratio |
| AC-9 | `POST /kpi-records` (ADMIN/PM only) upserts manual scores per userId+period+metricId |
| AC-10 | All 6 original report tabs show live DB data (no static arrays) |
| AC-11 | 7th tab "Capacity" shows monthly matrix with correct colour coding |
| AC-12 | Today's column is highlighted in the capacity view |
| AC-13 | Employee self-service: `POST /leave-logs`, `POST /learning-logs`, `POST /innovation-logs` |
| AC-14 | KpiScoreEntryPanel visible to ADMIN/SUPER_USER on KPI page; shows all employees × 3 manual metrics |
| AC-15 | Employee KPI view shows own computed record (not static fallback) |

---

## 4. Dependencies

- F-022 merged: `WorkItem`, `Sprint`, `TimesheetEntry`, `KpiRecord`, `LeaveLog`, `LearningLog`, `InnovationLog` models exist in DB
- `Holiday` model and `PortalConfig.workingDays` exist (from settings module)
- `ProjectMember` model exists for project-based filtering

---

## 5. Out of Scope

- Timesheet approval workflow
- PDF export
- Push notifications for KPI changes
- Historical KPI trend charts

---

## 6. DB Schema (already applied in F-022)

All required models exist:
- `WorkItem` — `completedAt`, `reopenCount`, `storyPoints`, `estimatedHours`, `severity`, `bugClassification`
- `TimesheetEntry` — `userId`, `date`, `hours`, `workItemId`
- `KpiRecord` — `userId`, `period`, `metricId`, `points`
- `LeaveLog` — `userId`, `date`, `type`
- `LearningLog` — `userId`, `period`, `hours`
- `InnovationLog` — `userId`, `period`, `type`
- `Holiday` — `date`, `name`
- `PortalConfig` — `workingDays` (JSON)

**Migration:** Not required — schema already deployed via F-022.

---

## 7. API Contract

### A. Analytics — KPI

```
GET /analytics/kpi?period=2026-05&userId={optional}
Auth: JWT, any role
Response: EmployeeKpiRecord[]
```

### B. Analytics — Reports

```
GET /analytics/reports/productivity?period=2026-05&projectId={optional}
GET /analytics/reports/projects?period=2026-05&projectId={optional}
GET /analytics/reports/bugs?period=2026-05&projectId={optional}
GET /analytics/reports/allocation?period=2026-05&projectId={optional}
GET /analytics/reports/timesheet?period=2026-05&projectId={optional}
GET /analytics/reports/capacity?period=2026-05
Auth: JWT; Admin/SuperUser for full team; Employee gets own data
```

### C. KPI Records (manual scores)

```
POST /kpi-records
Body: { userId, period, metricId, points, notes? }
Auth: ADMIN, SUPER_USER only

GET /kpi-records?userId=&period=
Auth: JWT any role
```

### D. Self-service Logs

```
POST   /leave-logs        Body: { date, type, description? }
GET    /leave-logs?period=
DELETE /leave-logs/:id

POST   /learning-logs     Body: { period, topic, hours, description? }
GET    /learning-logs?period=
DELETE /learning-logs/:id

POST   /innovation-logs   Body: { period, title, impact, type }
GET    /innovation-logs?period=
DELETE /innovation-logs/:id
```

---

## 8. KPI Metric Computation Logic

| Metric | Formula | Source |
|--------|---------|--------|
| Sprint Reliability (15) | (QA_DONE storyPoints) / (committed storyPoints) × 15 | WorkItem by sprintId + status |
| Delivery Timeliness (15) | (completedAt ≤ dueDate items) / (total with dueDate) × 15 | WorkItem.completedAt vs dueDate |
| Estimation Accuracy (10) | variance = |actualHours - estimatedHours| / estimatedHours; ≤15%=10, 16-30%=7, 31-50%=4, >50%=0 | TimesheetEntry sum vs estimatedHours |
| Throughput (10) | (QA_DONE count / total assigned in sprint) × 10 | WorkItem by assigneeId + sprintId |
| Internal Rework Ratio (5) | ratio = SUM(reopenCount) / total completed; 0%=5, ≤10%=3, >10%=0 | WorkItem.reopenCount |
| Defect Leakage (10) | 0 bugs=10; 1 MINOR=7; 2 MINOR=4; 1 CRITICAL/3+ MINOR=0 | WorkItem[type=BUG] by reporterId |
| Dependency & Agile (5) | items flagged BLOCKED / total items; ≥50%=5, 20-49%=3, <20%=0 | WorkItem.status history (BLOCKED count via status=BLOCKED) |
| Engineering Hygiene (5) | KpiRecord.points for metricId='engineering_hygiene' | KpiRecord |
| Reporting & Docs (5) | KpiRecord.points for metricId='reporting_documentation' | KpiRecord |
| Positive Behaviour (5) | KpiRecord.points for metricId='positive_behaviour' | KpiRecord |
| Attendance (5) | leaveDays in period; 0=5, ≤1=5, 1.5=3, >1.5 or unapproved=0 | LeaveLog |
| Learning Velocity (5) | learningHours in period; ≥4h=5, 1-3.9h=3, 0=0 | LearningLog |
| Automation & Innovation (5) | innovationLogs count; ≥1 AI_IMPLEMENTATION=5, ≥1 other=3, 0=0 | InnovationLog |
