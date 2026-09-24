# UTC-F-023 — Unit Test Cases: Dynamic KPI & Reports

**Feature ID:** F-023  
**Date:** 2026-05-28  

---

## Backend Unit Tests (Jest)

### AnalyticsService — KPI Computation

| ID | Test Name | Arrange | Act | Assert |
|----|-----------|---------|-----|--------|
| UTC-BE-01 | Sprint Reliability: 100% delivery | User has sprint with 10 committed SP, 10 delivered SP | computeSprintReliability() | Returns 15 |
| UTC-BE-02 | Sprint Reliability: 50% delivery | 10 committed, 5 delivered SP | computeSprintReliability() | Returns 7.5 |
| UTC-BE-03 | Sprint Reliability: no data | No sprint items | computeSprintReliability() | Returns 0 |
| UTC-BE-04 | Delivery Timeliness: all on time | 5 items, all completedAt ≤ dueDate | computeDeliveryTimeliness() | Returns 15 |
| UTC-BE-05 | Delivery Timeliness: none on time | 5 items, all completedAt > dueDate | computeDeliveryTimeliness() | Returns 0 |
| UTC-BE-06 | Estimation Accuracy: ≤15% variance | estimatedHours=10, actualHours=10.5 | computeEstimationAccuracy() | Returns 10 |
| UTC-BE-07 | Estimation Accuracy: 16–30% variance | estimatedHours=10, actualHours=12 | computeEstimationAccuracy() | Returns 7 |
| UTC-BE-08 | Estimation Accuracy: >50% variance | estimatedHours=10, actualHours=16 | computeEstimationAccuracy() | Returns 0 |
| UTC-BE-09 | Throughput: full completion | 5 assigned, 5 QA_DONE | computeThroughput() | Returns 10 |
| UTC-BE-10 | Rework Ratio: zero reopens | 5 items, all reopenCount=0 | computeReworkRatio() | Returns 5 |
| UTC-BE-11 | Rework Ratio: >10% reopens | 10 items, 2 reopened | computeReworkRatio() | Returns 0 |
| UTC-BE-12 | Defect Leakage: zero bugs | No BUG items | computeDefectLeakage() | Returns 10 |
| UTC-BE-13 | Defect Leakage: 1 MINOR bug | 1 MINOR BUG item | computeDefectLeakage() | Returns 7 |
| UTC-BE-14 | Defect Leakage: 1 CRITICAL bug | 1 CRITICAL BUG item | computeDefectLeakage() | Returns 0 |
| UTC-BE-15 | Attendance: 0 leave days | Empty leaveLogs | computeAttendance() | Returns 5 |
| UTC-BE-16 | Attendance: unapproved leave | 1 UNAPPROVED leave | computeAttendance() | Returns 0 |
| UTC-BE-17 | Learning Velocity: ≥4h | LearningLog total 5h | computeLearningVelocity() | Returns 5 |
| UTC-BE-18 | Innovation: AI_IMPLEMENTATION | 1 InnovationLog type=AI | computeInnovation() | Returns 5 |

### KpiRecordsService

| ID | Test Name | Arrange | Act | Assert |
|----|-----------|---------|-----|--------|
| UTC-BE-19 | upsert creates new record | No existing record for userId+period+metricId | upsert() | Record created |
| UTC-BE-20 | upsert updates existing | Record exists | upsert() | Record updated with new points |

### SelfLogsService

| ID | Test Name | Arrange | Act | Assert |
|----|-----------|---------|-----|--------|
| UTC-BE-21 | createLeaveLog creates entry | Valid userId + date | createLeaveLog() | Row in leave_logs |
| UTC-BE-22 | duplicate leave date returns 409 | Same userId + date exists | createLeaveLog() | ConflictException |
| UTC-BE-23 | deleteLeaveLog own entry | Owner userId | deleteLeaveLog() | Deleted |
| UTC-BE-24 | deleteLeaveLog other entry | Non-owner userId | deleteLeaveLog() | ForbiddenException |

---

## Frontend Unit Tests (Vitest)

### KpiPage (dynamic)

| ID | Test Name | Arrange | Act | Assert |
|----|-----------|---------|-----|--------|
| UTC-FE-01 | Shows loading state | useQuery returns isLoading=true | Render KpiPage | Loading spinner shown |
| UTC-FE-02 | Renders employee records from API | API returns 3 employees | Render KpiPage as admin | Table shows 3 rows |
| UTC-FE-03 | Employee view shows own record | user.id matches returned record | Render KpiPage as employee | Own name shown |
| UTC-FE-04 | KpiScoreEntryPanel visible to admin | user.systemRole = ADMIN | Render KpiPage | "Enter Monthly Scores" button visible |
| UTC-FE-05 | KpiScoreEntryPanel hidden from employee | user.systemRole = EMPLOYEE | Render KpiPage | Button not visible |

### CapacityReportTab

| ID | Test Name | Arrange | Act | Assert |
|----|-----------|---------|-----|--------|
| UTC-FE-06 | Renders employee rows | API returns 2 employees | Render CapacityReportTab | 2 employee name cells |
| UTC-FE-07 | Holiday cell rendered orange | API returns holiday on day 5 | Render | Day 5 cell has orange class |
| UTC-FE-08 | Leave cell rendered pink | API returns leave on day 10 | Render | Day 10 cell has pink class |
| UTC-FE-09 | Available cell rendered green | Working day, no leave, no hours | Render | Cell has green class |
| UTC-FE-10 | Fully occupied cell rendered dark blue | hours ≥ 8 on a day | Render | Cell has dark blue class |
| UTC-FE-11 | Month prev/next navigation works | Month = May 2026 | Click prev | April 2026 selected |
| UTC-FE-12 | Legend shows all 6 colour descriptions | Any render | Render | 6 legend items visible |

### ReportsPage (dynamic tabs)

| ID | Test Name | Arrange | Act | Assert |
|----|-----------|---------|-----|--------|
| UTC-FE-13 | Productivity tab renders live data | API returns 3 productivity records | Render tab | 3 rows in table |
| UTC-FE-14 | Capacity tab visible in tab bar | Tab list rendered | Render ReportsPage as admin | "Capacity" tab button visible |
