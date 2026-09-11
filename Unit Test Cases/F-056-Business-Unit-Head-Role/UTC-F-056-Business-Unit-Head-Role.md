# Unit Test Cases — F-056: Business Unit Head Role

Feature ID   : F-056
Feature Name : Business Unit Head Role
Framework    : Jest + ts-jest (backend) / Vitest + React Testing Library (frontend)

---

## Backend Unit Tests

---

### UTC-F056-B-001

Unit Test ID : UTC-F056-B-001
Title        : UsersService_CreateUser_BuHeadWithoutManagedBuId_Throws422
Layer        : Backend — UsersService
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - Mock PrismaService (no DB calls needed)
  - Input DTO: { systemRole: 'BU_HEAD', managedBusinessUnitId: undefined, ...validFields }

Act:
  - Call usersService.create(dto)

Assert:
  - Throws UnprocessableEntityException
  - Exception message contains "managedBusinessUnitId is required for BU_HEAD role"

---

### UTC-F056-B-002

Unit Test ID : UTC-F056-B-002
Title        : UsersService_CreateUser_BuHeadWithManagedBuId_Succeeds
Layer        : Backend — UsersService
AC Covered   : AC-1, AC-2
Framework    : Jest

Arrange:
  - Mock PrismaService.user.create → returns user with systemRole BU_HEAD
    and managedBusinessUnitId set
  - Mock PrismaService.businessUnit.findUnique → returns a valid BU record
  - Input DTO: { systemRole: 'BU_HEAD', managedBusinessUnitId: 'bu-uuid', ...validFields }

Act:
  - Call usersService.create(dto)

Assert:
  - Returns created user with systemRole === 'BU_HEAD'
  - Returns user with managedBusinessUnitId === 'bu-uuid'
  - PrismaService.user.create called with managedBusinessUnitId: 'bu-uuid'

---

### UTC-F056-B-003

Unit Test ID : UTC-F056-B-003
Title        : UsersService_UpdateUser_RoleChangedFromBuHead_ClearsManagedBuId
Layer        : Backend — UsersService
AC Covered   : AC-10 (related), AC-2
Framework    : Jest

Arrange:
  - Mock PrismaService.user.update → returns updated user
  - Existing user has systemRole BU_HEAD
  - Update DTO: { systemRole: 'EMPLOYEE' }  (no managedBusinessUnitId provided)

Act:
  - Call usersService.update(userId, dto)

Assert:
  - PrismaService.user.update called with { managedBusinessUnitId: null }

---

### UTC-F056-B-004

Unit Test ID : UTC-F056-B-004
Title        : UsersService_GetAll_BuHeadCaller_ReturnsOnlyBuScopedUsers
Layer        : Backend — UsersService
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - Caller has systemRole BU_HEAD, managedBusinessUnitId: 'bu-001'
  - Mock PrismaService.user.findMany → verify it receives where clause filtering
    department.businessUnitId === 'bu-001'

Act:
  - Call usersService.findAll({ callerRole: 'BU_HEAD', callerManagedBuId: 'bu-001' })

Assert:
  - PrismaService.user.findMany called with where containing:
    { department: { businessUnitId: 'bu-001' } }

---

### UTC-F056-B-005

Unit Test ID : UTC-F056-B-005
Title        : UsersService_GetAll_AdminCaller_ReturnsAllUsers
Layer        : Backend — UsersService
AC Covered   : AC-14
Framework    : Jest

Arrange:
  - Caller has systemRole ADMIN
  - Mock PrismaService.user.findMany → returns all users

Act:
  - Call usersService.findAll({ callerRole: 'ADMIN', callerManagedBuId: null })

Assert:
  - PrismaService.user.findMany called WITHOUT department.businessUnitId filter
  - Existing ADMIN behaviour unchanged

---

### UTC-F056-B-006

Unit Test ID : UTC-F056-B-006
Title        : DashboardService_GetStats_BuHeadCaller_ScopesToBuProjects
Layer        : Backend — DashboardService
AC Covered   : AC-6
Framework    : Jest

Arrange:
  - Caller: { systemRole: BU_HEAD, managedBusinessUnitId: 'bu-001' }
  - Mock PrismaService.project.findMany → returns projects filtered by bu
  - Mock all parallel DB calls

Act:
  - Call dashboardService.getStats(userId, 'BU_HEAD', undefined, undefined, 'bu-001')

Assert:
  - Stat cards returned with correct blue/rose/purple/green color assignments
  - Labels: 'All Projects', 'Total Tasks', 'Team Members', 'Completed Tasks'
  - Project filter includes department.businessUnitId === 'bu-001'

---

### UTC-F056-B-007

Unit Test ID : UTC-F056-B-007
Title        : LeaveRequestsService_Approve_BuHeadInScope_Succeeds
Layer        : Backend — LeaveRequestsService
AC Covered   : AC-8
Framework    : Jest

Arrange:
  - Caller: { systemRole: BU_HEAD, managedBusinessUnitId: 'bu-001' }
  - Mock PrismaService.leaveRequest.findUnique → returns leave where
    user.department.businessUnitId === 'bu-001'
  - Mock PrismaService.leaveRequest.update → returns approved leave

Act:
  - Call leaveRequestsService.approve(leaveId, callerId, 'BU_HEAD', 'bu-001')

Assert:
  - Leave status updated to APPROVED
  - No ForbiddenException thrown

---

### UTC-F056-B-008

Unit Test ID : UTC-F056-B-008
Title        : LeaveRequestsService_Approve_BuHeadOutOfScope_ThrowsForbidden
Layer        : Backend — LeaveRequestsService
AC Covered   : AC-8
Framework    : Jest

Arrange:
  - Caller: { systemRole: BU_HEAD, managedBusinessUnitId: 'bu-001' }
  - Mock PrismaService.leaveRequest.findUnique → returns leave where
    user.department.businessUnitId === 'bu-002' (different BU)

Act:
  - Call leaveRequestsService.approve(leaveId, callerId, 'BU_HEAD', 'bu-001')

Assert:
  - Throws ForbiddenException
  - Exception message: "You can only manage leaves for users in your Business Unit"

---

### UTC-F056-B-009

Unit Test ID : UTC-F056-B-009
Title        : RolesGuard_BuHeadCallingAdminOnlyEndpoint_ThrowsForbidden
Layer        : Backend — RolesGuard
AC Covered   : AC-10
Framework    : Jest

Arrange:
  - Mock ExecutionContext with user { systemRole: 'BU_HEAD' }
  - Reflector returns required roles: ['SUPER_USER', 'ADMIN']

Act:
  - Call rolesGuard.canActivate(context)

Assert:
  - Throws ForbiddenException with 'Insufficient permissions'

---

### UTC-F056-B-010

Unit Test ID : UTC-F056-B-010
Title        : AuthService_Login_BuHeadUser_ReturnsManageddBuIdInUserDto
Layer        : Backend — AuthService
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock PrismaService.user.findUnique → returns BU_HEAD user with
    managedBusinessUnitId: 'bu-uuid'
  - Mock bcrypt.compare → true
  - Mock JwtService.sign → returns tokens

Act:
  - Call authService.login(email, password)

Assert:
  - response.user.managedBusinessUnitId === 'bu-uuid'
  - response.user.systemRole === 'BU_HEAD'

---

## Frontend Unit Tests

---

### UTC-F056-F-001

Unit Test ID : UTC-F056-F-001
Title        : Sidebar_BuHeadUser_ShowsCorrectNavItems
Layer        : Frontend — Sidebar component
AC Covered   : AC-11
Framework    : Vitest + React Testing Library

Arrange:
  - Mock useAuthStore → { user: { systemRole: 'BU_HEAD', managedBusinessUnitId: 'bu-1' } }
  - Mock useFeatureVisibility → { canSee: () => true }
  - Render <Sidebar collapsed={false} onToggle={() => {}} />

Act:
  - Render component

Assert:
  - Nav contains: 'Overview', 'Users', 'Projects', 'Timesheet',
    'Leaves Management', 'KPI', 'Reports', 'Announcements'
  - Nav does NOT contain: 'Business Units', 'Departments', 'Clients',
    'Org Structure', 'Activity Log'

---

### UTC-F056-F-002

Unit Test ID : UTC-F056-F-002
Title        : useFeatureVisibility_BuHeadUser_ReturnsTrue
Layer        : Frontend — useFeatureVisibility hook
AC Covered   : AC-13
Framework    : Vitest

Arrange:
  - Mock useAuthStore → { user: { systemRole: 'BU_HEAD' } }
  - Mock settingsApi.getFeatureVisibility → returns []

Act:
  - Call canSee('KPI') and canSee('REPORTS')

Assert:
  - canSee('KPI') === true
  - canSee('REPORTS') === true

---

### UTC-F056-F-003

Unit Test ID : UTC-F056-F-003
Title        : UserFormModal_BuHeadRole_ShowsManagedBuDropdown
Layer        : Frontend — UserFormModal component
AC Covered   : AC-12
Framework    : Vitest + React Testing Library

Arrange:
  - Mock usersApi.getBusinessUnits → returns [{ id: 'bu-1', name: 'Engineering' }]
  - Render <UserFormModal /> in create mode

Act:
  - Select 'BU Head' in the System Role dropdown

Assert:
  - A "Managed Business Unit" select/dropdown is visible
  - When role changes to 'ADMIN' or 'EMPLOYEE', the dropdown is hidden

---

### UTC-F056-F-004

Unit Test ID : UTC-F056-F-004
Title        : UserFormModal_OtherRoles_HidesManagedBuDropdown
Layer        : Frontend — UserFormModal component
AC Covered   : AC-12
Framework    : Vitest + React Testing Library

Arrange:
  - Render <UserFormModal /> in create mode

Act:
  - Default role is EMPLOYEE (no change)

Assert:
  - "Managed Business Unit" field is NOT present in the DOM

---

### UTC-F056-F-005

Unit Test ID : UTC-F056-F-005
Title        : AuthTypes_BuHead_IsValidSystemRole
Layer        : Frontend — TypeScript types
AC Covered   : AC-1
Framework    : TypeScript compiler (tsc --noEmit)

Arrange:
  - auth.types.ts defines SystemRole as union including 'BU_HEAD'

Act:
  - Assign: const role: SystemRole = 'BU_HEAD'

Assert:
  - No TypeScript compilation error
