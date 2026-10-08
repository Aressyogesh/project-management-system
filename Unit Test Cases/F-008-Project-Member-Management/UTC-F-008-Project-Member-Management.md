# Unit Test Cases — F-008: Project Member Management

**Feature ID:** F-008  
**Date:** 2026-05-26

---

## Backend — ProjectMembersService

| ID | Test Name | Method | Input | Expected |
|----|-----------|--------|-------|----------|
| UTC-F-008-B-001 | AddMember_ValidData_ReturnsMember | `addMember()` | Valid projectId, userId, projectRole | Returns new ProjectMember record |
| UTC-F-008-B-002 | AddMember_ProjectNotFound_ThrowsNotFoundException | `addMember()` | Non-existent projectId | Throws `NotFoundException` |
| UTC-F-008-B-003 | AddMember_UserNotFound_ThrowsNotFoundException | `addMember()` | Non-existent userId | Throws `NotFoundException` |
| UTC-F-008-B-004 | AddMember_DuplicateMember_ThrowsConflictException | `addMember()` | userId already in project | Throws `ConflictException` |
| UTC-F-008-B-005 | UpdateRole_ValidData_ReturnsUpdatedMember | `updateRole()` | Valid projectId, userId, new role | Returns member with updated role |
| UTC-F-008-B-006 | UpdateRole_MemberNotFound_ThrowsNotFoundException | `updateRole()` | userId not in project | Throws `NotFoundException` |
| UTC-F-008-B-007 | RemoveMember_ValidData_DeletesMember | `removeMember()` | Valid projectId + userId | Prisma `delete` called; void returned |
| UTC-F-008-B-008 | RemoveMember_NotFound_ThrowsNotFoundException | `removeMember()` | Non-member userId | Throws `NotFoundException` |
| UTC-F-008-B-009 | ListMembers_ValidProject_ReturnsMemberList | `listMembers()` | Valid projectId | Returns array of members with user info |

---

## Frontend — ProjectDetailPage

| ID | Test Name | Component | Scenario | Expected |
|----|-----------|-----------|----------|----------|
| UTC-F-008-FE-001 | ProjectDetailPage_LoadsProject_DisplaysProjectInfo | `ProjectDetailPage` | API returns project | Name, status badge, type badge visible |
| UTC-F-008-FE-002 | ProjectDetailPage_LoadsMembers_DisplaysMemberList | `ProjectDetailPage` | API returns members | Member names and roles listed |
| UTC-F-008-FE-003 | ProjectDetailPage_AdminRole_ShowsAddMemberButton | `ProjectDetailPage` | User is ADMIN | "Add Member" button visible |
| UTC-F-008-FE-004 | ProjectDetailPage_ViewerRole_HidesAddMemberButton | `ProjectDetailPage` | User is EMPLOYEE | "Add Member" button absent |
| UTC-F-008-FE-005 | ProjectDetailPage_AddMember_OpensModal | `ProjectDetailPage` | Click "Add Member" | AddMemberModal renders |
| UTC-F-008-FE-006 | ProjectDetailPage_BackLink_NavigatesToProjects | `ProjectDetailPage` | Click back link | Navigate called with `/projects` |
