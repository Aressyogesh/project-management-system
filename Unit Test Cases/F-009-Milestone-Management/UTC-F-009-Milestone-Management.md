# Unit Test Cases — F-009: Milestone Management

**Feature ID:** F-009  
**Date:** 2026-05-26

---

## Backend — MilestonesService

| ID | Test Name | Method | Input | Expected |
|----|-----------|--------|-------|----------|
| UTC-F-009-B-001 | CreateMilestone_ValidData_ReturnsMilestone | `create()` | Valid projectId + description | Returns created Milestone |
| UTC-F-009-B-002 | CreateMilestone_ProjectNotFound_ThrowsNotFoundException | `create()` | Non-existent projectId | Throws `NotFoundException` |
| UTC-F-009-B-003 | CreateMilestone_EndBeforeStart_ThrowsBadRequestException | `create()` | dueDate < startDate | Throws `BadRequestException` |
| UTC-F-009-B-004 | UpdateMilestone_ValidData_ReturnsUpdatedMilestone | `update()` | Valid id + new description | Returns updated Milestone |
| UTC-F-009-B-005 | UpdateMilestone_NotFound_ThrowsNotFoundException | `update()` | Non-existent id | Throws `NotFoundException` |
| UTC-F-009-B-006 | DeleteMilestone_ValidId_DeletesMilestone | `remove()` | Valid id | Prisma delete called; void returned |
| UTC-F-009-B-007 | DeleteMilestone_NotFound_ThrowsNotFoundException | `remove()` | Non-existent id | Throws `NotFoundException` |
| UTC-F-009-B-008 | ListMilestones_ValidProject_ReturnsList | `findAll()` | Valid projectId | Returns array of milestones |

---

## Frontend — ProjectDetailPage (Milestones section)

| ID | Test Name | Component | Scenario | Expected |
|----|-----------|-----------|----------|----------|
| UTC-F-009-FE-001 | MilestonesSection_LoadsMilestones_DisplaysList | `ProjectDetailPage` | API returns milestones | Milestone descriptions visible |
| UTC-F-009-FE-002 | MilestonesSection_EmptyState_ShowsNoMilestonesMsg | `ProjectDetailPage` | API returns empty array | "No milestones yet." shown |
| UTC-F-009-FE-003 | MilestonesSection_AdminRole_ShowsAddButton | `ProjectDetailPage` | User is ADMIN | "Add Milestone" button visible |
| UTC-F-009-FE-004 | MilestonesSection_ViewerRole_HidesAddButton | `ProjectDetailPage` | User is EMPLOYEE | "Add Milestone" button absent |
| UTC-F-009-FE-005 | MilestonesSection_AddButton_OpensModal | `ProjectDetailPage` | Click "Add Milestone" | MilestoneFormModal renders |
