# UTC-F-054 — Per-Project Teams Webhook Configuration — Unit Test Cases

**Feature ID:** F-054  
**Created:** 2026-07-15

---

## Backend — ProjectsService

### UTC-F-054-01: setTeamsWebhook — saves URL for authorized PM

**Arrange:**
- Mock `prisma.projectMember.findFirst` returns record with `projectRole: 'PROJECT_MANAGER'`
- Mock `prisma.project.update` returns project with `teamsWebhookUrl` set

**Act:**
- Call `projectsService.setTeamsWebhook(projectId, { teamsWebhookUrl: 'https://powerautomate.../invoke' }, userId, 'EMPLOYEE')`

**Assert:**
- `prisma.project.update` called with `{ where: { id: projectId }, data: { teamsWebhookUrl: 'https://...' } }`
- Returns the updated project object

---

### UTC-F-054-02: setTeamsWebhook — saves URL for ADMIN system role

**Arrange:**
- Mock `prisma.projectMember.findFirst` returns null (user is not a project member)
- Mock `prisma.project.update` returns project with teamsWebhookUrl set

**Act:**
- Call `projectsService.setTeamsWebhook(projectId, { teamsWebhookUrl: 'https://...' }, userId, 'ADMIN')`

**Assert:**
- Does not check project membership (admin bypasses it)
- `prisma.project.update` called and updated project returned

---

### UTC-F-054-03: setTeamsWebhook — throws 403 for non-PM EMPLOYEE

**Arrange:**
- Mock `prisma.projectMember.findFirst` returns record with `projectRole: 'DEVELOPER'`

**Act:**
- Call `projectsService.setTeamsWebhook(projectId, { teamsWebhookUrl: 'https://...' }, userId, 'EMPLOYEE')`

**Assert:**
- Throws `ForbiddenException`

---

### UTC-F-054-04: setTeamsWebhook — clears URL when null passed

**Arrange:**
- Mock `prisma.projectMember.findFirst` returns `PROJECT_MANAGER`
- Mock `prisma.project.update` returns project with `teamsWebhookUrl: null`

**Act:**
- Call `projectsService.setTeamsWebhook(projectId, { teamsWebhookUrl: null }, userId, 'EMPLOYEE')`

**Assert:**
- `prisma.project.update` called with `{ data: { teamsWebhookUrl: null } }`
- Returns project with `teamsWebhookUrl: null`

---

### UTC-F-054-05: setTeamsWebhook — throws 404 for non-existent project

**Arrange:**
- Mock `prisma.projectMember.findFirst` returns null (not a member)
- Mock `prisma.project.update` throws Prisma P2025 (not found)

**Act:**
- Call with ADMIN role

**Assert:**
- Throws `NotFoundException`

---

## Backend — AutomationService

### UTC-F-054-06: notifyTaskAssigned — includes teamsWebhookUrl at root of payload

**Arrange:**
- Mock `config.get` returns valid webhook IDs and base URL
- `item.projectTeamsWebhookUrl = 'https://pa-url.../invoke'`

**Act:**
- Call `automationService.notifyTaskAssigned(item, assignee, assignedBy)`

**Assert:**
- `fetch` called with body JSON containing `{ teamsWebhookUrl: 'https://pa-url.../invoke', event: 'TASK_ASSIGNED', payload: {...} }`

---

### UTC-F-054-07: notifyTaskAssigned — teamsWebhookUrl null when project has none

**Arrange:**
- `item.projectTeamsWebhookUrl = null`

**Act/Assert:**
- `fetch` called with `{ teamsWebhookUrl: null, event: 'TASK_ASSIGNED', payload: {...} }`
- No error thrown (null is valid — AP handles gracefully)

---

## Frontend — ProjectDetailPage Integrations Section

### UTC-F-054-08: renders Teams webhook input for PM

**Arrange:**
- Mock `useAuthStore` with EMPLOYEE user
- Mock `members` list including current user as PROJECT_MANAGER
- Mock project with `teamsWebhookUrl: 'https://example.com/webhook'`

**Act:**
- Render `<ProjectDetailPage />`

**Assert:**
- "Integrations" heading is in the document
- Input has value `https://example.com/webhook`

---

### UTC-F-054-09: does not render Integrations section for DEVELOPER role

**Arrange:**
- Mock `useAuthStore` with EMPLOYEE user
- Mock `members` including current user as `DEVELOPER`
- Mock project with `teamsWebhookUrl: null`

**Act:**
- Render `<ProjectDetailPage />`

**Assert:**
- "Integrations" heading is NOT in the document

---

### UTC-F-054-10: Save button calls PATCH endpoint with correct URL

**Arrange:**
- Render as PM
- Mock `projectsApi.setTeamsWebhook` resolves

**Act:**
- Type `https://new-webhook.com/invoke` into input
- Click "Save"

**Assert:**
- `projectsApi.setTeamsWebhook` called with `(projectId, { teamsWebhookUrl: 'https://new-webhook.com/invoke' })`
- Success toast "Teams webhook saved" appears

---

### UTC-F-054-11: Clear button sets teamsWebhookUrl to null

**Arrange:**
- Render as PM with existing webhook URL
- Mock `projectsApi.setTeamsWebhook` resolves with `{ teamsWebhookUrl: null }`

**Act:**
- Click "Clear"

**Assert:**
- `projectsApi.setTeamsWebhook` called with `(projectId, { teamsWebhookUrl: null })`
- Success toast "Teams webhook cleared" appears
- Input is cleared

---
