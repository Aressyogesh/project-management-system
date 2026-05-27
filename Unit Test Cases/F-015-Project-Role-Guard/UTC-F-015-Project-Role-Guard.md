Feature ID   : F-015
Feature Name : ProjectRoleGuard
Layer        : Backend
Framework    : Jest (NestJS testing module)

---

UTC-F-015-B-001
Title        : canActivate_SuperUser_ReturnsTrue
AC Covered   : AC-1
Arrange:
  - Mock Reflector to return required project roles [PROJECT_MANAGER, TEAM_LEAD]
  - Mock request with user { systemRole: SUPER_USER }
  - Mock ExecutionContext to return this request
Act:
  - result = await guard.canActivate(context)
Assert:
  - result === true
  - PrismaService.projectMember.findFirst NOT called

---

UTC-F-015-B-002
Title        : canActivate_Admin_ReturnsTrue
AC Covered   : AC-1
Arrange:
  - Mock request with user { systemRole: ADMIN }
  - Mock Reflector to return [PROJECT_MANAGER]
Act:
  - result = await guard.canActivate(context)
Assert:
  - result === true
  - PrismaService NOT called

---

UTC-F-015-B-003
Title        : canActivate_ProjectManagerMember_ReturnsTrue
AC Covered   : AC-2
Arrange:
  - Mock request with user { id: 'u1', systemRole: EMPLOYEE }, params { projectId: 'p1' }
  - Mock Reflector to return [PROJECT_MANAGER, TEAM_LEAD]
  - Mock PrismaService.projectMember.findFirst → { projectRole: PROJECT_MANAGER }
Act:
  - result = await guard.canActivate(context)
Assert:
  - result === true

---

UTC-F-015-B-004
Title        : canActivate_TeamLeadMember_AllowedRoles_ReturnsTrue
AC Covered   : AC-3
Arrange:
  - Mock request with user { id: 'u2', systemRole: EMPLOYEE }, params { projectId: 'p1' }
  - Mock Reflector to return [PROJECT_MANAGER, TEAM_LEAD]
  - Mock PrismaService.projectMember.findFirst → { projectRole: TEAM_LEAD }
Act:
  - result = await guard.canActivate(context)
Assert:
  - result === true

---

UTC-F-015-B-005
Title        : canActivate_TeamLeadMember_MilestoneRoute_ThrowsForbidden
AC Covered   : AC-3
Arrange:
  - Mock request with user { id: 'u2', systemRole: EMPLOYEE }, params { projectId: 'p1' }
  - Mock Reflector to return [PROJECT_MANAGER]  ← milestone routes only allow PM
  - Mock PrismaService.projectMember.findFirst → { projectRole: TEAM_LEAD }
Act:
  - guard.canActivate(context)
Assert:
  - throws ForbiddenException

---

UTC-F-015-B-006
Title        : canActivate_DeveloperMember_ThrowsForbidden
AC Covered   : AC-4
Arrange:
  - Mock request with user { id: 'u3', systemRole: EMPLOYEE }, params { projectId: 'p1' }
  - Mock Reflector to return [PROJECT_MANAGER, TEAM_LEAD]
  - Mock PrismaService.projectMember.findFirst → { projectRole: DEVELOPER }
Act:
  - guard.canActivate(context)
Assert:
  - throws ForbiddenException

---

UTC-F-015-B-007
Title        : canActivate_NonMember_ThrowsForbidden
AC Covered   : AC-5
Arrange:
  - Mock request with user { id: 'u99', systemRole: EMPLOYEE }, params { projectId: 'p1' }
  - Mock PrismaService.projectMember.findFirst → null
Act:
  - guard.canActivate(context)
Assert:
  - throws ForbiddenException

---

UTC-F-015-B-008
Title        : canActivate_NoProjectRolesDecorator_ReturnsTrue
AC Covered   : AC-6 (read endpoints have no decorator)
Arrange:
  - Mock Reflector to return null/undefined
  - Mock request with any user
Act:
  - result = await guard.canActivate(context)
Assert:
  - result === true
  - PrismaService NOT called
