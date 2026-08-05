# TC-F-054 — Per-Project Teams Webhook Configuration — E2E Test Cases

**Feature ID:** F-054  
**Created:** 2026-07-15

---

## TC-F-054-01: Project Manager saves Teams webhook URL

**Given** I am logged in as a user with PROJECT_MANAGER role on project "ESCT"  
**And** the project has no Teams webhook URL set  
**When** I navigate to the Project Detail page for "ESCT"  
**And** I scroll to the "Integrations" section  
**And** I enter `https://powerautomate.../invoke?api-version=1&sig=abc` in the Teams Webhook URL field  
**And** I click "Save"  
**Then** a success toast "Teams webhook saved" appears  
**And** `GET /api/v1/projects/:id` returns `teamsWebhookUrl: "https://powerautomate.../invoke?api-version=1&sig=abc"`

---

## TC-F-054-02: Project Manager clears Teams webhook URL

**Given** I am logged in as PROJECT_MANAGER  
**And** the project has `teamsWebhookUrl` set  
**When** I navigate to Project Detail > Integrations  
**And** I click "Clear"  
**Then** a success toast "Teams webhook cleared" appears  
**And** `GET /api/v1/projects/:id` returns `teamsWebhookUrl: null`

---

## TC-F-054-03: Admin saves Teams webhook URL for any project

**Given** I am logged in as ADMIN (not a member of the project)  
**When** I navigate to Project Detail > Integrations for any project  
**And** I enter a valid webhook URL and click "Save"  
**Then** the save succeeds and the URL is persisted

---

## TC-F-054-04: Developer cannot see Integrations section

**Given** I am logged in as EMPLOYEE with DEVELOPER project role  
**When** I navigate to Project Detail  
**Then** the "Integrations" section is NOT rendered

---

## TC-F-054-05: PATCH returns 403 for Developer via API

**Given** I am authenticated as EMPLOYEE with DEVELOPER project role  
**When** I call `PATCH /api/v1/projects/:id/teams-webhook` with `{ "teamsWebhookUrl": "https://..." }`  
**Then** the response status is 403 Forbidden

---

## TC-F-054-06: PATCH returns 400 for non-HTTPS URL

**Given** I am authenticated as PROJECT_MANAGER  
**When** I call `PATCH /api/v1/projects/:id/teams-webhook` with `{ "teamsWebhookUrl": "http://not-https.com" }`  
**Then** the response status is 400 Bad Request  
**And** the error message references URL validation

---

## TC-F-054-07: Task Assigned AP payload includes teamsWebhookUrl

**Given** project "ESCT" has `teamsWebhookUrl` configured  
**When** a work item in project "ESCT" is assigned to a user  
**Then** the AP webhook receives a payload with `teamsWebhookUrl` at root level equal to the project's configured URL  
**And** `event: "TASK_ASSIGNED"` is present

---

## TC-F-054-08: Bug Created AP payload includes teamsWebhookUrl

**Given** project "ESCT" has `teamsWebhookUrl` configured  
**When** a BUG work item is created in project "ESCT"  
**Then** the AP webhook receives a payload with `teamsWebhookUrl` equal to the project's URL

---

## TC-F-054-09: Sprint Started AP payload includes teamsWebhookUrl

**Given** project "ESCT" has `teamsWebhookUrl` configured  
**When** a sprint in "ESCT" is activated  
**Then** the AP webhook receives `teamsWebhookUrl` in the payload root

---

## TC-F-054-10: teamsWebhookUrl persists across page reload

**Given** I saved a Teams webhook URL on Project Detail  
**When** I refresh the page  
**Then** the webhook URL input still shows the saved URL

---

## RBAC Matrix

| Role | See Integrations section | Save webhook | Clear webhook |
|------|--------------------------|--------------|---------------|
| SUPER_USER | Yes | Yes | Yes |
| ADMIN | Yes | Yes | Yes |
| BU_HEAD | Yes | Yes | Yes |
| PROJECT_MANAGER | Yes | Yes | Yes |
| TEAM_LEAD | No | No (403) | No (403) |
| DEVELOPER | No | No (403) | No (403) |
| QA | No | No (403) | No (403) |
| DESIGNER | No | No (403) | No (403) |
| DEVOPS | No | No (403) | No (403) |
