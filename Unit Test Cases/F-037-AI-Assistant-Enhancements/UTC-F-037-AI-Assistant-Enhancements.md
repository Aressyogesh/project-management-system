# UTC-F-037 — AI Assistant Enhancements (Unit Test Cases)

**Feature:** F-037 — AI Assistant Enhancements  
**Suite:** `ai.service.spec.ts`  
**Date:** 2026-06-08

---

## UTC-F037-001 — Daily focus context fetches overdue + today tasks
**Arrange:** message = "what should I focus on today?"  
**Act:** `service.chat({ message, history: [] }, mockUser)`  
**Assert:** `prisma.workItem.findMany` called with filter `status: { not: 'QA_DONE' }` and `dueDate` range covering today

---

## UTC-F037-002 — Daily focus context fetches active sprint
**Arrange:** message = "what should I focus on today?"  
**Act:** `service.chat({ message, history: [] }, mockUser)`  
**Assert:** `prisma.sprint.findFirst` called with `status: 'ACTIVE'`

---

## UTC-F037-003 — Sprint health context fetched on sprint keywords
**Arrange:** message = "is our sprint on track?"  
**Act:** `service.chat({ message, history: [] }, mockUser)`  
**Assert:** `prisma.sprint.findFirst` called

---

## UTC-F037-004 — Sprint health not fetched for unrelated message
**Arrange:** message = "show my tasks"  
**Act:** `service.chat({ message, history: [] }, mockUser)`  
**Assert:** `prisma.sprint.findFirst` not called

---

## UTC-F037-005 — Action intent parsed from LLM reply
**Arrange:** Groq mock returns `"Sure!\nACTION:{\"type\":\"UPDATE_TASK_STATUS\",\"workItemId\":\"w1\",\"displayId\":\"PMS-1\",\"title\":\"Fix bug\",\"newStatus\":\"QA_DONE\",\"label\":\"Mark PMS-1 as Done\"}"`  
**Act:** `service.chat({ message: 'mark PMS-1 as done', history: [] }, mockUser)`  
**Assert:** response has `action.type === 'UPDATE_TASK_STATUS'` and `reply` does not contain the `ACTION:{...}` token

---

## UTC-F037-006 — No action field when LLM reply has no ACTION token
**Arrange:** Groq mock returns plain text reply  
**Act:** `service.chat({ message: 'hello', history: [] }, mockUser)`  
**Assert:** response has no `action` field (undefined)

---

## UTC-F037-007 — Action intent includes work items in context
**Arrange:** message = "mark PMS-1 as done"  
**Act:** `service.chat({ message, history: [] }, mockUser)`  
**Assert:** `prisma.workItem.findMany` called (context needed so LLM can resolve task)

---

## UTC-F037-008 — Proactive greeting includes overdue count
**Arrange:** `prisma.workItem.count` mock returns 3; `prisma.sprint.findFirst` mock returns sprint ending in 2 days  
**Act:** `service.chat({ message: '__greet__Yogesh', history: [] }, mockUser)`  
**Assert:** reply contains "3 overdue" and "2 days"

---

## UTC-F037-009 — Proactive greeting with no alerts is clean
**Arrange:** `prisma.workItem.count` returns 0; `prisma.sprint.findFirst` returns null  
**Act:** `service.chat({ message: '__greet__Yogesh', history: [] }, mockUser)`  
**Assert:** reply does not mention "overdue" or "sprint"

---

## UTC-F037-010 — Model constant is llama-3.3-70b-versatile
**Arrange:** capture Groq request body  
**Act:** `service.chat({ message: 'hello', history: [] }, mockUser)`  
**Assert:** `body.model === 'llama-3.3-70b-versatile'`
