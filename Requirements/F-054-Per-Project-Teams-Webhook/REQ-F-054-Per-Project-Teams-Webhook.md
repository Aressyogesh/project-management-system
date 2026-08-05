.# REQ-F-054 — Per-Project Microsoft Teams Webhook Configuration

**Feature ID:** F-054  
**Feature Name:** Per-Project Teams Webhook Configuration  
**Epic:** PMS  
**Created:** 2026-07-15  
**Status:** In Development

---

## 1. User Story

> **As a** Project Manager or Administrator,  
> **I want to** store a Microsoft Teams channel webhook URL per project,  
> **so that** ActivePieces automation notifications (task assigned, bug created, critical bug, bug reopened, item blocked, sprint started) are sent to the correct project-specific Teams channel instead of a shared channel.

---

## 2. Business Requirements

| BR# | Requirement |
|-----|-------------|
| BR-1 | Each project must support zero or one Teams channel webhook URL. |
| BR-2 | Only users with system role SUPER_USER, ADMIN, or BU_HEAD, or project-level role PROJECT_MANAGER, may save/clear the webhook URL for a project. |
| BR-3 | When a Teams webhook URL is configured for a project, all 6 AP automation scenarios (Task Assigned, Bug Created, Critical Bug, Bug Reopened, Item Blocked, Sprint Started) must route notifications to that project's Teams channel. |
| BR-4 | When no Teams webhook URL is configured for a project, the AP automation call for that project must still fire to AP (AP itself gracefully skips or logs it). |
| BR-5 | The webhook URL field must accept any valid HTTPS URL (max 2000 chars). |
| BR-6 | The UI must provide a clear input field labelled "Teams Channel Webhook URL" inside a dedicated "Integrations" section on the Project Detail page. |
| BR-7 | Save and Clear actions must give the user immediate visual feedback (success toast / error toast). |

---

## 3. Acceptance Criteria

| AC# | Criteria |
|-----|----------|
| AC-1 | `PATCH /api/v1/projects/:id/teams-webhook` accepts `{ teamsWebhookUrl: string \| null }`, persists to DB, and returns the updated project object. |
| AC-2 | The endpoint returns 403 Forbidden when called by a user who is neither an Admin/Super/BU_HEAD nor the project's PROJECT_MANAGER. |
| AC-3 | The `GET /api/v1/projects/:id` response includes the `teamsWebhookUrl` field. |
| AC-4 | When `teamsWebhookUrl` is set, all 6 AP webhook calls include `teamsWebhookUrl` in the root of the payload (not nested under `payload`). |
| AC-5 | When `teamsWebhookUrl` is null/missing, the field is still present in the AP payload as `null` — AP flow handles it. |
| AC-6 | Project Detail page shows an "Integrations" section (visible to PM, Admin, Super, BU_HEAD only) with a Teams webhook URL input and Save/Clear buttons. |
| AC-7 | Saving a valid URL shows a "Teams webhook saved" success toast. |
| AC-8 | Clearing (saving null) shows a "Teams webhook cleared" success toast. |
| AC-9 | Saving an invalid URL (non-HTTPS or > 2000 chars) returns 400 Bad Request. |

---

## 4. Out of Scope

- Multiple webhook URLs per project.
- Slack / other platform integrations.
- Per-user or per-sprint webhook overrides.
- Webhook URL validation by actually calling the URL.
- Audit log entries for webhook URL changes (nice-to-have, not required now).

---

## 5. Dependencies

- ActivePieces (AP) running at `http://203.193.165.229:9091`.
- All 6 AP flows must be updated to use `{{trigger.body.teamsWebhookUrl}}` as the HTTP Request URL (done manually by user in AP UI after this feature ships).
- `AutomationService` already exists at `backend/src/automation-services/automation.service.ts`.
- `ProjectDetailPage` frontend exists at `frontend/src/features/projects/pages/ProjectDetailPage.tsx`.

---

## 6. DB / Schema Design

### 6.1 Migration

Add `teamsWebhookUrl` to the `projects` table:

```sql
ALTER TABLE projects ADD COLUMN "teamsWebhookUrl" VARCHAR(2000);
```

### 6.2 Prisma Schema Change

```prisma
model Project {
  id               String        @id @default(uuid())
  name             String        @db.VarChar(200)
  clientId         String?
  departmentId     String?
  description      String?       @db.Text
  startDate        DateTime?     @db.Date
  endDate          DateTime?     @db.Date
  budget           Decimal?      @db.Decimal(12, 2)
  projectType      ProjectType
  status           ProjectStatus @default(ACTIVE)
  workItemCounter  Int           @default(10000)
  teamsWebhookUrl  String?       @db.VarChar(2000)   // ← NEW
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  // ... relations unchanged
}
```

Migration name: `add_teams_webhook_url_to_project`

---

## 7. API Contract

### 7.1 PATCH /api/v1/projects/:id/teams-webhook

**Description:** Save or clear the Teams channel webhook URL for a project.

**Auth:** JWT required. Caller must be SUPER_USER, ADMIN, BU_HEAD (system role) or PROJECT_MANAGER for this project.

**Request Body:**
```json
{
  "teamsWebhookUrl": "https://powerautomate.../invoke?..."
}
```
Set `teamsWebhookUrl` to `null` to clear.

**Validation:**
- `teamsWebhookUrl`: optional string, if present must be HTTPS URL, max 2000 chars. Accepts `null` to clear.

**Response 200:**
```json
{
  "id": "...",
  "name": "Project Alpha",
  "teamsWebhookUrl": "https://...",
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

**Response 400:** Validation error (non-HTTPS or too long).

**Response 403:** Caller lacks permission.

**Response 404:** Project not found.

---

### 7.2 GET /api/v1/projects/:id (updated)

`teamsWebhookUrl` is now included in the response:

```json
{
  "id": "...",
  "name": "Project Alpha",
  "teamsWebhookUrl": "https://...",
  ...
}
```

---

## 8. AutomationService Changes

Each notify method must:
1. Accept `teamsWebhookUrl: string | null | undefined` as part of the item payload (fetched by the calling service before invoking the notify method).
2. Spread `teamsWebhookUrl` at the **root** of the AP payload (not inside `payload`).

Payload structure:
```json
{
  "event": "TASK_ASSIGNED",
  "teamsWebhookUrl": "https://...",
  "payload": { ... }
}
```

The calling services (`work-items.service.ts`, `sprints.service.ts`) must fetch the project's `teamsWebhookUrl` from DB before calling the automation service.
