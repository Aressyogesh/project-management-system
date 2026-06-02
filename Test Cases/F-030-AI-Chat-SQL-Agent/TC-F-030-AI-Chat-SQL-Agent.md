# E2E Test Cases

Feature ID   : F-030
Feature Name : AI Chat — SQL Agent on Live PMS Data
Framework    : Playwright
Date         : 2026-06-02

---

## TC-F030-001
Title        : Authenticated User Sends Message and Receives AI Answer
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-1
Priority     : High
Type         : Happy Path

Given  : A seeded DB with projects, work items, and users
  And  : The user is logged in as an Employee
  And  : Ollama is running at http://localhost:11434

When   : The user clicks the floating AI chat button
  And  : Types "Hello, what can you help me with?"
  And  : Clicks Send

Then   : The chat window shows the user's message
  And  : A non-empty assistant reply appears within 30 seconds
  And  : No error message is shown

Expected Response : HTTP 200 with { answer: string, sources: [], conversationId: string }

---

## TC-F030-002
Title        : Ask About Overdue Tasks — Returns Accurate List
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-2
Priority     : High
Type         : Happy Path

Given  : The DB has at least 2 work items with dueDate in the past and status != QA_DONE
  And  : The user is logged in as Admin

When   : The user types "What tasks are overdue?"
  And  : Sends the message

Then   : The response contains the titles of the overdue work items
  And  : The response includes source cards referencing the overdue work items
  And  : Items with status QA_DONE are not listed

Expected Response : HTTP 200; answer mentions overdue item titles; sources array contains work_item references

---

## TC-F030-003
Title        : Ask About Blockers in a Sprint
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-3
Priority     : High
Type         : Happy Path

Given  : The DB has an active sprint named "Sprint 1" with at least 1 BLOCKED work item
  And  : The user is logged in as Project Manager

When   : The user types "What blockers exist in Sprint 1?"
  And  : Sends the message

Then   : The response lists the BLOCKED work item(s) in Sprint 1
  And  : Source cards link to the BLOCKED items
  And  : Items from other sprints are not included

Expected Response : HTTP 200; answer contains BLOCKED item titles; sources filtered to Sprint 1

---

## TC-F030-004
Title        : Ask for Project Progress — Returns Completion Percentages
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-4
Priority     : High
Type         : Happy Path

Given  : At least 2 projects with work items in various statuses exist
  And  : The user is logged in as Admin

When   : The user types "Show project progress"
  And  : Sends the message

Then   : The response lists each project with a completion percentage
  And  : Percentages are between 0 and 100
  And  : A project with all QA_DONE items shows 100%

Expected Response : HTTP 200; answer includes project names and % values

---

## TC-F030-005
Title        : Ask Who Has Highest Workload
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-5
Priority     : Medium
Type         : Happy Path

Given  : Multiple users have open work items assigned
  And  : The user is logged in as Admin

When   : The user types "Who has the highest workload?"
  And  : Sends the message

Then   : The response names the top assignees ordered by open work item count
  And  : The user with most items appears first

Expected Response : HTTP 200; answer lists user names with item counts in descending order

---

## TC-F030-006
Title        : Ask for Weekly Summary
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-6
Priority     : Medium
Type         : Happy Path

Given  : At least 1 work item was completed this week (completedAt >= Monday)
  And  : The user is logged in as Employee

When   : The user types "What work was completed this week?"
  And  : Sends the message

Then   : The response includes the title(s) of items completed since Monday
  And  : Items completed before this week are not listed

Expected Response : HTTP 200; answer references recently completed work items

---

## TC-F030-007
Title        : Ask About Delayed Milestones
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-7
Priority     : Medium
Type         : Happy Path

Given  : At least 1 milestone has status = DELAYED
  And  : The user is logged in as Project Manager

When   : The user types "Which milestones are delayed?"
  And  : Sends the message

Then   : The response lists milestone names with status DELAYED
  And  : Milestones with other statuses are not listed

Expected Response : HTTP 200; answer contains delayed milestone names

---

## TC-F030-008
Title        : Unauthenticated Request Returns 401
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-11
Priority     : High
Type         : Security

Given  : No valid JWT token in the request

When   : POST /api/v1/ai/chat is called without Authorization header
  And  : Body: { "message": "What is overdue?" }

Then   : Response status is 401 Unauthorized
  And  : No AI answer is returned

Expected Response : HTTP 401

---

## TC-F030-009
Title        : Employee Cannot See Other Users' Private Work Items
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-11
Priority     : High
Type         : RBAC

Given  : Employee A has 2 work items assigned
  And  : Employee B has 3 work items assigned (different projects)
  And  : Employee A is logged in

When   : Employee A types "What are all overdue tasks?"
  And  : Sends the message

Then   : The response only contains Employee A's work items
  And  : Employee B's items do not appear in the response or sources

Expected Response : HTTP 200; sources only reference items assigned to Employee A

---

## TC-F030-010
Title        : Message Exceeding 1000 Characters Returns 400
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-1
Priority     : Medium
Type         : Negative

Given  : The user is logged in as any role

When   : POST /api/v1/ai/chat is called with message of 1001 characters

Then   : Response status is 400 Bad Request
  And  : Error message indicates character limit

Expected Response : HTTP 400 with validation error

---

## TC-F030-011
Title        : Empty Message Returns 400
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-1
Priority     : Medium
Type         : Negative

Given  : The user is logged in as any role

When   : POST /api/v1/ai/chat is called with { "message": "" }

Then   : Response status is 400 Bad Request

Expected Response : HTTP 400 with "message cannot be empty"

---

## TC-F030-012
Title        : Chat Widget Is Visible on Dashboard Page
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-12
Priority     : High
Type         : Happy Path

Given  : The user is logged in

When   : The user navigates to /dashboard

Then   : The floating AI chat button is visible in the bottom-right corner
  And  : Hovering over it shows tooltip "Ask AI Assistant"

Expected Response : UI — floating button present with correct tooltip

---

## TC-F030-013
Title        : Full-Page AI Assistant Route Loads at /ai
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-13
Priority     : High
Type         : Happy Path

Given  : The user is logged in

When   : The user navigates to /ai

Then   : The page title "AI Assistant" is visible
  And  : The message input is focused
  And  : An empty state prompt is shown

Expected Response : UI — /ai route renders correctly

---

## TC-F030-014
Title        : Health Endpoint Returns Ollama Status
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-14
Priority     : Medium
Type         : Happy Path

Given  : Ollama is running at http://localhost:11434
  And  : The user is logged in

When   : GET /api/v1/ai/health is called with valid JWT

Then   : Response status is 200
  And  : Body contains { status: "ok", ollama: { reachable: true, model: "llama3.2:3b" } }

Expected Response : HTTP 200 with health object

---

## TC-F030-015
Title        : Multi-Turn Conversation Remembers Context
Feature      : F-030 — AI Chat SQL Agent
AC Covered   : AC-1
Priority     : Medium
Type         : Happy Path

Given  : The user has sent 1 prior message: "Show me overdue tasks"
  And  : The AI replied with a list of tasks
  And  : conversationId was returned

When   : The user sends a follow-up: "Who is assigned to the first one?"
  And  : Includes the prior conversationId and history in the request

Then   : The AI answers using context from the previous turn
  And  : The answer is coherent and references the prior result

Expected Response : HTTP 200; contextually relevant answer without repeating the full overdue list

---

## Test Coverage Matrix

| AC  | Test Case(s)                  |
|-----|-------------------------------|
| AC-1  | TC-001, TC-010, TC-011, TC-015 |
| AC-2  | TC-002                         |
| AC-3  | TC-003                         |
| AC-4  | TC-004                         |
| AC-5  | TC-005                         |
| AC-6  | TC-006                         |
| AC-7  | TC-007                         |
| AC-8  | (covered by TC-002 bug types)  |
| AC-9  | TC-002, TC-003                 |
| AC-10 | TC-002, TC-003                 |
| AC-11 | TC-008, TC-009                 |
| AC-12 | TC-012                         |
| AC-13 | TC-013                         |
| AC-14 | TC-014                         |
