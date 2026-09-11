# TC-F-033 — E2E Test Cases: Project Role-Based Access Control

**Feature:** F-033 — Project Role-Based Access Control  
**Date:** 2026-06-03  
**Author:** Yogesh Lolage  

---

## TC-F-033-001 — PROJECT_MANAGER has full access

**Given** a user logged in as PROJECT_MANAGER on "Horizon" project  
**When** they perform all actions: create/update/delete work items, manage sprints, add members  
**Then** all actions succeed with 2xx responses  

---

## TC-F-033-002 — TEAM_LEAD can manage work items and sprints but not members

**Given** a user logged in as TEAM_LEAD  
**When** they create a work item → succeeds  
**And** they delete a work item → succeeds  
**And** they create a sprint → succeeds  
**And** they delete a sprint → receives `403`  
**And** they add a project member → receives `403`  
**Then** all assertions pass  

---

## TC-F-033-003 — DEVELOPER can contribute but not manage

**Given** a user logged in as DEVELOPER  
**When** they view the board → succeeds  
**And** they create a work item → succeeds  
**And** they update a work item → succeeds  
**And** they move a work item → succeeds  
**And** they delete a work item → receives `403`  
**And** they create a sprint → receives `403`  
**Then** all assertions pass  

---

## TC-F-033-004 — QA can contribute but not delete or manage sprints

**Given** a user logged in as QA  
**When** they view the board → succeeds  
**And** they create a work item → succeeds  
**And** they delete a work item → receives `403`  
**And** they create a sprint → receives `403`  
**Then** all assertions pass  

---

## TC-F-033-005 — Non-member cannot access project resources

**Given** an authenticated user who is NOT a member of "Horizon" project  
**When** they call any project-scoped guarded endpoint  
**Then** they receive `403 Forbidden`  

---

## TC-F-033-006 — ADMIN bypasses all project role restrictions

**Given** a user with system role `ADMIN`  
**When** they delete a work item, delete a sprint, and remove a project member  
**Then** all actions succeed regardless of project membership  

---

## TC-F-033-007 — KPI data scoping — PROJECT_MANAGER sees all

**Given** a PROJECT_MANAGER on a project with 5 members  
**When** they open the KPI/Reports page  
**Then** they see data for all 5 team members  

---

## TC-F-033-008 — KPI data scoping — DEVELOPER sees only own data

**Given** a DEVELOPER on a project with 5 members  
**When** they open the KPI/Reports page  
**Then** they see only their own data, not other members' data  

---

## TC-F-033-009 — Frontend hides restricted actions for DEVELOPER

**Given** a DEVELOPER logged into the board  
**When** they view a work item card  
**Then** the Delete button is not visible  
**And** the Sprint Management controls are not visible  

---

## TC-F-033-010 — Frontend shows all actions for PROJECT_MANAGER

**Given** a PROJECT_MANAGER logged into the board  
**When** they view the board and work item modal  
**Then** Delete button is visible  
**And** Sprint Manager is accessible  
**And** Add Member button is visible on project detail  
