# Unit Test Cases

Feature ID   : F-030
Feature Name : AI Chat — SQL Agent on Live PMS Data
Framework    : Jest (backend) + Vitest + React Testing Library (frontend)
Date         : 2026-06-02

---

## Backend Unit Tests — AiService

---

### UTC-F030-B-001
Title        : chat_ValidMessage_CallsOllamaAndReturnsAnswer
Layer        : Backend
Class / File : AiService
AC Covered   : AC-1
Framework    : Jest

Arrange:
  - Mock OllamaClientService.chat() → returns { answer: "You have 3 overdue tasks.", toolsUsed: [], sources: [] }
  - Mock PrismaService (not called — no tool invoked)
  - Input: { message: "Hello", userId: "user-1", systemRole: "EMPLOYEE" }

Act:
  - result = await aiService.chat({ message: "Hello", userId: "user-1", systemRole: "EMPLOYEE" })

Assert:
  - result.answer is a non-empty string
  - result.sources is an array
  - result.toolsUsed is an array
  - result.conversationId is a valid UUID

---

### UTC-F030-B-002
Title        : chat_EmptyMessage_ThrowsBadRequestException
Layer        : Backend
Class / File : AiService
AC Covered   : AC-1
Framework    : Jest

Arrange:
  - Input: { message: "", userId: "user-1", systemRole: "EMPLOYEE" }

Act:
  - call aiService.chat({ message: "" })

Assert:
  - throws BadRequestException with message "Message cannot be empty"

---

### UTC-F030-B-003
Title        : chat_MessageExceeds1000Chars_ThrowsBadRequestException
Layer        : Backend
Class / File : AiService
AC Covered   : AC-1
Framework    : Jest

Arrange:
  - Input: { message: "a".repeat(1001), userId: "user-1", systemRole: "EMPLOYEE" }

Act:
  - call aiService.chat({ message: "a".repeat(1001) })

Assert:
  - throws BadRequestException with message containing "1000"

---

### UTC-F030-B-004
Title        : getOverdueWorkItems_EmployeeRole_FiltersToAssignedItemsOnly
Layer        : Backend
Class / File : GetOverdueWorkItemsTool
AC Covered   : AC-2, AC-11
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.findMany() → returns [{ id: "wi-1", title: "Fix login", dueDate: "2026-05-01" }]
  - userId: "user-1", systemRole: "EMPLOYEE"

Act:
  - result = await getOverdueWorkItemsTool.execute({ userId: "user-1", systemRole: "EMPLOYEE" })

Assert:
  - PrismaService.workItem.findMany called with where: { assigneeId: "user-1", dueDate: { lt: expect.any(Date) }, status: { notIn: ["QA_DONE"] } }
  - result contains array with the mocked work item

---

### UTC-F030-B-005
Title        : getOverdueWorkItems_AdminRole_ReturnsAllOverdueItems
Layer        : Backend
Class / File : GetOverdueWorkItemsTool
AC Covered   : AC-2, AC-11
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.findMany() → returns [{ id: "wi-2" }, { id: "wi-3" }]
  - userId: "admin-1", systemRole: "ADMIN"

Act:
  - result = await getOverdueWorkItemsTool.execute({ userId: "admin-1", systemRole: "ADMIN" })

Assert:
  - PrismaService.workItem.findMany called WITHOUT assigneeId filter
  - result has 2 items

---

### UTC-F030-B-006
Title        : getBlockedItems_WithSprintId_FiltersToSprint
Layer        : Backend
Class / File : GetBlockedItemsTool
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.findMany() → returns [{ id: "wi-5", status: "BLOCKED", sprintId: "sprint-1" }]
  - Input: { sprintId: "sprint-1", userId: "admin-1", systemRole: "ADMIN" }

Act:
  - result = await getBlockedItemsTool.execute({ sprintId: "sprint-1", userId: "admin-1", systemRole: "ADMIN" })

Assert:
  - PrismaService.workItem.findMany called with where: { status: "BLOCKED", sprintId: "sprint-1" }
  - result has 1 item with status BLOCKED

---

### UTC-F030-B-007
Title        : getProjectProgress_ReturnsCompletionPercentage
Layer        : Backend
Class / File : GetProjectProgressTool
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock PrismaService.project.findMany() → returns [{ id: "proj-1", name: "Alpha" }]
  - Mock PrismaService.workItem.count() →
      total call: returns 10
      completed call: returns 7
  - Input: { userId: "admin-1", systemRole: "ADMIN" }

Act:
  - result = await getProjectProgressTool.execute({ userId: "admin-1", systemRole: "ADMIN" })

Assert:
  - result[0].name is "Alpha"
  - result[0].totalItems is 10
  - result[0].completedItems is 7
  - result[0].progressPercent is 70

---

### UTC-F030-B-008
Title        : getTeamWorkload_ReturnsTopAssigneesSortedByOpenItems
Layer        : Backend
Class / File : GetTeamWorkloadTool
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.groupBy() → returns [
      { assigneeId: "user-2", _count: { id: 8 } },
      { assigneeId: "user-3", _count: { id: 3 } }
    ]
  - Mock PrismaService.user.findMany() → returns [
      { id: "user-2", fullName: "Alice" },
      { id: "user-3", fullName: "Bob" }
    ]

Act:
  - result = await getTeamWorkloadTool.execute({ userId: "admin-1", systemRole: "ADMIN" })

Assert:
  - result[0].fullName is "Alice"
  - result[0].openItems is 8
  - result is sorted descending by openItems

---

### UTC-F030-B-009
Title        : getWeeklySummary_ReturnsItemsCompletedThisWeek
Layer        : Backend
Class / File : GetWeeklySummaryTool
AC Covered   : AC-6
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.findMany() → returns [{ id: "wi-10", completedAt: new Date(), title: "Done task" }]
  - Input: { userId: "user-1", systemRole: "EMPLOYEE" }

Act:
  - result = await getWeeklySummaryTool.execute({ userId: "user-1", systemRole: "EMPLOYEE" })

Assert:
  - PrismaService.workItem.findMany called with where.completedAt.gte = start of current week (Monday)
  - result has 1 item

---

### UTC-F030-B-010
Title        : getMilestoneStatus_ReturnsMilestonesWithDelayedStatus
Layer        : Backend
Class / File : GetMilestoneStatusTool
AC Covered   : AC-7
Framework    : Jest

Arrange:
  - Mock PrismaService.milestone.findMany() → returns [{ id: "m-1", name: "Phase 1", status: "DELAYED" }]
  - Input: { userId: "admin-1", systemRole: "ADMIN" }

Act:
  - result = await getMilestoneStatusTool.execute({ userId: "admin-1", systemRole: "ADMIN" })

Assert:
  - result contains milestone with status DELAYED
  - PrismaService.milestone.findMany called with where: { status: "DELAYED" }

---

### UTC-F030-B-011
Title        : getBugSummary_ReturnsBugWorkItemsGroupedBySeverity
Layer        : Backend
Class / File : GetBugSummaryTool
AC Covered   : AC-8
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.groupBy() → returns [
      { severity: "CRITICAL", _count: { id: 4 } },
      { severity: "MINOR", _count: { id: 9 } }
    ]
  - Input: { userId: "admin-1", systemRole: "ADMIN" }

Act:
  - result = await getBugSummaryTool.execute({ userId: "admin-1", systemRole: "ADMIN" })

Assert:
  - PrismaService.workItem.groupBy called with by: ["severity"], where: { type: "BUG" }
  - result contains CRITICAL: 4, MINOR: 9

---

### UTC-F030-B-012
Title        : getSprintVelocity_ReturnsCommittedVsDeliveredPoints
Layer        : Backend
Class / File : GetSprintVelocityTool
AC Covered   : AC-9
Framework    : Jest

Arrange:
  - Mock PrismaService.workItem.aggregate() →
      committed: { _sum: { storyPoints: 40 } }
      delivered: { _sum: { storyPoints: 32 } }
  - Input: { sprintId: "sprint-1", userId: "admin-1", systemRole: "ADMIN" }

Act:
  - result = await getSprintVelocityTool.execute({ sprintId: "sprint-1", userId: "admin-1", systemRole: "ADMIN" })

Assert:
  - result.committedPoints is 40
  - result.deliveredPoints is 32
  - result.velocityPercent is 80

---

### UTC-F030-B-013
Title        : chat_OllamaUnreachable_ThrowsServiceUnavailableException
Layer        : Backend
Class / File : AiService
AC Covered   : AC-1
Framework    : Jest

Arrange:
  - Mock OllamaClientService.chat() → throws Error("ECONNREFUSED")

Act:
  - call aiService.chat({ message: "What is overdue?", userId: "user-1", systemRole: "EMPLOYEE" })

Assert:
  - throws HttpException with status 503

---

### UTC-F030-B-014
Title        : health_OllamaReachable_ReturnsOkStatus
Layer        : Backend
Class / File : AiService
AC Covered   : AC-14
Framework    : Jest

Arrange:
  - Mock OllamaClientService.ping() → returns true
  - AI_MODEL env var = "llama3.2:3b"

Act:
  - result = await aiService.getHealth()

Assert:
  - result.status is "ok"
  - result.ollama.reachable is true
  - result.ollama.model is "llama3.2:3b"

---

### UTC-F030-B-015
Title        : health_OllamaUnreachable_ReturnsDegradedStatus
Layer        : Backend
Class / File : AiService
AC Covered   : AC-14
Framework    : Jest

Arrange:
  - Mock OllamaClientService.ping() → throws Error("ECONNREFUSED")

Act:
  - result = await aiService.getHealth()

Assert:
  - result.status is "degraded"
  - result.ollama.reachable is false

---

## Frontend Unit Tests — AIChatWidget + useAIChat

---

### UTC-F030-F-001
Title        : AIChatWidget_Renders_FloatingButtonVisible
Layer        : Frontend
Class / File : AIChatWidget.tsx
AC Covered   : AC-12
Framework    : Vitest + React Testing Library

Arrange:
  - Render <AIChatWidget /> inside authenticated context

Act:
  - Query for button with aria-label="Open AI Assistant"

Assert:
  - Button is present in the DOM
  - Button is visible (not hidden)

---

### UTC-F030-F-002
Title        : AIChatWidget_ClickButton_OpensChatWindow
Layer        : Frontend
Class / File : AIChatWidget.tsx
AC Covered   : AC-12
Framework    : Vitest + React Testing Library

Arrange:
  - Render <AIChatWidget />
  - Chat window is initially closed

Act:
  - Click the floating button

Assert:
  - AIChatWindow becomes visible
  - Input field is focused

---

### UTC-F030-F-003
Title        : ChatInput_EmptySubmit_DoesNotCallApi
Layer        : Frontend
Class / File : ChatInput.tsx
AC Covered   : AC-1
Framework    : Vitest + React Testing Library

Arrange:
  - Render <ChatInput onSend={mockSend} />
  - Input is empty

Act:
  - Click send button

Assert:
  - mockSend not called

---

### UTC-F030-F-004
Title        : useAIChat_SendMessage_AddsUserMessageToHistory
Layer        : Frontend
Class / File : useAIChat.ts
AC Covered   : AC-1
Framework    : Vitest

Arrange:
  - Mock ai.api.ts sendMessage() → resolves with { answer: "3 overdue", sources: [], toolsUsed: [], conversationId: "c-1" }
  - Initialize hook: const { messages, sendMessage } = useAIChat()

Act:
  - await sendMessage("What is overdue?")

Assert:
  - messages contains { role: "user", content: "What is overdue?" }
  - messages contains { role: "assistant", content: "3 overdue" }

---

### UTC-F030-F-005
Title        : useAIChat_ApiError_SetsErrorState
Layer        : Frontend
Class / File : useAIChat.ts
AC Covered   : AC-1
Framework    : Vitest

Arrange:
  - Mock ai.api.ts sendMessage() → rejects with Error("Network error")

Act:
  - await sendMessage("What is overdue?")

Assert:
  - error state is set to a non-null string
  - isLoading is false

---

### UTC-F030-F-006
Title        : ChatMessage_AssistantRole_RendersSourceCards
Layer        : Frontend
Class / File : ChatMessage.tsx
AC Covered   : AC-10
Framework    : Vitest + React Testing Library

Arrange:
  - message = { role: "assistant", content: "You have 2 overdue tasks.",
      sources: [{ type: "work_item", id: "wi-1", title: "Fix login bug" }] }

Act:
  - Render <ChatMessage message={message} />

Assert:
  - Source card with text "Fix login bug" is rendered
  - Source card is a clickable link element

---

### UTC-F030-F-007
Title        : AIAssistantPage_Renders_WithInputAndEmptyState
Layer        : Frontend
Class / File : AIAssistantPage.tsx
AC Covered   : AC-13
Framework    : Vitest + React Testing Library

Arrange:
  - Render <AIAssistantPage /> with empty message history

Act:
  - Query for heading and input

Assert:
  - Page heading "AI Assistant" is present
  - Text input is present and enabled
  - Empty state message is shown (e.g. "Ask me anything about your projects")

---

## Test Execution Summary

| Layer    | Total Tests | Target |
|----------|-------------|--------|
| Backend  | 15          | 15/15 PASS |
| Frontend | 7           | 7/7 PASS |
| **Total**| **22**      | **22/22 PASS** |
