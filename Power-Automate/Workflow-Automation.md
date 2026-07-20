# PMS Workflow Automation — ActivePieces + Teams

All automation flows route through ActivePieces (AP) running at `http://203.193.165.229:9091`.  
Teams notifications are delivered via Power Automate webhooks to the **Developers EQ2** group chat.

---

## Architecture

```
PMS Backend → ActivePieces Webhook → Teams Power Automate → Project-Specific Teams Channel
```

**AP Base URL:** `http://203.193.165.229:9091`  
**AP Docker Network:** `activepieces_default`

### F-054 — Per-Project Teams Webhook

Each project now stores its own Teams channel webhook URL in the DB (`teamsWebhookUrl` field).

- PMS backend resolves the project's `teamsWebhookUrl` asynchronously in `AutomationService`.
- Every AP payload now includes `teamsWebhookUrl` at the **root level** (not inside `payload`).
- Each AP flow's HTTP Request step uses `{{trigger.body.teamsWebhookUrl}}` as the URL.
- If `teamsWebhookUrl` is `null` (project not configured), AP receives `null` and the HTTP step will fail gracefully (AP catches the error and logs it).

**To configure a project's Teams channel:**
1. Go to Project Detail page → "Integrations" section.
2. Paste the Power Automate webhook URL for that project's Teams channel.
3. Click Save.

**After enabling F-054, update all 6 AP flows:**
- In each flow's HTTP Request step, change the URL from the hardcoded Teams PA webhook to `{{trigger.body.teamsWebhookUrl}}`.

---

## GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AUTOMATION_AP_BASE` | `http://203.193.165.229:9091` |
| `AP_TASK_ASSIGNED_WEBHOOK_ID` | AP webhook ID for Task Assigned flow |
| `AP_CRITICAL_BUG_WEBHOOK_ID` | AP webhook ID for Critical Bug flow |
| `AP_BUG_WEBHOOK_ID` | AP webhook ID for Bug Created flow |
| `AP_BUG_REOPENED_WEBHOOK_ID` | AP webhook ID for Bug Reopened flow |
| `AP_ITEM_BLOCKED_WEBHOOK_ID` | AP webhook ID for Item Blocked flow |
| `AP_SPRINT_WEBHOOK_ID` | AP webhook ID for Sprint Started flow |

---

## Scenario 1 — Task Assigned

**Status:** ✅ Complete  
**AP Flow Name:** `PMS - Task Assigned`  
**AP Webhook ID:** `fW98HBa6CkWdUuXKemaLr`  
**Teams PA Webhook:** `https://default5beaa7672ae348468fcd957346cd1b.17.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/22/workflows/f8f40455f8084e99bdbdba291be0b620/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=YLgGt312JF2PqpMA72RtdfOXoxhZqdk-WqnGoJc8N0I`

### Trigger
Fires when a task/bug is assigned or reassigned to a user.

**Backend call:**
```
POST http://203.193.165.229:9091/api/v1/webhooks/fW98HBa6CkWdUuXKemaLr
```

**Payload:**
```json
{
  "event": "TASK_ASSIGNED",
  "payload": {
    "id": "...",
    "displayId": "HEW10003",
    "title": "Task title",
    "type": "TASK",
    "priority": "MEDIUM",
    "dueDate": "2026-07-14T00:00:00.000Z",
    "projectId": "...",
    "assignee": { "id": "...", "fullName": "Shital Joshi" },
    "assignedBy": "Yogesh Lolage"
  }
}
```

### AP HTTP Request Body (Adaptive Card)
```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "🎯 Task Assigned",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Accent"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Task",        "value": "{{trigger.body.payload.title}}" },
        { "title": "ID",          "value": "{{trigger.body.payload.displayId}}" },
        { "title": "Assigned to", "value": "{{trigger.body.payload.assignee.fullName}}" },
        { "title": "By",          "value": "{{trigger.body.payload.assignedBy}}" },
        { "title": "Priority",         "value": "{{trigger.body.payload.priority}}" },
        { "title": "Estimated Hours",  "value": "{{trigger.body.payload.estimatedHours}}" },
        { "title": "Due Date",         "value": "{{trigger.body.payload.dueDate}}" }
      ]
    }
  ]
}
```

---

## Scenario 2 — Bug Created

**Status:** ✅ Complete  
**AP Flow Name:** `Dev_BugCreatedAndAssign`  
**AP Webhook ID:** `osnuq2sAj1BUjWajD79Ou`  
**Teams PA Webhook:** _(same as Scenario 1)_

### Trigger
Fires when any new BUG work item is created.

**Backend call:**
```
POST http://203.193.165.229:9091/api/v1/webhooks/osnuq2sAj1BUjWajD79Ou
```

**Payload:**
```json
{
  "event": "BUG_CREATED",
  "payload": {
    "id": "...",
    "displayId": "HEW10003",
    "title": "Bug title",
    "type": "BUG",
    "severity": "HIGH",
    "priority": "HIGH",
    "status": "TODO",
    "projectId": "...",
    "environment": "Production",
    "assignee": { "id": "...", "fullName": "Shital Joshi" },
    "reporter": { "id": "...", "fullName": "Yogesh Lolage" },
    "dueDate": "2026-07-14T00:00:00.000Z",
    "createdAt": "2026-07-15T10:00:00.000Z"
  }
}
```

### AP HTTP Request Body (Adaptive Card)
```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "🐛 Bug Created",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Attention"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Bug",         "value": "{{trigger.body.payload.title}}" },
        { "title": "ID",          "value": "{{trigger.body.payload.displayId}}" },
        { "title": "Severity",    "value": "{{trigger.body.payload.severity}}" },
        { "title": "Priority",    "value": "{{trigger.body.payload.priority}}" },
        { "title": "Assignee",    "value": "{{trigger.body.payload.assignee.fullName}}" },
        { "title": "Reporter",    "value": "{{trigger.body.payload.reporter.fullName}}" },
        { "title": "Environment", "value": "{{trigger.body.payload.environment}}" },
        { "title": "Due Date",    "value": "{{trigger.body.payload.dueDate}}" }
      ]
    }
  ]
}
```

---

## Scenario 3 — Critical Bug

**Status:** ✅ Complete  
**AP Flow Name:** `PMS - Critical Bug`  
**AP Webhook ID:** `5luhQmBHXKA8Xdjx3l95l`  
**Teams PA Webhook:** _(same as Scenario 1)_

### Trigger
Fires in addition to Scenario 2 when a BUG with `severity = CRITICAL` is created.

**Backend call:**
```
POST http://203.193.165.229:9091/api/v1/webhooks/5luhQmBHXKA8Xdjx3l95l
```

**Payload:**
```json
{
  "event": "CRITICAL_BUG_CREATED",
  "payload": {
    "id": "...",
    "displayId": "HEW10003",
    "title": "Critical Bug title",
    "severity": "CRITICAL",
    "priority": "CRITICAL",
    "projectId": "...",
    "description": "Full description",
    "environment": "Production",
    "stepsToRepro": "1. Go to... 2. Click...",
    "assignee": { "id": "...", "fullName": "Shital Joshi" },
    "reporter": { "id": "...", "fullName": "Yogesh Lolage" },
    "createdAt": "2026-07-15T10:00:00.000Z"
  }
}
```

### AP HTTP Request Body (Adaptive Card)
```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "🚨 CRITICAL Bug Alert!",
      "weight": "Bolder",
      "size": "Large",
      "color": "Attention"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Bug",            "value": "{{trigger.body.payload.title}}" },
        { "title": "ID",             "value": "{{trigger.body.payload.displayId}}" },
        { "title": "Severity",       "value": "{{trigger.body.payload.severity}}" },
        { "title": "Priority",       "value": "{{trigger.body.payload.priority}}" },
        { "title": "Assignee",       "value": "{{trigger.body.payload.assignee.fullName}}" },
        { "title": "Reporter",       "value": "{{trigger.body.payload.reporter.fullName}}" },
        { "title": "Environment",    "value": "{{trigger.body.payload.environment}}" },
        { "title": "Steps to Repro", "value": "{{trigger.body.payload.stepsToRepro}}" }
      ]
    }
  ]
}
```

---

## Scenario 4 — Bug Reopened

**Status:** ✅ Complete  
**AP Flow Name:** `PMS - Bug Reopened`  
**AP Webhook ID:** `Eulm1QGh6QyMUDXLmK1CL`  
**Teams PA Webhook:** _(same as Scenario 1)_

### Trigger
Fires when a BUG is moved back from a terminal status (`QA_DONE` or `CLOSED`) to any non-terminal status.

**Backend call:**
```
POST http://203.193.165.229:9091/api/v1/webhooks/Eulm1QGh6QyMUDXLmK1CL
```

**Payload:**
```json
{
  "event": "BUG_REOPENED",
  "payload": {
    "id": "...",
    "displayId": "HEW10003",
    "title": "Bug title",
    "projectId": "...",
    "reopenCount": 2,
    "assigneeName": "Shital Joshi",
    "reopenedBy": "Yogesh Lolage"
  }
}
```

### AP HTTP Request Body (Adaptive Card)
```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "🔁 Bug Reopened",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Warning"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Bug",          "value": "{{trigger.body.payload.title}}" },
        { "title": "ID",           "value": "{{trigger.body.payload.displayId}}" },
        { "title": "Reopen Count", "value": "{{trigger.body.payload.reopenCount}}" },
        { "title": "Assignee",     "value": "{{trigger.body.payload.assigneeName}}" },
        { "title": "Reopened By",  "value": "{{trigger.body.payload.reopenedBy}}" }
      ]
    }
  ]
}
```

---

## Scenario 5 — Item Blocked

**Status:** ✅ Complete  
**AP Flow Name:** `Dev_ItemBlocked`  
**AP Webhook ID:** `I6QjRXubf7IP1Vpza7iVt`  
**Teams PA Webhook:** _(same as Scenario 1)_

### Trigger
Fires when any work item status is changed to `BLOCKED`.

**Backend call:**
```
POST http://203.193.165.229:9091/api/v1/webhooks/I6QjRXubf7IP1Vpza7iVt
```

**Payload:**
```json
{
  "event": "ITEM_BLOCKED",
  "payload": {
    "id": "...",
    "displayId": "HEW10003",
    "title": "Task title",
    "type": "TASK",
    "projectId": "...",
    "assigneeName": "Shital Joshi",
    "blockedBy": "Yogesh Lolage"
  }
}
```

### AP HTTP Request Body (Adaptive Card)
```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "⛔ Item Blocked",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Warning"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Item",       "value": "{{trigger.body.payload.title}}" },
        { "title": "ID",         "value": "{{trigger.body.payload.displayId}}" },
        { "title": "Type",       "value": "{{trigger.body.payload.type}}" },
        { "title": "Assignee",   "value": "{{trigger.body.payload.assigneeName}}" },
        { "title": "Blocked By", "value": "{{trigger.body.payload.blockedBy}}" }
      ]
    }
  ]
}
```

---

## Scenario 6 — Sprint Started

**Status:** ✅ Complete  
**AP Flow Name:** `Dev_SprintStarted`  
**AP Webhook ID:** `yI2YL7EYSAKx9Uek5VQey`  
**Teams PA Webhook:** _(same as Scenario 1)_

### Trigger
Fires when a sprint is activated (status changed to `ACTIVE`).

**Backend call:**
```
POST http://203.193.165.229:9091/api/v1/webhooks/yI2YL7EYSAKx9Uek5VQey
```

**Payload:**
```json
{
  "event": "SPRINT_STARTED",
  "payload": {
    "id": "...",
    "name": "Sprint 1",
    "goal": "Ship user auth module",
    "startDate": "2026-07-15T00:00:00.000Z",
    "endDate": "2026-07-29T00:00:00.000Z",
    "projectId": "...",
    "projectName": "Project Alpha",
    "activatedBy": "Yogesh Lolage",
    "members": [
      { "id": "...", "fullName": "Team Member", "email": "member@company.com" }
    ]
  }
}
```

### AP HTTP Request Body (Adaptive Card)
```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "🚀 Sprint Started",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Good"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Sprint",     "value": "{{trigger.body.payload.name}}" },
        { "title": "Project",    "value": "{{trigger.body.payload.projectName}}" },
        { "title": "Goal",       "value": "{{trigger.body.payload.goal}}" },
        { "title": "Start Date", "value": "{{trigger.body.payload.startDate}}" },
        { "title": "End Date",   "value": "{{trigger.body.payload.endDate}}" },
        { "title": "Started By", "value": "{{trigger.body.payload.activatedBy}}" }
      ]
    }
  ]
}
```

---

## AP Docker — Recreate Command

If the AP container needs to be recreated (e.g., env var changes):

```powershell
docker stop activepieces
docker rm activepieces
docker run -d --name activepieces --restart unless-stopped --network activepieces_default -p 9091:80 `
  -e "AP_ENGINE_EXECUTABLE_PATH=dist/packages/engine/main.js" `
  -e "AP_JWT_SECRET=31BBB1C9F922C3CC7443B9D88BFC40454BB2CF02A93A711B6FF8391384B5BB69" `
  -e "AP_ENCRYPTION_KEY=2A8ADC51AE22748BC8A7F42CBD8B1400" `
  -e "AP_POSTGRES_DATABASE=activepieces" `
  -e "AP_POSTGRES_HOST=activepieces-postgres" `
  -e "AP_POSTGRES_PORT=5432" `
  -e "AP_POSTGRES_USERNAME=postgres" `
  -e "AP_POSTGRES_PASSWORD=postgres" `
  -e "AP_REDIS_HOST=activepieces-redis" `
  -e "AP_REDIS_PORT=6379" `
  -e "AP_QUEUE_MODE=REDIS" `
  -e "AP_TRIGGER_DEFAULT_POLL_INTERVAL=5" `
  -e "AP_BACKEND_URL=http://203.193.165.229:9091" `
  -e "AP_FRONTEND_URL=http://203.193.165.229:9091" `
  activepieces/activepieces:latest
```
