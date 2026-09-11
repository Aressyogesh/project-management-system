# E2E Test Cases — F-004: User Management

---

### TC-F-004-001
```
Test Case ID : TC-F-004-001
Title        : Admin Creates New User Successfully
Feature      : F-004 — User Management
AC Covered   : AC-3
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : An Admin user is logged in
  And  : The user navigates to /users

When   : The admin clicks "Add User"
  And  : Fills in Full Name = "Alice Smith", Email = "alice@pms.com", Password = "Pass@1234", Role = "Employee"
  And  : Clicks "Save User"

Then   : The API returns HTTP 201
  And  : Alice Smith appears in the user list
  And  : Status shows "Active"

Expected Response : HTTP 201 with user object
```

---

### TC-F-004-002
```
Test Case ID : TC-F-004-002
Title        : User List Shows Search Results
Feature      : F-004 — User Management
AC Covered   : AC-8, AC-9
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : Multiple users exist in the system
  And  : Admin is logged in at /users

When   : Admin types "alice" in the search box

Then   : Only users matching "alice" (in name or email) are displayed
  And  : Non-matching users are not visible
```

---

### TC-F-004-003
```
Test Case ID : TC-F-004-003
Title        : Admin Edits User Department and Shift
Feature      : F-004 — User Management
AC Covered   : AC-4
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : A user "Alice Smith" exists
  And  : Admin clicks the Edit icon for Alice

When   : Admin selects Department = "Digital" and Shift = "Day"
  And  : Clicks "Save User"

Then   : HTTP 200 returned
  And  : Alice's row in the table shows "Digital" and "Day"
```

---

### TC-F-004-004
```
Test Case ID : TC-F-004-004
Title        : Admin Deactivates a User
Feature      : F-004 — User Management
AC Covered   : AC-5
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : An active user "Bob Jones" exists
  And  : Admin is at /users

When   : Admin clicks the toggle to deactivate Bob Jones

Then   : HTTP 200 returned with isActive = false
  And  : Bob's status badge changes to "Inactive"
```

---

### TC-F-004-005
```
Test Case ID : TC-F-004-005
Title        : Duplicate Email Returns Conflict Error
Feature      : F-004 — User Management
AC Covered   : AC-6
Priority     : High
Type         : Negative
Framework    : Playwright

Given  : User "alice@pms.com" already exists

When   : Admin tries to create another user with email "alice@pms.com"

Then   : API returns HTTP 409 Conflict
  And  : UI shows error message "Email already in use"
```

---

### TC-F-004-006
```
Test Case ID : TC-F-004-006
Title        : Required Fields Missing Returns Validation Error
Feature      : F-004 — User Management
AC Covered   : AC-7
Priority     : Medium
Type         : Negative
Framework    : Playwright

Given  : Admin is on the Add User form

When   : Admin submits the form with empty Full Name and Email

Then   : HTTP 400 returned
  And  : UI shows field-level validation errors under Full Name and Email
```

---

### TC-F-004-007
```
Test Case ID : TC-F-004-007
Title        : Employee Cannot Access /users
Feature      : F-004 — User Management
AC Covered   : AC-1, AC-12
Priority     : High
Type         : RBAC / Security
Framework    : Playwright

Given  : An EMPLOYEE user is logged in

When   : The employee navigates to /users
  And  : Makes a direct GET /api/v1/users API call

Then   : The /users route is not visible in their sidebar
  And  : API returns HTTP 403 Forbidden
```

---

### TC-F-004-008
```
Test Case ID : TC-F-004-008
Title        : Admin Cannot Deactivate Own Account
Feature      : F-004 — User Management
AC Covered   : AC-5
Priority     : High
Type         : Edge Case / Security
Framework    : Playwright

Given  : Admin "admin@pms.com" is logged in at /users

When   : Admin attempts to toggle their own status to inactive

Then   : HTTP 400 returned
  And  : UI shows error "Cannot deactivate your own account"
  And  : Admin's status remains Active
```

---

### TC-F-004-009
```
Test Case ID : TC-F-004-009
Title        : User List Is Paginated (25 per page)
Feature      : F-004 — User Management
AC Covered   : AC-9
Priority     : Medium
Type         : Edge Case
Framework    : Playwright

Given  : 30 users exist in the system

When   : Admin navigates to /users

Then   : Only 25 users are shown on page 1
  And  : Pagination shows "Page 1 of 2"
  And  : Clicking Next shows remaining 5 users
```
