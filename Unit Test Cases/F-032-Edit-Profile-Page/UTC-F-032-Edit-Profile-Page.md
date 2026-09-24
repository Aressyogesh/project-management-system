# Unit Test Cases — F-032: Edit Profile Page

---

## Backend Unit Tests

```
Unit Test ID : UTC-F032-B-001
Title        : getProfile_ValidUser_ReturnsProfileData
Layer        : Backend — Service
File         : backend/src/users/users.service.ts (or profile.service.ts)
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - Mock prisma.user.findUnique → returns { id, fullName, email, profilePhoto, systemRole, phone, joinDate }

Act:
  - result = await usersService.getProfile(userId)

Assert:
  - result.id === userId
  - result.fullName is present
  - result.passwordHash is NOT in the result
```

---

```
Unit Test ID : UTC-F032-B-002
Title        : updateProfile_ValidName_UpdatesSuccessfully
Layer        : Backend — Service
File         : backend/src/users/users.service.ts
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock prisma.user.findUnique → returns existing user
  - Mock prisma.user.update → returns updated user with new fullName
  - dto = { fullName: "Jane Doe" }

Act:
  - result = await usersService.updateProfile(userId, dto, undefined)

Assert:
  - result.fullName === "Jane Doe"
  - prisma.user.update called with correct data
```

---

```
Unit Test ID : UTC-F032-B-003
Title        : updateProfile_EmailAlreadyTaken_Throws409
Layer        : Backend — Service
File         : backend/src/users/users.service.ts
AC Covered   : AC-9
Framework    : Jest

Arrange:
  - Mock prisma.user.findUnique (email check) → returns a different user (email taken)
  - dto = { email: "taken@example.com" }

Act:
  - await usersService.updateProfile(userId, dto, undefined)

Assert:
  - Throws ConflictException (HTTP 409)
```

---

```
Unit Test ID : UTC-F032-B-004
Title        : updateProfile_IncorrectCurrentPassword_Throws400
Layer        : Backend — Service
File         : backend/src/users/users.service.ts
AC Covered   : AC-7
Framework    : Jest

Arrange:
  - Mock prisma.user.findUnique → returns user with known passwordHash
  - Mock bcrypt.compare → returns false (wrong password)
  - dto = { currentPassword: "wrongpass", newPassword: "newpass123" }

Act:
  - await usersService.updateProfile(userId, dto, undefined)

Assert:
  - Throws BadRequestException with message about incorrect current password
```

---

```
Unit Test ID : UTC-F032-B-005
Title        : updateProfile_CorrectCurrentPassword_UpdatesPasswordHash
Layer        : Backend — Service
File         : backend/src/users/users.service.ts
AC Covered   : AC-7, AC-8
Framework    : Jest

Arrange:
  - Mock prisma.user.findUnique → returns user with known passwordHash
  - Mock bcrypt.compare → returns true
  - Mock bcrypt.hash → returns "new-hash"
  - Mock prisma.user.update → returns updated user
  - dto = { currentPassword: "correct", newPassword: "newpass123" }

Act:
  - result = await usersService.updateProfile(userId, dto, undefined)

Assert:
  - prisma.user.update called with passwordHash === "new-hash"
```

---

```
Unit Test ID : UTC-F032-B-006
Title        : updateProfile_NoCurrentPasswordWhenChangingPassword_Throws400
Layer        : Backend — Service
File         : backend/src/users/users.service.ts
AC Covered   : AC-7
Framework    : Jest

Arrange:
  - dto = { newPassword: "newpass123" }  // no currentPassword

Act:
  - await usersService.updateProfile(userId, dto, undefined)

Assert:
  - Throws BadRequestException
```

---

## Frontend Unit Tests

```
Unit Test ID : UTC-F032-F-001
Title        : TopbarDropdown_ShowsEditProfileForAllRoles
Layer        : Frontend — Component
File         : frontend/src/components/layout/Topbar.tsx
AC Covered   : AC-1
Framework    : Vitest + React Testing Library

Arrange:
  - Mock useAuthStore → { user: { systemRole: 'EMPLOYEE', fullName: 'John' } }

Act:
  - render(<Topbar />) and click gear icon

Assert:
  - "Edit Profile" menu item is in the document
```

---

```
Unit Test ID : UTC-F032-F-002
Title        : TopbarDropdown_ShowsCompanySettingsForAdminOnly
Layer        : Frontend — Component
File         : frontend/src/components/layout/Topbar.tsx
AC Covered   : AC-10
Framework    : Vitest + React Testing Library

Arrange:
  - Mock useAuthStore → { user: { systemRole: 'ADMIN' } }

Act:
  - render(<Topbar />) and click gear icon

Assert:
  - "Company Settings" is in the document
  - "Edit Profile" is also in the document
```

---

```
Unit Test ID : UTC-F032-F-003
Title        : TopbarDropdown_HidesCompanySettingsForEmployee
Layer        : Frontend — Component
File         : frontend/src/components/layout/Topbar.tsx
AC Covered   : AC-10
Framework    : Vitest + React Testing Library

Arrange:
  - Mock useAuthStore → { user: { systemRole: 'EMPLOYEE' } }

Act:
  - render(<Topbar />) and click gear icon

Assert:
  - "Company Settings" is NOT in the document
  - "Edit Profile" IS in the document
```

---

```
Unit Test ID : UTC-F032-F-004
Title        : EditProfileForm_PreFillsCurrentUserData
Layer        : Frontend — Component
File         : frontend/src/features/profile/EditProfilePage.tsx
AC Covered   : AC-3
Framework    : Vitest + React Testing Library

Arrange:
  - Mock API GET /users/profile → { fullName: "Jane Doe", email: "jane@test.com" }

Act:
  - render(<EditProfilePage />) and wait for data load

Assert:
  - Input with value "Jane Doe" is in the document
  - Input with value "jane@test.com" is in the document
```

---

```
Unit Test ID : UTC-F032-F-005
Title        : EditProfileForm_PasswordMismatch_ShowsError
Layer        : Frontend — Component
File         : frontend/src/features/profile/EditProfilePage.tsx
AC Covered   : AC-8
Framework    : Vitest + React Testing Library

Arrange:
  - render(<EditProfilePage />)
  - Fill newPassword = "abc123", confirmPassword = "different"

Act:
  - Click Save

Assert:
  - Error message about password mismatch is displayed
  - API was NOT called
```
