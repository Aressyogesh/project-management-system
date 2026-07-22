# E2E Test Cases — F-017: Task Allocation CRUD + 8-Hour Daily Cap

```
Test Case ID : TC-F017-001
Title        : Project Manager creates valid allocation
AC Covered   : AC-1 | Type: Happy Path
Given  : A PM is authenticated; a task and project member exist; user has 3h allocated on date
When   : POST /api/v1/task-allocations with { taskId, userId, date, allocatedHours: 4 }
Then   : HTTP 201 returned with allocation record
  And  : allocatedHours: 4 in response
```

```
Test Case ID : TC-F017-002
Title        : Over-allocation blocked at 8-hour cap
AC Covered   : AC-2 | Type: Negative
Given  : User already has 6h allocated on date
When   : POST with allocatedHours: 4
Then   : HTTP 422 returned
  And  : Error message mentions remaining hours
```

```
Test Case ID : TC-F017-003
Title        : EMPLOYEE cannot create allocation
AC Covered   : AC-8 | Type: RBAC
Given  : User with EMPLOYEE system role and no PM/TL project role
When   : POST /api/v1/task-allocations
Then   : HTTP 403 Forbidden
```

```
Test Case ID : TC-F017-004
Title        : Update allocation re-validates cap excluding current record
AC Covered   : AC-3 | Type: Happy Path
Given  : Allocation of 3h exists; user has 5h total on that date
When   : PATCH /api/v1/task-allocations/:id with { allocatedHours: 3 }
Then   : HTTP 200; cap = (5 - 3) + 3 = 5 ≤ 8 — succeeds
```

```
Test Case ID : TC-F017-005
Title        : Delete allocation returns 204
AC Covered   : AC-4 | Type: Happy Path
Given  : Allocation record exists
When   : DELETE /api/v1/task-allocations/:id
Then   : HTTP 204 No Content
```

```
Test Case ID : TC-F017-006
Title        : Check endpoint returns remaining hours
AC Covered   : AC-7 | Type: Happy Path
Given  : User has 5h allocated on a date
When   : GET /api/v1/task-allocations/check?userId=&date=
Then   : HTTP 200 with { allocatedHours: 5, remainingHours: 3 }
```

```
Test Case ID : TC-F017-007
Title        : Duplicate task+user+date returns 409
AC Covered   : AC-1 | Type: Negative
Given  : An allocation for task+user+date already exists
When   : POST with same task+user+date
Then   : HTTP 409 Conflict
```

```
Test Case ID : TC-F017-008
Title        : Unauthenticated request returns 401
AC Covered   : AC-1 | Type: Security
Given  : No JWT token provided
When   : POST /api/v1/task-allocations
Then   : HTTP 401 Unauthorized
```
