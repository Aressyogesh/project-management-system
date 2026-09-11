# Unit Test Cases — F-021: Phase 11 Complete Reports

**Feature:** F-021 — Phase 11 Complete: Task Allocation, Timesheet & Export Reports  
**Date:** 2026-05-28  
**Framework:** Vitest + React Testing Library  

---

## UTC-F021-FE-001
**Suite:** ReportsPage tabs  
**Title:** Renders 6 tab buttons after F-021  
**Arrange:** Render ReportsPage as ADMIN  
**Act:** Query all tab buttons  
**Assert:** All 6 tabs present: Team Productivity, KPI Appraisal, Project Summary, Bug Summary, Task Allocation, Timesheet  

---

## UTC-F021-FE-002
**Suite:** ReportsPage — Task Allocation tab  
**Title:** Clicking Task Allocation tab shows allocation content  
**Arrange:** Render ReportsPage as ADMIN  
**Act:** userEvent.click on 'Task Allocation' tab  
**Assert:** 'Task Allocation Details' heading or allocation table visible  

---

## UTC-F021-FE-003
**Suite:** ReportsPage — Timesheet tab  
**Title:** Clicking Timesheet tab shows timesheet content  
**Arrange:** Render ReportsPage as ADMIN  
**Act:** userEvent.click on 'Timesheet' tab  
**Assert:** 'Timesheet Summary' heading or timesheet table visible  

---

## UTC-F021-FE-004
**Suite:** Static data integrity — allocation  
**Title:** STATIC_ALLOCATION_DATA has 14 entries  
**Arrange:** Import STATIC_ALLOCATION_DATA  
**Act:** Check length  
**Assert:** `STATIC_ALLOCATION_DATA.length === 14`  

---

## UTC-F021-FE-005
**Suite:** Static data integrity — allocation  
**Title:** Hemant Atre has highest allocation hours  
**Arrange:** Import STATIC_ALLOCATION_DATA  
**Act:** Sort by hoursAllocated descending  
**Assert:** `sorted[0].name === 'Hemant Atre'`  

---

## UTC-F021-FE-006
**Suite:** Static data integrity — allocation  
**Title:** Jayvant Bagul has lowest allocation hours  
**Arrange:** Import STATIC_ALLOCATION_DATA  
**Act:** Sort by hoursAllocated ascending  
**Assert:** `sorted[0].name === 'Jayvant Bagul'`  

---

## UTC-F021-FE-007
**Suite:** Static data integrity — timesheet  
**Title:** STATIC_TIMESHEET_DATA has 14 entries  
**Arrange:** Import STATIC_TIMESHEET_DATA  
**Act:** Check length  
**Assert:** `STATIC_TIMESHEET_DATA.length === 14`  

---

## UTC-F021-FE-008
**Suite:** Static data integrity — timesheet  
**Title:** Total timesheet hours sums correctly  
**Arrange:** Import STATIC_TIMESHEET_DATA  
**Act:** Sum all hoursLogged  
**Assert:** Total equals 1464 (sum of all 14 users' hours)  

---

## UTC-F021-FE-009
**Suite:** Static data integrity — timesheet  
**Title:** Approved timesheet count is correct  
**Arrange:** Import STATIC_TIMESHEET_DATA  
**Act:** Filter by status === 'Approved'  
**Assert:** `approved.length === 7`  

---

## UTC-F021-FE-010
**Suite:** ReportsPage — Task Allocation tab  
**Title:** Shows Hemant Atre in allocation table  
**Arrange:** Render ReportsPage as ADMIN; click Task Allocation tab  
**Act:** Look for Hemant Atre text  
**Assert:** `screen.getAllByText('Hemant Atre').length >= 1`  

---

## UTC-F021-FE-011
**Suite:** ReportsPage — Timesheet tab  
**Title:** Shows Yogesh Lolage in timesheet table  
**Arrange:** Render ReportsPage as ADMIN; click Timesheet tab  
**Act:** Look for Yogesh Lolage text  
**Assert:** `screen.getAllByText('Yogesh Lolage').length >= 1`  

---

## UTC-F021-FE-012
**Suite:** CSV Export  
**Title:** Export CSV button is present on Task Allocation tab  
**Arrange:** Render ReportsPage as ADMIN; click Task Allocation tab  
**Act:** Query for Export CSV button  
**Assert:** `screen.getByText(/Export CSV/i)` is in the document  

---

## UTC-F021-FE-013
**Suite:** CSV Export  
**Title:** Export CSV button is present on Timesheet tab  
**Arrange:** Render ReportsPage as ADMIN; click Timesheet tab  
**Act:** Query for Export CSV button  
**Assert:** `screen.getByText(/Export CSV/i)` is in the document  

---

## UTC-F021-FE-014
**Suite:** EMPLOYEE role — Task Allocation tab  
**Title:** Employee sees personal allocation summary  
**Arrange:** Mock useAuthStore → EMPLOYEE (Yogesh Lolage); render ReportsPage  
**Act:** Look for personal allocation content  
**Assert:** Personal summary card or 'My Allocation' heading is rendered  

---

## UTC-F021-FE-015
**Suite:** Static data integrity — allocation utilisation  
**Title:** Total allocated hours across all users is 1600  
**Arrange:** Import STATIC_ALLOCATION_DATA  
**Act:** Sum all hoursAllocated  
**Assert:** Total equals 1600  
