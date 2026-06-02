# Requirements Document

Feature ID   : F-030
Feature Name : AI Chat — SQL Agent on Live PMS Data
Epic         : PMS AI Assistant
Priority     : High
Roles        : All authenticated users (RBAC-filtered responses)

---

## User Story

As a PMS user (any role), I want to ask natural language questions about my
project data — tasks, work items, sprints, milestones, bugs, and team workload —
so that I get instant, accurate answers without navigating multiple screens.

---

## Business Rules

BR-1 : The AI must never modify data. All Prisma queries are read-only (SELECT).
BR-2 : Every query must apply the same RBAC filters as the corresponding REST
        endpoint — employees see only their own data, PMs see their project data,
        Admins and Super Users see everything.
BR-3 : Sensitive fields (passwordHash, tokens) must never appear in AI responses.
BR-4 : All DB queries must use Prisma parameterised queries — no raw SQL string
        concatenation.
BR-5 : The AI must hold up to the last 10 conversation turns in context for
        multi-turn dialogue.
BR-6 : The AI backend must respond within 30 seconds or return a timeout error.
BR-7 : Ollama endpoint, API key, and model name must be configurable via
        environment variables (AI_BASE_URL, AI_API_KEY, AI_MODEL).
BR-8 : Ollama host must be configurable via AI_BASE_URL env var so the URL can
        be changed without code changes (e.g. local vs remote Ollama instance).
BR-9 : Rate limiting must be applied to POST /api/v1/ai/chat (max 30 req/min
        per user).

---

## Acceptance Criteria

AC-1  : A user can type a message in the chat widget and receive a natural
         language answer from the AI.
AC-2  : "What tasks are overdue?" returns work items where dueDate < NOW() and
         status not in [QA_DONE], scoped to the user's RBAC context.
AC-3  : "What blockers exist in Sprint X?" returns work items with status
         BLOCKED for the named sprint.
AC-4  : "Show project progress" returns per-project completion percentage
         (completed items / total items).
AC-5  : "Who has the highest workload?" returns the top assignees ranked by
         open work item count.
AC-6  : "Summarize work completed this week" returns work items where
         completedAt >= Monday of the current week.
AC-7  : "Which milestones are delayed?" returns milestones with status = DELAYED.
AC-8  : "Show bug summary" returns work items of type BUG grouped by severity
         (SHOW_STOPPER, BLOCKER, CRITICAL, MAJOR, MINOR, TRIVIAL).
AC-9  : "What is the velocity of Sprint X?" returns story points committed vs
         delivered for that sprint.
AC-10 : AI responses include source references (type + id + title) so the
         frontend can render clickable links to the relevant tasks/work items.
AC-11 : RBAC is enforced — an Employee only receives data from their own
         assigned work; a Project Manager receives data from their projects;
         Admin/Super User receives system-wide data.
AC-12 : The chat widget is accessible as a floating button on all authenticated
         pages and opens as a slide-in panel.
AC-13 : A full-page AI assistant is available at the /ai route in the sidebar.
AC-14 : The GET /api/v1/ai/health endpoint returns Ollama status and model name.

---

## Dependencies

- F-022 (JIRA Kanban Board) — work_items, sprints tables must exist and be seeded
- F-026 (Dynamic Dashboard) — project, user, project_member data must exist
- Ollama running locally at http://localhost:11434 with llama3.2:3b pulled
- backend/.env must contain AI_BASE_URL, AI_API_KEY, AI_MODEL
- ollama npm package installed in backend (`npm install ollama`)

---

## Out of Scope

- Document ingestion and pgvector RAG (Phase 2 — F-031)
- Voice input / speech-to-text (Phase 3 — F-032)
- AI writing or creating tasks/work items (read-only for Phase 1)
- Persistent conversation history stored in the database
- Multi-user shared chat sessions

---

## Database / Schema Design (Step 4)

No new tables required for Phase 1. All queries use existing tables.

### Tables Used (read-only)

| Table              | Used For                                        |
|--------------------|-------------------------------------------------|
| work_items         | Tasks, bugs, stories, epics — core query target |
| sprints            | Sprint name, dates, active flag                 |
| projects           | Project name, status, type, dates               |
| milestones         | Milestone name, status, due date                |
| users              | Full name, system role                          |
| project_members    | Which user has which role on which project      |
| timesheet_entries  | Hours logged per work item                      |
| work_item_comments | Comment content per work item                   |

### Migration

Not required — no schema changes.

---

## API Contract Design (Step 5)

Base path: /api/v1/ai

─────────────────────────────────────────────────────
Endpoint  : POST  /api/v1/ai/chat
─────────────────────────────────────────────────────
Auth Required : Yes — JwtAuthGuard (all authenticated roles)
Rate Limit    : 30 requests/minute per user

Request Body:
  {
    "message"        : string     // required, 1–1000 chars
    "projectId"      : string?    // optional — scope queries to one project
    "conversationId" : string?    // optional — for multi-turn context (UUID)
    "history"        : [          // optional — last N turns
      { "role": "user" | "assistant", "content": string }
    ]
  }

Success Response  HTTP 200:
  {
    "answer"         : string,    // AI natural language response
    "sources"        : [          // references to DB records used
      {
        "type"  : "work_item" | "project" | "sprint" | "milestone",
        "id"    : string,
        "title" : string
      }
    ],
    "toolsUsed"      : string[],  // names of tools invoked e.g. ["get_overdue_work_items"]
    "conversationId" : string     // echo back or generate new UUID
  }

Error Responses:
  400  Bad Request      — message missing or exceeds 1000 chars
  401  Unauthorized     — missing or invalid JWT
  429  Too Many Requests — rate limit exceeded (30 req/min)
  503  Service Unavailable — Ollama not reachable
  504  Gateway Timeout   — AI response exceeded 30s

─────────────────────────────────────────────────────
Endpoint  : GET  /api/v1/ai/health
─────────────────────────────────────────────────────
Auth Required : Yes — JwtAuthGuard
Roles Allowed : All authenticated users

Success Response  HTTP 200:
  {
    "status"  : "ok" | "degraded",
    "ollama"  : { "reachable": boolean, "model": string },
    "version" : string
  }

Error Responses:
  401  Unauthorized — missing or invalid JWT
  503  Service Unavailable — Ollama not reachable

---

## AI Tools (SQL Agent Tool Definitions)

Each tool is a Prisma query registered as a Claude/Llama function-calling tool.

| Tool Name                | Triggers When User Asks About             |
|--------------------------|-------------------------------------------|
| get_overdue_work_items   | Overdue tasks, missed deadlines           |
| get_sprint_summary       | Sprint status, items per sprint           |
| get_blocked_items        | Blockers, blocked items                   |
| get_project_progress     | Project progress, completion %            |
| get_team_workload        | Workload, who is busy, assignments        |
| get_bug_summary          | Bugs, defects, by severity/status         |
| get_weekly_summary       | Work done this week, weekly output        |
| get_milestone_status     | Milestones, delayed deliveries            |
| get_sprint_velocity      | Velocity, story points, sprint burndown   |
| search_work_items        | Free text search on title/description     |

---

## Frontend Components

```
frontend/src/features/ai/
├── components/
│   ├── AIChatWidget.tsx      ← floating button (all authenticated pages)
│   ├── AIChatWindow.tsx      ← slide-in chat panel (320px wide)
│   ├── ChatMessage.tsx       ← user bubble + assistant bubble
│   ├── ChatInput.tsx         ← text field + send button
│   └── SourceCard.tsx        ← clickable link to referenced work item/project
├── pages/
│   └── AIAssistantPage.tsx   ← full-page /ai route
├── hooks/
│   └── useAIChat.ts          ← message state, send, loading, error
└── api/
    └── ai.api.ts             ← POST /api/v1/ai/chat, GET /api/v1/ai/health
```

---

## Backend Module Structure

```
backend/src/ai/
├── ai.module.ts
├── ai.controller.ts              ← POST /chat, GET /health
├── ai.service.ts                 ← orchestrate router + tools
├── ollama-client.service.ts      ← OpenAI-compatible Ollama client
├── tools/
│   ├── get-overdue-work-items.tool.ts
│   ├── get-sprint-summary.tool.ts
│   ├── get-blocked-items.tool.ts
│   ├── get-project-progress.tool.ts
│   ├── get-team-workload.tool.ts
│   ├── get-bug-summary.tool.ts
│   ├── get-weekly-summary.tool.ts
│   ├── get-milestone-status.tool.ts
│   ├── get-sprint-velocity.tool.ts
│   └── search-work-items.tool.ts
└── dto/
    ├── chat-message.dto.ts
    └── chat-response.dto.ts
```
