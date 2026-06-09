# Project Management System (PMS)
## Project Plan

---

## Overview

A full-stack, role-based Project Management System for a software development firm (~150 employees).

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
**Backend:** NestJS (Node.js + TypeScript)
**ORM:** Prisma
**Database:** PostgreSQL (Supabase production / Docker local)
**Auth:** Passport.js + JWT
**Real-time:** Socket.io (bug reminders, notifications)
**File Uploads:** Multer (task & bug attachments)
**API Docs:** Swagger via @nestjs/swagger
**AI:** Groq API (LLM inference — free tier)
**Email:** Brevo REST API (transactional email — free tier, 300/day)
**Scheduler:** @nestjs/schedule (cron-based automation)

Both frontend and backend are 100% TypeScript — Prisma auto-generates types from `schema.prisma` that are shared across the stack.

Covers the complete project lifecycle: department & client management, project tracking, milestone planning, task list & task management, task allocation (8-hour shift tracking), timesheet logging, leave/overtime tracking, bug management (with full classification system), KPI appraisal, and reporting.

UI design follows the **Taskee** reference (`Document/Design/project-management-system.webp`) — clean sidebar layout, stat cards, activity charts, task tables, and progress widgets.

---

## Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Data Fetching | TanStack React Query |
| State Management | Zustand |
| Routing | React Router v6 |
| HTTP Client | Axios (with JWT interceptors) |
| Charts | Recharts |
| Forms | React Hook Form |

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | NestJS (Node.js + TypeScript) |
| ORM | Prisma ORM |
| Database | PostgreSQL |
| Authentication | Passport.js + JWT (`@nestjs/jwt` + `@nestjs/passport`) |
| Password Hashing | bcryptjs |
| Validation | class-validator + class-transformer |
| API Docs | Swagger / OpenAPI (`@nestjs/swagger`) |
| Real-time | Socket.io (`@nestjs/websockets`) — notifications |
| File Upload | Multer (multipart/form-data, stored on disk) |
| Scheduler | `@nestjs/schedule` — cron jobs for reminders & automation |

### AI & Automation
| Layer | Technology |
|-------|-----------|
| **Local LLM (dev)** | **Ollama** — runs `llama3.2:3b` locally at `http://localhost:11434`; OpenAI-compatible API; zero cost; used during development for F-030 AI Chat SQL Agent |
| **Cloud LLM (prod)** | **Groq API** — free tier, ultra-fast inference via `api.groq.com`; drop-in replacement for Ollama (same OpenAI-compatible API); used in production for all AI features |
| **Groq Models** | `llama-3.3-70b-versatile` — primary model for chat, SQL agent, sprint planning (best quality); `llama-3.1-8b-instant` — fast model for blocker detection, smart descriptions (low latency) |
| **LLM Abstraction** | Provider switching = 3 env vars only (`GROQ_API_KEY`, `AI_BASE_URL`, `AI_MODEL`); no code changes needed to swap Ollama ↔ Groq |
| **Tool Calling** | Groq native tool use (OpenAI-compatible function calling); used by SQL Agent to select Prisma query tools based on user question |
| **Embeddings (Phase 2)** | **Voyage AI** `voyage-3-lite` (768 dims) — document embeddings for RAG knowledge base; pgvector extension on existing PostgreSQL |
| **Email Delivery** | **Brevo REST API** — transactional email, 300 emails/day free forever; password reset, deadline reminders, project health reports, welcome emails |
| **Workflow Automation** | **NestJS `@nestjs/schedule`** — built-in cron scheduler, no external tool; deadline reminders, timesheet reminders, overdue escalation, monthly KPI digest |

#### AI Model Reference

| Model | Provider | Context | Use Case in PMS |
|-------|----------|---------|-----------------|
| `llama3.2:3b` | Ollama (local) | 128k | Development / local testing |
| `llama-3.3-70b-versatile` | Groq (cloud) | 128k | AI Chat SQL Agent, sprint planning, complex summaries |
| `llama-3.1-8b-instant` | Groq (cloud) | 128k | Blocker detection, smart task description, quick checks |
| `voyage-3-lite` | Voyage AI | — | Document chunk embeddings (Phase 2 RAG only) |

#### Environment Variables (AI)
```env
# Local development (Ollama)
GROQ_API_KEY=ollama
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2:3b

# Production (Groq)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
```

### Infrastructure & DevOps
| Layer | Technology |
|-------|-----------|
| Dev Environment | Docker Compose (PostgreSQL + pgAdmin) |
| Deployment | On-premise server + GitHub Actions self-hosted runner |
| Frontend Hosting | Vercel |
| Backend Hosting | Render (`pms-backend-zhez.onrender.com`) |
| Database Hosting | Supabase (production) / PostgreSQL local (development) |

---

## User Roles

### System-Level Roles

| Role | Description |
|------|-------------|
| **Super User** | Full system access — all settings, users, departments, clients, projects, reports, KPI |
| **Admin** | Company admin — manages users, departments, clients, projects, timesheets, KPI, reports |
| **Employee** | Any staff member — accesses features based on their project role (see below) |

### Project-Level Team Roles (assigned per project)

| Project Role | Description |
|-------------|-------------|
| Project Manager | Owns the project, manages milestones, task allocation, approvals, assigns developer tasks | 
| Team Lead | Manages sprint task lists, assigns developer tasks, reviews output |
| Developer | Works on development tasks, logs timesheets, logs bugs, updates bug status |
| QA | Tests features, logs & manages bugs, updates bug status |
| Designer | Works on UI/UX tasks, logs timesheets, logs bugs, updates bug status |
| DevOps | Infrastructure tasks |

---

## Departments

Internal company divisions (e.g. Digital, SalesForce). Each employee belongs to one department.

---

## Shifts

9-hour shift with 1-hour break = **8 productive hours per shift**.

| Shift | Start | End |
|-------|-------|-----|
| Day | 10:00 AM | 07:00 PM |
| Afternoon | 03:00 PM | 12:00 AM |
| Night | 11:00 PM | 08:00 AM |

Task allocation rules enforce that an employee's total assigned task hours for a day do not exceed **8 hours**. If employee works for more than allocated task hours, he or she should be able to log additional hours in timesheet.

---

## Role-Based Access Control (RBAC)

| Feature | Super User | Admin | Employee (Project Manager) | Employee (Team Lead) | Employee (Developer / QA) |
|---------|:----------:|:-----:|:--------------------------:|:--------------------:|:-------------------------:|
| User Management | Full | Full | — | — | — |
| Department Management | Full | Full | — | — | — |
| Client Management | Full | Full | — | — | — |
| Shift Configuration | Full | Full | — | — | — |
| Project CRUD | Full | Full | Own projects | — | Read |
| Project Members | Full | Full | Full | — | — |
| Milestones | Full | Full | Full | Read | Read |
| Task Lists | Full | Full | Full | Full | Read |
| Task CRUD | Full | Full | Full | Full | Update assigned |
| Task Allocation | Full | Full | Full | Full | — |
| Timesheet | Full | Approve | Approve | Approve | Create + Read own |
| Leave / Overtime Log | Full | Approve | Approve | — | Create + Read own |
| Bug Management | Full | Full | Full | Full | Create + Update own |
| KPI Store | Full | Full | Read own | Read own | Read own |
| Reports | Full | Full | Own projects | Own projects | Read own |
| Dashboard | Full | Full | Project-scoped | Project-scoped | Own stats |

---

## Core Features

### 1. Authentication
- Login with email + password
- "Remember me" (extended JWT expiry)
- Forgotten password / reset flow
- New user registration (pending Admin/Super User approval)
- JWT access token + refresh token

### 2. Department Management
- Create / edit / deactivate departments (Digital, Mobile, SalesForce, etc.)
- Employees are assigned to a department
- Filter users, projects and reports by department

### 3. Client Management
- Create / edit / deactivate clients (client name, contact person, email, phone, address)
- Each project is linked to a client
- Sidebar can group projects by client (matching existing PM TOOL navigation pattern)

### 4. User Management
- User fields: Full Name, Email, Password, Department, Shift (Day/Afternoon/Night), System Role, Profile Photo, Phone, Join Date, Is Active
- Super User / Admin can create, edit, deactivate users
- Assign department and shift to each user

### 5. Project Management
- Project fields: Project Name, Client, Department, Description, Start Date, End Date, Duration, Cost, Project Type (Fixed Price / Time & Material / Dedicated), Status
- Project statuses: `ACTIVE → ARCHIVED`
- Project card shows: Project Manager name, completion %, task count, bug count, start/end dates
- Projects Summary panel: Active, Archive, Dedicated, T&M, Fixed, Overdue counts
- Add / remove team members — assign each member a project role (Project Manager, Team Lead, Developer, QA, etc.)
- Search projects by name / filter by client, department, status

### 6. Milestones
- Miletsone can be optional
- Milestones belong to a project
- Fields: Description, Delivery Note, Start Date, Due Date, Responsible User, Status
- Examples: Initial Application Screen Prototypes/Wireframes, Phase-1 Admin Module, Web API Delivery, Mobile Application
- Tasks and Bugs can reference a milestone (Release Milestone / Affected Milestone)
- Milestone progress tracked via linked tasks

### 7. Task Lists
- Task Lists belong to a project and group related tasks
- Examples: General Tasks, Project Management Tasks, Development Tasks, QA Tasks, Sprint-1 Tasks, Sprint-2 Tasks, Sprint-3 Tasks
- Task List fields: Name, Project, Type (General / Sprint / QA / PM), Sprint Number (for Sprint type), Description
- Tasks are created under a Task List

### 8. Task Management
- Task fields:
  - Project Name
  - Task List (select from project's task lists)
  - Milestone (select from project's milestones)
  - Task Name
  - Description
  - Assignee (select from project team members)
  - Duration (estimated hours)
  - Priority (Low / Medium / High / Critical)
  - Billing Status (Billable / Non-Billable)
  - Start Date, Due Date
  - Status (Not Started / In Progress / On Review / Completed)
  - File Attachments (PDF, DOCX, XLSX, PNG/JPG, TXT, MP4 — max size configurable)
- Task detail view: description, attachments, comments/history, actual vs estimated hours
- Task allocation enforcement: total assigned hours per user per day ≤ 8 hours
- My Task table on dashboard: Project Details, Assign, Priority, Stage

### 9. Task Allocation Tracking
- When assigning a task to a user for a specific date:
  - System checks total already-allocated hours for that user on that date
  - Warns or blocks if allocation would exceed 8 hours (user's shift work hours)
- Task allocation view per employee: daily calendar showing allocated tasks + hours
- Manager/Team Lead can view team allocation to balance workload

### 10. Timesheet
- Log hours against an assigned task (date, hours worked, description)
- Timesheet statuses: `SUBMITTED`
- My Timesheet view: weekly/monthly calendar grid
- Actual vs estimated hours comparison per task/project

### 11. Leave / Overtime Log
- Log leave or overtime: date, type (Leave / Overtime), hours, description
- If employee is on leave for a day (8 hours), then 8 hours should not be considered for that day in timesheet tracking.
- Approval workflow: `PENDING → APPROVED / REJECTED`
- Admin / Project Manager approves
- Leave and overtime history per employee

### 12. Bug Management

#### Bug Entry Fields
| Field | Details |
|-------|---------|
| Problem Title | Short title |
| Description | Full description |
| File Attachments | PDF, DOCX, XLSX, TXT, PNG/JPG/screenshots, MP4 videos |
| Project | Link to project |
| Task | Link to task (optional) |
| Module | Module/area of the system affected |
| Bug Assigned To | User responsible for the bug record |
| Responsible Developer | Developer assigned to fix |
| Billing Status | Billable / Non-Billable |
| Severity | Show Stopper / Critical / Major / Minor |
| Classification | See list below |
| Flag | Internal (found by QA, Team Lead, unit testing) / External (reported by client) |
| Is Reproducible | Always / Sometimes / Rarely / Unable / Never Tried / Not Applicable |
| Release Milestone | Milestone for planned fix release |
| Affected Milestone | Milestone where bug was introduced |
| Affected Build Version | Build version where bug exists |
| Fixed Build Version | Build version where bug was fixed |
| Reminder | None / Daily / 1 Day / 2 Days / 3 Days |
| Status | See list below |

#### Bug Status Values
| # | Status |
|---|--------|
| 1 | Open |
| 2 | Reopen |
| 3 | To Be Tested |
| 4 | In Progress |
| 5 | Closed |
| 6 | Acknowledge |
| 7 | Deferred |
| 8 | On Hold |

#### Bug Severity Values
| # | Severity |
|---|---------|
| 1 | Show Stopper |
| 2 | Critical |
| 3 | Major |
| 4 | Minor |

#### Bug Classification Values
| # | Classification |
|---|---------------|
| 1 | Security |
| 2 | Crash/Hang |
| 3 | Data Loss |
| 4 | Performance |
| 5 | UI/Usability |
| 6 | Other Bug |
| 7 | Feature (New) |
| 8 | Enhancement |
| 9 | Design |
| 10 | New Bug |
| 11 | Code Review |
| 12 | Unit Testing |
| 13 | Suggestion |
| 14 | Project Management |
| 15 | Existing Application |
| 16 | Calendly |
| 17 | Tommy |
| 18 | Neo |

#### Bug Reproducibility Values
| # | Value |
|---|-------|
| 1 | Always |
| 2 | Sometimes |
| 3 | Rarely |
| 4 | Unable |
| 5 | Never Tried |
| 6 | Not Applicable |

- Bug list with filters: status, severity, classification, project, milestone, flag (Internal/External), assignee
- My Bug Statistics: open/in-progress/resolved/closed counts with charts
- Bug count on project cards (as in existing PM TOOL)
- Reminder notifications per configured reminder setting

### 13. KPI Store (Digital Appraisal System)
Based on `Document/KPI/Digital Appraisal System.xlsx`:

| Category | Metric | Weightage |
|----------|--------|-----------|
| Delivery & Execution | Sprint Reliability (Story Points Delivered vs Committed) | 15% |
| Delivery & Execution | Delivery Timeliness (On-Time Tasks vs Total) | 15% |
| Delivery & Execution | Estimation Accuracy (Actual Hours vs Estimated) | 10% |
| Delivery & Execution | Throughput & Complexity (Valid PRs vs Generated) | 10% |
| Quality & Engineering Excellence | Internal Rework Ratio (Reopened vs Completed Tasks) | 5% |
| Quality & Engineering Excellence | Defect Leakage (Production Bugs) | 10% |
| Quality & Engineering Excellence | Engineering Hygiene (Best Practices, Security, Linting) | 5% |
| Ownership & Collaboration | Dependency & Agile Management (Standup Logs) | 5% |
| Ownership & Collaboration | Reporting & Documentation | 5% |
| Growth & Innovation | Learning Velocity (Upskilling Path) | 5% |
| Growth & Innovation | Automation / Innovation (Tangible Improvements) | 5% |
| Behaviour & Reliability | Attendance | 5% |
| Behaviour & Reliability | Positive Behaviour & Conduct | 5% |
| **Total** | | **100%** |

Rating grades: **A** (90%+), **B** (75–89%), **C** (60–74%), **D** (<60%)

- Admin/Project Manager records KPI scores per employee per appraisal period
- Auto-calculate total score and grade
- KPI history per employee
- Super User can configure metric weightages

### 14. Reports
- Project summary report (tasks, timesheets, bugs per project)
- Team productivity report (hours logged, tasks completed per member)
- Task allocation report (daily/weekly allocation per employee)
- Bug report (open/closed by project, severity/classification breakdown, Internal vs External)
- Timesheet report (approved hours per project, per employee)
- KPI appraisal report (team scores, grades per period)
- Export to PDF / CSV

### 15. Dashboard (Taskee-style)
- Greeting + date (e.g. "Good Morning, Alex")
- Global search (search projects)
- Stat cards: Active Projects, Total Tasks, Assigned Tasks, Completed Tasks (with % change)
- Team Activity Summary bar chart (monthly, High/Low activity)
- My Task table: Project Details, Assign, Priority, Stage
- Today Task widget + Team Performance score
- Tasks Progress donut chart (Not Started, In Progress, On Review, Completed)
- "What's New" / Announcements section

---

## Prisma Schema Models

All models defined in `backend/prisma/schema.prisma`. PostgreSQL is the datasource.

| Model | Key Fields |
|-------|-----------|
| `User` | id, fullName, email, passwordHash, systemRole (enum), departmentId, shiftId, profilePhoto, phone, joinDate, isActive, createdAt |
| `Department` | id, name, code, description, isActive |
| `Shift` | id, name (Day/Afternoon/Night), startTime, endTime, workHours (8) |
| `Client` | id, name, contactPerson, email, phone, address, isActive |
| `Project` | id, name, code, clientId, departmentId, description, startDate, endDate, duration, cost, type (enum), status (enum), createdById |
| `ProjectMember` | id, projectId, userId, projectRole (enum), joinedAt |
| `Milestone` | id, projectId, description, deliveryNote, startDate, dueDate, responsibleUserId, status (enum) |
| `TaskList` | id, projectId, name, type (enum), sprintNumber, description |
| `Task` | id, projectId, taskListId, milestoneId, title, description, assignedToId, createdById, estimatedHours, actualHours, priority (enum), status (enum), billingStatus (enum), startDate, dueDate |
| `TaskAttachment` | id, taskId, fileName, filePath, fileType, fileSize, uploadedById, uploadedAt |
| `TaskComment` | id, taskId, userId, comment, createdAt |
| `TaskAllocation` | id, taskId, userId, date, allocatedHours |
| `Timesheet` | id, taskId, userId, date, hoursWorked, description, status (enum), approvedById |
| `LeaveLog` | id, userId, date, type (enum), hours, description, approvedById, status (enum) |
| `Bug` | id, projectId, taskId, module, title, description, assignedToId, responsibleDeveloperId, reportedById, billingStatus (enum), severity (enum), classification (enum), flag (enum), isReproducible (enum), releaseMilestoneId, affectedMilestoneId, affectedBuildVersion, fixedBuildVersion, reminderType (enum), status (enum), createdAt, resolvedAt |
| `BugAttachment` | id, bugId, fileName, filePath, fileType, fileSize, uploadedById, uploadedAt |
| `BugComment` | id, bugId, userId, comment, createdAt |
| `KpiRecord` | id, userId, period (YYYY-MM), category, metric, weightage, pointsGained, achieved, total, recordedById, createdAt |
| `Announcement` | id, title, content, createdById, createdAt |

### Prisma Enums

| Enum | Values |
|------|--------|
| `SystemRole` | SUPER_USER, ADMIN, EMPLOYEE |
| `ProjectRole` | PROJECT_MANAGER, TEAM_LEAD, DEVELOPER, QA, DESIGNER, DEVOPS |
| `ShiftType` | DAY, AFTERNOON, NIGHT |
| `ProjectType` | FIXED_PRICE, TIME_AND_MATERIAL, DEDICATED |
| `ProjectStatus` | ACTIVE, ARCHIVED |
| `MilestoneStatus` | NOT_STARTED, IN_PROGRESS, COMPLETED, DELAYED |
| `TaskListType` | GENERAL, PROJECT_MANAGEMENT, DEVELOPMENT, QA, SPRINT |
| `TaskPriority` | LOW, MEDIUM, HIGH, CRITICAL |
| `TaskStatus` | NOT_STARTED, IN_PROGRESS, ON_REVIEW, COMPLETED |
| `BillingStatus` | BILLABLE, NON_BILLABLE |
| `TimesheetStatus` | DRAFT, SUBMITTED, APPROVED, REJECTED |
| `LeaveType` | LEAVE, OVERTIME |
| `ApprovalStatus` | PENDING, APPROVED, REJECTED |
| `BugStatus` | OPEN, REOPEN, TO_BE_TESTED, IN_PROGRESS, CLOSED, ACKNOWLEDGE, DEFERRED, ON_HOLD |
| `BugSeverity` | SHOW_STOPPER, CRITICAL, MAJOR, MINOR |
| `BugClassification` | SECURITY, CRASH_HANG, DATA_LOSS, PERFORMANCE, UI_USABILITY, OTHER_BUG, FEATURE_NEW, ENHANCEMENT, DESIGN, NEW_BUG, CODE_REVIEW, UNIT_TESTING, SUGGESTION, PROJECT_MANAGEMENT, EXISTING_APPLICATION, CALENDLY, TOMMY, NEO |
| `BugFlag` | INTERNAL, EXTERNAL |
| `BugReproducible` | ALWAYS, SOMETIMES, RARELY, UNABLE, NEVER_TRIED, NOT_APPLICABLE |
| `BugReminderType` | NONE, DAILY, ONE_DAY, TWO_DAYS, THREE_DAYS |

---

## API Endpoints

All endpoints prefixed with `/api/v1`. Documented via **Swagger UI** at `/swagger`.

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/register

GET    /api/v1/users                              [SuperUser, Admin]
POST   /api/v1/users                              [SuperUser, Admin]
GET    /api/v1/users/{id}                         [SuperUser, Admin, Owner]
PUT    /api/v1/users/{id}                         [SuperUser, Admin]
DELETE /api/v1/users/{id}                         [SuperUser]

GET    /api/v1/departments                        [All]
POST   /api/v1/departments                        [SuperUser, Admin]
PUT    /api/v1/departments/{id}                   [SuperUser, Admin]
DELETE /api/v1/departments/{id}                   [SuperUser]

GET    /api/v1/shifts                             [All]
POST   /api/v1/shifts                             [SuperUser, Admin]
PUT    /api/v1/shifts/{id}                        [SuperUser, Admin]

GET    /api/v1/clients                            [All]
POST   /api/v1/clients                            [SuperUser, Admin]
PUT    /api/v1/clients/{id}                       [SuperUser, Admin]
DELETE /api/v1/clients/{id}                       [SuperUser]

GET    /api/v1/projects                           [All — filtered by role]
POST   /api/v1/projects                           [SuperUser, Admin]
GET    /api/v1/projects/{id}                      [All]
PUT    /api/v1/projects/{id}                      [SuperUser, Admin, ProjectManager]
DELETE /api/v1/projects/{id}                      [SuperUser]
POST   /api/v1/projects/{id}/members              [SuperUser, Admin, ProjectManager]
PUT    /api/v1/projects/{id}/members/{userId}     [SuperUser, Admin, ProjectManager]
DELETE /api/v1/projects/{id}/members/{userId}     [SuperUser, Admin, ProjectManager]

GET    /api/v1/projects/{id}/milestones           [All]
POST   /api/v1/projects/{id}/milestones           [SuperUser, Admin, ProjectManager]
PUT    /api/v1/milestones/{id}                    [SuperUser, Admin, ProjectManager]
DELETE /api/v1/milestones/{id}                    [SuperUser, Admin, ProjectManager]

GET    /api/v1/projects/{id}/task-lists           [All]
POST   /api/v1/projects/{id}/task-lists           [SuperUser, Admin, ProjectManager, TeamLead]
PUT    /api/v1/task-lists/{id}                    [SuperUser, Admin, ProjectManager, TeamLead]
DELETE /api/v1/task-lists/{id}                    [SuperUser, Admin, ProjectManager]

GET    /api/v1/projects/{id}/tasks                [All]
POST   /api/v1/projects/{id}/tasks                [SuperUser, Admin, ProjectManager, TeamLead]
GET    /api/v1/tasks/{id}                         [All]
PUT    /api/v1/tasks/{id}                         [SuperUser, Admin, ProjectManager, TeamLead, Assignee]
DELETE /api/v1/tasks/{id}                         [SuperUser, Admin, ProjectManager]
PUT    /api/v1/tasks/{id}/assign                  [SuperUser, Admin, ProjectManager, TeamLead]
PUT    /api/v1/tasks/{id}/status                  [SuperUser, Admin, ProjectManager, TeamLead, Assignee]
POST   /api/v1/tasks/{id}/attachments             [All — project members]
DELETE /api/v1/tasks/{id}/attachments/{attachId}  [SuperUser, Admin, Uploader]
POST   /api/v1/tasks/{id}/comments                [All — project members]

GET    /api/v1/task-allocations                   [All — filtered by role]
POST   /api/v1/task-allocations                   [SuperUser, Admin, ProjectManager, TeamLead]
GET    /api/v1/task-allocations/user/{userId}     [SuperUser, Admin, ProjectManager, TeamLead, Owner]
GET    /api/v1/task-allocations/check             [SuperUser, Admin, ProjectManager, TeamLead]

GET    /api/v1/timesheets                         [All — filtered by role]
POST   /api/v1/timesheets                         [Employee]
PUT    /api/v1/timesheets/{id}                    [Owner (Draft only)]
DELETE /api/v1/timesheets/{id}                    [Owner (Draft only)]
PUT    /api/v1/timesheets/{id}/submit             [Owner]
PUT    /api/v1/timesheets/{id}/approve            [SuperUser, Admin, ProjectManager]
PUT    /api/v1/timesheets/{id}/reject             [SuperUser, Admin, ProjectManager]

GET    /api/v1/leave-logs                         [All — filtered by role]
POST   /api/v1/leave-logs                         [Employee]
PUT    /api/v1/leave-logs/{id}                    [Owner (Pending only)]
PUT    /api/v1/leave-logs/{id}/approve            [SuperUser, Admin, ProjectManager]
PUT    /api/v1/leave-logs/{id}/reject             [SuperUser, Admin, ProjectManager]

GET    /api/v1/bugs                               [All — filtered by role/project]
POST   /api/v1/bugs                               [All — project members]
GET    /api/v1/bugs/{id}                          [All — project members]
PUT    /api/v1/bugs/{id}                          [SuperUser, Admin, ProjectManager, TeamLead, QA, Assignee]
DELETE /api/v1/bugs/{id}                          [SuperUser, Admin]
POST   /api/v1/bugs/{id}/attachments              [All — project members]
DELETE /api/v1/bugs/{id}/attachments/{attachId}   [SuperUser, Admin, Uploader]
POST   /api/v1/bugs/{id}/comments                 [All — project members]

GET    /api/v1/kpi                                [All — filtered by role]
POST   /api/v1/kpi                                [SuperUser, Admin, ProjectManager]
PUT    /api/v1/kpi/{id}                           [SuperUser, Admin, ProjectManager]
DELETE /api/v1/kpi/{id}                           [SuperUser, Admin]
GET    /api/v1/kpi/summary/{userId}               [SuperUser, Admin, ProjectManager, Owner]

GET    /api/v1/reports/projects                   [SuperUser, Admin, ProjectManager]
GET    /api/v1/reports/productivity               [SuperUser, Admin, ProjectManager]
GET    /api/v1/reports/task-allocation            [SuperUser, Admin, ProjectManager, TeamLead]
GET    /api/v1/reports/timesheets                 [SuperUser, Admin, ProjectManager]
GET    /api/v1/reports/bugs                       [SuperUser, Admin, ProjectManager, QA]
GET    /api/v1/reports/kpi                        [SuperUser, Admin, ProjectManager]

GET    /api/v1/dashboard/stats                    [All — filtered by role]
GET    /api/v1/dashboard/activity                 [All — filtered by role]

GET    /api/v1/announcements                      [All]
POST   /api/v1/announcements                      [SuperUser, Admin]
DELETE /api/v1/announcements/{id}                 [SuperUser, Admin]

GET    /api/v1/settings/bug-classifications       [All]
PUT    /api/v1/settings/bug-classifications       [SuperUser]
GET    /api/v1/settings/kpi-weights               [All]
PUT    /api/v1/settings/kpi-weights               [SuperUser]
```

---

## Project Structure

```
project-management-system/
├── PLAN.md
├── PROCEDURE.md
├── docker-compose.yml                   ← PostgreSQL + pgAdmin
├── .env.example
│
├── backend/                             ← NestJS application
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env                             ← DATABASE_URL, JWT_SECRET, etc.
│   │
│   ├── prisma/
│   │   ├── schema.prisma                ← all models + enums defined here
│   │   ├── seed.ts                      ← seed: depts, shifts, clients, users, projects
│   │   └── migrations/                  ← auto-generated by prisma migrate dev
│   │
│   └── src/
│       ├── main.ts                      ← bootstrap, Swagger setup, global pipes
│       ├── app.module.ts                ← root module
│       │
│       ├── common/
│       │   ├── decorators/              ← @CurrentUser(), @Roles(), @Public()
│       │   ├── guards/                  ← JwtAuthGuard, RolesGuard, ProjectRoleGuard
│       │   ├── interceptors/            ← TransformInterceptor, LoggingInterceptor
│       │   ├── filters/                 ← GlobalExceptionFilter
│       │   ├── pipes/                   ← ValidationPipe (class-validator)
│       │   └── storage/
│       │       └── file-storage.service.ts  ← Multer file upload/download
│       │
│       ├── prisma/
│       │   └── prisma.service.ts        ← PrismaClient wrapper (singleton)
│       │
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts       ← login, refresh, logout, register, forgot/reset
│       │   ├── auth.service.ts
│       │   ├── strategies/
│       │   │   ├── jwt.strategy.ts
│       │   │   └── local.strategy.ts
│       │   └── dto/
│       │       ├── login.dto.ts
│       │       ├── register.dto.ts
│       │       └── reset-password.dto.ts
│       │
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   └── dto/
│       │
│       ├── departments/
│       │   ├── departments.module.ts
│       │   ├── departments.controller.ts
│       │   ├── departments.service.ts
│       │   └── dto/
│       │
│       ├── shifts/
│       │   ├── shifts.module.ts
│       │   ├── shifts.controller.ts
│       │   ├── shifts.service.ts
│       │   └── dto/
│       │
│       ├── clients/
│       │   ├── clients.module.ts
│       │   ├── clients.controller.ts
│       │   ├── clients.service.ts
│       │   └── dto/
│       │
│       ├── projects/
│       │   ├── projects.module.ts
│       │   ├── projects.controller.ts
│       │   ├── projects.service.ts
│       │   └── dto/
│       │
│       ├── milestones/
│       │   ├── milestones.module.ts
│       │   ├── milestones.controller.ts
│       │   ├── milestones.service.ts
│       │   └── dto/
│       │
│       ├── task-lists/
│       │   ├── task-lists.module.ts
│       │   ├── task-lists.controller.ts
│       │   ├── task-lists.service.ts
│       │   └── dto/
│       │
│       ├── tasks/
│       │   ├── tasks.module.ts
│       │   ├── tasks.controller.ts
│       │   ├── tasks.service.ts
│       │   └── dto/
│       │
│       ├── task-allocations/
│       │   ├── task-allocations.module.ts
│       │   ├── task-allocations.controller.ts
│       │   ├── task-allocations.service.ts   ← 8h daily cap validation logic
│       │   └── dto/
│       │
│       ├── timesheets/
│       │   ├── timesheets.module.ts
│       │   ├── timesheets.controller.ts
│       │   ├── timesheets.service.ts
│       │   └── dto/
│       │
│       ├── leave-logs/
│       │   ├── leave-logs.module.ts
│       │   ├── leave-logs.controller.ts
│       │   ├── leave-logs.service.ts
│       │   └── dto/
│       │
│       ├── bugs/
│       │   ├── bugs.module.ts
│       │   ├── bugs.controller.ts
│       │   ├── bugs.service.ts
│       │   └── dto/
│       │
│       ├── kpi/
│       │   ├── kpi.module.ts
│       │   ├── kpi.controller.ts
│       │   ├── kpi.service.ts
│       │   └── dto/
│       │
│       ├── reports/
│       │   ├── reports.module.ts
│       │   ├── reports.controller.ts
│       │   └── reports.service.ts
│       │
│       ├── dashboard/
│       │   ├── dashboard.module.ts
│       │   ├── dashboard.controller.ts
│       │   └── dashboard.service.ts
│       │
│       ├── announcements/
│       │   ├── announcements.module.ts
│       │   ├── announcements.controller.ts
│       │   ├── announcements.service.ts
│       │   └── dto/
│       │
│       └── notifications/
│           ├── notifications.module.ts
│           └── notifications.gateway.ts  ← Socket.io gateway (bug reminders)
│
└── frontend/
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/
        │   ├── client.ts                ← Axios instance + JWT interceptors
        │   ├── auth.api.ts
        │   ├── users.api.ts
        │   ├── departments.api.ts
        │   ├── shifts.api.ts
        │   ├── clients.api.ts
        │   ├── projects.api.ts
        │   ├── milestones.api.ts
        │   ├── taskLists.api.ts
        │   ├── tasks.api.ts
        │   ├── taskAllocations.api.ts
        │   ├── timesheets.api.ts
        │   ├── leaveLogs.api.ts
        │   ├── bugs.api.ts
        │   ├── kpi.api.ts
        │   ├── reports.api.ts
        │   └── dashboard.api.ts
        ├── components/
        │   ├── ui/           ← Button, Input, Card, Table, Badge, Modal, Select, Avatar, FileUpload
        │   ├── layout/       ← AppLayout, Sidebar, Topbar
        │   └── shared/       ← ProtectedRoute, RoleGuard, PageHeader, Spinner, StatCard
        ├── features/
        │   ├── auth/         ← LoginPage, ForgotPasswordPage, RegisterPage
        │   ├── dashboard/    ← Overview, stat cards, activity chart, task table, donut chart
        │   ├── users/        ← UserList, UserForm
        │   ├── departments/  ← DepartmentList, DepartmentForm
        │   ├── clients/      ← ClientList, ClientForm
        │   ├── projects/     ← ProjectList (card grid), ProjectForm, ProjectDetail, MemberManager
        │   ├── milestones/   ← MilestoneList, MilestoneForm
        │   ├── taskLists/    ← TaskListManager
        │   ├── tasks/        ← TaskList, TaskForm, TaskDetail, KanbanBoard, FileAttachments
        │   ├── taskAllocations/ ← AllocationCalendar, AllocationForm, TeamCapacityView
        │   ├── timesheets/   ← TimesheetCalendar, TimesheetForm, ApprovalList
        │   ├── leaveLogs/    ← LeaveForm, LeaveList, ApprovalList
        │   ├── bugs/         ← BugList, BugForm, BugDetail, BugStats, FileAttachments
        │   ├── kpi/          ← KpiForm, KpiSummary, KpiHistory
        │   └── reports/      ← ReportFilters, ReportTable, ExportButton
        ├── hooks/
        ├── store/            ← authStore (Zustand)
        └── types/            ← shared TypeScript types (mirroring Prisma generated types)
```

---

## Mandatory Development Procedure

> Every feature MUST follow all 10 steps in order. See `PROCEDURE.md` for full details.

| Step | Action | Where |
|------|--------|--------|
| 1 | **Prisma Model** — add/update model + enums in schema.prisma | `prisma/schema.prisma` |
| 2 | **Migration** — `npx prisma migrate dev --name <name>` | `prisma/migrations/` |
| 3 | **DTOs** — `create-<x>.dto.ts`, `update-<x>.dto.ts` with class-validator decorators | `src/<feature>/dto/` |
| 4 | **Service** — `<feature>.service.ts` using PrismaService (business logic) | `src/<feature>/` |
| 5 | **Controller** — `<feature>.controller.ts` with `@UseGuards`, `@Roles()`, route handlers | `src/<feature>/` |
| 6 | **Module** — wire controller + service in `<feature>.module.ts`, import in AppModule | `src/<feature>/`, `app.module.ts` |
| 7 | **API Client** — Axios wrapper in frontend | `frontend/src/api/` |
| 8 | **Components** — reusable React UI components | `frontend/src/features/<feature>/components/` |
| 9 | **Page/View** — full React page | `frontend/src/features/<feature>/pages/` |
| 10 | **Integration + Seed** — wire route in App.tsx, add seed data to seed.ts | `App.tsx`, `prisma/seed.ts` |

---

## Implementation Phases

### Phase 1 — Foundation
- [ ] `docker-compose.yml` — PostgreSQL + pgAdmin
- [ ] `PROCEDURE.md` — development procedure doc
- [ ] `nest new backend` — NestJS scaffold
- [ ] Install core packages: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `@nestjs/swagger`, `class-validator`, `class-transformer`, `multer`, `@nestjs/websockets`, `socket.io`
- [ ] Prisma setup: `prisma init`, full `schema.prisma` with all models + enums, initial migration
- [ ] `PrismaService` singleton module
- [ ] JWT auth: `AuthModule`, `JwtStrategy`, `LocalStrategy`, `JwtAuthGuard`
- [ ] RBAC: `@Roles()` decorator + `RolesGuard` for SUPER_USER, ADMIN, EMPLOYEE
- [ ] `ProjectRoleGuard` — checks user's role within a specific project
- [ ] Global `ValidationPipe` (class-validator), `GlobalExceptionFilter`, `TransformInterceptor`
- [ ] Swagger setup in `main.ts` with JWT Bearer support
- [ ] CORS for `http://localhost:5173`
- [ ] `FileStorageService` — Multer disk storage for task/bug attachments
- [ ] `prisma/seed.ts` — seed data:
  - 3 Departments (Digital, Mobile, SalesForce)
  - 3 Shifts (Day, Afternoon, Night)
  - 3 Clients
  - 1 Super User, 2 Admins, 2 Project Managers, 2 Team Leads, 5 Developers, 3 QAs
  - 3 Projects with milestones, task lists, tasks
- [ ] Frontend: `npm create vite` — React + TypeScript + Tailwind scaffold
- [ ] Axios client with JWT interceptors
- [ ] Zustand auth store
- [ ] AppLayout: Sidebar (client/project navigation, role-aware links) + Topbar
- [ ] `ProtectedRoute` + `RoleGuard` components
- [ ] Login page (Taskee-style)
- [ ] Forgotten password + reset flow
- [ ] Sign-up page (pending approval)

### Phase 2 — Core Setup (Departments, Shifts, Clients, Users)
- [ ] Department CRUD
- [ ] Shift configuration
- [ ] Client CRUD
- [ ] User management (create, edit, assign department + shift)

### Phase 3 — Projects & Milestones
- [ ] Project list page (card grid — Taskee style)
- [ ] Projects Summary sidebar panel
- [ ] Project create/edit form (with client, department, cost, type)
- [ ] Project member management (with project role assignment)
- [ ] Project detail page
- [ ] Milestone CRUD per project
- [ ] Milestone progress tracking

### Phase 4 — Task Lists & Tasks
- [ ] Task List management per project (General, Sprint, QA, PM types)
- [ ] Task create/edit form (with task list, milestone, billing status selectors)
- [ ] File attachment upload/download on tasks
- [ ] Task list + kanban board views
- [ ] Task assignment to team member
- [ ] Task status transitions
- [ ] Task comments
- [ ] My Task widget on dashboard

### Phase 5 — Task Allocation Tracking
- [ ] Task allocation form (assign hours per user per date)
- [ ] 8-hour daily cap validation (warn/block on over-allocation)
- [ ] Employee allocation calendar view
- [ ] Team capacity view (manager sees all team allocations)
- [ ] Task allocation report

### Phase 6 — Timesheet
- [ ] Timesheet entry form (log hours against task)
- [ ] My Timesheet calendar/list view
- [ ] Submit for approval flow
- [ ] Admin / Project Manager approval/rejection
- [ ] Actual vs estimated hours comparison

### Phase 7 — Leave / Overtime Log
- [ ] Leave/overtime entry form
- [ ] My log history
- [ ] Admin / Project Manager approval flow

### Phase 8 — Bug Management
- [ ] Bug entry form (all fields: title, description, attachments, severity, classification, flag, reproducibility, milestones, build versions, reminder, module)
- [ ] Bug list with full filter set (status, severity, classification, flag, project, assignee)
- [ ] Bug file attachment upload/download
- [ ] Bug assignment to developer
- [ ] Bug status lifecycle (8 statuses)
- [ ] Bug comments
- [ ] Reminder notification system
- [ ] My Bug Statistics page (charts: by status, severity, classification)
- [ ] Bug count on project cards

### Phase 9 — KPI Store
- [ ] KPI entry form (per employee per period)
- [ ] KPI categories and metrics (from Digital Appraisal System)
- [ ] Auto-calculated total score and grade
- [ ] KPI summary per employee per period
- [ ] KPI history table
- [ ] Configurable metric weightages (Super User)

### Phase 10 — Dashboard & Reports
- [x] Role-based stats dashboard — fully live (F-026):
  - Stat cards: Active Projects, Total Tasks, Assigned Tasks, Completed Tasks (live DB)
  - Team Activity Summary bar chart (real 12-month WorkItem data)
  - My Task table (Project Details, Assign, Priority, Stage) — live DB
  - Today Task widget — real WorkItem due today for logged-in user
  - Team Performance score — real avg completion ratio
  - Projects Progress panel (Super User / Admin only) — per-project: team size, tasks, bugs, progress %
  - Tasks Progress donut chart (live task counts)
- [x] Project summary report (F-021)
- [x] Task allocation report (F-021)
- [x] Timesheet report (F-021)
- [x] PDF / CSV export (F-021)
- [ ] Bug report (with Internal vs External breakdown)
- [ ] KPI appraisal report
- [ ] Announcements / What's New
- [ ] Toast notifications

---

### Phase 11 — Leave Management ✅ COMPLETE
- [x] **F-025** — Leave / overtime application form (date, type, hours, description)
- [x] **F-025** — My log history view with status badges
- [x] **F-025** — Admin / Project Manager approval / rejection / cancel flow
- [x] **F-025** — `LeaveLog` model: `userId`, `date`, `type` (LEAVE/OVERTIME), `hours`, `status` (PENDING/APPROVED/REJECTED/CANCELLED)
- [x] **F-025** — RBAC: EMPLOYEE sees own logs; ADMIN/SUPER_USER see all
- [x] **F-025** — 33 tests (19 BE + 14 FE + 14 E2E)

---

### Phase 12 — JIRA Kanban Board + Dynamic KPI & Reports ✅ COMPLETE
- [x] **F-022** — Full JIRA-style board, Sprint manager, WorkItem hierarchy, TimesheetEntry ("Log Work"), WorkItemModal 5 tabs, drag-and-drop, board filters
- [x] **F-023** — Live KPI (13 metrics auto-computed), Monthly Capacity matrix, 6 live report endpoints
- [x] **F-024** — Two-panel WorkItemModal, Phase 9 Bug fields on WorkItem, 4 new enums, parent selector, milestone dropdowns
- [x] **F-026** — Fully live dashboard: 12-month activity chart, Projects Progress panel, Today's Task, Team Performance score

---

### Phase 13 — Enhancements, Polish & Platform Features ✅ COMPLETE
- [x] **F-027** — Project Team Activity Dashboard — per-project activity feed, team productivity metrics
- [x] **F-028** — Dynamic Reports KPI RBAC — API-level data scoping for all report/KPI endpoints
- [x] **F-029** — Kanban Board Enhancements — QA workflow, test case type, client filter, bulk team add, global spinner
- [x] **F-030** — AI Chat SQL Agent — Ollama LLM, keyword pre-router, natural language project queries, chat widget
- [x] **F-031** — Work Item Display ID — project-prefix + sequential number (e.g. HOR10001), back-fill migration
- [x] **F-032** — Edit Profile Page — avatar upload, password change, gear-icon dropdown, `/profile` route
- [x] **F-033** — Project Role-Based Access Control — full `ProjectRoleGuard` enforcement, frontend RBAC gating
- [x] **F-034** — User Activity Audit Log — append-only audit trail, fire-and-forget writes, RBAC-scoped read, Activity Log page

---

### Phase 14 — Infrastructure & DevOps
- [ ] **F-035** — CI/CD On-Premise Deployment — self-hosted GitHub Actions runner, automated deploy workflow, health check integration
- [ ] Docker Compose full stack bundle (PostgreSQL + pgAdmin + backend + frontend)
- [ ] Environment variable hardening (`.env.example`, secrets management)
- [ ] Socket.io notification gateway (bug reminders, real-time updates)

---

### Phase 15 — Smart Email Notifications & Workflow Automation

> **Guiding principle:** 100% free stack — NestJS `@nestjs/schedule` + Brevo REST API (300 emails/day) + Groq API. No paid services.

- [x] **F-037 — Forgot Password Email Flow** ✅
  - `PasswordResetToken` Prisma model (token, userId, expiresAt, usedAt)
  - `POST /auth/forgot-password` — generates token, sends branded HTML email via Brevo
  - `POST /auth/reset-password` — validates token, hashes new password, revokes all refresh tokens
  - `ResetPasswordPage` frontend at `/reset-password?token=xxx`
  - Token expires in 1 hour; previous unused tokens invalidated on new request

- [ ] **F-038 — Email Notification Infrastructure**
  - Extend `EmailModule` with generic `sendEmail(to, subject, html)` method
  - Reusable branded HTML template wrapper (header/footer consistent with reset email)
  - `BREVO_API_KEY`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` env vars (already in `.env`)
  - Foundation used by all subsequent notification features

- [ ] **F-039 — Task Deadline & Timesheet Reminders**
  - Install `@nestjs/schedule` + `@types/cron`
  - `NotificationsCronService` with two cron jobs:
    - **Daily 9 AM** — query tasks where `dueDate = tomorrow AND status != COMPLETED` → email each assignee
    - **Friday 4 PM** — query employees with 0 `TimesheetEntry` hours this week → send reminder email
  - Both jobs use `EmailService` for delivery
  - RBAC: emails sent only to active users

- [ ] **F-040 — Overdue Task Escalation & Weekly Project Health Report**
  - **Daily cron** — tasks where `dueDate < today AND status != COMPLETED` overdue ≥ 2 days → group by project → email each Project Manager with table of overdue tasks (assignee, task title, days overdue)
  - **Monday 8 AM cron** — per-project summary email to PM: tasks completed vs pending vs overdue, open bug count, milestone status, team size
  - Skip projects with no assigned PM

- [ ] **F-041 — New User Welcome Email & Monthly KPI Digest**
  - **Event hook** — `UsersService.create()` calls `EmailService` after user created → branded welcome email (name, login link, role)
  - **1st of month cron** — for each employee, compile KPI scores for previous month → email to their manager/PM and CC employee
  - **Monthly leave report** — email admin/super-user: team leave usage summary (total days taken per employee)

- [ ] **F-042 — AI-Powered Smart Automation (Groq)**
  - **Smart task description** — `WorkItemsService.create()` hook: if `description.length < 30` → call Groq API to expand into detailed description (steps, acceptance criteria)
  - **Blocker detection cron** — daily scan of `WorkItemComment` text for keywords (blocked, stuck, waiting on, can't proceed) → group by project → email PM with list of flagged items + comment excerpt
  - **Sprint planning suggestion** — new endpoint `POST /sprints/:id/suggest` — Groq analyses open backlog items, team velocity from last 2 sprints, member count → returns ranked list of suggested items with reasoning

---

## End-to-End User Journeys

```
1. Super User / Admin
   → Set up Departments (Digital, Mobile, SalesForce)
   → Set up Shifts (Day, Afternoon, Night)
   → Add Clients
   → Create Users (assign department + shift)
   → Create Projects (link to client + department)
   → View all reports and KPI dashboards

2. Project Manager (Employee role within a project)
   → Add team members to project, assign project roles
   → Create Milestones (prototypes, Phase-1, API delivery, mobile app)
   → Create Task Lists (Sprint-1, Sprint-2, General, QA)
   → Create Tasks under task lists, assign to team members
   → Monitor task allocation (ensure no one exceeds 8h/day)
   → Approve / reject timesheets and leave logs
   → Record KPI scores for team at end of appraisal period
   → View project-level reports

3. Team Lead (Employee role within a project)
   → Manage sprint task lists
   → Create and assign tasks to Developers
   → Review task progress
   → Log bugs found during code review / unit testing (Flag: Internal)
   → Monitor team allocation calendar

4. Developer (Employee)
   → View assigned tasks on dashboard
   → Update task status: Not Started → In Progress → On Review → Completed
   → Log timesheet entries against tasks and submit for approval
   → Log leave / overtime
   → Log bugs found
   → View own KPI score and grade

5. QA (Employee)
   → View project tasks
   → Log bugs against tasks (with full classification, severity, flag: External if client-reported)
   → Update bug status: Open → In Progress → To Be Tested → Closed
   → View bug statistics and charts per project
   → Log timesheet entries
   → View own KPI score
```

---

## Getting Started (after build)

```bash
# 1. Start PostgreSQL
docker-compose up -d

# 2. Setup backend (NestJS)
cd backend
npm install
cp .env.example .env              # set DATABASE_URL, JWT_SECRET
npx prisma migrate dev            # run migrations
npx prisma db seed                # seed departments, shifts, clients, users, projects
npm run start:dev                 # API on http://localhost:3000
                                  # Swagger at http://localhost:3000/api

# 3. Setup frontend
cd frontend
npm install
npm run dev                       # React app on http://localhost:5173
```

---

*Plan version: 5.0 — Updated: 2026-06-09 | Backend: NestJS + Prisma + PostgreSQL | 37 features tracked (F-001 – F-037 complete, F-038–F-042 planned)*
