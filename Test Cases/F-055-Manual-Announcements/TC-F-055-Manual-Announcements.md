# TC-F-054-Manual-Announcements
# E2E Test Case Specifications

Feature ID   : F-054
Feature Name : Manual Announcements
Framework    : Playwright

---

Test Case ID : TC-F054-001
Title        : Admin posts an announcement and it appears in the list
Feature      : F-054 — Manual Announcements
AC Covered   : AC-1, AC-5, AC-9
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : An ADMIN user is logged in
  And  : The Announcements page is open

When   : The user clicks "Add Announcement"
  And  : Enters title "System Maintenance Tonight"
  And  : Enters content "Please save your work before 10 PM."
  And  : Clicks "Save"

Then   : The new announcement appears at the top of the list
  And  : The title "System Maintenance Tonight" is visible
  And  : The author's name and date are displayed
  And  : HTTP 201 is returned from POST /announcements

Expected Response : HTTP 201, announcement object in body

---

Test Case ID : TC-F054-002
Title        : Employee can view announcements but cannot create
Feature      : F-054 — Manual Announcements
AC Covered   : AC-2, AC-3
Priority     : High
Type         : RBAC
Framework    : Playwright

Given  : An EMPLOYEE user is logged in
  And  : The Announcements page is open

When   : The user views the announcements list
Then   : All existing announcements are visible
  And  : The "Add Announcement" button is NOT present

When   : The employee sends POST /announcements directly via API with valid token
Then   : HTTP 403 Forbidden is returned

Expected Response : HTTP 403

---

Test Case ID : TC-F054-003
Title        : Admin deletes an announcement
Feature      : F-054 — Manual Announcements
AC Covered   : AC-4
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : An ADMIN user is logged in
  And  : At least one announcement exists

When   : The admin clicks the delete (trash) icon on an announcement
  And  : Confirms the deletion in the confirmation dialog

Then   : The announcement is removed from the list
  And  : HTTP 204 is returned from DELETE /announcements/:id

Expected Response : HTTP 204

---

Test Case ID : TC-F054-004
Title        : Employee cannot delete an announcement via API
Feature      : F-054 — Manual Announcements
AC Covered   : AC-3, AC-4
Priority     : High
Type         : Security / RBAC
Framework    : Playwright

Given  : An EMPLOYEE user is authenticated and has a valid JWT token
  And  : An announcement exists with a known ID

When   : The employee sends DELETE /announcements/:id directly via API

Then   : HTTP 403 Forbidden is returned
  And  : The announcement remains in the list

Expected Response : HTTP 403

---

Test Case ID : TC-F054-005
Title        : Dashboard widget shows latest 3 announcements
Feature      : F-054 — Manual Announcements
AC Covered   : AC-6
Priority     : Medium
Type         : Happy Path
Framework    : Playwright

Given  : 5 or more announcements exist in the system
  And  : Any authenticated user is logged in and on the Dashboard

When   : The user views the Dashboard

Then   : The Announcements widget shows exactly 3 announcements
  And  : They are the 3 most recently created

Expected Response : GET /announcements?latest=true returns 3 items

---

Test Case ID : TC-F054-006
Title        : Sidebar shows Announcements nav for all roles
Feature      : F-054 — Manual Announcements
AC Covered   : AC-7
Priority     : Medium
Type         : RBAC / Happy Path
Framework    : Playwright

Given  : A user with any role (SUPER_USER, ADMIN, EMPLOYEE) is logged in

When   : The user views the sidebar

Then   : "Announcements" nav item is visible and clickable
  And  : Clicking it navigates to /announcements

Expected Response : Page loads with HTTP 200

---

Test Case ID : TC-F054-007
Title        : Form validates empty title and content
Feature      : F-054 — Manual Announcements
AC Covered   : AC-8
Priority     : Medium
Type         : Negative
Framework    : Playwright

Given  : An ADMIN user is logged in and has opened the "Add Announcement" modal

When   : The user clicks "Save" without entering any text

Then   : Validation error messages appear for title and content
  And  : No API call is made (POST /announcements is NOT called)

Expected Response : N/A (client-side validation only)

---

Test Case ID : TC-F054-008
Title        : Unauthenticated user cannot access announcements endpoint
Feature      : F-054 — Manual Announcements
AC Covered   : AC-3 (security)
Priority     : High
Type         : Security
Framework    : Playwright

Given  : No authentication token is present

When   : A GET request is sent to /api/v1/announcements without Authorization header

Then   : HTTP 401 Unauthorized is returned

Expected Response : HTTP 401
