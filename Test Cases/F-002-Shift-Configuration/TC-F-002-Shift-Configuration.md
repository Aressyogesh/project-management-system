# TC-F-002 — Shift Configuration E2E Test Cases

---

TC-F002-001
Title     : Admin views and edits Day shift times
Type      : Happy Path
AC Covered: AC-1, AC-3, AC-5, AC-6

Given  : Admin is logged in and navigates to Settings → Shifts tab
When   : The page loads
Then   : Three shift rows are displayed (Day, Afternoon, Night)
  And  : Each row shows name, start time, end time, work hours inputs

When   : Admin changes Day shift startTime to "09:00" and clicks Save
Then   : PUT /api/v1/settings/shifts/:id returns HTTP 200
  And  : Row shows "Saved" confirmation inline

---

TC-F002-002
Title     : Employee cannot access Shifts POST endpoint
Type      : RBAC / Security
AC Covered: AC-4

Given  : An EMPLOYEE JWT token
When   : POST /api/v1/settings/shifts with valid body
Then   : Returns HTTP 403 Forbidden

---

TC-F002-003
Title     : Reset to Default restores original shift times
Type      : Happy Path
AC Covered: AC-7

Given  : Admin has changed shift times
When   : Admin clicks "Reset to Default"
Then   : All three shifts revert to Day 10:00–19:00, Afternoon 15:00–00:00, Night 23:00–08:00
  And  : PUT requests sent for each shift with default values

---

TC-F002-004
Title     : Duplicate shiftType returns 409
Type      : Negative
AC Covered: AC-2

Given  : DAY shift already exists in the database
When   : POST /api/v1/settings/shifts with shiftType "DAY"
Then   : Returns HTTP 409 Conflict
  And  : Error message "Shift type DAY already exists"
