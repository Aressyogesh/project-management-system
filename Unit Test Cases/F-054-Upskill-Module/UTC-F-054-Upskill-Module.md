# UTC-F-054 — Upskill Module — Unit Test Cases

**Feature:** F-054 Upskill Module  
**Date:** 2026-06-24  
**Coverage:** Backend Service + Frontend Component logic

---

## Backend — UpskillService

---

### UTC-F054-BE-01 — Create Learning Assignment (happy path)

**AC:** AC-2

**Arrange:**
- `prisma.user.findUnique` returns a valid user with id `user-001`
- `prisma.upskillAssignment.create` resolves to a mock assignment `{ id: 'asgn-001', type: 'LEARNING', status: 'ASSIGNED', ... }`
- Caller `systemRole = ADMIN`

**Act:**
- Call `upskillService.createAssignment(callerId, { type: 'LEARNING', assignedToId: 'user-001', description: 'Learn NestJS', startDate: '2026-06-01', endDate: '2026-06-30' })`

**Assert:**
- Returns object with `id = 'asgn-001'`, `status = 'ASSIGNED'`
- `prisma.upskillAssignment.create` called once with correct `type`, `assignedToId`, `createdById = callerId`

---

### UTC-F054-BE-02 — Create Automation Assignment requires toolScript

**AC:** AC-3

**Arrange:**
- Caller is ADMIN
- `assignedToId` exists

**Act:**
- Call `createAssignment` with `type = 'AUTOMATION'` but `toolScript` omitted

**Assert:**
- Throws `BadRequestException` with message `'toolScript is required for AUTOMATION type'`
- `prisma.upskillAssignment.create` never called

---

### UTC-F054-BE-03 — Create Assignment rejected for EMPLOYEE

**AC:** AC-1

**Arrange:**
- Caller `systemRole = EMPLOYEE`, `projectRole = null` (no PM role)

**Act:**
- Call `createAssignment` as non-privileged employee

**Assert:**
- Throws `ForbiddenException`
- `prisma.upskillAssignment.create` never called

---

### UTC-F054-BE-04 — endDate before startDate rejected

**AC:** AC-2

**Arrange:**
- Valid ADMIN caller

**Act:**
- Call `createAssignment` with `startDate = '2026-06-30'`, `endDate = '2026-06-01'`

**Assert:**
- Throws `BadRequestException` with message containing `'endDate must be after startDate'`

---

### UTC-F054-BE-05 — Log Progress transitions status to IN_PROGRESS

**AC:** AC-5

**Arrange:**
- `prisma.upskillAssignment.findUnique` returns `{ id: 'asgn-001', assignedToId: 'user-001', status: 'ASSIGNED' }`
- `prisma.upskillProgressLog.create` resolves with log
- `prisma.upskillAssignment.update` resolves

**Act:**
- Call `logProgress('asgn-001', 'user-001', { percentComplete: 30, hoursSpent: 2, notes: 'Started reading docs' })`

**Assert:**
- `prisma.upskillProgressLog.create` called with correct fields
- `prisma.upskillAssignment.update` called with `{ status: 'IN_PROGRESS' }` (because prior status was ASSIGNED)

---

### UTC-F054-BE-06 — Log Progress by non-assignee throws 403

**AC:** AC-7

**Arrange:**
- Assignment `assignedToId = 'user-001'`
- Caller `userId = 'user-002'` (different user, not manager)

**Act:**
- Call `logProgress('asgn-001', 'user-002', { percentComplete: 50, hoursSpent: 1 })`

**Assert:**
- Throws `ForbiddenException`
- `prisma.upskillProgressLog.create` never called

---

### UTC-F054-BE-07 — Log Progress on APPROVED assignment throws 409

**AC:** AC-5

**Arrange:**
- `prisma.upskillAssignment.findUnique` returns `{ status: 'APPROVED', assignedToId: 'user-001' }`
- Caller is the assigned user

**Act:**
- Call `logProgress`

**Assert:**
- Throws `ConflictException` with message `'Cannot log progress on an APPROVED assignment'`

---

### UTC-F054-BE-08 — Final Submission transitions status to SUBMITTED

**AC:** AC-6

**Arrange:**
- Assignment `{ id: 'asgn-001', assignedToId: 'user-001', status: 'IN_PROGRESS' }`
- File path `'uploads/upskill/evidence.pdf'`
- `prisma.upskillAssignment.update` resolves

**Act:**
- Call `submitEvidence('asgn-001', 'user-001', 'uploads/upskill/evidence.pdf')`

**Assert:**
- `prisma.upskillAssignment.update` called with `{ status: 'SUBMITTED', evidenceFilePath: 'uploads/upskill/evidence.pdf' }`
- Returns updated assignment with `status = 'SUBMITTED'`

---

### UTC-F054-BE-09 — Cannot submit on SUBMITTED/APPROVED assignment

**AC:** AC-6

**Arrange:**
- Assignment `status = 'SUBMITTED'` or `status = 'APPROVED'`

**Act:**
- Call `submitEvidence`

**Assert:**
- Throws `ConflictException`

---

### UTC-F054-BE-10 — Approve transitions status to APPROVED

**AC:** AC-9

**Arrange:**
- Assignment `{ status: 'SUBMITTED', assignedToId: 'user-001' }`
- Approver `systemRole = ADMIN`, `approverId = 'mgr-001'`

**Act:**
- Call `approveAssignment('asgn-001', 'mgr-001')`

**Assert:**
- `prisma.upskillAssignment.update` called with `{ status: 'APPROVED', approvedById: 'mgr-001', approvedAt: expect.any(Date) }`

---

### UTC-F054-BE-11 — Approve non-SUBMITTED assignment throws 409

**AC:** AC-9

**Arrange:**
- Assignment `status = 'ASSIGNED'`

**Act:**
- Call `approveAssignment`

**Assert:**
- Throws `ConflictException` with message `'Assignment must be in SUBMITTED state to approve'`

---

### UTC-F054-BE-12 — Reject requires reason

**AC:** AC-10

**Arrange:**
- Assignment `status = 'SUBMITTED'`
- Rejector is ADMIN

**Act:**
- Call `rejectAssignment('asgn-001', 'mgr-001', '')` (empty reason)

**Assert:**
- Throws `BadRequestException` with message containing `'reason is required'`

---

### UTC-F054-BE-13 — Reject stores reason and transitions to REJECTED

**AC:** AC-10

**Arrange:**
- Assignment `status = 'SUBMITTED'`

**Act:**
- Call `rejectAssignment('asgn-001', 'mgr-001', 'Certificate unclear')`

**Assert:**
- `prisma.upskillAssignment.update` called with `{ status: 'REJECTED', rejectionReason: 'Certificate unclear' }`

---

### UTC-F054-BE-14 — Rejected assignment can be re-submitted in same month

**AC:** AC-11

**Arrange:**
- Assignment `{ status: 'REJECTED', startDate: 2026-06-01, endDate: 2026-06-30 }`
- Current date `2026-06-20` (same month)

**Act:**
- Call `submitEvidence` with new file path

**Assert:**
- `prisma.upskillAssignment.update` called with `{ status: 'SUBMITTED', evidenceFilePath: newPath, rejectionReason: null }`

---

### UTC-F054-BE-15 — Rejected assignment cannot be re-submitted after month end

**AC:** AC-11

**Arrange:**
- Assignment `{ status: 'REJECTED', endDate: 2026-05-31 }`
- Current date `2026-06-05` (different month)

**Act:**
- Call `submitEvidence`

**Assert:**
- Throws `ForbiddenException` with message `'Resubmission window has closed for this assignment'`

---

### UTC-F054-BE-16 — KPI score: approved upskill → 10/10 Growth & Innovation

**AC:** AC-12

**Arrange:**
- `prisma.upskillAssignment.findMany` returns `[{ status: 'APPROVED', startDate: 2026-06-01, endDate: 2026-06-30 }]`
- Existing `learningLogs = []`, `innovationLogs = []`
- KPI period `'2026-06'`

**Act:**
- Call `analyticsService.computeKpi('user-001', '2026-06')`

**Assert:**
- Returned `metrics` contains `{ metricId: 'learning_velocity', points: 5 }` and `{ metricId: 'automation_innovation', points: 5 }`

---

### UTC-F054-BE-17 — KPI score: no approved upskill → existing formula applies

**AC:** AC-13

**Arrange:**
- `prisma.upskillAssignment.findMany` returns `[]`
- `learningLogs = [{ hours: 4 }]`
- `innovationLogs = [{ type: 'PROCESS_IMPROVEMENT' }]`
- KPI period `'2026-06'`

**Act:**
- Call `analyticsService.computeKpi('user-001', '2026-06')`

**Assert:**
- `learning_velocity = 5` (from `computeLearningVelocity(4)`)
- `automation_innovation = 3` (from `computeInnovation([{type:'PROCESS_IMPROVEMENT'}])`)

---

## Frontend — UpskillPage Component

---

### UTC-F054-FE-01 — Upskill nav item hidden for EMPLOYEE

**AC:** AC-1

**Arrange:**
- Auth store: `systemRole = 'EMPLOYEE'`, `projectRoles = []`

**Act:**
- Render `<AppLayout />`

**Assert:**
- "Upskill" nav item not present in DOM

---

### UTC-F054-FE-02 — Upskill nav item visible for ADMIN

**AC:** AC-1

**Arrange:**
- Auth store: `systemRole = 'ADMIN'`

**Act:**
- Render `<AppLayout />`

**Assert:**
- "Upskill" nav item present and has correct href `/upskill`

---

### UTC-F054-FE-03 — Learning tab form renders correct fields

**AC:** AC-2

**Arrange:**
- Render `<UpskillPage />`, click "Learning" tab, click "Create Assignment"

**Act:**
- Form modal opens

**Assert:**
- Fields present: Resource select, Description textarea, Start Date, End Date
- "Tool/Script Name" field NOT present

---

### UTC-F054-FE-04 — Automation tab form renders Tool/Script field

**AC:** AC-3

**Arrange:**
- Render `<UpskillPage />`, click "Automation" tab, click "Create Assignment"

**Act:**
- Form modal opens

**Assert:**
- "Tool/Script Name" input present and required

---

### UTC-F054-FE-05 — Submit button disabled when required fields missing

**AC:** AC-2, AC-3

**Arrange:**
- Create Assignment modal open (Learning tab)
- No resource selected, description empty

**Act:**
- Inspect Submit button

**Assert:**
- Submit button is disabled (`disabled = true`)

---

### UTC-F054-FE-06 — Approve button calls PATCH approve

**AC:** AC-8, AC-9

**Arrange:**
- Render `<UpskillPage />` with one SUBMITTED assignment
- Mock `PATCH /upskill/assignments/:id/approve` → 200

**Act:**
- Click Approve button → confirm dialog → confirm

**Assert:**
- API call made to `PATCH /upskill/assignments/asgn-001/approve`
- Assignment row status badge updates to "APPROVED"

---

### UTC-F054-FE-07 — Reject dialog requires reason before submitting

**AC:** AC-10

**Arrange:**
- Reject dialog open for a SUBMITTED assignment
- Reason textarea empty

**Act:**
- Click "Reject" confirm button

**Assert:**
- Validation error shown ("Reason is required")
- API call NOT made

---

### UTC-F054-FE-08 — KPI Growth section shows upskill assignment card for employee

**AC:** AC-4

**Arrange:**
- Render `<MyGrowthInnovationSection />` with mock API returning one upskill assignment `{ type: 'LEARNING', status: 'IN_PROGRESS', ... }`

**Act:**
- Component renders

**Assert:**
- Assignment card visible with "Upskill Assignment — Learning" label and status badge "In Progress"

---

### UTC-F054-FE-09 — Log Progress form validates percentComplete range

**AC:** AC-5

**Arrange:**
- Progress log form open

**Act:**
- Enter `percentComplete = 110`

**Assert:**
- Validation error shown: "Must be between 0 and 100"
- Submit disabled

---

### UTC-F054-FE-10 — Final Submission rejects files > 10 MB

**AC:** AC-6

**Arrange:**
- Final submission file picker

**Act:**
- User selects a file of size 15 MB

**Assert:**
- Error message shown: "File size must not exceed 10 MB"
- POST submit NOT called

---

### UTC-F054-FE-11 — APPROVED assignment shows read-only state

**AC:** AC-9

**Arrange:**
- Render assignment card with `status = 'APPROVED'`

**Act:**
- Inspect card

**Assert:**
- "Log Progress" button disabled or hidden
- "Submit Evidence" button disabled or hidden
- "APPROVED" badge visible (green)

---

### UTC-F054-FE-12 — REJECTED assignment shows rejection reason banner

**AC:** AC-10, AC-11

**Arrange:**
- Render assignment card with `status = 'REJECTED'`, `rejectionReason = 'Certificate unclear'`

**Act:**
- Inspect card

**Assert:**
- Red banner visible with text "Certificate unclear"
- "Submit Evidence" button enabled (resubmit allowed)
