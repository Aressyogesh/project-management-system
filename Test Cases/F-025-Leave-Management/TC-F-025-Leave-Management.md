# TC-F-025 — Leave Management E2E Test Cases

**Feature:** F-025 Leave Management  
**Date:** 2026-05-31  

---

## Happy Path

### TC-F025-001: Employee applies for leave successfully
**Given** an authenticated employee  
**When** they POST `/leave-requests` with `{ type: "SICK", startDate: "2026-06-10", endDate: "2026-06-12", reason: "Fever" }`  
**Then** response is `201` with `totalDays: 3`, `status: "PENDING"`

### TC-F025-002: Employee views their own leave list
**Given** an authenticated employee with 2 leave requests  
**When** they GET `/leave-requests`  
**Then** response is `200` with exactly their 2 records

### TC-F025-003: Admin views all leave requests
**Given** an authenticated admin; 3 employees have applied for leave (5 requests total)  
**When** admin GET `/leave-requests`  
**Then** response is `200` with all 5 records

### TC-F025-004: Admin approves a leave request
**Given** a PENDING leave request (id = X)  
**When** admin PATCH `/leave-requests/X/approve`  
**Then** response is `200` with `status: "APPROVED"`, `approvedById` set

### TC-F025-005: Admin rejects a leave request with note
**Given** a PENDING leave request (id = Y)  
**When** admin PATCH `/leave-requests/Y/reject` with `{ approvalNote: "Project deadline" }`  
**Then** response is `200` with `status: "REJECTED"`, `approvalNote: "Project deadline"`

### TC-F025-006: Employee cancels their own pending leave
**Given** a PENDING leave request owned by the employee  
**When** employee PATCH `/leave-requests/Z/cancel`  
**Then** response is `200` with `status: "CANCELLED"`

### TC-F025-007: Capacity report shows approved leave as pink cell
**Given** employee Alice has APPROVED leave on Jun 10–12 2026  
**When** admin GET `/reports/capacity?year=2026&month=6`  
**Then** Alice's cells for days 10, 11, 12 have `status: "leave"`  
**And** Alice's `summary.leaveDays = 3`

### TC-F025-008: Capacity report shows allocation as occupied
**Given** employee Bob has 8h task allocation on Jun 5  
**When** admin GET `/reports/capacity?year=2026&month=6`  
**Then** Bob's cell for day 5 has `status: "occupied"`, `hours: 8`

---

## Negative / Validation

### TC-F025-009: Overlapping leave is rejected
**Given** employee has PENDING leave Jun 10–12  
**When** they POST another leave Jun 11–14  
**Then** response is `409 Conflict`

### TC-F025-010: endDate before startDate rejected
**Given** authenticated employee  
**When** POST `/leave-requests` with `startDate: "2026-06-15"`, `endDate: "2026-06-10"`  
**Then** response is `400 Bad Request`

### TC-F025-011: Employee cannot approve leave
**Given** authenticated employee  
**When** PATCH `/leave-requests/:id/approve`  
**Then** response is `403 Forbidden`

### TC-F025-012: Employee cannot cancel another's leave
**Given** PENDING leave owned by Alice  
**When** Bob PATCH `/leave-requests/:id/cancel`  
**Then** response is `403 Forbidden`

### TC-F025-013: Cannot cancel APPROVED leave as employee
**Given** APPROVED leave owned by employee  
**When** employee PATCH `/leave-requests/:id/cancel`  
**Then** response is `400 Bad Request`

### TC-F025-014: Unauthenticated access blocked
**Given** no auth token  
**When** GET `/leave-requests`  
**Then** response is `401 Unauthorized`

---

## RBAC

| Action | SUPER_USER | ADMIN | EMPLOYEE (own) | EMPLOYEE (other) |
|--------|-----------|-------|----------------|-----------------|
| Apply leave | ✓ 201 | ✓ 201 | ✓ 201 | N/A |
| List all leaves | ✓ 200 all | ✓ 200 all | 200 own only | 200 own only |
| Approve | ✓ 200 | ✓ 200 | ✗ 403 | ✗ 403 |
| Reject | ✓ 200 | ✓ 200 | ✗ 403 | ✗ 403 |
| Cancel PENDING | ✓ 200 | ✓ 200 | ✓ 200 | ✗ 403 |
| View capacity | ✓ 200 | ✓ 200 | ✗ 403 | ✗ 403 |
