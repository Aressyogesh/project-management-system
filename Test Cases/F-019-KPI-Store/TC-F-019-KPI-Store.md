# E2E Test Cases — F-019 KPI Store

Feature ID   : F-019
Feature Name : KPI Store — Digital Appraisal System
Date         : 2026-05-28
Framework    : Playwright (future automation); currently manual verification

---

## TC-F019-001
Test Case ID : TC-F019-001
Title        : Super User Accesses KPI Dashboard and Sees All Employees
Feature      : F-019 — KPI Store
AC Covered   : AC-1, AC-6
Priority     : High
Type         : Happy Path

Given  : A Super User is logged into PMS
  And  : The KPI page (/kpi) is accessible from the sidebar

When   : The Super User clicks "KPI" in the sidebar

Then   : The page /kpi loads without error
  And  : The heading "KPI Appraisal" is visible
  And  : All 10 static employees are listed in the employee table
  And  : Each row shows Name, Role, Department, Total Score, and Grade

Expected Response : HTTP 200; KPI page renders with employee table

---

## TC-F019-002
Test Case ID : TC-F019-002
Title        : Admin Views KPI Summary Cards With Correct Counts
Feature      : F-019 — KPI Store
AC Covered   : AC-3
Priority     : High
Type         : Happy Path

Given  : An Admin is logged in
  And  : The KPI page is loaded

When   : The Admin views the top summary cards

Then   : "Team Average" card shows 78.3 (or similar rounded value)
  And  : "Grade A" card shows count 3
  And  : "Grade B" card shows count 4
  And  : "Grade C/D" card shows count 3

Expected Response : UI displays correct aggregate statistics

---

## TC-F019-003
Test Case ID : TC-F019-003
Title        : Period Selector Changes Displayed Data
Feature      : F-019 — KPI Store
AC Covered   : AC-2
Priority     : Medium
Type         : Happy Path

Given  : The KPI page is loaded showing period "2026-05"

When   : The Super User clicks the period selector and selects a different month

Then   : The period label updates to the selected month
  And  : The data refreshes (or shows the same static data with updated period label)

Expected Response : Period label updates; no page crash

---

## TC-F019-004
Test Case ID : TC-F019-004
Title        : Category Bar Chart Renders 5 Category Bars
Feature      : F-019 — KPI Store
AC Covered   : AC-4
Priority     : High
Type         : Happy Path

Given  : The KPI page is loaded with Super User role

When   : The user views the "Team Category Performance" chart

Then   : 5 bars are visible, one per category:
         - Delivery & Execution
         - Quality & Engineering Excellence
         - Ownership & Collaboration
         - Growth & Innovation
         - Behaviour & Reliability
  And  : Each bar shows a % of max (0-100%)
  And  : Bar heights visually correspond to team averages

Expected Response : Recharts bar chart renders 5 grouped bars

---

## TC-F019-005
Test Case ID : TC-F019-005
Title        : Grade Distribution Pie Chart Shows 4 Segments
Feature      : F-019 — KPI Store
AC Covered   : AC-5
Priority     : High
Type         : Happy Path

Given  : The KPI page is loaded

When   : The user views the "Grade Distribution" pie chart

Then   : The pie chart has 4 segments: A (green), B (blue), C (amber), D (red)
  And  : Hovering on a segment shows the employee count for that grade

Expected Response : Recharts PieChart renders 4 coloured slices

---

## TC-F019-006
Test Case ID : TC-F019-006
Title        : Click Employee Row Expands Detail Panel With Radar Chart
Feature      : F-019 — KPI Store
AC Covered   : AC-7
Priority     : High
Type         : Happy Path

Given  : The KPI page is loaded and the employee table is visible

When   : The user clicks on "Rahul Sharma" in the employee table

Then   : A detail panel expands below (or as a modal)
  And  : A radar chart appears showing 5 category scores
  And  : All 13 individual metrics are listed with:
         - Metric name
         - Points earned / max points
         - A progress bar showing % of max

Expected Response : Detail panel opens with radar chart and 13 metric rows

---

## TC-F019-007
Test Case ID : TC-F019-007
Title        : Grade Badges Are Colour-Coded Correctly
Feature      : F-019 — KPI Store
AC Covered   : AC-8
Priority     : High
Type         : Happy Path

Given  : The KPI page is loaded with employee table visible

When   : The user inspects grade badges in the table

Then   : Grade "A" badges are green (emerald colour)
  And  : Grade "B" badges are blue
  And  : Grade "C" badges are amber/yellow
  And  : Grade "D" badges are red

Expected Response : Each grade badge has the correct background colour

---

## TC-F019-008
Test Case ID : TC-F019-008
Title        : Leaderboard Shows Top 5 Employees Sorted by Score
Feature      : F-019 — KPI Store
AC Covered   : AC-9
Priority     : Medium
Type         : Happy Path

Given  : The KPI page is loaded

When   : The user views the "Leaderboard" section

Then   : 5 rows are displayed, sorted by total score descending:
         1. Pooja Mehta — 94
         2. Arjun Patel — 91
         3. Rahul Sharma — 90
         4. Vikram Joshi — 87
         5. Sneha Khanna — 83
  And  : Deepak Verma (46) is NOT in the leaderboard

Expected Response : Leaderboard shows top 5 employees correctly ordered

---

## TC-F019-009
Test Case ID : TC-F019-009
Title        : Employee Role User Sees Only Own KPI Data
Feature      : F-019 — KPI Store
AC Covered   : AC-10
Priority     : High
Type         : RBAC

Given  : An Employee is logged in

When   : The Employee navigates to /kpi

Then   : Only their own KPI card is shown (personal view)
  And  : The team-wide table is NOT visible
  And  : The grade distribution pie chart is NOT shown

Expected Response : Employee sees personal KPI only — no team data

---

## TC-F019-010
Test Case ID : TC-F019-010
Title        : Unauthenticated User Cannot Access KPI Page
Feature      : F-019 — KPI Store
AC Covered   : AC-1 (security)
Priority     : High
Type         : Security

Given  : A user is not logged in

When   : The user navigates directly to /kpi

Then   : The user is redirected to /login

Expected Response : 302/redirect to /login — KPI page is not accessible

---

## TC-F019-011
Test Case ID : TC-F019-011
Title        : KPI Page Loads Without Console Errors
Feature      : F-019 — KPI Store
AC Covered   : AC-1 (stability)
Priority     : Medium
Type         : Edge Case

Given  : Super User is logged in

When   : The KPI page loads and all charts render

Then   : No JavaScript console errors appear
  And  : All Recharts components render without warnings
  And  : The page is responsive at 1280px and 768px viewport widths

Expected Response : Clean render with no errors at multiple viewport sizes

---

## TC-F019-012
Test Case ID : TC-F019-012
Title        : Searching/Filtering Employees Narrows Table Results
Feature      : F-019 — KPI Store
AC Covered   : AC-6 (filtering)
Priority     : Low
Type         : Happy Path

Given  : The KPI page is loaded showing all 10 employees

When   : The user types "Pooja" in the search/filter input

Then   : Only "Pooja Mehta" row is shown in the table
  And  : All other employee rows are hidden

Expected Response : Table filters to matching employee(s)
