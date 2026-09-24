# UTC-F-033 — Unit Test Cases: Project Role-Based Access Control

**Feature:** F-033 — Project Role-Based Access Control  
**Date:** 2026-06-03  
**Author:** Yogesh Lolage  

---

## Work Items

### UTC-F-033-001 — DEVELOPER cannot delete a work item
**Arrange:** User with project role `DEVELOPER`, valid `workItem.id`  
**Act:** `DELETE /work-items/:id`  
**Assert:** Guard throws `ForbiddenException`

---

### UTC-F-033-002 — QA cannot delete a work item
**Arrange:** User with project role `QA`, valid `workItem.id`  
**Act:** `DELETE /work-items/:id`  
**Assert:** Guard throws `ForbiddenException`

---

### UTC-F-033-003 — TEAM_LEAD can delete a work item
**Arrange:** User with project role `TEAM_LEAD`, valid `workItem.id`  
**Act:** `DELETE /work-items/:id`  
**Assert:** Guard returns `true`

---

### UTC-F-033-004 — PROJECT_MANAGER can delete a work item
**Arrange:** User with project role `PROJECT_MANAGER`, valid `workItem.id`  
**Act:** `DELETE /work-items/:id`  
**Assert:** Guard returns `true`

---

### UTC-F-033-005 — ADMIN system role bypasses project role check on delete
**Arrange:** User with `systemRole = ADMIN`, any project role  
**Act:** `DELETE /work-items/:id`  
**Assert:** Guard returns `true` without querying `ProjectMember`

---

## Sprints

### UTC-F-033-006 — DEVELOPER cannot create a sprint
**Arrange:** User with project role `DEVELOPER`  
**Act:** `POST /projects/:projectId/sprints`  
**Assert:** Guard throws `ForbiddenException`

---

### UTC-F-033-007 — TEAM_LEAD can create a sprint
**Arrange:** User with project role `TEAM_LEAD`  
**Act:** `POST /projects/:projectId/sprints`  
**Assert:** Guard returns `true`

---

### UTC-F-033-008 — TEAM_LEAD cannot delete a sprint
**Arrange:** User with project role `TEAM_LEAD`, valid `sprint.id`  
**Act:** `DELETE /sprints/:id`  
**Assert:** Guard throws `ForbiddenException`

---

### UTC-F-033-009 — PROJECT_MANAGER can delete a sprint
**Arrange:** User with project role `PROJECT_MANAGER`, valid `sprint.id`  
**Act:** `DELETE /sprints/:id`  
**Assert:** Guard returns `true`

---

## Project Members

### UTC-F-033-010 — TEAM_LEAD cannot add a project member
**Arrange:** User with project role `TEAM_LEAD`  
**Act:** `POST /projects/:projectId/members`  
**Assert:** Guard throws `ForbiddenException`

---

### UTC-F-033-011 — PROJECT_MANAGER can add a project member
**Arrange:** User with project role `PROJECT_MANAGER`  
**Act:** `POST /projects/:projectId/members`  
**Assert:** Guard returns `true`

---

## Membership Check

### UTC-F-033-012 — User with no project membership is rejected
**Arrange:** User with `systemRole = EMPLOYEE`, no `ProjectMember` record for the project  
**Act:** Any guarded endpoint  
**Assert:** Guard throws `ForbiddenException`

---

## KPI / Reports Scoping

### UTC-F-033-013 — PROJECT_MANAGER receives full team data from KPI endpoint
**Arrange:** User with project role `PROJECT_MANAGER`, 3 project members  
**Act:** `GET /analytics/kpi?projectId=:id`  
**Assert:** Response contains data for all 3 members

---

### UTC-F-033-014 — DEVELOPER receives only own data from KPI endpoint
**Arrange:** User with project role `DEVELOPER`, 3 project members  
**Act:** `GET /analytics/kpi?projectId=:id`  
**Assert:** Response contains data for current user only
