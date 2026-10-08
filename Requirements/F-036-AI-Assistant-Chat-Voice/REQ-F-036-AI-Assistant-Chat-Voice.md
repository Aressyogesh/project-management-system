# REQ-F-036 — AI Assistant (Chat + Voice)

## 1. User Story
As a PMS user, I want an AI assistant embedded in the application so that I can ask natural-language questions about my projects, tasks, and KPIs — and interact using both typed text and voice — without leaving the current page.

---

## 2. Business Requirements

| ID   | Requirement |
|------|-------------|
| BR-1 | The assistant must be available on every page via a floating widget |
| BR-2 | All AI inference must be free-of-cost (Groq free tier) |
| BR-3 | Voice input and output must work without any third-party paid service |
| BR-4 | The assistant must respect RBAC — employees see only their own data |
| BR-5 | Responses must reflect live database state, not static knowledge |
| BR-6 | The assistant must support multi-turn conversation (remembers context within a session) |

---

## 3. Acceptance Criteria

| ID    | Criterion |
|-------|-----------|
| AC-1  | A floating chat button is visible on all pages for authenticated users |
| AC-2  | Clicking the button opens a chat panel with a message input and send button |
| AC-3  | Typing a message and pressing Send returns an AI-generated response within 10 seconds |
| AC-4  | A microphone button enables voice input via Web Speech API; transcript populates the input field |
| AC-5  | A speaker toggle enables text-to-speech playback of AI responses via Web Speech Synthesis API |
| AC-6  | The assistant can answer "What are my overdue tasks?" with live data |
| AC-7  | The assistant can answer "Summarise project X" with live sprint/task/member data |
| AC-8  | The assistant can answer "What is my KPI score this month?" with live KPI data |
| AC-9  | The assistant can create a work item when asked ("Create a bug titled X in project Y") |
| AC-10 | EMPLOYEE role only receives data scoped to their own assignments |
| AC-11 | SUPER_USER/ADMIN receive organisation-wide data in responses |
| AC-12 | Conversation history persists within the browser session (not in DB) |
| AC-13 | The panel can be minimised/closed without losing conversation history |
| AC-14 | `POST /ai/chat` returns 401 for unauthenticated requests |

---

## 4. Out of Scope

- Persistent conversation history stored in DB
- AI-generated email or Slack notifications
- Fine-tuned or custom-trained models
- Mobile native voice integration
- Multi-language support

---

## 5. Dependencies

| Dependency | Detail |
|------------|--------|
| Groq API key | Free account at console.groq.com; stored as `GROQ_API_KEY` env var and GitHub secret |
| Web Speech API | Chrome/Edge only; Safari partial support — degrade gracefully |
| Existing modules | `PrismaService`, `AuthModule`, `WorkItemsModule`, `AnalyticsModule`, `ProjectsModule` |

---

## 6. DB / Schema Design

No new tables required. Conversation history is held in React component state (session-scoped). The backend is stateless per request.

New environment variable:
```
GROQ_API_KEY=<from console.groq.com>
```

---

## 7. API Contract

### POST /ai/chat

**Auth:** JWT required (`JwtAuthGuard`)

**Request body:**
```json
{
  "message": "What are my overdue tasks?",
  "history": [
    { "role": "user",      "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ]
}
```

**Response 200:**
```json
{
  "reply": "You have 3 overdue tasks: HOR10012 (due 2026-06-01), ..."
}
```

**Response 401:** Unauthenticated  
**Response 500:** Groq API unavailable

---

## 8. Tool Functions (Context Injection)

The backend gathers live data before calling Groq and injects it into the system prompt:

| Tool | Data Fetched |
|------|-------------|
| `getUserContext` | Caller's profile, role, assigned projects |
| `getMyTasks` | Work items assigned to caller (filtered by status/due date) |
| `getProjectSummary` | Project name, progress, sprint, open bugs |
| `getKpiSummary` | Caller's KPI score for current month |
| `getOverdueTasks` | Tasks past due date, not completed |
| `getRiskyProjects` | Projects with <50% sprint completion or critical bugs |

**Create action** (write path):
| Tool | Action |
|------|--------|
| `createWorkItem` | Creates a work item if the user's message contains intent to create |

---

## 9. Frontend Components

| Component | Purpose |
|-----------|---------|
| `AiAssistantButton` | Floating FAB (bottom-right), shows unread dot |
| `AiAssistantPanel` | Slide-up chat panel with message list + input bar |
| `ChatMessage` | Individual message bubble (user / assistant) with markdown |
| `VoiceInputButton` | Microphone button; uses `SpeechRecognition` API |
| `VoiceSpeakerToggle` | On/off toggle for `speechSynthesis` auto-read |
| `useAiChat` | Hook managing message state, API call, loading, error |
| `useVoiceInput` | Hook wrapping `SpeechRecognition` lifecycle |
| `useVoiceOutput` | Hook wrapping `speechSynthesis` |

---

## 10. Free Stack Summary

| Concern | Solution | Cost |
|---------|----------|------|
| LLM inference | Groq API — `llama-3.3-70b-versatile` | Free tier |
| Voice input | Browser `SpeechRecognition` (Web Speech API) | Free |
| Voice output | Browser `speechSynthesis` (Web Speech Synthesis) | Free |
| DB storage | None — session state only | Free |

---

## 11. Non-Functional Requirements

- Response time ≤ 10 seconds (Groq is typically < 2 s on free tier)
- Graceful degradation: if Groq is unavailable, return a clear error message
- Graceful degradation: if `SpeechRecognition` not supported, hide mic button
- No console.log of user messages or API keys in production
