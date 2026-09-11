# E2E Test Cases — F-005: Department Management

### TC-F-005-001
```
Test Case ID : TC-F-005-001
Title        : Admin Creates New Department Successfully
AC Covered   : AC-3 | Priority: High | Type: Happy Path

Given  : Admin is logged in and navigates to /departments
When   : Clicks "Add Department", enters name "Engineering", clicks Save
Then   : HTTP 201 returned
         "Engineering" appears in the list with status Active
```

### TC-F-005-002
```
Test Case ID : TC-F-005-002
Title        : Admin Edits Department Name
AC Covered   : AC-4 | Priority: High | Type: Happy Path

Given  : Department "Digital" exists
When   : Admin clicks Edit, changes name to "Digital Media", saves
Then   : HTTP 200 returned; list shows "Digital Media"
```

### TC-F-005-003
```
Test Case ID : TC-F-005-003
Title        : Admin Deactivates a Department
AC Covered   : AC-5 | Priority: High | Type: Happy Path

Given  : Active department "SalesForce" exists
When   : Admin clicks toggle to deactivate
Then   : HTTP 200 returned; status badge changes to Inactive
```

### TC-F-005-004
```
Test Case ID : TC-F-005-004
Title        : Duplicate Department Name Returns Conflict
AC Covered   : AC-6 | Priority: High | Type: Negative

Given  : "Digital" department already exists
When   : Admin tries to create another "Digital" department
Then   : HTTP 409 Conflict; UI shows "Department name already in use"
```

### TC-F-005-005
```
Test Case ID : TC-F-005-005
Title        : Empty Name Returns Validation Error
AC Covered   : AC-7 | Priority: Medium | Type: Negative

Given  : Admin opens Add Department form
When   : Submits with empty name
Then   : HTTP 400; UI shows validation error
```

### TC-F-005-006
```
Test Case ID : TC-F-005-006
Title        : Employee Cannot Access /departments
AC Covered   : AC-1, AC-8 | Priority: High | Type: RBAC

Given  : Employee is logged in
When   : Navigates to /departments; calls GET /api/v1/departments
Then   : /departments not in sidebar; API returns 403
```

### TC-F-005-007
```
Test Case ID : TC-F-005-007
Title        : Inactive Departments Are Shown in Management List
AC Covered   : AC-2 | Priority: Medium | Type: Edge Case

Given  : Both active and inactive departments exist
When   : Admin views /departments
Then   : Both active and inactive departments appear with correct status badges
```
