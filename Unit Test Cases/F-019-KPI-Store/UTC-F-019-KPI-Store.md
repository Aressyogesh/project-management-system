# Unit Test Cases — F-019 KPI Store

Feature ID   : F-019
Feature Name : KPI Store — Digital Appraisal System
Layer        : Frontend (Vitest + React Testing Library)
Date         : 2026-05-28

---

## UTC-F019-FE-001
Title        : KpiPage_SuperUserRole_RendersTeamDashboard
Layer        : Frontend
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-1, AC-3
Framework    : Vitest + React Testing Library

Arrange:
  - Mock useAuthStore to return user with systemRole = SUPER_USER
  - Render KpiPage wrapped in MemoryRouter and QueryClientProvider

Act:
  - Component mounts

Assert:
  - "KPI Appraisal" heading is visible
  - "Team Average" stat card is rendered
  - "Grade A" stat card is rendered

---

## UTC-F019-FE-002
Title        : KpiPage_AdminRole_RendersTeamDashboard
Layer        : Frontend
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-1
Framework    : Vitest + React Testing Library

Arrange:
  - Mock useAuthStore to return user with systemRole = ADMIN

Act:
  - Render KpiPage

Assert:
  - "KPI Appraisal" heading is visible
  - Employee table is rendered (at least one table row)

---

## UTC-F019-FE-003
Title        : KpiPage_PeriodSelector_IsRendered
Layer        : Frontend
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-2
Framework    : Vitest + React Testing Library

Arrange:
  - Render KpiPage with SUPER_USER role

Act:
  - Component mounts

Assert:
  - A period selector (select element or button showing YYYY-MM) is present in the DOM

---

## UTC-F019-FE-004
Title        : KpiSummaryCards_DisplaysCorrectGradeCounts
Layer        : Frontend
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-3
Framework    : Vitest + React Testing Library

Arrange:
  - Import static KPI data (10 employees: 3×A, 4×B, 2×C, 1×D)
  - Render KpiSummaryCards with this data

Act:
  - Component mounts

Assert:
  - Text "3" appears near "Grade A"
  - Text "4" appears near "Grade B"
  - Text "3" appears near "Grade C/D"

---

## UTC-F019-FE-005
Title        : computeGrade_ScoreAbove90_ReturnsA
Layer        : Frontend utility
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-8 (grade logic)
Framework    : Vitest

Arrange:
  - Import computeGrade utility from kpiStaticData or kpi.utils

Act:
  - Call computeGrade(92)
  - Call computeGrade(90)
  - Call computeGrade(89.99)

Assert:
  - computeGrade(92) returns "A"
  - computeGrade(90) returns "A"
  - computeGrade(89.99) returns "B"

---

## UTC-F019-FE-006
Title        : computeGrade_ScoreBetween75And89_ReturnsB
Layer        : Frontend utility
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-8
Framework    : Vitest

Arrange:
  - Import computeGrade

Act:
  - Call computeGrade(75), computeGrade(82), computeGrade(89.99)

Assert:
  - All return "B"

---

## UTC-F019-FE-007
Title        : computeGrade_ScoreBetween60And74_ReturnsC
Layer        : Frontend utility
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-8
Framework    : Vitest

Arrange:
  - Import computeGrade

Act:
  - Call computeGrade(60), computeGrade(71), computeGrade(74.99)

Assert:
  - All return "C"

---

## UTC-F019-FE-008
Title        : computeGrade_ScoreBelow60_ReturnsD
Layer        : Frontend utility
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-8
Framework    : Vitest

Arrange:
  - Import computeGrade

Act:
  - Call computeGrade(59.99), computeGrade(46), computeGrade(0)

Assert:
  - All return "D"

---

## UTC-F019-FE-009
Title        : KpiEmployeeTable_ShowsAllEmployees
Layer        : Frontend
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-6
Framework    : Vitest + React Testing Library

Arrange:
  - Render KpiPage with ADMIN role mocked

Act:
  - Component mounts with static data (10 employees)

Assert:
  - "Rahul Sharma" text is visible in the document
  - "Pooja Mehta" text is visible
  - "Deepak Verma" text is visible
  - 10 rows (or employee name elements) are in the document

---

## UTC-F019-FE-010
Title        : computeCategoryScores_CorrectSumsPerCategory
Layer        : Frontend utility
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-4
Framework    : Vitest

Arrange:
  - Import computeCategoryScores and a known employee record (Rahul: total=90)

Act:
  - Call computeCategoryScores(rahulMetrics)

Assert:
  - Delivery & Execution score = 40 (sum of sprint 12 + delivery 13 + estimation 7 + throughput 8)
  - Quality & Engineering score = 20 (rework 5 + defect 10 + hygiene 5)
  - Ownership & Collaboration score = 10 (dep 5 + reporting 5)
  - Growth & Innovation score = 10 (learning 5 + automation 5)
  - Behaviour & Reliability score = 10 (attendance 5 + behaviour 5)

---

## UTC-F019-FE-011
Title        : KpiPage_GradeBadge_AIsGreenColour
Layer        : Frontend
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-8
Framework    : Vitest + React Testing Library

Arrange:
  - Render an employee row with Grade A employee (e.g. Arjun Patel, score 91)

Act:
  - Find the grade badge element

Assert:
  - Badge element has green-related class (e.g. "bg-emerald-100" or "text-emerald-700")

---

## UTC-F019-FE-012
Title        : KpiLeaderboard_ShowsTop5ByScore
Layer        : Frontend
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-9
Framework    : Vitest + React Testing Library

Arrange:
  - Render KpiLeaderboard with static data (10 employees)

Act:
  - Component mounts

Assert:
  - Pooja Mehta (94) is visible in leaderboard
  - Arjun Patel (91) is visible
  - Rahul Sharma (90) is visible
  - Deepak Verma (46, last place) is NOT in leaderboard (only top 5 shown)

---

## UTC-F019-FE-013
Title        : KpiPage_EmployeeRow_ExpandsOnClick
Layer        : Frontend
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-7
Framework    : Vitest + React Testing Library + userEvent

Arrange:
  - Render KpiPage with ADMIN role
  - Wait for employees to be displayed

Act:
  - userEvent.click on the first employee row

Assert:
  - Detail panel appears (contains metric names like "Sprint Reliability")
  - Radar chart container is visible (role="img" or specific test-id)

---

## UTC-F019-FE-014
Title        : KpiPage_EmployeeRole_ShowsOwnDataOnly
Layer        : Frontend
File         : frontend/src/features/kpi/__tests__/KpiPage.test.tsx
AC Covered   : AC-10
Framework    : Vitest + React Testing Library

Arrange:
  - Mock useAuthStore to return user with systemRole = EMPLOYEE and id matching one static employee

Act:
  - Render KpiPage

Assert:
  - The employee's own KPI card is visible
  - Other employees' names are NOT visible
  - Team average section is NOT rendered (employee sees personal view only)
