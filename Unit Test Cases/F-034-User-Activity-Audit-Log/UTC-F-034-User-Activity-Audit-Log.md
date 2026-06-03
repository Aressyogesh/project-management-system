# UTC-F-034 — Unit Test Cases: User Activity Audit Log

**Feature:** F-034 — User Activity Audit Log  
**Date:** 2026-06-03  

---

## UTC-034-01 — AuditLogService.log() persists a record

**Layer:** Service  
**AC:** AC-1

**Arrange:**
- Mock `PrismaService.auditLog.create` to resolve successfully
- Input: `{ userId, action: 'WORK_ITEM_CREATED', entity: 'WORK_ITEM', entityId, entityTitle, projectId }`

**Act:**
- Call `auditLogService.log({ userId, action, entity, entityId, entityTitle, projectId })`

**Assert:**
- `prisma.auditLog.create` called once with correct shape
- Method resolves without throwing

---

## UTC-034-02 — AuditLogService.log() is fire-and-forget (does not block caller)

**Layer:** Service  
**AC:** AC-1

**Arrange:**
- Mock `PrismaService.auditLog.create` to resolve after a delay

**Act:**
- Call `auditLogService.log(...)` and measure synchronous return

**Assert:**
- The log call does not block (returns immediately / uses setImmediate pattern)
- Main promise resolves before DB write completes

---

## UTC-034-03 — AuditLogService.log() swallows DB errors (best-effort)

**Layer:** Service  
**AC:** AC-1

**Arrange:**
- Mock `PrismaService.auditLog.create` to reject with `Error('DB down')`

**Act:**
- Call `auditLogService.log(...)` — should not throw

**Assert:**
- No unhandled rejection propagates
- Caller receives no error

---

## UTC-034-04 — AuditLogsService.findAll() — SUPER_USER receives all logs

**Layer:** Service  
**AC:** AC-6

**Arrange:**
- Mock `prisma.auditLog.findMany` to return 3 log entries belonging to different users
- Caller systemRole = `SUPER_USER`

**Act:**
- Call `auditLogsService.findAll({ page: 1, limit: 20 }, callerUser)`

**Assert:**
- `prisma.auditLog.findMany` called with no `userId` constraint
- Returns all 3 entries

---

## UTC-034-05 — AuditLogsService.findAll() — EMPLOYEE sees only own logs

**Layer:** Service  
**AC:** AC-6

**Arrange:**
- Mock `prisma.auditLog.findMany`
- Caller systemRole = `EMPLOYEE`, id = `user-123`

**Act:**
- Call `auditLogsService.findAll({ page: 1, limit: 20 }, callerUser)`

**Assert:**
- `prisma.auditLog.findMany` called with `where: { userId: 'user-123' }`

---

## UTC-034-06 — AuditLogsService.findAll() — action filter applied

**Layer:** Service  
**AC:** AC-7

**Arrange:**
- Mock `prisma.auditLog.findMany`
- Caller = ADMIN, filter: `{ action: 'LOGIN' }`

**Act:**
- Call `auditLogsService.findAll({ action: 'LOGIN', page: 1, limit: 20 }, callerUser)`

**Assert:**
- `where` clause includes `action: 'LOGIN'`

---

## UTC-034-07 — AuditLogsService.findAll() — projectId filter applied

**Layer:** Service  
**AC:** AC-7

**Arrange:**
- Mock `prisma.auditLog.findMany`
- Caller = ADMIN, filter: `{ projectId: 'proj-abc' }`

**Act:**
- Call `auditLogsService.findAll({ projectId: 'proj-abc', page: 1, limit: 20 }, callerUser)`

**Assert:**
- `where` clause includes `projectId: 'proj-abc'`

---

## UTC-034-08 — AuditLogsService.findAll() — date range filter applied

**Layer:** Service  
**AC:** AC-7

**Arrange:**
- Mock `prisma.auditLog.findMany`
- Caller = ADMIN, filter: `{ startDate: '2026-06-01', endDate: '2026-06-03' }`

**Act:**
- Call `auditLogsService.findAll({ startDate: '2026-06-01', endDate: '2026-06-03', page: 1, limit: 20 }, callerUser)`

**Assert:**
- `where.createdAt` includes `gte` and `lte` DateTime bounds

---

## UTC-034-09 — AuditLogsService.findAll() — pagination: skip = (page-1) * limit

**Layer:** Service  
**AC:** AC-7

**Arrange:**
- Mock `prisma.auditLog.findMany`
- Caller = ADMIN, page = 3, limit = 10

**Act:**
- Call `auditLogsService.findAll({ page: 3, limit: 10 }, callerUser)`

**Assert:**
- `prisma.auditLog.findMany` called with `skip: 20, take: 10`

---

## UTC-034-10 — AuditLogsService.findAll() — limit capped at 100

**Layer:** Service  
**AC:** AC-7

**Arrange:**
- Caller = ADMIN, limit = 500

**Act:**
- Call `auditLogsService.findAll({ limit: 500 }, callerUser)`

**Assert:**
- `take` passed to Prisma is 100 (capped)

---

## UTC-034-11 — Login action logged after successful auth

**Layer:** Service (AuthService)  
**AC:** AC-4

**Arrange:**
- Mock `auditLogService.log`
- Mock user lookup returns valid user
- Mock bcrypt.compare returns true

**Act:**
- Call `authService.login({ email, password })`

**Assert:**
- `auditLogService.log` called with `{ userId, action: 'LOGIN', entity: 'AUTH' }`

---

## UTC-034-12 — Work item create logs WORK_ITEM_CREATED

**Layer:** Service (WorkItemsService)  
**AC:** AC-1

**Arrange:**
- Mock `prisma.workItem.create` returning new item
- Mock `auditLogService.log`

**Act:**
- Call `workItemsService.create(projectId, dto, userId)`

**Assert:**
- `auditLogService.log` called with `action: 'WORK_ITEM_CREATED'`, `entityId: newItem.id`, `entityTitle` containing `displayId`

---

## UTC-034-13 — Work item delete logs WORK_ITEM_DELETED

**Layer:** Service (WorkItemsService)  
**AC:** AC-1

**Arrange:**
- Mock `prisma.workItem.findUniqueOrThrow` returning existing item
- Mock `prisma.workItem.delete`
- Mock `auditLogService.log`

**Act:**
- Call `workItemsService.remove(itemId, userId)`

**Assert:**
- `auditLogService.log` called with `action: 'WORK_ITEM_DELETED'`

---

## UTC-034-14 — Member add logs MEMBER_ADDED

**Layer:** Service (ProjectMembersService)  
**AC:** AC-3

**Arrange:**
- Mock `prisma.projectMember.create`
- Mock `auditLogService.log`

**Act:**
- Call `projectMembersService.addMember(projectId, targetUserId, role, actorUserId)`

**Assert:**
- `auditLogService.log` called with `action: 'MEMBER_ADDED'`, `entity: 'PROJECT_MEMBER'`, `projectId`
