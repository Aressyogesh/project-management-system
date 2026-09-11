# REQ-F-025 — Leave Management

**Feature ID:** F-025  
**Feature Name:** Leave Management  
**Epic:** PMS — Phase 8 (Leave / Overtime Log)  
**Author:** Claude Code  
**Date:** 2026-05-31  
**Status:** Approved  

---

## 1. User Story

> As an **Employee**, I want to apply for leave, view my leave history, and see its approval status, so that my absence is formally recorded.
>
> As an **Admin / Project Manager / Team Lead**, I want to review, approve, or reject leave requests, so that team capacity is managed accurately.
>
> As an **Admin / Super User**, I want the Capacity Report to reflect approved leave days, so that resource planning accounts for real employee availability.

---

## 2. Business Rules

| ID | Rule |
|----|------|
| BR-1 | An employee can apply for leave with type: SICK, CASUAL, EARNED, MATERNITY, PATERNITY, UNPAID, or OTHER. |
| BR-2 | startDate must be ≤ endDate. |
| BR-3 | totalDays is calculated server-side as calendar days (endDate − startDate + 1). |
| BR-4 | Employees can only cancel their own PENDING leave requests. |
| BR-5 | Only ADMIN, SUPER_USER can approve or reject any leave request. |
| BR-6 | Approved leave days appear as `leave` status in the Capacity Report matrix. |
| BR-7 | An employee cannot have overlapping approved or pending leave. |
| BR-8 | Rejected / cancelled leaves do not affect capacity. |

---

## 3. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | Employee can submit a leave request (type, startDate, endDate, reason). |
| AC-2 | System calculates and stores totalDays automatically. |
| AC-3 | BR-7 overlap check rejects overlapping pending/approved leaves with 409. |
| AC-4 | Employee can view their own leave requests (all statuses). |
| AC-5 | Admin can view all leave requests, filterable by status and userId. |
| AC-6 | Admin can approve a PENDING leave → status becomes APPROVED. |
| AC-7 | Admin can reject a PENDING or APPROVED leave with a rejection note. |
| AC-8 | Employee can cancel their own PENDING leave → status becomes CANCELLED. |
| AC-9 | Capacity Report shows approved leave days with `leave` (pink) status in the matrix. |
| AC-10 | Capacity Report API returns live data (users, holidays, allocations, approved leaves). |

---

## 4. Out of Scope

- Leave balance / quota tracking (accrual logic)
- Email notifications on approval/rejection
- Half-day leave
- Leave encashment

---

## 5. Dependencies

- `User` model (assignee)
- `Holiday` model (for capacity computation — exclude public holidays)
- `TaskAllocation` model (for capacity computation — occupied days)
- Existing `CapacityReportTab.tsx` (to be wired from static → live API)

---

## 6. Database / Schema Design (Step 4)

### New Enums

```prisma
enum LeaveType {
  SICK
  CASUAL
  EARNED
  MATERNITY
  PATERNITY
  UNPAID
  OTHER
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
```

### New Model

```prisma
model LeaveRequest {
  id             String      @id @default(uuid())
  userId         String
  type           LeaveType
  startDate      DateTime
  endDate        DateTime
  totalDays      Int
  reason         String?
  status         LeaveStatus @default(PENDING)
  approvedById   String?
  approvalNote   String?
  approvedAt     DateTime?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  user           User        @relation("UserLeaves", fields: [userId], references: [id])
  approvedBy     User?       @relation("LeaveApprovals", fields: [approvedById], references: [id])

  @@index([userId])
  @@index([status])
  @@index([startDate, endDate])
  @@map("leave_requests")
}
```

### User model additions (relations only — no new columns)

```prisma
leaveRequests     LeaveRequest[] @relation("UserLeaves")
leaveApprovals    LeaveRequest[] @relation("LeaveApprovals")
```

---

## 7. API Contract Design (Step 5)

### Base path: `/leave-requests`

| Method | Path | Auth | Body / Query | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/leave-requests` | Any auth | `CreateLeaveRequestDto` | `201 LeaveRequest` | Apply for leave |
| GET | `/leave-requests` | Any auth | `?status=&userId=` | `200 LeaveRequest[]` | List (employee sees own; admin sees all) |
| GET | `/leave-requests/:id` | Any auth | — | `200 LeaveRequest` | Get one |
| PATCH | `/leave-requests/:id/approve` | ADMIN / SUPER_USER | optional `{ approvalNote }` | `200 LeaveRequest` | Approve |
| PATCH | `/leave-requests/:id/reject` | ADMIN / SUPER_USER | `{ approvalNote }` | `200 LeaveRequest` | Reject |
| PATCH | `/leave-requests/:id/cancel` | Owner (PENDING only) | — | `200 LeaveRequest` | Cancel own request |

### Capacity Report API

| Method | Path | Auth | Query | Response | Description |
|--------|------|------|-------|----------|-------------|
| GET | `/reports/capacity` | ADMIN / SUPER_USER | `?year=&month=` | `CapacityReportDto` | Live capacity matrix |

### DTOs

**CreateLeaveRequestDto**
```typescript
{
  type: LeaveType;       // required
  startDate: string;     // ISO date "YYYY-MM-DD"
  endDate: string;       // ISO date "YYYY-MM-DD"
  reason?: string;
}
```

**CapacityReportDto**
```typescript
{
  year: number;
  month: number;
  daysInMonth: number;
  days: CapacityDay[];      // per-day header (dayOfWeek, isWeeklyOff, isHoliday, holidayName)
  employees: CapacityEmployee[];
}

CapacityEmployee {
  userId: string;
  name: string;
  role: string;
  cells: CapacityCell[];
  summary: { occupiedDays, leaveDays, availableDays, holidayDays, weeklyOffDays }
}

CapacityCell {
  day: number;
  status: 'holiday' | 'weekly_off' | 'leave' | 'occupied' | 'partial' | 'available';
  hours: number;
  holidayName?: string;
}
```

---

## 8. RBAC Summary

| Action | SUPER_USER | ADMIN | EMPLOYEE |
|--------|-----------|-------|----------|
| Apply leave | ✓ | ✓ | ✓ (own only) |
| View leave list | All | All | Own only |
| Approve / Reject | ✓ | ✓ | ✗ |
| Cancel | Own PENDING | Any PENDING | Own PENDING |
| View capacity report | ✓ | ✓ | ✗ |
