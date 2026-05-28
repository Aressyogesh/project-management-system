# Test Cases — F-020: Team Reports Dashboard

**Feature:** F-020 — Team Reports Dashboard  
**Date:** 2026-05-28  
**Type:** E2E / Integration  
**Framework:** Playwright (or manual browser verification)

---

## TC-F020-001
**Suite:** Happy Path — Navigation  
**Title:** Admin navigates to /reports via sidebar link  
**Given:** User is logged in as ADMIN (Yogesh Lolage); sidebar is visible  
**When:** User clicks the "Reports" sidebar link  
**Then:** URL changes to `/reports`; page heading "Reports" is visible; 4 tab buttons are rendered  

---

## TC-F020-002
**Suite:** Happy Path — Tab rendering  
**Title:** Team Productivity tab is displayed by default  
**Given:** Admin is on `/reports`  
**When:** Page loads  
**Then:** "Team Productivity" tab is visually active; productivity bar chart is visible; employee table with 14 rows is visible  

---

## TC-F020-003
**Suite:** Happy Path — Tab switching  
**Title:** Admin switches to KPI Appraisal tab  
**Given:** Admin is on `/reports`, Team Productivity tab active  
**When:** User clicks "KPI Appraisal" tab  
**Then:** KPI content area is visible; "Grade Distribution" heading is visible; pie chart renders; team average score card is visible; employee table shows 14 rows  

---

## TC-F020-004
**Suite:** Happy Path — Tab switching  
**Title:** Admin switches to Project Summary tab  
**Given:** Admin is on `/reports`  
**When:** User clicks "Project Summary" tab  
**Then:** "PMS Web App", "Mobile CRM", "SalesForce Integration" project cards are all visible; status badges ("Active", "Completed") are visible  

---

## TC-F020-005
**Suite:** Happy Path — Tab switching  
**Title:** Admin switches to Bug Summary tab  
**Given:** Admin is on `/reports`  
**When:** User clicks "Bug Summary" tab  
**Then:** Bug severity section is visible; "Show Stopper", "Critical", "Major", "Minor" labels are visible; pie chart renders; total bug count is 40  

---

## TC-F020-006
**Suite:** Happy Path — Data accuracy  
**Title:** Hemant Atre appears as top productivity scorer  
**Given:** Admin is on `/reports`, Team Productivity tab active  
**When:** User views the productivity table  
**Then:** Hemant Atre is listed with score 94; appears at or near the top of the table  

---

## TC-F020-007
**Suite:** Happy Path — Data accuracy  
**Title:** SalesForce Integration shows Completed status  
**Given:** Admin is on `/reports`, Project Summary tab active  
**When:** User views the project cards  
**Then:** SalesForce Integration card shows "Completed" badge; 18/18 tasks done; 100% completion  

---

## TC-F020-008
**Suite:** Happy Path — Dashboard widget  
**Title:** Announcements widget visible on DashboardPage  
**Given:** User is logged in as ADMIN  
**When:** User navigates to `/dashboard`  
**Then:** An Announcements or "What's New" section is visible below the main charts row  

---

## TC-F020-009
**Suite:** RBAC — Employee view  
**Title:** Employee user sees personal summary on Reports page  
**Given:** User is logged in as EMPLOYEE (e.g. Rohit More)  
**When:** User navigates to `/reports`  
**Then:** Page renders without error; personal summary card or "My Performance" section is visible; full 14-user table is NOT prominently shown (or row is highlighted for own entry)  

---

## TC-F020-010
**Suite:** RBAC — Access control  
**Title:** Unauthenticated user is redirected away from /reports  
**Given:** User is not logged in (no valid JWT)  
**When:** User navigates directly to `/reports`  
**Then:** User is redirected to `/login`; Reports page is not rendered  

---

## TC-F020-011
**Suite:** RBAC — Super User  
**Title:** Super User can access Reports page and sees all 14 employees  
**Given:** User is logged in as SUPER_USER  
**When:** User navigates to `/reports`  
**Then:** Reports page renders; Team Productivity table shows 14 employees  

---

## TC-F020-012
**Suite:** Negative — Period selector  
**Title:** Period selector shows May 2026 as default  
**Given:** Admin is on `/reports`  
**When:** User inspects the period selector  
**Then:** "May 2026" is selected by default; previous months are available in the dropdown  

---

## TC-F020-013
**Suite:** Negative — Tab isolation  
**Title:** Switching tabs does not leak content from other tabs  
**Given:** Admin is on `/reports`, Bug Summary tab active  
**When:** User clicks "Team Productivity" tab  
**Then:** Bug chart/table is no longer visible; productivity content is shown; no duplicate or overlapping content  

---

## TC-F020-014
**Suite:** Happy Path — Export placeholder  
**Title:** Export buttons are present but produce no download  
**Given:** Admin is on `/reports`  
**When:** User clicks any "Export PDF" or "Export CSV" button  
**Then:** No file download is initiated; button may show a disabled state or toast message; no console error  

---

## TC-F020-015
**Suite:** Happy Path — Sidebar active state  
**Title:** Sidebar "Reports" link shows active styling when on /reports  
**Given:** Admin is on `/reports`  
**When:** User looks at the sidebar  
**Then:** "Reports" nav item has the active/highlighted styling; other nav items do not  

---

## TC-F020-016
**Suite:** Happy Path — KPI data integrity  
**Title:** KPI Appraisal tab shows Yogesh Lolage in the table  
**Given:** Admin is on `/reports`, KPI Appraisal tab active  
**When:** User views the employee KPI table  
**Then:** Yogesh Lolage entry is visible with grade "A" and score ≥ 90  

---

## TC-F020-017
**Suite:** Negative — Direct URL access  
**Title:** Authenticated EMPLOYEE cannot access a non-existent sub-route under /reports  
**Given:** User is logged in as EMPLOYEE  
**When:** User navigates to `/reports/admin-only`  
**Then:** App renders a 404 or redirects to `/reports` or `/dashboard`; no server error  
