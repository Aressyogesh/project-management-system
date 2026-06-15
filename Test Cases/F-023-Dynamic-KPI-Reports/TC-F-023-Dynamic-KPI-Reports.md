# TC-F-023 — E2E Test Cases: Dynamic KPI & Reports

**Feature ID:** F-023  
**Date:** 2026-05-28  

---

## Happy Path

| ID | Given | When | Then |
|----|-------|------|------|
| TC-01 | Admin user is logged in | Navigate to /kpi | Page shows live KPI data computed from DB (not static) |
| TC-02 | WorkItems exist for an employee in a sprint | Admin requests GET /analytics/kpi?period=2026-05 | Sprint Reliability score is computed correctly |
| TC-03 | Admin is on /kpi page | Click "Enter Monthly Scores" button | Panel opens with table of employees × 3 manual metrics |
| TC-04 | Admin fills manual scores and saves | POST /kpi-records with valid data | 200 OK; scores saved; KPI totals reflect manual scores |
| TC-05 | Admin navigates to Reports page | Click "Capacity" tab | Monthly capacity matrix renders with employee rows and day columns |
| TC-06 | A holiday exists on the 15th | View capacity matrix for that month | Day 15 cell is orange for all employees |
| TC-07 | Employee logs leave on day 20 | Admin views capacity matrix | Day 20 cell is pink for that employee |
| TC-08 | Employee logs 8h on day 10 | Admin views capacity matrix | Day 10 cell is dark blue for that employee |
| TC-09 | Admin clicks Export CSV on any tab | csvForTab() called | CSV downloads with live data |

## Negative Path

| ID | Given | When | Then |
|----|-------|------|------|
| TC-10 | Non-authenticated request | GET /analytics/kpi | 401 Unauthorized |
| TC-11 | Employee tries POST /kpi-records | POST with valid body | 403 Forbidden |
| TC-12 | Invalid period format | GET /analytics/kpi?period=invalid | 400 Bad Request |
| TC-13 | Employee logs duplicate leave date | POST /leave-logs with same date again | 409 Conflict |
| TC-14 | Employee tries to delete another's leave log | DELETE /leave-logs/:other-id | 403 Forbidden |

## RBAC

| ID | Given | When | Then |
|----|-------|------|------|
| TC-15 | EMPLOYEE role | GET /analytics/kpi | Returns only own record |
| TC-16 | ADMIN role | GET /analytics/kpi | Returns all employee records |
| TC-17 | EMPLOYEE role visits /kpi | KpiPage renders | Shows personal KPI view (not team view) |
| TC-18 | EMPLOYEE role visits /reports | ReportsPage renders | Shows personal performance summary (not tabs) |
