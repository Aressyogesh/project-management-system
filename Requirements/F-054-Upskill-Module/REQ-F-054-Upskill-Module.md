# REQ-F-054 — Upskill Module

**Epic:** PMS  
**Feature ID:** F-054  
**Feature Name:** Upskill Module  
**Author:** Yogesh Lolage  
**Date:** 2026-06-24  
**Status:** Draft

---

## 1. User Story

> As a **Manager / Admin / Super Admin**, I want to assign upskilling tasks (Learning or Automation) to team members with a defined duration, so I can track their skill growth.
>
> As an **Assigned Resource (Employee)**, I want to see my upskill assignments inside KPI > My Growth & Innovation, log progress over time, and make a final submission with supporting evidence, so my learning is formally recognised.
>
> As a **Manager / Admin / Super Admin**, I want to approve or reject submitted upskill assignments from the Upskill module so that only validated effort is counted toward an employee's KPI score.

---

## 2. Business Requirements

| ID   | Requirement |
|------|-------------|
| BR-1 | The Upskill module must be accessible only to ADMIN, SUPER_USER (system roles) and users with a PROJECT_MANAGER project role in at least one active project. |
| BR-2 | Assignments are created exclusively by eligible managers/admins — employees cannot self-create. |
| BR-3 | Two assignment types must be supported: **Learning** and **Automation**. Automation type captures an additional Tool / Script Name field. |
| BR-4 | Each assignment has a Start Date, End Date, a resource (assignee), and a Description. |
| BR-5 | The assigned employee must see their upskill assignments within KPI > My Growth & Innovation Self-Log. |
| BR-6 | Only the assigned resource may log progress or submit evidence; managers and admins may only view. |
| BR-7 | An employee may log multiple interim progress updates (% complete, hours spent, notes) before the final submission. |
| BR-8 | The final submission attaches evidence (certificate, PDF, image) and transitions the assignment to SUBMITTED status. |
| BR-9 | Manager/Admin approves or rejects a SUBMITTED assignment from the Upskill module. Rejection requires a reason. |
| BR-10 | A rejected assignment may be resubmitted by the resource within the same calendar month. |
| BR-11 | When a resource has at least one APPROVED upskill assignment whose period overlaps a KPI month, their combined Growth & Innovation score (`learning_velocity` + `automation_innovation`) for that month = **10 / 10**. |
| BR-12 | If no approved upskill assignment exists for a month, the existing self-log based computation (`learningLog` + `innovationLog`) continues to apply. |

---

## 3. Acceptance Criteria

| ID    | Acceptance Criterion |
|-------|----------------------|
| AC-1  | A user with ADMIN / SUPER_USER system role or PROJECT_MANAGER project role can see "Upskill" in the left navbar. Employees without these roles cannot see this item. |
| AC-2  | Manager/Admin can create a **Learning** assignment with: Assign Resource, Description, Start Date, End Date. |
| AC-3  | Manager/Admin can create an **Automation** assignment with: Assign Resource, Tool/Script Name, Description, Start Date, End Date. |
| AC-4  | An assigned employee can see their upskill assignment card(s) in KPI > My Growth & Innovation section, clearly labelled as "Upskill Assignment — Learning" or "Upskill Assignment — Automation". |
| AC-5  | Assigned employee can log interim progress: % Complete (0–100), Hours Spent (decimal), Notes (optional). Multiple entries allowed; status becomes IN_PROGRESS after first log. |
| AC-6  | Assigned employee can make a final submission: attaches one evidence file (PDF, DOCX, PNG, JPG, max 10 MB); status transitions to SUBMITTED. |
| AC-7  | Only the assigned employee can create progress logs or final submissions; other employees receive 403. |
| AC-8  | Manager/Admin sees all SUBMITTED assignments in the Upskill module with an Approve / Reject action. |
| AC-9  | On Approve: assignment status → APPROVED; `approvedAt` + `approvedById` set. |
| AC-10 | On Reject: assignment status → REJECTED; rejection reason stored; resource is notified. |
| AC-11 | A REJECTED assignment allows the resource to clear evidence, attach new evidence, and re-submit within the same calendar month. |
| AC-12 | KPI computation: if `UpskillAssignment.status = APPROVED` and the assignment's period overlaps the requested KPI month for the user → `learning_velocity = 5`, `automation_innovation = 5` (combined 10/10); the existing log-based formula is bypassed. |
| AC-13 | KPI computation: if no approved assignment exists for the month → existing `computeLearningVelocity` + `computeInnovation` logic unchanged. |
| AC-14 | Evidence file is stored on disk (Multer, same pattern as task attachments) and downloadable by the assigned resource and their manager/admin. |

---

## 4. Out of Scope

- Email/in-app notifications on approval/rejection (can be added in a future notification feature).
- Bulk assignment creation.
- Recurring upskill assignments.
- Multiple assignees per assignment.

---

## 5. Dependencies

| Dependency | Detail |
|------------|--------|
| `self-logs` module | Existing learning / innovation logs remain; Upskill approval overrides score for a month if present. |
| `analytics` module | `computeKpi()` in `analytics.service.ts` — must query approved UpskillAssignments per period. |
| `KPI frontend` | `MyGrowthInnovation` component must render assigned Upskill cards and progress form. |
| `Multer / FileStorageService` | Evidence file upload reuses existing disk-storage pattern (task attachments). |
| RBAC guards | New `UpskillManagerGuard` or inline check; `JwtAuthGuard` global. |

---

## 6. Database / Schema Design

### 6.1 New Models

#### `UpskillAssignment`

```prisma
model UpskillAssignment {
  id              String               @id @default(uuid())
  type            UpskillType          // LEARNING | AUTOMATION
  assignedToId    String               // FK → User (the resource)
  createdById     String               // FK → User (manager/admin)
  description     String               @db.VarChar(1000)
  toolScript      String?              @db.VarChar(300)   // Automation only
  startDate       DateTime
  endDate         DateTime
  status          UpskillStatus        @default(ASSIGNED)
  evidenceFilePath String?             @db.VarChar(500)
  rejectionReason  String?             @db.VarChar(500)
  approvedAt      DateTime?
  approvedById    String?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  assignedTo      User                 @relation("UpskillAssignments", fields: [assignedToId], references: [id], onDelete: Cascade)
  createdBy       User                 @relation("UpskillCreated", fields: [createdById], references: [id])
  approvedBy      User?                @relation("UpskillApprovals", fields: [approvedById], references: [id])
  progressLogs    UpskillProgressLog[]

  @@index([assignedToId])
  @@index([status])
  @@map("upskill_assignments")
}
```

#### `UpskillProgressLog`

```prisma
model UpskillProgressLog {
  id              String            @id @default(uuid())
  assignmentId    String
  userId          String            // must match assignment.assignedToId
  percentComplete Int               // 0–100
  hoursSpent      Float
  notes           String?           @db.VarChar(1000)
  createdAt       DateTime          @default(now())

  assignment      UpskillAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  user            User              @relation("UpskillProgressLogs", fields: [userId], references: [id])

  @@index([assignmentId])
  @@map("upskill_progress_logs")
}
```

#### New Enums

```prisma
enum UpskillType {
  LEARNING
  AUTOMATION
}

enum UpskillStatus {
  ASSIGNED
  IN_PROGRESS
  SUBMITTED
  APPROVED
  REJECTED
}
```

### 6.2 User Model Relations (additions)

```prisma
// Add to User model:
upskillAssignments      UpskillAssignment[]  @relation("UpskillAssignments")
upskillCreated          UpskillAssignment[]  @relation("UpskillCreated")
upskillApprovals        UpskillAssignment[]  @relation("UpskillApprovals")
upskillProgressLogs     UpskillProgressLog[] @relation("UpskillProgressLogs")
```

### 6.3 Migration

`npx prisma migrate dev --name add_upskill_module` (local)  
`npx prisma migrate deploy` (production, runs on Render deploy)

---

## 7. API Contract Design

Base path: `/upskill`  
Auth: All routes protected by global `JwtAuthGuard`.

### 7.1 Create Assignment

```
POST /upskill/assignments
Authorization: Manager / Admin only

Body:
{
  type: "LEARNING" | "AUTOMATION",
  assignedToId: string,          // UUID of resource
  description: string,
  toolScript?: string,           // Required if type = AUTOMATION
  startDate: string,             // ISO date
  endDate: string                // ISO date
}

Response 201:
{
  id, type, assignedToId, createdById, description, toolScript,
  startDate, endDate, status: "ASSIGNED", createdAt
}

Errors:
  400 — missing required fields or endDate < startDate
  403 — caller is not ADMIN / SUPER_USER / PROJECT_MANAGER
  404 — assignedToId not found
```

### 7.2 List Assignments

```
GET /upskill/assignments
Authorization: Manager / Admin (sees all or scoped); Resource (sees own via ?mine=true)

Query params:
  ?mine=true          — resource fetches only their own assignments
  ?status=SUBMITTED   — filter by status
  ?assignedToId=uuid  — manager filters by resource (optional)

Response 200: UpskillAssignment[] (includes progressLogs summary: latest % + total hours)
```

### 7.3 Get Assignment Detail

```
GET /upskill/assignments/:id
Authorization: assigned resource OR manager/admin

Response 200: full UpskillAssignment + progressLogs[]
Errors: 403, 404
```

### 7.4 Log Progress

```
POST /upskill/assignments/:id/progress
Authorization: Assigned resource only

Body:
{
  percentComplete: number,   // 0–100
  hoursSpent: number,        // > 0
  notes?: string
}

Response 201: UpskillProgressLog
Side effect: Assignment status → IN_PROGRESS (if ASSIGNED)
Errors: 400, 403, 404
```

### 7.5 Final Submission (with evidence file)

```
POST /upskill/assignments/:id/submit
Authorization: Assigned resource only
Content-Type: multipart/form-data

Fields:
  file: File   (PDF, DOCX, PNG, JPG; max 10 MB)

Response 200: updated UpskillAssignment (status: SUBMITTED, evidenceFilePath set)
Errors:
  400 — no file, wrong type, or size > 10 MB
  409 — already SUBMITTED or APPROVED
  403 — not the assigned resource
```

### 7.6 Approve Assignment

```
PATCH /upskill/assignments/:id/approve
Authorization: Manager / Admin only

Response 200: updated UpskillAssignment (status: APPROVED)
Errors: 403, 404, 409 (not in SUBMITTED state)
```

### 7.7 Reject Assignment

```
PATCH /upskill/assignments/:id/reject
Authorization: Manager / Admin only

Body:
{
  reason: string
}

Response 200: updated UpskillAssignment (status: REJECTED, rejectionReason set)
Errors: 400 (missing reason), 403, 404, 409
```

### 7.8 Download Evidence File

```
GET /upskill/assignments/:id/evidence
Authorization: Assigned resource OR manager/admin

Response 200: file stream (Content-Disposition: attachment)
Errors: 403, 404
```

---

## 8. Frontend Pages & Components

### 8.1 Upskill Module (`/upskill`)

- **Left Navbar:** "Upskill" item, visible only to ADMIN / SUPER_USER / PROJECT_MANAGER users.
- **Two tabs:** Learning | Automation.
- **Manager/Admin view (default):**
  - Assignment list table: Resource, Description, Tool/Script (Automation only), Start–End, Status badge, Actions (Approve / Reject / View).
  - "Create Assignment" button → modal/drawer with form fields per tab type.
  - Status filter dropdown (All / Assigned / In Progress / Submitted / Approved / Rejected).
- **Approve/Reject flow:**
  - Approve → confirmation dialog → PATCH approve.
  - Reject → dialog with rejection reason textarea → PATCH reject.

### 8.2 KPI > My Growth & Innovation — Upskill Section

- New section "Upskill Assignments" below existing self-log entries.
- Displays cards for each assignment assigned to the current employee.
- Card shows: type badge, description, tool/script (if Automation), Start–End dates, current status, latest % complete.
- **Progress Log button** → drawer with:
  - History of all past progress entries (date, %, hours, notes).
  - "Log Progress" form: % Complete slider/input, Hours Spent, Notes (optional).
  - Submit button (disabled once status = SUBMITTED / APPROVED).
- **Final Submission button** (active when status = ASSIGNED or IN_PROGRESS or REJECTED):
  - File picker (PDF, DOCX, PNG, JPG, ≤10 MB).
  - Submit Evidence button → POST submit.
- Status badges: ASSIGNED (gray) | IN_PROGRESS (blue) | SUBMITTED (amber) | APPROVED (green) | REJECTED (red).
- Rejection reason shown as a banner when status = REJECTED.

---

## 9. Role & Permission Matrix

| Action | SUPER_USER | ADMIN | PROJECT_MANAGER | EMPLOYEE |
|--------|-----------|-------|-----------------|----------|
| View Upskill nav item | ✓ | ✓ | ✓ | ✗ |
| Create assignment | ✓ | ✓ | ✓ | ✗ |
| View all assignments | ✓ | ✓ | Own team | Own only |
| Log progress | ✗ | ✗ | ✗ | Own only |
| Final submit (evidence) | ✗ | ✗ | ✗ | Own only |
| Approve / Reject | ✓ | ✓ | ✓ | ✗ |
| Download evidence | ✓ | ✓ | ✓ | Own only |

---

## 10. KPI Score Integration

**Modified logic in `analytics.service.ts` → `computeKpi()`:**

```
1. Query approved UpskillAssignments for the user where:
   - status = APPROVED
   - startDate <= periodEnd AND endDate >= periodStart
2. If at least one approved assignment exists:
   - learningVelocity = 5
   - automationInnovation = 5
   - (combined 10/10 for Growth & Innovation category)
3. Else: use existing computeLearningVelocity(hours) + computeInnovation(logs) as before
```

---

## 11. Non-Functional Requirements

| NFR | Detail |
|-----|--------|
| Evidence storage | Disk (Multer), same folder as task attachments (`uploads/upskill/`) |
| File size limit | 10 MB per evidence file |
| Allowed file types | PDF, DOCX, PNG, JPG, JPEG |
| Security | Assignment ID in URL validated against caller's permissions; no direct file path exposure |
| Performance | Assignment list paginated (25/page) for manager view |
