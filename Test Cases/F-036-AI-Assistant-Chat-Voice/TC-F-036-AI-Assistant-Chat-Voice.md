# TC-F-036 — AI Assistant (Chat + Voice) — E2E Test Cases

## Happy Path

---

### TC-F036-001 — Open chat panel
**Given** the user is logged in and on any page  
**When** they click the floating AI assistant button (bottom-right)  
**Then** the chat panel slides open with a welcome message and an empty input field

---

### TC-F036-002 — Send text message and receive reply
**Given** the chat panel is open  
**When** the user types "What are my tasks?" and clicks Send  
**Then** their message appears as a user bubble and within 10 seconds an assistant reply bubble appears with relevant task information

---

### TC-F036-003 — Multi-turn conversation
**Given** the user has sent one message and received a reply  
**When** they send a follow-up message "Which of those are overdue?"  
**Then** the assistant replies with context from the previous turn (overdue tasks only)

---

### TC-F036-004 — Minimise and reopen preserves history
**Given** the user has a 3-message conversation  
**When** they click the minimise button and then reopen the panel  
**Then** all 3 messages are still visible

---

### TC-F036-005 — Voice input populates the text field
**Given** the chat panel is open and the browser supports SpeechRecognition  
**When** the user clicks the mic button and speaks "Show me overdue tasks"  
**Then** the transcript "Show me overdue tasks" appears in the input field

---

### TC-F036-006 — Voice output reads assistant reply
**Given** the voice speaker toggle is ON  
**When** the assistant returns a reply  
**Then** the browser's speech synthesis reads the reply aloud

---

### TC-F036-007 — Create work item via chat
**Given** the user is a PROJECT_MANAGER on project "Horizon"  
**When** they type "Create a bug titled Login page crash in project Horizon"  
**Then** the assistant confirms creation and the work item appears on the Kanban board

---

## Negative / Edge Cases

---

### TC-F036-008 — Unauthenticated request blocked
**Given** no JWT is present  
**When** POST `/ai/chat` is called directly  
**Then** response is 401 Unauthorized

---

### TC-F036-009 — EMPLOYEE cannot see other users' data
**Given** the user has role EMPLOYEE  
**When** they ask "Show me all tasks for the whole team"  
**Then** the assistant only returns tasks assigned to that employee

---

### TC-F036-010 — Groq unavailable returns graceful error
**Given** the Groq API key is invalid or the service is down  
**When** the user sends any message  
**Then** the assistant bubble shows "AI service is currently unavailable. Please try again later." and no crash occurs

---

### TC-F036-011 — Voice input not supported degrades gracefully
**Given** the browser does not support `SpeechRecognition`  
**When** the chat panel opens  
**Then** the microphone button is hidden (not shown at all)

---

### TC-F036-012 — Empty message not sent
**Given** the chat input is blank  
**When** the user clicks Send or presses Enter  
**Then** no API call is made and no message bubble is added

---

## RBAC Matrix

| Role | See own tasks | See all org tasks | Create work item | Access /ai/chat |
|------|--------------|-------------------|-----------------|----------------|
| SUPER_USER | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| PROJECT_MANAGER | ✅ | Project only | ✅ | ✅ |
| TEAM_LEAD | ✅ | Project only | ✅ | ✅ |
| DEVELOPER | ✅ | Own only | ❌ | ✅ |
| EMPLOYEE | ✅ | Own only | ❌ | ✅ |
