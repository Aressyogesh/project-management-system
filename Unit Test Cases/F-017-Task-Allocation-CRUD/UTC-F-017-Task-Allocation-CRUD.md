# Unit Test Cases — F-017: Task Allocation CRUD + 8-Hour Daily Cap

---

## Backend Unit Tests — TaskAllocationsService

```
Unit Test ID : UTC-F017-B-001
Title        : create_ValidAllocation_ReturnsCreatedRecord
AC Covered   : AC-1
Arrange:
  - Mock task.findUnique → returns task
  - Mock taskAllocation.aggregate → { _sum: { allocatedHours: 3 } }
  - Mock taskAllocation.create → returns allocation record
Act: service.create({ taskId, userId, date: '2026-06-10', allocatedHours: 4 })
Assert: result.allocatedHours === 4; create called once
```

```
Unit Test ID : UTC-F017-B-002
Title        : create_ExceedsDailyCap_ThrowsUnprocessableEntity
AC Covered   : AC-2
Arrange:
  - Mock task.findUnique → returns task
  - Mock taskAllocation.aggregate → { _sum: { allocatedHours: 6 } }
Act: service.create({ ..., allocatedHours: 4 })
Assert: throws UnprocessableEntityException (existing 6 + new 4 = 10 > 8)
```

```
Unit Test ID : UTC-F017-B-003
Title        : create_ExactlyAtCap_Succeeds
AC Covered   : AC-1
Arrange:
  - Mock aggregate → { _sum: { allocatedHours: 4 } }
  - Mock create → returns allocation
Act: service.create({ ..., allocatedHours: 4 })
Assert: result returned; no exception (4 + 4 = 8 exactly)
```

```
Unit Test ID : UTC-F017-B-004
Title        : create_TaskNotFound_ThrowsNotFoundException
AC Covered   : AC-1
Arrange:
  - Mock task.findUnique → returns null
Act: service.create({ taskId: 'bad', ... })
Assert: throws NotFoundException; create not called
```

```
Unit Test ID : UTC-F017-B-005
Title        : create_DuplicateTaskUserDate_ThrowsConflictException
AC Covered   : AC-1
Arrange:
  - Mock task.findUnique → returns task
  - Mock aggregate → { _sum: { allocatedHours: 0 } }
  - Mock create → throws Prisma P2002 unique constraint error
Act: service.create({ ... })
Assert: throws ConflictException
```

```
Unit Test ID : UTC-F017-B-006
Title        : update_ValidHours_ReturnsUpdatedAllocation
AC Covered   : AC-3
Arrange:
  - Mock taskAllocation.findUnique → returns existing record (allocatedHours: 3)
  - Mock aggregate (excludes current record) → { _sum: { allocatedHours: 2 } }
  - Mock taskAllocation.update → returns updated record
Act: service.update('alloc-1', { allocatedHours: 5 })
Assert: result.allocatedHours === 5; existing 2 + new 5 = 7 ≤ 8
```

```
Unit Test ID : UTC-F017-B-007
Title        : update_ExceedsCap_ThrowsUnprocessableEntity
AC Covered   : AC-3
Arrange:
  - Mock findUnique → existing (allocatedHours: 2)
  - Mock aggregate → { _sum: { allocatedHours: 5 } }
Act: service.update('alloc-1', { allocatedHours: 6 })
Assert: throws UnprocessableEntityException (5 + 6 = 11 > 8)
```

```
Unit Test ID : UTC-F017-B-008
Title        : remove_ValidId_DeletesAllocation
AC Covered   : AC-4
Arrange:
  - Mock findUnique → returns allocation
  - Mock delete → resolves
Act: service.remove('alloc-1')
Assert: delete called once with { where: { id: 'alloc-1' } }
```

```
Unit Test ID : UTC-F017-B-009
Title        : remove_NotFound_ThrowsNotFoundException
AC Covered   : AC-4
Arrange:
  - Mock findUnique → returns null
Act: service.remove('bad-id')
Assert: throws NotFoundException; delete not called
```

```
Unit Test ID : UTC-F017-B-010
Title        : check_ReturnsAllocatedAndRemainingHours
AC Covered   : AC-7
Arrange:
  - Mock aggregate → { _sum: { allocatedHours: 5 } }
Act: service.check({ userId: 'u1', date: '2026-06-10' })
Assert: result.allocatedHours === 5; result.remainingHours === 3
```

```
Unit Test ID : UTC-F017-B-011
Title        : check_NoAllocations_Returns8HoursRemaining
AC Covered   : AC-7
Arrange:
  - Mock aggregate → { _sum: { allocatedHours: null } }
Act: service.check({ userId: 'u1', date: '2026-06-10' })
Assert: result.allocatedHours === 0; result.remainingHours === 8
```
