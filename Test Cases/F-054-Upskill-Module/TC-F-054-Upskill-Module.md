# TC-F-054 — Upskill Module — E2E Test Cases

**Feature:** F-054 Upskill Module  
**Date:** 2026-06-24  
**Format:** Given / When / Then

---

## Happy Path

---

### TC-F054-E2E-01 — Manager creates a Learning assignment

**Given** the test DB has user ADMIN `admin@pms.com` and EMPLOYEE `emp@pms.com`  
**And** I am authenticated as the Admin  
**When** I `POST /upskill/assignments` with:
```json
{
  "type": "LEARNING",
  "assignedToId": "<emp-uuid>",
  "description": "Complete NestJS fundamentals course",
  "startDate": "2026-06-01",
  "endDate": "2026-06-30"
}
```
**Then** response is `201`  
**And** body contains `status: "ASSIGNED"`, `type: "LEARNING"`, `assignedToId: <emp-uuid>`  
**And** the record exists in DB `upskill_assignments` table

---

### TC-F054-E2E-02 — Manager creates an Automation assignment

**Given** I am authenticated as Admin  
**When** I `POST /upskill/assignments` with `type: "AUTOMATION"`, `toolScript: "Selenium regression suite"`, valid dates  
**Then** response is `201`  
**And** body contains `toolScript: "Selenium regression suite"`

---

### TC-F054-E2E-03 — Employee views assigned upskill in KPI

**Given** an APPROVED assignment exists for employee `emp@pms.com`  
**And** I am authenticated as `emp@pms.com`  
**When** I `GET /upskill/assignments?mine=true`  
**Then** response is `200`  
**And** array contains the assignment with matching `assignedToId`

---

### TC-F054-E2E-04 — Employee logs interim progress

**Given** assignment `asgn-001` has `status: "ASSIGNED"`, assigned to `emp@pms.com`  
**And** I am authenticated as `emp@pms.com`  
**When** I `POST /upskill/assignments/asgn-001/progress` with:
```json
{ "percentComplete": 40, "hoursSpent": 3.5, "notes": "Completed module 1" }
```
**Then** response is `201`  
**And** DB record `upskill_assignments` for `asgn-001` now has `status: "IN_PROGRESS"`  
**And** DB table `upskill_progress_logs` has one new record with correct fields

---

### TC-F054-E2E-05 — Employee makes final submission with evidence

**Given** assignment `asgn-001` has `status: "IN_PROGRESS"`, assigned to `emp@pms.com`  
**And** I am authenticated as `emp@pms.com`  
**When** I `POST /upskill/assignments/asgn-001/submit` with a valid PDF file (< 10 MB)  
**Then** response is `200`  
**And** DB record has `status: "SUBMITTED"`, `evidenceFilePath` non-null  
**And** file exists on disk at the path stored in `evidenceFilePath`

---

### TC-F054-E2E-06 — Manager approves submitted assignment

**Given** assignment `asgn-001` has `status: "SUBMITTED"`  
**And** I am authenticated as Admin  
**When** I `PATCH /upskill/assignments/asgn-001/approve`  
**Then** response is `200`  
**And** DB record has `status: "APPROVED"`, `approvedById` = admin UUID, `approvedAt` non-null

---

### TC-F054-E2E-07 — KPI score is 10/10 Growth & Innovation after approval

**Given** assignment `asgn-001` is APPROVED for `emp@pms.com` with `startDate/endDate` in `2026-06`  
**And** employee has no learning/innovation self-logs for `2026-06`  
**When** I `GET /analytics/kpi?userId=<emp-uuid>&period=2026-06` as Admin  
**Then** response contains:
```json
{ "metricId": "learning_velocity", "points": 5 },
{ "metricId": "automation_innovation", "points": 5 }
```

---

### TC-F054-E2E-08 — Manager rejects submission with reason

**Given** assignment `asgn-001` has `status: "SUBMITTED"`  
**And** I am authenticated as Admin  
**When** I `PATCH /upskill/assignments/asgn-001/reject` with body `{ "reason": "Certificate is expired" }`  
**Then** response is `200`  
**And** DB record has `status: "REJECTED"`, `rejectionReason: "Certificate is expired"`

---

### TC-F054-E2E-09 — Employee resubmits after rejection (same month)

**Given** assignment `asgn-001` has `status: "REJECTED"`, `endDate` within current month  
**And** I am authenticated as `emp@pms.com`  
**When** I `POST /upskill/assignments/asgn-001/submit` with a new valid PDF  
**Then** response is `200`  
**And** DB record has `status: "SUBMITTED"`, `rejectionReason: null`, `evidenceFilePath` updated

---

### TC-F054-E2E-10 — Download evidence file

**Given** assignment `asgn-001` has `evidenceFilePath` set and `status: "SUBMITTED"`  
**And** I am authenticated as the assigned employee  
**When** I `GET /upskill/assignments/asgn-001/evidence`  
**Then** response is `200`  
**And** `Content-Disposition` header contains `attachment`  
**And** response body is binary file content

---

## Negative Path

---

### TC-F054-E2E-11 — EMPLOYEE cannot create assignment

**Given** I am authenticated as `emp@pms.com` (EMPLOYEE, no PM project role)  
**When** I `POST /upskill/assignments` with valid body  
**Then** response is `403`

---

### TC-F054-E2E-12 — Wrong employee cannot log progress

**Given** assignment `asgn-001` is assigned to `emp@pms.com`  
**And** I am authenticated as `emp2@pms.com` (a different employee)  
**When** I `POST /upskill/assignments/asgn-001/progress` with valid body  
**Then** response is `403`

---

### TC-F054-E2E-13 — Cannot submit APPROVED assignment

**Given** assignment `asgn-001` has `status: "APPROVED"`  
**And** I am authenticated as the assigned employee  
**When** I `POST /upskill/assignments/asgn-001/submit` with a file  
**Then** response is `409`

---

### TC-F054-E2E-14 — Cannot approve non-SUBMITTED assignment

**Given** assignment `asgn-001` has `status: "IN_PROGRESS"`  
**And** I am authenticated as Admin  
**When** I `PATCH /upskill/assignments/asgn-001/approve`  
**Then** response is `409`

---

### TC-F054-E2E-15 — Reject without reason returns 400

**Given** assignment `asgn-001` has `status: "SUBMITTED"`  
**And** I am authenticated as Admin  
**When** I `PATCH /upskill/assignments/asgn-001/reject` with body `{ "reason": "" }`  
**Then** response is `400`

---

### TC-F054-E2E-16 — endDate before startDate returns 400

**Given** I am authenticated as Admin  
**When** I `POST /upskill/assignments` with `startDate: "2026-06-30"`, `endDate: "2026-06-01"`  
**Then** response is `400`

---

### TC-F054-E2E-17 — Automation type without toolScript returns 400

**Given** I am authenticated as Admin  
**When** I `POST /upskill/assignments` with `type: "AUTOMATION"`, no `toolScript`  
**Then** response is `400`

---

### TC-F054-E2E-18 — File exceeding 10 MB rejected at upload

**Given** I am authenticated as the assigned employee  
**When** I `POST /upskill/assignments/asgn-001/submit` with a file > 10 MB  
**Then** response is `400` with message containing `'File too large'`

---

### TC-F054-E2E-19 — Resubmit after month end rejected

**Given** assignment `asgn-001` has `status: "REJECTED"`, `endDate: "2026-05-31"`  
**And** current date is `2026-06-24`  
**And** I am authenticated as the assigned employee  
**When** I `POST /upskill/assignments/asgn-001/submit`  
**Then** response is `403` with message `'Resubmission window has closed for this assignment'`

---

## RBAC

---

### TC-F054-E2E-20 — SUPER_USER can view all assignments

**Given** I am authenticated as Super User  
**When** I `GET /upskill/assignments`  
**Then** response is `200`  
**And** array contains assignments for all users

---

### TC-F054-E2E-21 — EMPLOYEE can only view own assignments via `?mine=true`

**Given** I am authenticated as `emp@pms.com`  
**When** I `GET /upskill/assignments?mine=true`  
**Then** response is `200`  
**And** every item in array has `assignedToId = <emp-uuid>`

---

### TC-F054-E2E-22 — EMPLOYEE accessing another user's assignment returns 403

**Given** assignment `asgn-002` is assigned to `emp2@pms.com`  
**And** I am authenticated as `emp@pms.com`  
**When** I `GET /upskill/assignments/asgn-002`  
**Then** response is `403`

---

### TC-F054-E2E-23 — PROJECT_MANAGER can create and approve assignments for their team

**Given** user `pm@pms.com` has `projectRole: PROJECT_MANAGER` in project P-001  
**And** `emp@pms.com` is a member of project P-001  
**And** I am authenticated as `pm@pms.com`  
**When** I create an assignment for `emp@pms.com` and then approve it after submission  
**Then** both operations return `201` / `200` respectively

---

### TC-F054-E2E-24 — KPI score unchanged for unapproved submission

**Given** assignment `asgn-001` has `status: "SUBMITTED"` (not yet approved) for `emp@pms.com` in `2026-06`  
**And** employee has `learningLogs = [{ hours: 2 }]` for `2026-06`  
**When** I `GET /analytics/kpi?userId=<emp-uuid>&period=2026-06`  
**Then** `learning_velocity` = 3 (from 2 hours via `computeLearningVelocity`) — NOT 5  
**And** `automation_innovation` follows existing formula — NOT auto-5
