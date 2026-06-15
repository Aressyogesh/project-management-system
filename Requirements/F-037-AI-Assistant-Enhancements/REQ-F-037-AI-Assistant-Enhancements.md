# REQ-F-037 — AI Assistant Enhancements (v2)

**Epic:** PMS — AI Assistant  
**Depends on:** F-036 (AI Assistant Chat + Voice)  
**Branch:** `feature/F-037-ai-assistant-enhancements`  
**Date:** 2026-06-08  
**Author:** Yogesh Lolage

---

## User Story

> As a PMS user, I want the AI assistant to proactively surface what matters, answer questions about sprint health, and let me take common actions directly from the chat — so I spend less time navigating the app and more time doing actual work.

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-1 | The assistant must provide a "daily focus" summary when asked what to work on today |
| BR-2 | The assistant must be able to perform write actions (update task status, log hours, submit leave) after explicit user confirmation |
| BR-3 | The assistant must surface active sprint health metrics when asked about sprint status |
| BR-4 | On first open each session, the greeting must include a brief proactive alert for overdue tasks or a sprint ending within 3 days |
| BR-5 | The underlying LLM must be upgraded to a higher-capability model for improved reasoning |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | Asking "what should I focus on today?" returns overdue tasks, tasks due today, and sprint end date if within 5 days |
| AC-2 | Asking "mark [task-id] as done" returns a confirmation card; on confirm the task status is updated |
| AC-3 | Asking "log 3 hours on [task-id]" returns a confirmation card; on confirm a timesheet entry is created |
| AC-4 | Asking "apply for leave from [date] to [date]" returns a confirmation card; on confirm a leave request is submitted |
| AC-5 | Asking about sprint status returns: sprint name, end date, total/done/blocked item counts, and story points burned |
| AC-6 | On first open, greeting includes proactive alert if user has overdue tasks or sprint ends within 3 days |
| AC-7 | Model upgrade to `llama-3.3-70b-versatile` with no regression in response time beyond 3s |
| AC-8 | Action confirmation cards show entity details (task title, dates) before the user confirms |
| AC-9 | Cancelled actions return the user to normal chat without side effects |
| AC-10 | EMPLOYEE cannot perform actions on tasks not assigned to them |

---

## Out of Scope

- Real-time push notifications
- Creating new work items or projects via chat
- Multi-step conversational form filling (all action params must be in a single message)
- Voice-triggered action confirmation

---

## DB / Schema Design

No new tables required. Uses existing:
- `WorkItem` — status update, timesheet context
- `TimesheetEntry` — new entries via `POST /timesheet-entries`
- `LeaveRequest` — new entries via `POST /leave-requests`
- `Sprint` — read for health context

No migration required.

---

## API Contract

### Existing endpoint — enhanced response shape
`POST /ai/chat`

**Request** (unchanged):
```json
{
  "message": "mark PMS-42 as done",
  "history": []
}
```

**Response** (new optional `action` field):
```json
{
  "reply": "I'll mark PMS-42 (Fix login bug) as Done. Please confirm below.",
  "action": {
    "type": "UPDATE_TASK_STATUS",
    "workItemId": "clxxx",
    "displayId": "PMS-42",
    "title": "Fix login bug",
    "newStatus": "QA_DONE",
    "label": "Mark PMS-42 as Done"
  }
}
```

**Action types:**
```typescript
type ActionType =
  | { type: 'UPDATE_TASK_STATUS'; workItemId: string; displayId: string; title: string; newStatus: string; label: string }
  | { type: 'LOG_TIMESHEET';      workItemId: string; displayId: string; title: string; hours: number; date: string; label: string }
  | { type: 'SUBMIT_LEAVE';       startDate: string; endDate: string; reason: string; label: string }
```

The frontend executes the underlying API call after user confirmation:
- `UPDATE_TASK_STATUS` → `PATCH /work-items/:id` `{ status }`
- `LOG_TIMESHEET`      → `POST /timesheet-entries` `{ workItemId, hours, date, description }`
- `SUBMIT_LEAVE`       → `POST /leave-requests` `{ startDate, endDate, reason }`

---

## Enhancement Details

### E1 — Daily Focus Summary
- Keywords: `focus`, `today`, `daily`, `standup`, `prioritize`, `prioritise`, `what should i`
- Fetches: overdue tasks (dueDate < today, status ≠ QA_DONE), tasks due today, nearest sprint end date
- Returns structured context for LLM to summarise

### E2 — Action Intents
- Keywords detected server-side: `mark`, `update status`, `log hours`, `log time`, `apply for leave`, `request leave`
- When detected: include work items in context + instruct LLM to embed `ACTION:{...}` JSON
- Backend parses `ACTION:{...}` from LLM reply and returns as `action` field
- Frontend renders `ActionConfirmCard` component

### E3 — Sprint Health Context
- Keywords: `sprint`, `velocity`, `burndown`, `burn down`, `on track`, `sprint health`  
- Fetches: active sprint for user's projects, item counts, story point totals, blocked count, days remaining

### E4 — Proactive Greeting
- Enhanced `__greet__` handler fetches overdue count + nearest sprint deadline in parallel
- Appends 1-line alert to greeting: *"You have 2 overdue tasks and your sprint ends in 3 days."*

### E5 — Model Upgrade
- `MODEL` constant: `llama-3.1-8b-instant` → `llama-3.3-70b-versatile`
- Both models are within Groq free tier limits
