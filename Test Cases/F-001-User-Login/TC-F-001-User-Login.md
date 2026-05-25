# TC-F-001 — E2E Test Cases: User Login

Feature  : F-001 — User Login
Framework: Supertest (API E2E) · Playwright (UI E2E — future)
Test DB  : Seeded PostgreSQL (test environment)

---

## TC-F001-001 — Happy Path: Valid Login Returns Tokens
```
Test Case ID : TC-F001-001
Title        : Successful login returns access token, refresh token, and user profile
AC Covered   : AC-2, AC-3, AC-7
Priority     : High
Type         : Happy Path

Given  : A seeded SUPER_USER with email 'superadmin@pms.com' and password 'Password@123'
  And  : The user is not logged in

When   : POST /api/v1/auth/login with { email, password }

Then   : HTTP 200 OK
  And  : Response body contains accessToken (string)
  And  : Response body contains refreshToken (string)
  And  : Response body contains user.id, user.fullName, user.email, user.systemRole
  And  : user.systemRole === 'SUPER_USER'
  And  : Response body does NOT contain passwordHash
```

---

## TC-F001-002 — Negative: Wrong Password Returns 401
```
Test Case ID : TC-F001-002
Title        : Wrong password returns 401 with generic message
AC Covered   : AC-4
Priority     : High
Type         : Negative

Given  : A seeded user exists with email 'superadmin@pms.com'

When   : POST /api/v1/auth/login with { email: 'superadmin@pms.com', password: 'wrongpass' }

Then   : HTTP 401 Unauthorized
  And  : Response message does NOT reveal whether email exists (account enumeration prevention)
```

---

## TC-F001-003 — Negative: Unknown Email Returns 401
```
Test Case ID : TC-F001-003
Title        : Unknown email returns same 401 as wrong password (no enumeration)
AC Covered   : AC-4
Priority     : High
Type         : Security

Given  : No user exists with email 'ghost@pms.com'

When   : POST /api/v1/auth/login with { email: 'ghost@pms.com', password: 'anypass' }

Then   : HTTP 401 Unauthorized
  And  : Error message is identical to TC-F001-002 (same message regardless of email existence)
```

---

## TC-F001-004 — Negative: Inactive Account Returns 403
```
Test Case ID : TC-F001-004
Title        : Inactive account is rejected with 403
AC Covered   : AC-5
Priority     : High
Type         : Negative

Given  : A seeded user with isActive = false

When   : POST /api/v1/auth/login with correct credentials for inactive user

Then   : HTTP 403 Forbidden
```

---

## TC-F001-005 — Negative: Missing Email Returns 400
```
Test Case ID : TC-F001-005
Title        : Request missing email returns 400 validation error
AC Covered   : AC-6
Priority     : Medium
Type         : Negative

Given  : No preconditions

When   : POST /api/v1/auth/login with { password: 'Password@123' } (no email)

Then   : HTTP 400 Bad Request
  And  : Response includes validation error referencing 'email'
```

---

## TC-F001-006 — Negative: Invalid Email Format Returns 400
```
Test Case ID : TC-F001-006
Title        : Invalid email format returns 400 validation error
AC Covered   : AC-6
Priority     : Medium
Type         : Negative

Given  : No preconditions

When   : POST /api/v1/auth/login with { email: 'not-an-email', password: 'Password@123' }

Then   : HTTP 400 Bad Request
  And  : Response includes validation error referencing email format
```

---

## TC-F001-007 — Happy Path: Refresh Token Returns New Tokens
```
Test Case ID : TC-F001-007
Title        : Valid refresh token returns new access and refresh tokens
AC Covered   : AC-8, AC-9
Priority     : High
Type         : Happy Path

Given  : A valid login was performed; refreshToken obtained

When   : POST /api/v1/auth/refresh with { refreshToken }

Then   : HTTP 200 OK
  And  : New accessToken returned
  And  : New refreshToken returned
  And  : New refreshToken is different from the original (rotation)
```

---

## TC-F001-008 — Security: Revoked Refresh Token Rejected
```
Test Case ID : TC-F001-008
Title        : Previously used refresh token cannot be reused (rotation enforced)
AC Covered   : AC-9, AC-10
Priority     : High
Type         : Security

Given  : A valid refreshToken obtained from login
  And  : POST /api/v1/auth/refresh used once (token now revoked)

When   : POST /api/v1/auth/refresh with the ORIGINAL (now revoked) refreshToken again

Then   : HTTP 401 Unauthorized
```

---

## TC-F001-009 — Happy Path: Logout Revokes Token
```
Test Case ID : TC-F001-009
Title        : Logout revokes refresh token and returns 204
AC Covered   : AC-11, AC-12
Priority     : High
Type         : Happy Path

Given  : A valid login was performed; accessToken and refreshToken obtained

When   : POST /api/v1/auth/logout with Bearer accessToken and body { refreshToken }

Then   : HTTP 204 No Content
  And  : Subsequent POST /api/v1/auth/refresh with same refreshToken returns HTTP 401
```

---

## TC-F001-010 — Security: Protected Route Blocked Without Token
```
Test Case ID : TC-F001-010
Title        : Accessing protected route without JWT returns 401
AC Covered   : AC-1
Priority     : High
Type         : Security / RBAC

Given  : No Authorization header provided

When   : GET /api/v1/dashboard/stats (a protected route)

Then   : HTTP 401 Unauthorized
```

---

## TC-F001-011 — Security: Protected Route Accessible With Valid Token
```
Test Case ID : TC-F001-011
Title        : Accessing protected route with valid JWT returns 200
AC Covered   : AC-1, AC-2
Priority     : High
Type         : RBAC

Given  : A valid login was performed; accessToken obtained

When   : GET /api/v1/dashboard/stats with Authorization: Bearer <accessToken>

Then   : HTTP 200 OK (or 404 if route not yet built — NOT 401)
```
