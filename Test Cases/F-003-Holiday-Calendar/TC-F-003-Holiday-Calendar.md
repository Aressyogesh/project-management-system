# TC-F-003 — Holiday Calendar E2E Test Cases

---

TC-F003-001
Title     : Admin adds a holiday and it appears in the list
Type      : Happy Path
AC Covered: AC-2, AC-7, AC-8

Given  : Admin is on Portal Configuration page, Holidays section expanded, year = 2026
When   : Admin enters name "Republic Day", date "2026-01-26", ticks Recurring, clicks Add
Then   : POST /api/v1/settings/holidays returns HTTP 201
  And  : New holiday appears in the list with name, date, and recurring badge

---

TC-F003-002
Title     : Admin deletes a holiday
Type      : Happy Path
AC Covered: AC-3, AC-7

Given  : Holiday "Diwali — 2026-10-20" exists in the list
When   : Admin clicks the delete icon on that row and confirms
Then   : DELETE /api/v1/settings/holidays/:id returns HTTP 204
  And  : Holiday is removed from the list

---

TC-F003-003
Title     : Year selector filters holidays correctly
Type      : Happy Path
AC Covered: AC-6

Given  : Holidays exist for 2025 and 2026
When   : Admin selects year "2025" from dropdown
Then   : GET /api/v1/settings/holidays?year=2025 is called
  And  : Only 2025 holidays are shown

---

TC-F003-004
Title     : Duplicate date returns 409
Type      : Negative
AC Covered: AC-2

Given  : Holiday on "2026-01-26" already exists
When   : Admin tries to add another holiday on "2026-01-26"
Then   : POST returns HTTP 409
  And  : Inline error "A holiday already exists on this date" shown

---

TC-F003-005
Title     : Employee cannot add or delete holidays
Type      : RBAC / Security
AC Covered: AC-4

Given  : An EMPLOYEE JWT token
When   : POST /api/v1/settings/holidays with valid body
Then   : Returns HTTP 403 Forbidden

When   : DELETE /api/v1/settings/holidays/:id
Then   : Returns HTTP 403 Forbidden

---

TC-F003-006
Title     : Recurring holiday shows badge in future year view
Type      : Edge Case
AC Covered: AC-9

Given  : "Republic Day" is marked isRecurring = true with date 2026-01-26
When   : Admin selects year 2027 in the holiday list
Then   : "Republic Day" appears with date 2027-01-26 and recurring badge
