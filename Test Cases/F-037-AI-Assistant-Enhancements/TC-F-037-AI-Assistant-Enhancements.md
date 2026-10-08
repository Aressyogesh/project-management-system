# TC-F-037 — AI Assistant Enhancements (E2E Test Cases)

**Feature:** F-037 — AI Assistant Enhancements  
**Date:** 2026-06-08

---

## TC-F037-001 — Daily focus summary
**Given** user is logged in and has overdue tasks  
**When** user types "what should I focus on today?"  
**Then** reply lists overdue tasks, tasks due today, and sprint end date if within 5 days

## TC-F037-002 — Mark task as done via chat
**Given** user has task PMS-42 assigned  
**When** user types "mark PMS-42 as done"  
**Then** confirmation card appears showing task title and new status  
**And** on clicking Confirm, task status changes to QA_DONE on the board

## TC-F037-003 — Cancel action — no side effect
**Given** confirmation card is visible for mark-as-done  
**When** user clicks Cancel  
**Then** task status is unchanged and chat returns to normal

## TC-F037-004 — Log timesheet hours via chat
**Given** user has task PMS-38 assigned  
**When** user types "log 3 hours on PMS-38"  
**Then** confirmation card shows task title and 3 hours  
**And** on Confirm, a timesheet entry is created

## TC-F037-005 — Apply for leave via chat
**When** user types "apply for leave from 2026-06-10 to 2026-06-12 for personal work"  
**Then** confirmation card shows date range and reason  
**And** on Confirm, leave request is submitted with PENDING status

## TC-F037-006 — Sprint health summary
**Given** user's project has an active sprint  
**When** user types "is our sprint on track?"  
**Then** reply includes sprint name, end date, items done vs total, and blocked count

## TC-F037-007 — Proactive greeting with alerts
**Given** user has 2 overdue tasks and sprint ends in 2 days  
**When** user opens the AI assistant panel  
**Then** greeting includes overdue task count and sprint warning

## TC-F037-008 — Proactive greeting with no alerts
**Given** user has no overdue tasks and no sprint ending soon  
**When** user opens the AI assistant panel  
**Then** greeting is a clean welcome without alert text

## TC-F037-009 — EMPLOYEE cannot act on other users' tasks
**Given** EMPLOYEE user asks to mark a task assigned to another user  
**Then** assistant says it cannot perform the action (task not in their assigned list)

## TC-F037-010 — Improved reasoning with 70b model
**When** user asks a multi-step question like "which of my tasks are overdue and which project are they in?"  
**Then** reply correctly cross-references task list with project names in a coherent answer
