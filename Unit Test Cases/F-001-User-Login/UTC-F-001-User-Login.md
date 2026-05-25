# UTC-F-001 — Unit Test Cases: User Login

Feature  : F-001 — User Login
Layer    : Backend (AuthService) + Frontend (LoginPage)
Framework: Jest (backend) · Vitest + React Testing Library (frontend)

---

## Backend — AuthService

---

### UTC-F001-B-001
```
Unit Test ID : UTC-F001-B-001
Title        : ValidateUser_ValidCredentials_ReturnsUser
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-2
Framework    : Jest

Arrange:
  - Mock PrismaService.user.findUnique → returns active user with valid bcrypt hash
  - Input: correct email + correct plain-text password

Act:
  - result = await authService.validateUser(email, password)

Assert:
  - result is not null
  - result.email === input email
  - result.passwordHash is NOT returned to caller (internal — acceptable in service layer)
```

---

### UTC-F001-B-002
```
Unit Test ID : UTC-F001-B-002
Title        : ValidateUser_WrongPassword_ReturnsNull
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-4

Arrange:
  - Mock PrismaService.user.findUnique → returns active user with bcrypt hash
  - Input: correct email + WRONG password

Act:
  - result = await authService.validateUser(email, wrongPassword)

Assert:
  - result is null
```

---

### UTC-F001-B-003
```
Unit Test ID : UTC-F001-B-003
Title        : ValidateUser_UnknownEmail_ReturnsNull
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-4

Arrange:
  - Mock PrismaService.user.findUnique → returns null

Act:
  - result = await authService.validateUser('unknown@pms.com', 'anypassword')

Assert:
  - result is null
```

---

### UTC-F001-B-004
```
Unit Test ID : UTC-F001-B-004
Title        : ValidateUser_InactiveAccount_ReturnsNull
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-5

Arrange:
  - Mock PrismaService.user.findUnique → returns user with isActive = false

Act:
  - result = await authService.validateUser(email, correctPassword)

Assert:
  - result is null
```

---

### UTC-F001-B-005
```
Unit Test ID : UTC-F001-B-005
Title        : Login_ValidUser_ReturnsAccessTokenRefreshTokenAndUser
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-2, AC-3

Arrange:
  - Mock JwtService.sign → returns 'fake-access-token'
  - Mock PrismaService.refreshToken.create → resolves
  - Mock PrismaService.user.update → resolves
  - Input: active SUPER_USER user object

Act:
  - result = await authService.login(user)

Assert:
  - result.accessToken === 'fake-access-token'
  - result.refreshToken is a non-empty string
  - result.user.email === user.email
  - result.user.systemRole === 'SUPER_USER'
  - 'passwordHash' key does NOT exist in result.user
  - PrismaService.refreshToken.create called once
  - PrismaService.user.update called once (lastLoginAt updated)
```

---

### UTC-F001-B-006
```
Unit Test ID : UTC-F001-B-006
Title        : Refresh_ValidToken_ReturnsNewTokensAndRevokesOld
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-8, AC-9

Arrange:
  - Mock PrismaService.refreshToken.findUnique → returns non-revoked, non-expired token with user
  - Mock PrismaService.refreshToken.update (revoke old) → resolves
  - Mock PrismaService.refreshToken.create (new token) → resolves
  - Mock JwtService.sign → returns 'new-access-token'

Act:
  - result = await authService.refresh('valid-token')

Assert:
  - result.accessToken === 'new-access-token'
  - result.refreshToken is a non-empty string
  - result.refreshToken !== 'valid-token'
  - PrismaService.refreshToken.update called with { isRevoked: true }
  - PrismaService.refreshToken.create called once
```

---

### UTC-F001-B-007
```
Unit Test ID : UTC-F001-B-007
Title        : Refresh_RevokedToken_ThrowsUnauthorizedException
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-10

Arrange:
  - Mock PrismaService.refreshToken.findUnique → returns { isRevoked: true, expiresAt: future }

Act:
  - authService.refresh('revoked-token')

Assert:
  - Throws UnauthorizedException
```

---

### UTC-F001-B-008
```
Unit Test ID : UTC-F001-B-008
Title        : Refresh_ExpiredToken_ThrowsUnauthorizedException
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-10

Arrange:
  - Mock PrismaService.refreshToken.findUnique → returns { isRevoked: false, expiresAt: past date }

Act:
  - authService.refresh('expired-token')

Assert:
  - Throws UnauthorizedException
```

---

### UTC-F001-B-009
```
Unit Test ID : UTC-F001-B-009
Title        : Refresh_TokenNotFound_ThrowsUnauthorizedException
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-10

Arrange:
  - Mock PrismaService.refreshToken.findUnique → returns null

Act:
  - authService.refresh('nonexistent-token')

Assert:
  - Throws UnauthorizedException
```

---

### UTC-F001-B-010
```
Unit Test ID : UTC-F001-B-010
Title        : Logout_ValidToken_RevokesTokenInDatabase
Layer        : Backend
File         : src/auth/__tests__/auth.service.spec.ts
AC Covered   : AC-11

Arrange:
  - Mock PrismaService.refreshToken.updateMany → resolves { count: 1 }

Act:
  - await authService.logout('some-refresh-token')

Assert:
  - Does not throw
  - PrismaService.refreshToken.updateMany called with:
      { where: { token: 'some-refresh-token' }, data: { isRevoked: true } }
```

---

## Frontend — LoginPage

---

### UTC-F001-F-001
```
Unit Test ID : UTC-F001-F-001
Title        : LoginPage_Render_ShowsEmailPasswordAndSubmitButton
Layer        : Frontend
File         : src/features/auth/__tests__/LoginPage.spec.tsx
AC Covered   : AC-1
Framework    : Vitest + React Testing Library

Arrange:
  - Render <LoginPage /> inside MemoryRouter

Act:
  - Query rendered output

Assert:
  - Email input is present
  - Password input is present
  - Submit / Login button is present
```

---

### UTC-F001-F-002
```
Unit Test ID : UTC-F001-F-002
Title        : LoginPage_EmptySubmit_ShowsValidationErrors
Layer        : Frontend
File         : src/features/auth/__tests__/LoginPage.spec.tsx
AC Covered   : AC-6

Arrange:
  - Render <LoginPage />

Act:
  - Click the Login button without filling any field

Assert:
  - Validation error for email is visible
  - Validation error for password is visible
  - authApi.login is NOT called
```

---

### UTC-F001-F-003
```
Unit Test ID : UTC-F001-F-003
Title        : LoginPage_ValidSubmit_CallsApiAndRedirects
Layer        : Frontend
File         : src/features/auth/__tests__/LoginPage.spec.tsx
AC Covered   : AC-2, AC-7

Arrange:
  - Mock authApi.login → resolves with { accessToken, refreshToken, user }
  - Render <LoginPage /> inside MemoryRouter with mocked navigate

Act:
  - Fill email and password with valid values
  - Click Login button

Assert:
  - authApi.login called once with correct email and password
  - navigate('/dashboard') called
```

---

### UTC-F001-F-004
```
Unit Test ID : UTC-F001-F-004
Title        : LoginPage_ApiError_ShowsErrorMessage
Layer        : Frontend
File         : src/features/auth/__tests__/LoginPage.spec.tsx
AC Covered   : AC-4

Arrange:
  - Mock authApi.login → rejects with 401 error

Act:
  - Fill email and password
  - Click Login button

Assert:
  - Error message is shown to user
  - User is NOT redirected
```
