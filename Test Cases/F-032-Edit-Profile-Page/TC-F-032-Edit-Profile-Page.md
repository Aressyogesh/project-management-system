# E2E Test Cases — F-032: Edit Profile Page

---

```
Test Case ID : TC-F032-001
Title        : Gear icon shows dropdown with Edit Profile and Company Settings (Admin)
AC Covered   : AC-1, AC-10
Priority     : High
Type         : Happy Path

Given  : User is logged in as ADMIN
When   : User clicks the gear icon in the Topbar
Then   : Dropdown shows "Edit Profile" as first item
  And  : "Company Settings" is also visible in the dropdown
```

---

```
Test Case ID : TC-F032-002
Title        : Gear icon shows Edit Profile but hides Company Settings for EMPLOYEE
AC Covered   : AC-1, AC-10
Priority     : High
Type         : RBAC

Given  : User is logged in as EMPLOYEE
When   : User clicks the gear icon in the Topbar
Then   : "Edit Profile" is visible
  And  : "Company Settings" is NOT visible
```

---

```
Test Case ID : TC-F032-003
Title        : Edit Profile page pre-fills current user data
AC Covered   : AC-2, AC-3
Priority     : High
Type         : Happy Path

Given  : User navigates to /profile
When   : The page loads
Then   : The fullName field contains the user's current name
  And  : The email field contains the user's current email
```

---

```
Test Case ID : TC-F032-004
Title        : Update name and email successfully
AC Covered   : AC-4, AC-5
Priority     : High
Type         : Happy Path

Given  : User is on /profile
When   : User updates fullName to "New Name" and submits
Then   : HTTP 200 is returned
  And  : Success toast is shown
  And  : Topbar displays "New Name" without page reload
```

---

```
Test Case ID : TC-F032-005
Title        : Upload and preview profile photo
AC Covered   : AC-6
Priority     : High
Type         : Happy Path

Given  : User is on /profile
When   : User selects a valid JPEG file and clicks Save
Then   : HTTP 200 is returned
  And  : The updated profile photo appears in the Topbar avatar
```

---

```
Test Case ID : TC-F032-006
Title        : Password change with correct current password
AC Covered   : AC-7, AC-8
Priority     : High
Type         : Happy Path

Given  : User is on /profile
When   : User enters correct current password and a valid new password (≥6 chars)
  And  : Confirm password matches new password
  And  : Clicks Save
Then   : HTTP 200 is returned
  And  : Success message shown
  And  : User can log in with new password
```

---

```
Test Case ID : TC-F032-007
Title        : Password change with incorrect current password returns error
AC Covered   : AC-7
Priority     : High
Type         : Negative

Given  : User is on /profile
When   : User enters wrong current password
Then   : HTTP 400 is returned
  And  : Error "Current password is incorrect" is shown
```

---

```
Test Case ID : TC-F032-008
Title        : New password and confirm do not match — validation error
AC Covered   : AC-8
Priority     : High
Type         : Negative

Given  : User is on /profile
When   : User enters new password "abc123" and confirm "xyz999"
  And  : Clicks Save
Then   : Client-side error "Passwords do not match" is shown
  And  : API is NOT called
```

---

```
Test Case ID : TC-F032-009
Title        : New email already taken returns 409 error
AC Covered   : AC-9
Priority     : High
Type         : Negative

Given  : User is on /profile
When   : User changes email to an address already registered to another user
  And  : Clicks Save
Then   : HTTP 409 is returned
  And  : Error "Email already in use" is displayed
```

---

```
Test Case ID : TC-F032-010
Title        : Unauthenticated access to GET /users/profile returns 401
AC Covered   : AC-11
Priority     : High
Type         : Security

Given  : No Authorization header is sent
When   : GET /users/profile
Then   : HTTP 401 Unauthorized is returned
```

---

```
Test Case ID : TC-F032-011
Title        : Unauthenticated access to PATCH /users/profile returns 401
AC Covered   : AC-11
Priority     : High
Type         : Security

Given  : No Authorization header is sent
When   : PATCH /users/profile with any body
Then   : HTTP 401 Unauthorized is returned
```
