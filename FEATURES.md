# PMS — Feature Tracker

> Last updated: 2026-06-03 (F-034 complete, F-035 pending)
> ~~Strikethrough~~ = completed and in production. Plain text = pending development.

---

## Phase 1 — Foundation

- ~~`docker-compose.yml` — PostgreSQL + pgAdmin service definition~~
- ~~`PROCEDURE.md` — development procedure document~~
- ~~NestJS backend scaffold (`nest new backend`)~~
- ~~Core packages installed: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `@nestjs/swagger`, `class-validator`, `class-transformer`~~
- ~~Prisma setup: `prisma init`, schema with `User` + `RefreshToken` + `CompanySettings` + `PortalConfig` models~~
- ~~`PrismaService` singleton module~~
- ~~JWT authentication: `AuthModule`, `JwtStrategy`, `LocalStrategy`, `JwtAuthGuard`~~
- ~~RBAC: `@Roles()` decorator + `RolesGuard` for SUPER_USER, ADMIN, EMPLOYEE~~
- ~~Global `ValidationPipe` (class-validator), `GlobalExceptionFilter`, `TransformInterceptor`~~
- ~~Swagger setup in `main.ts` with JWT Bearer support (available at `/api`)~~
- ~~CORS configured for `http://localhost:5173`~~
- ~~`prisma/seed.ts` — seed data: 3 Departments, 3 Shifts, 3 Clients, 1 Super User + Admins + Employees, Projects~~
- ~~Frontend: Vite + React 18 + TypeScript + Tailwind CSS scaffold~~
- ~~Axios client with JWT access/refresh token interceptors~~
- ~~Zustand auth store (persisted to localStorage)~~
- ~~`AppLayout` — Sidebar (role-aware nav) + Topbar~~
- ~~Sidebar collapse / expand toggle (persisted to localStorage)~~
- ~~Topbar — Welcome greeting, date, bell icon, gear icon → Settings~~
- ~~`ProtectedRoute` component (redirects unauthenticated users to login)~~
- ~~Login page (Taskee-style, JWT + Remember Me)~~
- ~~"Coming Soon" placeholder page for all pending modules~~
- Extend Prisma schema with all remaining models (Project, Task, Bug, etc. — see PLAN.md)
- `FileStorageService` — Multer disk storage for task/bug attachments
- ~~`ProjectRoleGuard` — checks user's project-level role (Project Manager, Team Lead, etc.)~~
- Forgotten password flow (email OTP / reset link)
- Sign-up / registration page (pending Admin approval)

---

## Phase 2 — Settings

- ~~**Company Settings** — companyName, address, timezone, back-date log, email domains — stored in `company_settings` table~~
- ~~**Portal Configuration** — date/time format, task duration unit, first day of week, business hours, working days — stored in `portal_config` table~~
- ~~**User Settings** — list all users, change system role inline (saves to DB), soft-deactivate users, search + pagination~~
- ~~Reusable `Pagination` component (25 records/page, smart ellipsis, persists across all listing pages)~~
- ~~Add User removed from User Settings — user creation belongs to the Users module (Phase 3)~~
- ~~**Shift Configuration** — DAY / AFTERNOON / NIGHT shifts with start/end time and work hours, seeded defaults, inline save per shift, Reset to Default — stored in `shifts` table~~
- ~~**Holiday Calendar Configuration** — inline inside Portal Configuration; year selector, add holiday (name, date, recurring), delete, recurring holidays projected into future years — stored in `holidays` table~~

---

## Phase 3 — Department, Client & User Management

- ~~**Department Management** — create / edit / deactivate departments; fully dynamic (no seeded data)~~
- ~~**Client Management** — create / edit / deactivate clients (name, contact, email, phone, address)~~
- ~~**User Management** — full CRUD: create user with Full Name, Email, Password, Department, Shift, System Role, Profile Photo, Phone, Join Date; edit, deactivate~~

---

## Phase 4 — Projects & Milestones

- ~~**Project Management** — card grid list with status filter; Summary panel (Active/Archive/On Hold/Dedicated/T&M/Fixed/Overdue counts); create/edit form (name, type, client, department, description, start/end date, budget); archive/restore; overdue indicator~~
- ~~**Project Member Management** — project detail page; add/remove team members; assign/change project roles (Project Manager, Team Lead, Developer, QA, Designer, DevOps); role-colour badges; avatar with initials fallback~~
- ~~**Milestone Management** — milestones section on project detail page; create/edit/delete milestones (description, delivery note, start/due dates, responsible user, status); status badges (NOT_STARTED / IN_PROGRESS / COMPLETED / DELAYED); RBAC gated write actions~~
- ~~Milestone progress tracking via linked tasks~~

---

## Phase 5 — Task Lists & Tasks

- ~~**Task List Management** — task list CRUD per project (General, Sprint, QA, PM, Development types; sprint number support); type-colour badges; RBAC gated write actions~~
- ~~**Task Management** — full CRUD per project; title, description, task list, milestone, assignee, estimated hours, priority (LOW/MEDIUM/HIGH/CRITICAL), status (NOT_STARTED/IN_PROGRESS/ON_REVIEW/COMPLETED), billing status, start/due dates; tasks grouped by task list on project detail page; cross-project FK validation; RBAC gated write actions~~
- ~~**Task Attachments & Comments** — file upload to tasks (PDF, DOCX, XLSX, PNG, JPG, TXT, MP4; 10 MB max; ADMIN+); download via blob streaming; delete with disk cleanup; comments by any auth user; author/admin-only delete; TaskDetailModal with Details/Attachments/Comments tabs~~
- ~~**Task List View + Kanban Board View** — List/Board toggle on Project Detail Tasks section; Kanban board with 4 status columns (NOT_STARTED, IN_PROGRESS, ON_REVIEW, COMPLETED); task cards with title, priority badge, assignee, task list name; click to open TaskDetailModal; frontend-only feature~~
- ~~**My Task Widget — Live DB Data** — `DashboardService.getStats` updated to return live tasks assigned to the current user; tasksProgress counts from DB; stat cards (Active Projects, Total Tasks, Completed Tasks) from DB; all queries run in parallel via `Promise.all`~~

---

## Phase 6 — Task Allocation Tracking

- ~~**Task Allocation CRUD + 8h Daily Cap Validation** — `TaskAllocation` model (`@@unique([taskId, userId, date])`); `assertCap()` aggregate check throws `422` if daily 8h cap exceeded; P2002 → `409 Conflict`; write endpoints restricted to `PROJECT_MANAGER` / `TEAM_LEAD` via `ProjectRoleGuard` with `'allocation'` source; `GET /task-allocations/check` returns allocated + remaining hours; Task Allocations section on Project Detail page (Log Hours form, table with task/member/date/hours, edit/delete); 13 unit tests~~
- ~~**Employee Allocation Calendar View** — monthly calendar at `/allocations`; days colour-coded by total hours (green < 6h, yellow 6–7.5h, red 8h); progress bar per day; up to 3 task chips + "+N more"; SUPER_USER/ADMIN user dropdown; summary cards (total hours, days allocated, avg hrs/day); prev/next month + Today nav; Sidebar nav item; 14 frontend unit tests (buildCalendarWeeks, toLocalDateStr, dayColor, hoursBarColor)~~
- Team capacity view (manager sees all team member allocations)
- Task allocation report

---

## Phase 7 — Timesheet

- Timesheet entry form (log hours against a task, date, description)
- My Timesheet calendar / list view (weekly + monthly)
- Submit for approval flow
- Admin / Project Manager approval and rejection
- Actual vs estimated hours comparison per task / project

---

## Phase 8 — Leave / Overtime Log

- ~~**F-025 — Leave Management** — Apply / approve / reject / cancel leave and overtime logs; `LeaveLog` model (`userId`, `date`, `type` LEAVE/OVERTIME, `hours`, `status` PENDING/APPROVED/REJECTED/CANCELLED); `GET /leave-logs` (EMPLOYEE sees own, ADMIN/SUPER_USER sees all); `POST /leave-logs`; `PATCH /leave-logs/:id/approve` + `/reject` + `/cancel`; LeavePage with tabs (My Requests, All Requests for Admin); leave badge colours by status; capacity integration (leaves excluded from workload); 33 tests (19 BE + 14 FE + 14 E2E)~~
- Leave days excluded from timesheet tracking (8h deducted on leave days)

---

## Phase 9 — Bug Management

- Bug entry form — all fields: title, description, attachments, project, task, module, assigned to, responsible developer, billing status, severity, classification, flag (Internal / External), reproducibility, release milestone, affected milestone, build versions, reminder, status
- Bug list with full filter set (status, severity, classification, flag, project, milestone, assignee)
- File attachment upload / download on bugs
- Bug assignment to developer
- Bug status lifecycle (8 statuses: Open → Reopen → To Be Tested → In Progress → Closed → Acknowledge → Deferred → On Hold)
- Bug comments
- Reminder notification system (None / Daily / 1 Day / 2 Days / 3 Days) via Socket.io
- My Bug Statistics page (charts: by status, severity, classification)
- Bug count badge on project cards

---

## Phase 10 — KPI Store

- ~~**KPI Store — Digital Appraisal System** — team KPI dashboard at `/kpi`; 13 metrics, 5 categories, 100 pts, grades A/B/C/D; RadarChart (per-employee), BarChart (team category avg), PieChart (grade distribution); leaderboard top 5; expandable employee table with full metric detail panel; RBAC (Admin/SuperUser see team view, Employee sees own); 14 actual DB users with real UUIDs; 23/23 unit tests~~
-



---

## Phase 11 — Dashboard (Live Data) & Reports

- ~~**F-020** — Team Reports Dashboard (static data): 4 tabs (Team Productivity, KPI Appraisal, Project Summary, Bug Summary), Announcements widget on Dashboard, RBAC for ADMIN/EMPLOYEE views~~
- ~~**F-021** — Phase 11 Complete: Task Allocation tab, Timesheet tab, functional CSV export on all 6 report tabs, RBAC (ADMIN sees all 14 users, EMPLOYEE sees personal summary with allocation & timesheet)~~
- ~~Role-based dashboard with live DB data:~~
  - ~~Stat cards: Active Projects, Total Tasks, Assigned Tasks, Completed Tasks (with % change)~~
  - ~~Team Activity Summary bar chart (monthly, High/Low)~~
  - ~~My Task table (Project, Assignee, Priority, Stage)~~
  - ~~Today Task widget + Team Performance score~~
  - ~~Tasks Progress donut chart (Not Started / In Progress / On Review / Completed)~~
- ~~Project summary report (tasks, timesheets, bugs per project)~~
- ~~Task allocation report (daily/weekly per employee)~~
- ~~Timesheet report (approved hours per project/employee)~~
- ~~PDF / CSV export for all reports~~

---

## Phase 12 — JIRA Kanban Board + Dynamic KPI & Reports

- ~~**F-022 — JIRA Kanban Board** — Full JIRA-style project board at `/projects/:id/board`; 6 Kanban columns (TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, QA, QA_DONE); drag-and-drop via `@hello-pangea/dnd` with optimistic updates; Sprint model + Sprint Manager (create/edit/activate/delete sprints); WorkItem model with full hierarchy (Epic → Story → Task → SubTask → Bug) with RBAC; TimesheetEntry model ("Log Work" per item, JIRA-style); WorkItemModal (5 tabs: Details, Log Time, Comments, Attachments, Child Items); TypeBadge component; BoardToolbar with sprint/type/assignee/priority/search filters; removed `/allocations`, `/timesheets`, `/bugs` nav items; project cards now navigate to board; ProjectDetailPage "Open Board" link; 9 backend unit tests + 26 frontend unit tests; code review + security review HTML reports~~
- ~~**F-023 — Dynamic KPI + Reports + Monthly Capacity** — Replace all static KPI and Reports data with live DB queries; Analytics module (`GET /analytics/kpi`, 6 report endpoints); KPI Records module (admin monthly manual scores); Self-logs modules (leave-logs, learning-logs, innovation-logs); all 13 KPI metrics auto-computed from `WorkItem`/`TimesheetEntry` data; `KpiScoreEntryPanel` for admin input; Reports page 7th tab — Monthly Capacity matrix (employees × days, colour-coded: orange=holiday, gray=weekly-off, pink=leave, dark-blue=≥8h, amber=1–7.9h, light-green=available); sticky columns, horizontal scroll, today-highlight, hover tooltip, legend~~
- ~~**F-024 — JIRA Board Enhancement + Phase 9 Bug Management** — JIRA-style two-panel WorkItemModal (left: inline-editable title/description/child items/activity tabs; right: full properties sidebar with assignee dropdown + "Assign to me", inline label chips, bug details); Phase 9 Bug fields on WorkItem (bugFlag, bugReproducibility, bugStatus, module, responsibleUserId, billingStatus, affectedBuildVersion, fixedBuildVersion, reminderType, releaseMilestoneId, affectedMilestoneId) with 4 new Prisma enums; updated BugSeverity (SHOW_STOPPER added) + BugClassification (16 values); parent selector in CreateWorkItemModal for TASK/SUB_TASK/BUG; milestone dropdowns; ProjectDetailPage cleaned (Task Lists/Tasks/Allocations sections removed); Sidebar "Leave & OT" renamed to "Leaves Management"~~
- ~~**F-026 — Dynamic Dashboard & Project-wise Team Progress** — Fully live dashboard: activity chart replaced with real 12-month WorkItem creation/completion data; new `GET /dashboard/projects-progress` endpoint (SUPER_USER/ADMIN only) returns per-project: name, client, PM, team size, tasks (total/completed), open bugs, progress %; `ProjectProgressPanel` component with colour-coded progress bars; Today's Task widget wired to real WorkItem due today; team performance score from live avg completion ratio; all stat cards live from DB; 13/13 backend unit tests pass; no schema changes~~

---

## Phase 13 — Enhancements, Polish & Platform Features

- ~~**F-027 — Project Team Activity Dashboard** — Per-project activity feed and team productivity metrics; project-scoped `GET /projects/:id/activity` endpoint; ActivityFeed component with action timeline; project member contribution stats~~
- ~~**F-028 — Dynamic Reports KPI RBAC** — Reports and KPI pages enforce role-based data scoping at the API level; EMPLOYEE sees only own data; PROJECT_MANAGER/TEAM_LEAD see full project-team data; ADMIN/SUPER_USER see organisation-wide data~~
- ~~**F-029 — Kanban Board Enhancements** — QA workflow columns, test case work item type, client filter on board toolbar, bulk add team members, global loading spinner; board column configuration persisted per project~~
- ~~**F-030 — AI Chat SQL Agent** — Natural language query interface for project data; Ollama-powered local LLM; keyword pre-router skips LLM call for known query types; active project filter; board links in responses; `GET /ai/query` endpoint; chat widget in sidebar/topbar~~
- ~~**F-031 — Work Item Display ID** — Project-based prefix + sequential number display ID (e.g. `HOR10001`); `displayId` field on `WorkItem`; prefix derived from project name (alphabetic chars only); shown in board cards, modal breadcrumb, and search; migration adds `displayId` column and back-fills existing records~~
- ~~**F-032 — Edit Profile Page** — Gear icon in topbar dropdown opens `/profile`; avatar upload (S3/disk); password change (current + new + confirm); full name / phone / shift editable; `PATCH /users/me/profile` and `PATCH /users/me/password` endpoints; `EditProfilePage` component~~
- ~~**F-033 — Project Role-Based Access Control** — Full enforcement of `ProjectRoleGuard` across all project-scoped endpoints; DEVELOPER/QA receive `403` on delete-work-item, create-sprint, manage-members; `SUPER_USER`/`ADMIN` bypass all project-role checks; frontend hides Delete, Manage Sprint, Add Member buttons based on computed project role; `canDeleteWorkItem`, `canManageSprints`, `canEditColumns` props in `BoardPage`; 24 tests~~
- ~~**F-034 — User Activity Audit Log** — Append-only `audit_logs` table with `AuditAction` (14 values) and `AuditEntity` (5 values) enums; `AuditLogsService.log()` is fire-and-forget via `setImmediate()`; `@Global()` module injectable everywhere; login, work item CRUD, sprint CRUD, member changes, profile updates all emit events; `GET /audit-logs` RBAC-scoped (EMPLOYEE forced to own userId); Activity Log page at `/activity` (SUPER_USER/ADMIN only in sidebar) with filters and pagination; 24 tests (14 unit + 10 E2E)~~

---

## Phase 14 — Infrastructure & DevOps

- **F-035 — CI/CD On-Premise Deployment** — Self-hosted GitHub Actions runner setup; workflow for automated deploy to local/on-premise server; health check endpoint integration; deployment guide
- Docker Compose full stack bundle (PostgreSQL + pgAdmin + backend + frontend)
- Environment variable hardening (`.env.example`, secrets management)
- Production build optimisation (Vite build, NestJS dist)
- Socket.io notification gateway (bug reminders, real-time updates)
