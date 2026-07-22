# Requirements — F-019 KPI Store

Feature ID   : F-019
Feature Name : KPI Store — Digital Appraisal System
Epic         : Project Management System (PMS)
Priority     : High
Roles        : Super User, Admin (full view + management); Employee (own KPI only)
Date         : 2026-05-28

---

## User Story

As a Super User or Admin, I want to view a comprehensive KPI dashboard showing all employees'
appraisal scores across 13 weighted metrics so that I can assess team performance, identify
underperformers, and make informed appraisal decisions.

As an Employee, I want to view my own KPI scores and grade so that I understand my
performance standing and areas for improvement.

---

## Business Rules

BR-1: Total KPI score is the sum of all 13 metric points, where max total = 100.
BR-2: Grade is automatically determined: A=90+, B=75–89.99, C=60–74.99, D=<60.
BR-3: KPI weightages per metric are fixed per the Digital Appraisal System xlsx:
      - Sprint Reliability: 15 pts max
      - Delivery Timeliness: 15 pts max
      - Estimation Accuracy: 10 pts max (stepped: ≤15% var=10, 16-30%=7, 31-50%=4, >50%=0)
      - Throughput & Complexity: 10 pts max (formula: Valid PRs / Total PRs × 10)
      - Internal Rework Ratio: 5 pts max (0% reopens=5, ≤10%=3, >10%=0)
      - Defect Leakage: 10 pts max (0 bugs=10, 1 minor=7, 2 minor=4, 1 critical/3+minor=0)
      - Engineering Hygiene: 5 pts max (manual: best practices adherence)
      - Dependency & Agile Management: 5 pts max (stepped: proactive=5, delays=3, blockers=0)
      - Reporting & Documentation: 5 pts max (stepped: accurate=5, inconsistent=3, missed=0)
      - Learning Velocity: 5 pts max (stepped: completed=5, partial=3, none=0)
      - Automation & Innovation: 5 pts max (stepped: AI impl=5, drafted=3, zero=0)
      - Attendance: 5 pts max (stepped: ≤1 leave=5, 1.5 leaves=3, unapproved/>1.5=0)
      - Positive Behaviour & Conduct: 5 pts max (stepped: professional=5, minor issues=3, poor=0)
BR-4: Super User and Admin can view KPI data for ALL employees.
BR-5: An Employee can only view their own KPI data.
BR-6: KPI period is expressed as YYYY-MM (e.g. "2026-05").
BR-7: Category groupings:
      - Delivery & Execution: Sprint + Delivery + Estimation + Throughput (max 50)
      - Quality & Engineering Excellence: Rework + Defect + Hygiene (max 20)
      - Ownership & Collaboration: Dependency + Reporting (max 10)
      - Growth & Innovation: Learning + Automation (max 10)
      - Behaviour & Reliability: Attendance + Behaviour (max 10)

---

## Acceptance Criteria

AC-1: The KPI page at /kpi is accessible to authenticated Super User and Admin roles.
AC-2: The page displays a period selector (YYYY-MM format) to filter KPI data.
AC-3: Four summary stat cards are shown: Team Average Score, Grade A count, Grade B count, Grade C/D count.
AC-4: A grouped bar chart shows the team's average score per category (5 categories) as a % of max.
AC-5: A pie chart shows grade distribution (A, B, C, D) across the team.
AC-6: All employees are listed in a table showing: Name, Role, Department, scores per category, total score, grade badge.
AC-7: Clicking on an employee row expands a detail panel showing:
      - A radar chart (all 5 categories as %)
      - All 13 individual metrics with points earned / max points
AC-8: Grade badges are colour-coded: A=green, B=blue, C=amber, D=red.
AC-9: The leaderboard section shows the top 5 performers sorted by total score.
AC-10: An Employee role user accessing /kpi sees only their own KPI data (their personal card + radar).
AC-11: The page title and breadcrumb correctly reflect "KPI Appraisal".

---

## Database / Schema Design

The `KpiRecord` model is planned in PLAN.md:

```
KpiRecord {
  id          : UUID      [PK]
  userId      : UUID      [FK → User]
  period      : String    [YYYY-MM format]
  category    : String    [e.g. "Delivery & Execution"]
  metric      : String    [e.g. "Sprint Reliability"]
  weightage   : Float     [e.g. 0.15]
  pointsGained: Float     [actual points scored]
  achieved    : Float?    [raw numerator — e.g. story points delivered]
  total       : Float?    [raw denominator — e.g. story points committed]
  recordedById: UUID      [FK → User — who entered the data]
  createdAt   : DateTime
}
```

Migration: Not required for Phase 10 (frontend static data only).
Backend model and migration will be added in a future backend implementation sprint.

---

## API Contract Design

Note: Phase 10 uses static frontend data. The API contract below is defined for
the future backend implementation (Phase 11+).

```
GET /api/v1/kpi
Auth: Yes | Roles: SUPER_USER, ADMIN
Query: ?period=2026-05&userId=<optional>
Response 200:
{
  "records": [
    {
      "userId": string,
      "period": string,
      "metrics": [{ "metric": string, "category": string, "pointsGained": number, "maxPoints": number }],
      "totalScore": number,
      "grade": "A"|"B"|"C"|"D",
      "categoryScores": [{ "category": string, "earned": number, "max": number }]
    }
  ]
}

GET /api/v1/kpi/summary/:userId
Auth: Yes | Roles: SUPER_USER, ADMIN, Owner
Response 200:
{
  "userId": string,
  "period": string,
  "totalScore": number,
  "grade": string,
  "metrics": [...],
  "categoryScores": [...]
}
```

---

## Dependencies

- Phase 1 (Auth, RBAC, AppLayout) — must be complete
- Recharts library (already installed as dependency)
- Users must exist in the system (seeded)

---

## Out of Scope

- Backend KPI CRUD endpoints (deferred to backend sprint)
- KPI entry form for Admin to record new scores (deferred)
- KPI history across multiple periods
- Configurable metric weightages (Super User setting — deferred)
- PDF/CSV export of KPI report (Phase 11)
- Email notifications for KPI appraisal results
