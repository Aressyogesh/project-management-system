# UTC-F-036 — AI Assistant (Chat + Voice) — Unit Test Cases

## Backend — AiService

---

### UTC-F036-001 — Returns reply from Groq on valid message
**Arrange:** Mock Groq client returns `{ choices: [{ message: { content: "You have 2 tasks." } }] }`. Mock PrismaService returns empty work items.  
**Act:** Call `aiService.chat({ message: "What are my tasks?", history: [] }, mockUser)`.  
**Assert:** Result equals `{ reply: "You have 2 tasks." }`.

---

### UTC-F036-002 — Throws on Groq API error
**Arrange:** Mock Groq client throws `Error("Groq unavailable")`.  
**Act:** Call `aiService.chat(...)`.  
**Assert:** Service throws `InternalServerErrorException` with message containing "AI service unavailable".

---

### UTC-F036-003 — Injects overdue tasks into system prompt
**Arrange:** Mock PrismaService `workItem.findMany` returns 2 overdue items. Capture the messages array passed to Groq.  
**Act:** Call `aiService.chat({ message: "overdue?", history: [] }, mockUser)`.  
**Assert:** The system message content includes both work item titles.

---

### UTC-F036-004 — EMPLOYEE context scoped to own data only
**Arrange:** Mock user has `systemRole: EMPLOYEE`, `id: "u1"`. Mock `workItem.findMany` called with `assigneeId: "u1"`.  
**Act:** Call `aiService.chat(...)`.  
**Assert:** `workItem.findMany` was called with a filter containing `assigneeId: "u1"`.

---

### UTC-F036-005 — SUPER_USER context fetches all projects
**Arrange:** Mock user has `systemRole: SUPER_USER`. Mock `project.findMany` called without userId filter.  
**Act:** Call `aiService.chat(...)`.  
**Assert:** `project.findMany` was called without an `assigneeId` restriction.

---

### UTC-F036-006 — Conversation history is forwarded to Groq
**Arrange:** Provide `history: [{ role: "user", content: "Hello" }, { role: "assistant", content: "Hi" }]`.  
**Act:** Call `aiService.chat(...)`. Capture messages sent to Groq.  
**Assert:** Messages array includes the 2 history items before the new user message.

---

### UTC-F036-007 — Create work item intent triggers creation
**Arrange:** Mock Groq returns `{ action: "CREATE_WORK_ITEM", title: "Fix login bug", projectId: "p1" }` as structured JSON. Mock `workItem.create`.  
**Act:** Call `aiService.chat({ message: "Create a bug Fix login bug in project p1", history: [] }, mockUser)`.  
**Assert:** `workItem.create` was called once with `title: "Fix login bug"`.

---

### UTC-F036-008 — Empty message returns 400
**Arrange:** DTO with `message: ""`.  
**Act:** POST `/ai/chat` with empty message.  
**Assert:** Response is 400 Bad Request.

---

## Frontend — useAiChat hook

---

### UTC-F036-009 — Sends message and appends reply to history
**Arrange:** Mock `fetch` returns `{ reply: "Hello back" }`.  
**Act:** Call `sendMessage("Hello")`.  
**Assert:** `messages` contains user message followed by assistant reply.

---

### UTC-F036-010 — Sets loading true during fetch, false after
**Arrange:** Mock `fetch` with delayed resolution.  
**Act:** Call `sendMessage("Hi")`, check loading mid-flight, then after resolve.  
**Assert:** `loading` is `true` during fetch, `false` after.

---

### UTC-F036-011 — Appends error message on fetch failure
**Arrange:** Mock `fetch` throws network error.  
**Act:** Call `sendMessage("Hi")`.  
**Assert:** `messages` contains an assistant message with error text.

---

### UTC-F036-012 — clearHistory resets messages to empty
**Arrange:** Pre-populate messages with 3 items.  
**Act:** Call `clearHistory()`.  
**Assert:** `messages` is `[]`.
