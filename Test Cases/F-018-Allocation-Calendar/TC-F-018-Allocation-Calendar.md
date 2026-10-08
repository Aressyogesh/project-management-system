# TC-F-018 — E2E Test Cases: Employee Allocation Calendar View

## Feature: F-018 — Employee Allocation Calendar View
## Date: 2026-05-27

---

## Test Environment
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **Test Users:**
  - Super User: `superuser@test.com` / `password`
  - Project Manager (Employee): `pm@test.com` / `password`
  - Developer (Employee): `dev@test.com` / `password`

---

## TC-F018-E2E-001 — HappyPath_EmployeeViewsOwnCalendar

**AC:** AC-1, AC-2, AC-7

**Given:** A Developer user is logged in and has task allocations in the current month

**When:** The user navigates to `/allocations`

**Then:**
- The page renders the "Allocation Calendar" heading
- The calendar shows the current month and year
- Today's date cell has a distinct highlight (blue circle)
- No user dropdown is visible
- Days with allocations show coloured backgrounds
- The summary cards show non-zero values for total hours and days allocated

---

## TC-F018-E2E-002 — HappyPath_MonthNavigation

**AC:** AC-5, AC-8

**Given:** A Developer is viewing the calendar for the current month

**When:** The user clicks the left arrow ("prev month") button

**Then:**
- The calendar header shows the previous month name and year
- The calendar grid updates to show the previous month's days
- Summary cards update (may show 0 if no allocations that month)

**When:** The user clicks the right arrow ("next month") button twice

**Then:**
- The calendar shows the month after the current month
- The calendar grid is correct for that month

**When:** The user clicks "Today"

**Then:**
- The calendar returns to the current month

---

## TC-F018-E2E-003 — HappyPath_ColorCoding

**AC:** AC-3, BR-4

**Given:** A Developer has:
- 3h allocated on day 5 (< 6h → green)
- 7h allocated on day 10 (6–8h → yellow)
- 8h allocated on day 15 (= 8h → red)

**When:** The user views the calendar

**Then:**
- Day 5's cell has a green background
- Day 10's cell has a yellow background
- Day 15's cell has a red background
- Each of those cells shows the correct total hours (3h, 7h, 8h)
- Each cell has a progress bar proportional to 8h max

---

## TC-F018-E2E-004 — HappyPath_TaskChips

**AC:** AC-4

**Given:** A Developer has 5 task allocations on one day

**When:** The user views that day in the calendar

**Then:**
- 3 task chips are visible showing task title and hours
- "+2 more" label is shown below the chips

---

## TC-F018-E2E-005 — HappyPath_EmptyMonth

**AC:** AC-9

**Given:** A Developer has no allocations in a future month

**When:** The user navigates to that month

**Then:**
- The calendar renders without error
- All days appear empty (no colours, no chips)
- Summary cards show 0h, 0 days, "—" avg

---

## TC-F018-E2E-006 — HappyPath_AdminViewsAnotherUser

**AC:** AC-6, AC-8

**Given:** An Admin user is logged in

**When:** The user navigates to `/allocations`

**Then:**
- A user dropdown is visible with "My Allocations" as default
- The dropdown lists all active users

**When:** The Admin selects a different user from the dropdown

**Then:**
- The calendar re-renders with the selected user's allocations
- Summary cards update to reflect the selected user's data

---

## TC-F018-E2E-007 — RBAC_EmployeeCannotSeeDropdown

**AC:** AC-7

**Given:** A Developer (EMPLOYEE system role) is logged in

**When:** The user navigates to `/allocations`

**Then:**
- No user dropdown is present on the page
- The calendar shows only their own allocations

---

## TC-F018-E2E-008 — RBAC_UnauthenticatedUserRedirected

**AC:** AC-1

**Given:** No user is logged in

**When:** The user navigates to `/allocations`

**Then:**
- The user is redirected to the login page
- The allocations page is not shown

---

## TC-F018-E2E-009 — HappyPath_SidebarNavItem

**AC:** AC-10

**Given:** Any authenticated user is logged in

**When:** The user views the sidebar

**Then:**
- An "Allocations" nav item is visible
- Clicking it navigates to `/allocations`
- The nav item is highlighted when on the allocations page

---

## TC-F018-E2E-010 — HappyPath_SummaryCards

**AC:** AC-8, BR-7

**Given:** A Developer has 24h total across 4 days in the viewed month

**When:** The user views the calendar

**Then:**
- "Total Hours (Month)" card shows "24h"
- "Days with Allocations" card shows "4"
- "Avg Hours / Allocated Day" card shows "6.0h"
