# UTC-F-025 — Leave Management Unit Test Cases

**Feature:** F-025 Leave Management  
**Date:** 2026-05-31  

---

## Backend — LeaveRequestsService

### UTC-F025-001: create() — happy path
**AC:** AC-1, AC-2  
**Arrange:** Valid DTO `{ type: SICK, startDate: "2026-06-10", endDate: "2026-06-12", reason: "Flu" }`, userId  
**Act:** `service.create(userId, EMPLOYEE, dto)`  
**Assert:** Returns LeaveRequest with `totalDays = 3`, `status = PENDING`

### UTC-F025-002: create() — endDate before startDate
**AC:** AC-1  
**Arrange:** DTO with `startDate: "2026-06-15"`, `endDate: "2026-06-10"`  
**Act:** `service.create(userId, EMPLOYEE, dto)`  
**Assert:** Throws `BadRequestException`

### UTC-F025-003: create() — overlapping pending leave
**AC:** AC-3  
**Arrange:** Existing PENDING leave for userId spanning Jun 10–12; new request Jun 11–13  
**Act:** `service.create(userId, EMPLOYEE, dto)`  
**Assert:** Throws `ConflictException` (409)

### UTC-F025-004: create() — overlapping approved leave
**AC:** AC-3  
**Arrange:** Existing APPROVED leave for userId spanning Jun 10–12; new request Jun 11–13  
**Act:** `service.create(userId, EMPLOYEE, dto)`  
**Assert:** Throws `ConflictException` (409)

### UTC-F025-005: create() — non-overlapping leave is allowed
**AC:** AC-3  
**Arrange:** Existing APPROVED leave Jun 10–12; new request Jun 13–14  
**Act:** `service.create(userId, EMPLOYEE, dto)`  
**Assert:** Returns new LeaveRequest successfully

### UTC-F025-006: findAll() — employee sees only own requests
**AC:** AC-4  
**Arrange:** Two users each with 2 leave requests  
**Act:** `service.findAll(empUserId, EMPLOYEE)`  
**Assert:** Returns only 2 records for empUserId

### UTC-F025-007: findAll() — admin sees all requests
**AC:** AC-5  
**Arrange:** Two users each with 2 leave requests  
**Act:** `service.findAll(adminId, ADMIN)`  
**Assert:** Returns all 4 records

### UTC-F025-008: findAll() — admin filters by status
**AC:** AC-5  
**Arrange:** Mix of PENDING and APPROVED requests  
**Act:** `service.findAll(adminId, ADMIN, { status: 'PENDING' })`  
**Assert:** Returns only PENDING records

### UTC-F025-009: approve() — success
**AC:** AC-6  
**Arrange:** PENDING leave request  
**Act:** `service.approve(leaveId, adminId, ADMIN, {})`  
**Assert:** Returns updated LeaveRequest with `status = APPROVED`, `approvedById = adminId`

### UTC-F025-010: approve() — already approved throws
**AC:** AC-6  
**Arrange:** APPROVED leave request  
**Act:** `service.approve(leaveId, adminId, ADMIN, {})`  
**Assert:** Throws `BadRequestException`

### UTC-F025-011: approve() — employee cannot approve
**AC:** AC-6, RBAC  
**Arrange:** PENDING leave request; caller is EMPLOYEE  
**Act:** `service.approve(leaveId, empId, EMPLOYEE, {})`  
**Assert:** Throws `ForbiddenException`

### UTC-F025-012: reject() — success
**AC:** AC-7  
**Arrange:** PENDING leave request  
**Act:** `service.reject(leaveId, adminId, ADMIN, { approvalNote: "Not enough cover" })`  
**Assert:** Returns updated LeaveRequest with `status = REJECTED`, `approvalNote` set

### UTC-F025-013: cancel() — owner cancels own PENDING
**AC:** AC-8  
**Arrange:** PENDING leave owned by userId  
**Act:** `service.cancel(leaveId, userId, EMPLOYEE)`  
**Assert:** Returns updated LeaveRequest with `status = CANCELLED`

### UTC-F025-014: cancel() — cannot cancel another user's leave
**AC:** AC-8  
**Arrange:** PENDING leave owned by userA  
**Act:** `service.cancel(leaveId, userB, EMPLOYEE)`  
**Assert:** Throws `ForbiddenException`

### UTC-F025-015: cancel() — cannot cancel APPROVED leave as employee
**AC:** AC-8  
**Arrange:** APPROVED leave owned by userId  
**Act:** `service.cancel(leaveId, userId, EMPLOYEE)`  
**Assert:** Throws `BadRequestException`

---

## Backend — ReportsService (capacity)

### UTC-F025-016: getCapacity() — leave days marked correctly
**AC:** AC-9, AC-10  
**Arrange:** User has APPROVED leave Jun 10–12; no allocations those days  
**Act:** `service.getCapacity(year: 2026, month: 6)`  
**Assert:** Cells for days 10, 11, 12 have `status = 'leave'`

### UTC-F025-017: getCapacity() — holiday takes priority over leave
**AC:** AC-9  
**Arrange:** Jun 10 is a public holiday; user also has approved leave Jun 10–12  
**Act:** `service.getCapacity(2026, 6)`  
**Assert:** Day 10 cell `status = 'holiday'`; days 11, 12 `status = 'leave'`

### UTC-F025-018: getCapacity() — occupied days from allocations
**AC:** AC-10  
**Arrange:** User has 8h task allocation on Jun 5  
**Act:** `service.getCapacity(2026, 6)`  
**Assert:** Day 5 cell `status = 'occupied'`, `hours = 8`

### UTC-F025-019: getCapacity() — summary counts correct
**AC:** AC-9  
**Arrange:** User has 2 approved leave days, 3 occupied days, 1 holiday, 4 weekly-offs in a 30-day month  
**Act:** `service.getCapacity(2026, 6)`  
**Assert:** `summary.leaveDays = 2`, `summary.occupiedDays = 3`, `summary.availableDays = 20`
