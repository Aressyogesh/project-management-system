# E2E Test Cases — F-006: Client Management

Feature ID   : F-006
Framework    : Playwright / Manual
Environment  : http://localhost:5173 + http://localhost:3000

---

## TC-F-006-001
Title        : Admin creates a new client successfully
Type         : Happy Path
AC Covered   : AC-1
Given        : Admin is logged in and on /clients
When         : Clicks 'Add Client', fills name='Acme Corp', contactPerson='Jane', email='jane@acme.com', clicks Save
Then         : Modal closes; 'Acme Corp' appears in the list with Active badge

---

## TC-F-006-002
Title        : Admin cannot create duplicate client name
Type         : Negative
AC Covered   : AC-2
Given        : 'Acme Corp' already exists
When         : Attempts to create another client named 'acme corp' (different case)
Then         : Error message 'already exists' shown; client not created

---

## TC-F-006-003
Title        : Admin edits client details
Type         : Happy Path
AC Covered   : AC-3
Given        : 'Acme Corp' exists
When         : Clicks Edit, changes contactPerson to 'Bob', clicks Save
Then         : Table refreshes showing updated contact

---

## TC-F-006-004
Title        : Admin deactivates an active client
Type         : Happy Path
AC Covered   : AC-5
Given        : 'Acme Corp' is Active
When         : Clicks the deactivate button on its row
Then         : Status badge changes to Inactive

---

## TC-F-006-005
Title        : Admin reactivates an inactive client
Type         : Happy Path
AC Covered   : AC-6
Given        : 'Acme Corp' is Inactive
When         : Clicks the activate button on its row
Then         : Status badge changes to Active

---

## TC-F-006-006
Title        : Client list shows both active and inactive with correct badges
Type         : Happy Path
AC Covered   : AC-7
Given        : Mix of active and inactive clients exist
When         : Admin navigates to /clients
Then         : All clients listed; active ones show green Active badge; inactive show grey Inactive

---

## TC-F-006-007
Title        : EMPLOYEE role cannot access client endpoints
Type         : Security / RBAC
AC Covered   : AC-8
Given        : User logged in as EMPLOYEE
When         : Sends GET /clients with valid JWT
Then         : API returns 403 Forbidden

---

## TC-F-006-008
Title        : Empty state shown when no clients exist
Type         : Edge Case
AC Covered   : AC-9
Given        : No clients in the system
When         : Admin navigates to /clients
Then         : 'No clients yet. Click "Add Client" to create one.' is displayed
