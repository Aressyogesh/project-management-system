# Test Cases — F-021: Phase 11 Complete Reports

**Feature:** F-021 — Phase 11 Complete: Task Allocation, Timesheet & Export Reports  
**Date:** 2026-05-28  
**Type:** E2E / Integration  
**Framework:** Playwright (or manual browser verification)  

---

## TC-F021-001
**Suite:** Happy Path — Tabs  
**Title:** Admin sees 6 tabs on Reports page  
**Given:** Admin is logged in and on `/reports`  
**When:** Page loads  
**Then:** Six tab buttons visible: Team Productivity, KPI Appraisal, Project Summary, Bug Summary, Task Allocation, Timesheet  

---

## TC-F021-002
**Suite:** Happy Path — Task Allocation tab  
**Title:** Admin navigates to Task Allocation tab  
**Given:** Admin is on `/reports`  
**When:** User clicks "Task Allocation" tab  
**Then:** Allocation bar chart renders; table with 14 employee rows is visible; Hemant Atre appears with highest hours  

---

## TC-F021-003
**Suite:** Happy Path — Timesheet tab  
**Title:** Admin navigates to Timesheet tab  
**Given:** Admin is on `/reports`  
**When:** User clicks "Timesheet" tab  
**Then:** Timesheet summary table with 14 rows visible; status badges (Approved/Submitted/Draft) shown; total hours card visible  

---

## TC-F021-004
**Suite:** Happy Path — CSV Export (Task Allocation)  
**Title:** Clicking Export CSV on Task Allocation tab downloads file  
**Given:** Admin is on `/reports`, Task Allocation tab active  
**When:** User clicks "Export CSV"  
**Then:** Browser initiates a file download named `task-allocation-report-may-2026.csv`; file contains header row and 14 data rows  

---

## TC-F021-005
**Suite:** Happy Path — CSV Export (Timesheet)  
**Title:** Clicking Export CSV on Timesheet tab downloads file  
**Given:** Admin is on `/reports`, Timesheet tab active  
**When:** User clicks "Export CSV"  
**Then:** Browser initiates a file download named `timesheet-report-may-2026.csv`; file contains name, project, hours, status columns  

---

## TC-F021-006
**Suite:** Happy Path — CSV Export (Team Productivity)  
**Title:** Export CSV works on Team Productivity tab  
**Given:** Admin is on `/reports`, Team Productivity tab active  
**When:** User clicks "Export CSV"  
**Then:** CSV file named `team-productivity-report-may-2026.csv` downloaded with 14 rows  

---

## TC-F021-007
**Suite:** Happy Path — Data accuracy  
**Title:** Task Allocation tab shows 110% utilisation for Hemant Atre  
**Given:** Admin is on `/reports`, Task Allocation tab  
**When:** User views the table  
**Then:** Hemant Atre row shows 110% utilisation; row colour or badge indicates over-allocated  

---

## TC-F021-008
**Suite:** RBAC — Employee view  
**Title:** Employee sees personal allocation summary on Task Allocation tab  
**Given:** User is logged in as EMPLOYEE (e.g. Rohit More)  
**When:** User navigates to `/reports`  
**Then:** Personal summary card is visible; full 14-user table is NOT shown  

---

## TC-F021-009
**Suite:** Happy Path — Timesheet status badges  
**Title:** Approved, Submitted, Draft badges render with correct colours  
**Given:** Admin is on `/reports`, Timesheet tab active  
**When:** User views the table  
**Then:** "Approved" badge is green; "Submitted" is blue/amber; "Draft" is gray  

---

## TC-F021-010
**Suite:** Happy Path — Period selector  
**Title:** Period selector applies to new tabs  
**Given:** Admin is on `/reports`  
**When:** User changes period to "April 2026" and switches to Task Allocation tab  
**Then:** Tab still renders without error; period label shown  

---

## TC-F021-011
**Suite:** Negative — Unauthenticated access  
**Title:** Unauthenticated user cannot access /reports  
**Given:** User is not logged in  
**When:** User navigates to `/reports`  
**Then:** Redirected to `/login`  

---

## TC-F021-012
**Suite:** Happy Path — Tab isolation  
**Title:** Switching from Timesheet to Task Allocation shows correct content  
**Given:** Admin is on Timesheet tab  
**When:** User clicks Task Allocation tab  
**Then:** Timesheet content disappears; allocation chart and table shown; no overlapping content  
