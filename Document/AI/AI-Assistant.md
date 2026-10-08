# F-026 — AI Assistant (Chat + Voice + Vector RAG)

## Context

The PMS has rich, structured data across 23+ Prisma models — work items, sprints, timesheets, leave, KPI, milestones. Today users must navigate multiple pages to get answers. The goal is a persistent AI assistant panel that lets any user ask natural-language questions ("What tasks are overdue in Project X?", "Summarize my sprint"), get answers grounded in live DB data via RAG, and optionally take actions (create tasks, update status, log time) — all via text or voice.

**Key decisions:**
- Vector DB: pgvector on existing Supabase PostgreSQL (no new infra)
- LLM: Claude API — `claude-sonnet-4-6` with streaming + tool use
- Embeddings: Voyage AI `voyage-3` (1024 dims) — Anthropic's recommended partner
- Voice: Browser Web Speech API (zero cost, Chrome/Edge)
- Scope: RAG for read queries + Claude tool use for write actions

---

## Feature ID

**F-026** (next after F-025 leave management, per FEATURES.md)

---

## Architecture Overview

```
Browser                    NestJS Backend              External Services
───────                    ──────────────              ─────────────────
AssistantFAB               AiAssistantController       Claude API (claude-sonnet-4-6)
  └─ AssistantPanel   SSE  AiAssistantService          Voyage AI (voyage-3 embeddings)
       └─ ChatInput ──────▶ ├─ EmbeddingService  ────▶ voyage-ai API
       └─ VoiceButton       ├─ VectorSearchService
            (Web Speech)    ├─ ToolExecutorService
                            └─ IndexingService
                                          ↕
                                    PostgreSQL
                               (pgvector extension)
                               DocumentChunk table
                               ChatSession / ChatMessage
```

---

## Database Schema (Prisma + pgvector)

### New Prisma models (add to `backend/prisma/schema.prisma`)

```prisma
model ChatSession {
  id        String        @id @default(uuid())
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String?                         // Auto-set from first user message (first 60 chars)
  messages  ChatMessage[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@map("chat_sessions")
}

model ChatMessage {
  id        String      @id @default(uuid())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String                          // 'user' | 'assistant'
  content   String      @db.Text
  toolCalls Json?                           // Claude tool call metadata (for replay)
  createdAt DateTime    @default(now())

  @@map("chat_messages")
}

model DocumentChunk {
  id         String   @id @default(uuid())
  sourceType String                         // 'work_item' | 'project' | 'milestone' | 'comment'
  sourceId   String
  content    String   @db.Text             // Plain text that was embedded
  metadata   Json                          // {projectId, assigneeId, status, title, ...}
  // NOTE: embedding vector(1024) column added via raw SQL migration below
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([sourceType, sourceId])
  @@map("document_chunks")
}
```

### Raw SQL migration (run after prisma migrate)

```sql
-- Enable pgvector (Supabase already has this available)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to document_chunks
ALTER TABLE document_chunks ADD COLUMN embedding vector(1024);

-- HNSW index for fast cosine similarity search
CREATE INDEX document_chunks_embedding_idx
  ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

### User model addition

```prisma
// Add to existing User model:
chatSessions ChatSession[]
```

---

## Backend Module

**Location:** `backend/src/ai-assistant/`

```
ai-assistant/
├── ai-assistant.module.ts
├── ai-assistant.controller.ts
├── ai-assistant.service.ts      ← orchestration
├── embedding.service.ts         ← Voyage AI API calls
├── vector-search.service.ts     ← pgvector $queryRaw
├── indexing.service.ts          ← sync PMS data → DocumentChunk
├── tools/
│   ├── tool-definitions.ts      ← Claude tool JSON schemas
│   └── tool-executor.service.ts ← executes tool calls via Prisma
└── dto/
    ├── chat.dto.ts
    └── send-message.dto.ts
```

### API Endpoints

| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/api/v1/ai-assistant/sessions` | JwtAuthGuard | Create new chat session |
| GET | `/api/v1/ai-assistant/sessions` | JwtAuthGuard | List user's sessions |
| DELETE | `/api/v1/ai-assistant/sessions/:id` | JwtAuthGuard (owner) | Delete session |
| POST | `/api/v1/ai-assistant/sessions/:id/messages` | JwtAuthGuard | Send message — **SSE stream** |
| POST | `/api/v1/ai-assistant/index` | Roles(SUPER_USER, ADMIN) | Trigger manual re-index |

### EmbeddingService

```typescript
// Calls POST https://api.voyageai.com/v1/embeddings
// model: 'voyage-3', input_type: 'query' (for search) or 'document' (for indexing)
// Returns: number[] (1024 dims)
// Env var: VOYAGE_API_KEY
```

### VectorSearchService

```typescript
// Uses Prisma $queryRaw for pgvector similarity
const results = await this.prisma.$queryRaw`
  SELECT id, source_type, source_id, content, metadata,
         1 - (embedding <=> ${embeddingVector}::vector) AS similarity
  FROM document_chunks
  WHERE 1 - (embedding <=> ${embeddingVector}::vector) > 0.6
  ORDER BY similarity DESC
  LIMIT 5
`;
```

### IndexingService — what gets indexed

| Source | Content template | Metadata |
|--------|-----------------|----------|
| WorkItem | `"[TYPE] {title}: {description} — Status: {status}, Assignee: {name}"` | projectId, status, type, assigneeId |
| Project | `"Project {name} ({type}): {description} — Status: {status}"` | clientId, departmentId, status |
| Milestone | `"Milestone: {description} — Due: {dueDate}, Status: {status}"` | projectId, status |
| WorkItemComment | `"Comment on '{workItemTitle}': {content}"` | workItemId, projectId, userId |

Re-index trigger: called from existing `WorkItemsService.create()`, `.update()`, `ProjectsService.create()`, etc.

### Claude Tool Definitions (tool-definitions.ts)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_my_tasks` | Tasks/work items assigned to the caller | `{ status?, projectId? }` |
| `get_project_summary` | Project overview + sprint status | `{ projectId }` |
| `search_work_items` | Search by keyword, status, assignee | `{ query, projectId?, status?, assigneeId? }` |
| `get_sprint_status` | Active sprint + work items | `{ projectId }` |
| `get_team_capacity` | Allocation calendar summary | `{ startDate, endDate, userId? }` |
| `create_work_item` | Create a task/story/bug | `{ projectId, type, title, description?, assigneeId?, priority? }` |
| `update_work_item_status` | Update work item status | `{ workItemId, status }` |
| `log_timesheet` | Log hours against a work item | `{ workItemId, date, hoursWorked, description? }` |

### AiAssistantService.chat() — full data flow

```
1. Embed user message (EmbeddingService, input_type='query')
2. VectorSearch → top 5 DocumentChunks (RAG context)
3. Load last 20 ChatMessages from session (history)
4. Build Anthropic SDK messages array:
   - system: "You are PMS Assistant for {company}. Today: {date}. User: {name} ({role})."
   - Inject RAG chunks as a <context> block in first human turn
   - Append conversation history
   - Append current user message
5. Call claude-sonnet-4-6 with tool_choice='auto', stream=true
6. Stream tokens to frontend via SSE
7. On stop_reason='tool_use':
   a. Execute tool via ToolExecutorService
   b. Append tool_result to messages
   c. Loop back to step 5 (continue generation)
8. On stop_reason='end_turn':
   a. Save user ChatMessage + assistant ChatMessage to DB
   b. If session has no title, set title = first 60 chars of user message
   c. Close SSE stream
```

### SSE streaming endpoint

```typescript
@Sse('sessions/:id/messages')
async streamMessage(@Param('id') sessionId: string, @Body() dto: SendMessageDto, @Request() req) {
  return this.aiAssistantService.streamChat(sessionId, dto.content, req.user);
}
// Returns: Observable<MessageEvent> — each event is a JSON {type, delta} chunk
```

---

## Frontend Module

**Location:** `frontend/src/features/ai-assistant/`

```
ai-assistant/
├── components/
│   ├── AssistantFAB.tsx        ← Floating action button (bottom-right, always visible)
│   ├── AssistantPanel.tsx      ← Right slide-in drawer (w-96, full height)
│   ├── SessionList.tsx         ← Past sessions sidebar (optional)
│   ├── ChatMessageBubble.tsx   ← User (right/blue) vs assistant (left/gray) bubbles
│   ├── MarkdownRenderer.tsx    ← Render assistant markdown (use 'react-markdown')
│   ├── ChatInput.tsx           ← Textarea + Send button + VoiceButton
│   └── VoiceButton.tsx         ← Mic icon with recording pulse animation
├── hooks/
│   ├── useChat.ts              ← SSE streaming, message list, session management
│   └── useVoice.ts             ← Web Speech API: STT (recognition) + TTS (synthesis)
└── api/
    └── assistantApi.ts         ← createSession, getSessions, sendMessage (SSE)
```

### AssistantFAB placement

Render `<AssistantFAB />` in `AppLayout.tsx` alongside Sidebar + Topbar — so it appears on every protected page. The FAB opens/closes `AssistantPanel` via local state.

### useVoice hook (Web Speech API)

```typescript
// STT: window.SpeechRecognition (prefixed in some browsers)
// - startRecording() → continuous recognition → onresult appends to transcript
// - stopRecording() → finalize text → emit to ChatInput

// TTS: window.speechSynthesis
// - speak(text) → utterance with rate/pitch config
// - Voice toggle in AssistantPanel header (speaker icon)
```

### SSE client (assistantApi + useChat)

```typescript
// Native EventSource doesn't support POST body, so use fetch with ReadableStream
const response = await fetch(`/api/v1/ai-assistant/sessions/${sessionId}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ content }),
});
// Read stream chunks, parse SSE events, append to message state
```

### UI Design

- **FAB**: Purple/indigo robot icon, bottom-right corner, z-50
- **Panel**: Slides in from right, `w-96`, white background, shadow-xl
- **Header**: "PMS Assistant" + mic toggle + close button
- **Messages area**: Scrollable, user bubbles right-aligned (blue), assistant left-aligned (gray), markdown rendered
- **Input**: Multi-line textarea, Enter to send (Shift+Enter for newline), mic button shows red pulse when recording
- **Streaming**: Tokens appear character by character (typewriter effect via useState append)
- **Tool calls**: Show a small "Searching..." / "Updating..." inline indicator when Claude is calling a tool

---

## Environment Variables (new)

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...           # Claude API
VOYAGE_API_KEY=pa-...                  # Voyage AI embeddings
```

---

## Installation (new packages)

```bash
# Backend
npm install @anthropic-ai/sdk voyageai

# Frontend
npm install react-markdown         # Render assistant markdown responses
```

---

## Phased Build Order (within F-026)

### Phase A — DB + Backend Core
1. Add `ChatSession`, `ChatMessage`, `DocumentChunk` to schema.prisma
2. Run `npx prisma db push` (local) — raw SQL for pgvector column
3. `EmbeddingService` (Voyage AI) + `VectorSearchService` (pgvector `$queryRaw`)
4. `IndexingService` — index existing WorkItems + Projects on startup
5. `AiAssistantModule` — basic POST endpoint (non-streaming, full response)
6. Unit test: embedding + vector search round-trip

### Phase B — Claude Integration + Tool Use
7. `ToolDefinitions` (8 tools) + `ToolExecutorService`
8. `AiAssistantService.chat()` — RAG → Claude → tool loop
9. Convert endpoint to SSE streaming
10. Hook re-indexing into `WorkItemsService` and `ProjectsService`

### Phase C — Frontend Panel
11. `assistantApi.ts` (SSE fetch streaming)
12. `useChat` hook + `useVoice` hook
13. `AssistantPanel` + `ChatMessageBubble` + `ChatInput`
14. `AssistantFAB` wired into `AppLayout.tsx`

### Phase D — Voice
15. `VoiceButton` with STT mic recording
16. TTS toggle in panel header (speaks assistant responses)
17. Browser compatibility check (Chrome/Edge only, graceful hide in Firefox)

---

## RBAC

- All authenticated users can use the assistant (JwtAuthGuard)
- Tool executor respects caller's role — e.g., `create_work_item` checks if user has project access; `log_timesheet` only allowed for self
- `POST /index` restricted to SUPER_USER / ADMIN

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add `ChatSession`, `ChatMessage`, `DocumentChunk`, `User.chatSessions` |
| `backend/src/app.module.ts` | Import `AiAssistantModule` |
| `backend/src/work-items/work-items.service.ts` | Call `IndexingService.indexWorkItem()` on create/update |
| `backend/src/projects/projects.service.ts` | Call `IndexingService.indexProject()` on create/update |
| `frontend/src/App.tsx` | No route change needed — panel is in AppLayout |
| `frontend/src/components/layout/AppLayout.tsx` | Add `<AssistantFAB />` |

---

## Verification Checklist

1. **DB**: `SELECT * FROM document_chunks LIMIT 5;` — confirm embeddings stored after indexing
2. **Vector search**: `SELECT content, 1-(embedding<=>'{...}'::vector) as sim FROM document_chunks ORDER BY sim DESC LIMIT 3;` — confirm similarity scores
3. **Chat API**: POST to `/api/v1/ai-assistant/sessions` → create session → POST message → receive streamed SSE response
4. **Tool use**: Ask "Create a task called Test Bug in Project Alpha" → Claude should call `create_work_item` → confirm row in DB
5. **RAG**: Ask about a specific work item by name → confirm assistant answer matches DB record
6. **Voice**: Open panel in Chrome → click mic → speak → confirm transcript appears in input → send → TTS reads response
7. **RBAC**: Employee asking to create a work item in a project they're not a member of → tool executor returns error → Claude relays it gracefully

---

## Cost Analysis

### Claude API (claude-sonnet-4-6)

**Per message token estimate:**

| Token source | Tokens |
|---|---|
| System prompt + RAG context (5 chunks) | ~1,250 |
| Conversation history (last 20 messages) | ~2,000 |
| User message | ~75 |
| Assistant response | ~350 |
| **Total per message** | **~3,675** |

**Pricing:** Input $3/MTok · Output $15/MTok

| Usage scenario | Messages/month | Claude cost/month |
|---|---|---|
| Light (15 users, 5 msg/day, 22 days) | ~1,650 | ~$10–14 |
| Medium (40 users, 8 msg/day, 22 days) | ~7,000 | ~$50–70 |
| Heavy (100 users, 10 msg/day, 22 days) | ~22,000 | ~$150–200 |

Prompt caching on the system prompt reduces input costs by ~30–40% at medium/heavy usage.

### Voyage AI (voyage-3 embeddings)

Free tier: **200 million tokens/month**. At even heavy usage (~1.65M tokens/month), this stays entirely within the free tier. Cost: **$0/month**.

### pgvector on Supabase

No additional cost — PostgreSQL extension on the existing Supabase instance. Storage for 10,000 embedding vectors ≈ 40 MB.

### Web Speech API

Free — runs entirely in the browser with no external API calls.

### Total Monthly Cost Summary

| Scenario | Total/month |
|---|---|
| Light | **~$10–15** |
| Medium | **~$50–75** |
| Heavy | **~$150–200** |
| **Typical (30–50 DAU)** | **~$30–80** |

### Cost Reduction Tips

1. **Prompt caching** — cache the system prompt (saves ~30% on Claude input tokens)
2. **Limit history window** — last 10 messages instead of 20 (halves history tokens)
3. **Limit RAG chunks** — 3 instead of 5 (saves ~450 tokens/message)
4. **Per-user rate limit** — e.g., 20 queries/day cap per employee
5. **Model tiering** — use `claude-haiku-4-5` for simple factual lookups, `claude-sonnet-4-6` for complex reasoning (Haiku is ~20× cheaper on output)
