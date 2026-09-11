# Unit Test Cases — F-020: Team Reports Dashboard

**Feature:** F-020 — Team Reports Dashboard  
**Date:** 2026-05-28  
**Framework:** Vitest + React Testing Library  

---

## UTC-F020-FE-001
**Suite:** ReportsPage render  
**Title:** Renders Reports page heading for ADMIN  
**Arrange:** Mock useAuthStore → ADMIN user; render ReportsPage  
**Act:** Query for heading text  
**Assert:** `screen.getByText('Reports')` is in the document  

---

## UTC-F020-FE-002
**Suite:** ReportsPage tabs  
**Title:** Renders all 4 tab buttons  
**Arrange:** Render ReportsPage as ADMIN  
**Act:** Query all tab buttons  
**Assert:** 'Team Productivity', 'KPI Appraisal', 'Project Summary', 'Bug Summary' tabs all present  

---

## UTC-F020-FE-003
**Suite:** ReportsPage tabs  
**Title:** Team Productivity tab is active by default  
**Arrange:** Render ReportsPage  
**Act:** Check default active tab  
**Assert:** 'Team Productivity' tab has active styling; productivity content visible  

---

## UTC-F020-FE-004
**Suite:** ReportsPage tabs  
**Title:** Clicking KPI Appraisal tab shows KPI content  
**Arrange:** Render ReportsPage  
**Act:** userEvent.click on 'KPI Appraisal' tab  
**Assert:** 'Grade Distribution' or 'Team Average' heading visible  

---

## UTC-F020-FE-005
**Suite:** ReportsPage tabs  
**Title:** Clicking Project Summary tab shows project content  
**Arrange:** Render ReportsPage  
**Act:** userEvent.click on 'Project Summary' tab  
**Assert:** 'PMS Web App' project name visible  

---

## UTC-F020-FE-006
**Suite:** ReportsPage tabs  
**Title:** Clicking Bug Summary tab shows bug content  
**Arrange:** Render ReportsPage  
**Act:** userEvent.click on 'Bug Summary' tab  
**Assert:** 'Show Stopper' or 'Critical' severity label visible  

---

## UTC-F020-FE-007
**Suite:** Static data integrity — productivity  
**Title:** STATIC_PRODUCTIVITY_DATA has 14 entries  
**Arrange:** Import STATIC_PRODUCTIVITY_DATA  
**Act:** Check length  
**Assert:** `STATIC_PRODUCTIVITY_DATA.length === 14`  

---

## UTC-F020-FE-008
**Suite:** Static data integrity — productivity  
**Title:** Hemant Atre is highest productivity scorer  
**Arrange:** Import STATIC_PRODUCTIVITY_DATA  
**Act:** Sort by score descending  
**Assert:** `sorted[0].name === 'Hemant Atre'`  

---

## UTC-F020-FE-009
**Suite:** Static data integrity — productivity  
**Title:** Jayvant Bagul is lowest productivity scorer  
**Arrange:** Import STATIC_PRODUCTIVITY_DATA  
**Act:** Sort by score ascending  
**Assert:** `sorted[0].name === 'Jayvant Bagul'`  

---

## UTC-F020-FE-010
**Suite:** Static data integrity — projects  
**Title:** STATIC_PROJECT_DATA has 3 projects  
**Arrange:** Import STATIC_PROJECT_DATA  
**Act:** Check length  
**Assert:** `STATIC_PROJECT_DATA.length === 3`  

---

## UTC-F020-FE-011
**Suite:** Static data integrity — projects  
**Title:** SalesForce Integration project is Completed  
**Arrange:** Import STATIC_PROJECT_DATA  
**Act:** Find project by name  
**Assert:** `project.status === 'Completed'` and `project.done === project.tasks`  

---

## UTC-F020-FE-012
**Suite:** Static data integrity — bugs  
**Title:** Total bug count sums correctly  
**Arrange:** Import STATIC_BUG_SEVERITY_DATA  
**Act:** Sum all counts  
**Assert:** Total equals 40 (2 + 5 + 12 + 21)  

---

## UTC-F020-FE-013
**Suite:** ReportsPage render — team productivity  
**Title:** Shows Hemant Atre in productivity table  
**Arrange:** Render ReportsPage as ADMIN  
**Act:** Look for Hemant Atre text  
**Assert:** `screen.getAllByText('Hemant Atre').length >= 1`  

---

## UTC-F020-FE-014
**Suite:** ReportsPage — KPI tab  
**Title:** KPI tab reuses STATIC_KPI_DATA (14 employees shown)  
**Arrange:** Render ReportsPage; click KPI Appraisal tab  
**Act:** Check for known KPI user  
**Assert:** `screen.getAllByText('Yogesh Lolage').length >= 1`  

---

## UTC-F020-FE-015
**Suite:** DashboardPage  
**Title:** Announcements widget renders on dashboard  
**Arrange:** Mock dashboardApi.getStats; render DashboardPage  
**Act:** Look for announcements heading  
**Assert:** `screen.getByText('Announcements')` or `screen.getByText("What's New")` in document  

---

## UTC-F020-FE-016
**Suite:** ReportsPage — EMPLOYEE role  
**Title:** Employee sees personal summary card  
**Arrange:** Mock useAuthStore → EMPLOYEE user (Yogesh Lolage); render ReportsPage  
**Act:** Look for personal summary element  
**Assert:** Personal productivity card or 'My Performance' heading is rendered  
