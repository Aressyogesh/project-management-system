# AI Assistant Plan — Project Management System
## Version 1.1 | Created: 2026-06-02 | Updated: 2026-06-02

---

## Overview

A two-phase AI assistant embedded inside the PMS that lets users ask natural language questions about project data and documents. Phase 1 uses SQL queries against live DB tables. Phase 2 adds a pgvector knowledge base for unstructured documents.

**AI Runtime:** Ollama (local) → cloud provider TBD for production
**Local Model:** `llama3.2:3b` (tool calling supported)
**Backend:** NestJS AI module (`src/ai/`)
**Frontend:** Floating chat widget (all pages) + dedicated `/ai` route

---

## Deployment Strategy

### Phase 1 Build Target — Local Only
Build and validate the entire AI assistant on Ollama locally.
Production deployment is deferred — decided after local build is stable.

```
LOCAL DEVELOPMENT (now)
────────────────────────────────────────
Frontend  → http://localhost:5173  (Vite)
Backend   → http://localhost:3000  (NestJS)
Database  → localhost:5432         (PostgreSQL)
Ollama    → http://localhost:11434 (Ollama)
  └─ Model: llama3.2:3b
```

### Production (future — not yet planned)
Options to evaluate after local build is complete:
- Self-hosted VPS with Ollama (Hetzner ~€4.5/mo)
- Gemini Flash (free cloud API)
- Groq (free cloud API)

### Provider Abstraction (zero code change to switch)

The NestJS AI module talks to the **OpenAI-compatible API** that Ollama exposes.
Switching providers in production = change 3 env vars only.

```env
# Local (.env)
AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=ollama
AI_MODEL=llama3.2:3b

# Production (future — swap these only)
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_API_KEY=your-gemini-key
AI_MODEL=gemini-2.0-flash
```

---

## Combined Architecture

```
User Question
      │
      ▼
POST /api/v1/ai/chat
      │
      ▼
   AI Router
(Claude classifies intent)
      │
      ├── Task / Project Question
      │           │
      │           ▼
      │        SQL Agent
      │     (Prisma queries)
      │
      └── Document Question
                  │
                  ▼
            RAG Agent
          (pgvector search)
```

---

## Phase 1 — AI on Existing Structured Data

**Feature ID:** F-030
**No PDFs yet.** AI answers questions directly from live DB tables.

### Data Sources

| Table | Purpose |
|-------|---------|
| `projects` | Status, dates, client, type, progress |
| `work_items` | Core JIRA items — epics, stories, tasks, subtasks, bugs |
| `sprints` | Sprint metadata (name, start/end, active flag) |
| `milestones` | Delivery milestones per project |
| `tasks` | Legacy task model |
| `comments` | Work item activity / discussion |
| `users` | Team members, roles |
| `project_members` | Who is on which project, project role |
| `timesheet_entries` | Hours logged per work item |

### Example Questions Phase 1 Can Answer

```
"What tasks are overdue?"
"Show project progress."
"What blockers exist in Sprint 3?"
"Summarize work completed this week."
"Who has the highest workload?"
"Which milestones are delayed?"
"How many open bugs are critical?"
"What is the velocity of Sprint 2?"
```

### Why SQL — Not Vector Search — for Phase 1

Vector search is approximate. For structured questions like "what is overdue?"
a direct SQL query gives precise, reliable answers:

```sql
SELECT *
FROM work_items
WHERE due_date < NOW()
  AND status != 'Completed';
```

This approach is more accurate, faster, and cheaper than embedding + cosine search
for any question that maps to a Prisma query.

### Phase 1 Pre-Build Schema Inspection

Run before building:

```sql
-- work_items schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'work_items'
ORDER BY ordinal_position;

-- tasks schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;
```

`work_items` has 39 columns and 322 records — it is the core of Phase 1.

### Phase 1 — Backend Structure

```
backend/src/ai/
├── ai.module.ts
├── ai.controller.ts              ← POST /api/v1/ai/chat
├── ai.service.ts                 ← orchestrates router + tools
├── ai-router.service.ts          ← Claude classifies intent
├── sql-agent.service.ts          ← runs safe read-only Prisma queries
├── tools/
│   ├── get-overdue-tasks.tool.ts
│   ├── get-sprint-summary.tool.ts
│   ├── get-project-progress.tool.ts
│   ├── get-team-workload.tool.ts
│   ├── get-milestone-status.tool.ts
│   ├── get-bug-summary.tool.ts
│   └── get-weekly-summary.tool.ts
└── dto/
    ├── chat-message.dto.ts
    └── chat-response.dto.ts
```

### Phase 1 — Claude Tool Calling Pattern

Each Prisma query is registered as a **Claude tool**. Claude picks which tool(s) to call based on the user's question, then we execute the query and return results for Claude to summarise.

```typescript
// Tool definition example passed to Claude
{
  name: "get_overdue_tasks",
  description: "Returns all work items past their due date and not yet completed",
  input_schema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Optional project filter" },
      assigneeId: { type: "string", description: "Optional assignee filter" }
    }
  }
}
```

### Phase 1 — API Contract

```
POST /api/v1/ai/chat
Authorization: Bearer <jwt>

Request body:
{
  "message": "What tasks are overdue in Project Alpha?",
  "projectId": "uuid (optional — scope to a project)",
  "conversationId": "uuid (optional — multi-turn history)"
}

Response:
{
  "answer": "There are 5 overdue tasks in Project Alpha...",
  "sources": [
    { "type": "work_item", "id": "...", "title": "...", "dueDate": "..." }
  ],
  "toolsUsed": ["get_overdue_tasks"],
  "conversationId": "uuid"
}
```

### Phase 1 — RBAC Rules

The SQL agent applies the same access rules as the existing API — the logged-in user's JWT context is injected into every Prisma query.

| Role | Query Scope |
|------|-------------|
| Super User / Admin | Full system — all projects, all users |
| Project Manager | Own projects + team data |
| Team Lead | Own project data |
| Developer / QA | Own assigned tasks + work items |
| Employee | Own data only |

### Phase 1 — Frontend Components

```
frontend/src/features/ai/
├── components/
│   ├── AIChatWidget.tsx      ← floating bubble visible on all pages
│   ├── AIChatWindow.tsx      ← slide-in chat panel
│   ├── ChatMessage.tsx       ← user + assistant message bubbles
│   ├── ChatInput.tsx         ← text field + send button + (future) mic
│   └── SourceCard.tsx        ← clickable link to referenced task/project
├── pages/
│   └── AIAssistantPage.tsx   ← full-page /ai route
└── hooks/
    └── useAIChat.ts          ← message state, streaming, loading
```

---

## Phase 2 — Knowledge Base (RAG + pgvector)

**Feature ID:** F-031
**Goal:** AI answers questions from uploaded documents — BRD, SRS, requirements,
meeting notes, architecture docs, client PDFs.

### New Table

```sql
CREATE TABLE knowledge_documents (
    id          BIGSERIAL PRIMARY KEY,
    company_id  INTEGER,
    project_id  INTEGER,
    file_name   TEXT,
    chunk_no    INTEGER,
    content     TEXT,
    embedding   VECTOR(768),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX knowledge_documents_embedding_idx
    ON knowledge_documents
    USING hnsw (embedding vector_cosine_ops);
```

### Document Types to Store

- BRD (Business Requirements Documents)
- SRS (Software Requirements Specifications)
- Requirements docs
- Meeting notes
- Architecture documents
- Client documents
- PDFs

### Embedding Model Options

| Option | Model | Dims | Notes |
|--------|-------|------|-------|
| Recommended | Voyage AI `voyage-3-lite` | 768 | Best price/quality |
| Alternate | OpenAI `text-embedding-3-small` | 1536 | Widely supported |
| Offline | `nomic-embed-text` via Ollama | 768 | No external API |

### Document Ingestion Pipeline

```
Upload PDF / DOCX
      │
      ▼
Extract text (pdf-parse / mammoth)
      │
      ▼
Chunk into 512-token segments
(50-token overlap between chunks)
      │
      ▼
Generate embeddings (batch API call)
      │
      ▼
Store rows in knowledge_documents
(one row per chunk)
```

### Phase 2 — Additional API Endpoints

```
POST   /api/v1/ai/documents/upload   ← upload, chunk, embed, store
GET    /api/v1/ai/documents          ← list all knowledge documents
DELETE /api/v1/ai/documents/:id      ← remove document + its embeddings
```

The existing `POST /api/v1/ai/chat` endpoint automatically routes to the RAG
agent when the AI router classifies the question as a document question.

### Phase 2 — Combined Routing Logic

```
User: "What does the BRD say about the payment module?"
      │
      ▼
AI Router → intent = "document_question"
      │
      ▼
RAG Agent:
  1. Embed the question
  2. Cosine similarity search on knowledge_documents
  3. Retrieve top-5 matching chunks
  4. Send chunks + question to Claude
      │
      ▼
Claude generates answer with chunk citations


User: "Which tasks are overdue in Sprint 3?"
      │
      ▼
AI Router → intent = "structured_data_question"
      │
      ▼
SQL Agent:
  1. Claude selects tool: get_overdue_tasks
  2. Prisma query runs (RBAC-filtered)
  3. Results returned to Claude
      │
      ▼
Claude generates answer with source links to tasks
```

---

## Phase 3 — Voice Assistant (Future)

**Feature ID:** F-032

| Component | Technology |
|-----------|-----------|
| Speech-to-Text | Web Speech API (browser-native) or Whisper API |
| Text-to-Speech | Web Speech API `speechSynthesis` or ElevenLabs |
| Trigger | Push-to-talk mic button in `ChatInput.tsx` |
| Flow | Record → STT → `/api/v1/ai/chat` → TTS playback |

---

## Technology Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| AI model | Claude `claude-sonnet-4-6` | Already on Anthropic ecosystem |
| Fast/cheap queries | Claude `claude-haiku-4-5` | Lower cost for simple lookups |
| Tool calling | Anthropic tool use API | Native, structured, reliable |
| Streaming | SSE (Server-Sent Events) | Simple with NestJS, no WS overhead |
| Vector extension | pgvector on existing Postgres | No new infrastructure |
| Embeddings (Phase 2) | Voyage AI `voyage-3-lite` (768 dims) | Best price/quality ratio |
| Conversation memory | Last 10 turns in request payload | Stateless server, simple |

---

## Environment Variables Required

```env
# backend/.env — Local development
AI_BASE_URL=http://localhost:11434/v1   # Ollama OpenAI-compatible endpoint
AI_API_KEY=ollama                        # Ollama ignores this but SDK requires it
AI_MODEL=llama3.2:3b                     # Model to use for chat + tool calling

# Phase 2 only (embeddings — provider TBD)
# EMBEDDING_API_KEY=...
# EMBEDDING_MODEL=...
```

### Ollama Setup (one-time, local)

```bash
# 1. Install Ollama (Windows)
# Download from https://ollama.com/download

# 2. Pull the model
ollama pull llama3.2:3b

# 3. Verify it runs
ollama run llama3.2:3b "say hello"

# 4. Ollama API is now available at http://localhost:11434
```

---

## Feature Build Order

| Feature | ID | Phase | Status |
|---------|-----|-------|--------|
| AI Chat — SQL Agent on live PMS data | F-030 | 1 | **Next to build** |
| AI Knowledge Base — pgvector RAG | F-031 | 2 | Planned |
| AI Voice Assistant | F-032 | 3 | Future |

---

## F-030 Pre-Build Checklist

- [x] Install Ollama locally + pull `llama3.2:3b`
- [ ] Add `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` to backend `.env`
- [ ] Install `ollama` npm package in backend (`npm install ollama`)
- [x] Schema inspection complete (Prisma schema reviewed)
- [ ] Write `Requirements/F-030-AI-Chat-SQL-Agent/REQ-F-030.md`
- [ ] Write `Unit Test Cases/F-030-AI-Chat-SQL-Agent/UTC-F-030.md`
- [ ] Write `Test Cases/F-030-AI-Chat-SQL-Agent/TC-F-030.md`
- [ ] Implement `backend/src/ai/` module
- [ ] Implement frontend chat widget
- [ ] Code review report
- [ ] Security review report
- [ ] HTML test reports + PR

---

*AI-Plan version: 1.0 — Created: 2026-06-02*
