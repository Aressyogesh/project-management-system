# Unit Test Cases — F-004: User Management

---

## Backend Unit Tests

### UTC-F-004-B-001
```
Unit Test ID : UTC-F-004-B-001
Title        : CreateUser_ValidData_ReturnsCreatedUser
Layer        : Backend
Class / File : UsersService
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - Mock PrismaService.user.findUnique() → returns null (email not taken)
  - Mock bcrypt.hash()                   → returns "hashed-password"
  - Mock PrismaService.user.create()     → returns user object with id, fullName, email

Act:
  - result = await usersService.createUser({ fullName: 'Jane Doe', email: 'jane@pms.com', password: 'Pass@1234', systemRole: 'EMPLOYEE' })

Assert:
  - result.fullName === 'Jane Doe'
  - result.email    === 'jane@pms.com'
  - PrismaService.user.create() called once
  - passwordHash field is NOT 'Pass@1234' (was hashed)
```

---

### UTC-F-004-B-002
```
Unit Test ID : UTC-F-004-B-002
Title        : CreateUser_DuplicateEmail_ThrowsConflictException
Layer        : Backend
Class / File : UsersService
AC Covered   : AC-6
Framework    : Jest

Arrange:
  - Mock PrismaService.user.findUnique() → returns existing user

Act:
  - usersService.createUser({ email: 'existing@pms.com', ... })

Assert:
  - Throws ConflictException with message containing 'email already in use'
  - PrismaService.user.create() never called
```

---

### UTC-F-004-B-003
```
Unit Test ID : UTC-F-004-B-003
Title        : FindAll_WithSearch_ReturnsFilteredPaginatedUsers
Layer        : Backend
Class / File : UsersService
AC Covered   : AC-8, AC-9
Framework    : Jest

Arrange:
  - Mock PrismaService.user.findMany() → returns [userA, userB]
  - Mock PrismaService.user.count()    → returns 2

Act:
  - result = await usersService.findAll({ page: 1, limit: 25, search: 'jane' })

Assert:
  - result.data.length === 2
  - result.total === 2
  - result.page  === 1
  - PrismaService.user.findMany() called with where clause containing 'jane'
```

---

### UTC-F-004-B-004
```
Unit Test ID : UTC-F-004-B-004
Title        : UpdateUser_ValidPatch_ReturnsUpdatedUser
Layer        : Backend
Class / File : UsersService
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock PrismaService.user.findUnique() → returns existing user
  - Mock PrismaService.user.update()     → returns updated user

Act:
  - result = await usersService.updateUser('user-id', { phone: '+91 98765 43210' })

Assert:
  - result.phone === '+91 98765 43210'
  - PrismaService.user.update() called with correct where + data
```

---

### UTC-F-004-B-005
```
Unit Test ID : UTC-F-004-B-005
Title        : UpdateUser_NotFound_ThrowsNotFoundException
Layer        : Backend
Class / File : UsersService
AC Covered   : AC-7
Framework    : Jest

Arrange:
  - Mock PrismaService.user.findUnique() → returns null

Act:
  - usersService.updateUser('non-existent-id', { fullName: 'X' })

Assert:
  - Throws NotFoundException
```

---

### UTC-F-004-B-006
```
Unit Test ID : UTC-F-004-B-006
Title        : ToggleStatus_OwnAccount_ThrowsBadRequestException
Layer        : Backend
Class / File : UsersService
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - currentUserId = 'user-abc'
  - targetId      = 'user-abc'   (same — own account)

Act:
  - usersService.setUserStatus('user-abc', false, 'user-abc')

Assert:
  - Throws BadRequestException with message 'Cannot deactivate your own account'
  - PrismaService.user.update() never called
```

---

### UTC-F-004-B-007
```
Unit Test ID : UTC-F-004-B-007
Title        : ToggleStatus_OtherUser_UpdatesIsActive
Layer        : Backend
Class / File : UsersService
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - Mock PrismaService.user.findUnique() → returns active user
  - Mock PrismaService.user.update()     → returns user with isActive: false

Act:
  - result = await usersService.setUserStatus('other-user-id', false, 'current-user-id')

Assert:
  - result.isActive === false
  - PrismaService.user.update() called with { isActive: false }
```

---

## Frontend Unit Tests

### UTC-F-004-F-001
```
Unit Test ID : UTC-F-004-F-001
Title        : UsersPage_Renders_UserTableWithData
Layer        : Frontend
Class / File : frontend/src/features/users/__tests__/UsersPage.test.tsx
AC Covered   : AC-2
Framework    : Vitest + React Testing Library

Arrange:
  - Mock useQuery (users) → returns { data: { data: [mockUser], total: 1, page: 1, limit: 25 } }

Act:
  - render(<UsersPage />)

Assert:
  - Screen contains mockUser.fullName
  - Screen contains mockUser.email
  - Screen contains mockUser.systemRole
```

---

### UTC-F-004-F-002
```
Unit Test ID : UTC-F-004-F-002
Title        : UserFormModal_Submit_ValidData_CallsCreateMutation
Layer        : Frontend
Class / File : frontend/src/features/users/__tests__/UsersPage.test.tsx
AC Covered   : AC-3
Framework    : Vitest + React Testing Library

Arrange:
  - Mock useMutation (createUser) → tracks calls
  - Render <UserFormModal mode="create" onClose={fn} />

Act:
  - Fill in fullName, email, password, systemRole
  - Click "Save User" button

Assert:
  - createUser mutation called once with correct payload
```

---

### UTC-F-004-F-003
```
Unit Test ID : UTC-F-004-F-003
Title        : UsersPage_Search_FiltersUserList
Layer        : Frontend
Class / File : frontend/src/features/users/__tests__/UsersPage.test.tsx
AC Covered   : AC-8
Framework    : Vitest + React Testing Library

Arrange:
  - Render <UsersPage />

Act:
  - Type 'jane' into search input

Assert:
  - useQuery called with search param containing 'jane'
```
