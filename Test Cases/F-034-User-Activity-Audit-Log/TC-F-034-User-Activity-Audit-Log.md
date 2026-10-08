# TC-F-034 — E2E Test Cases: User Activity Audit Log

**Feature:** F-034 — User Activity Audit Log  
**Date:** 2026-06-03  

---

## TC-034-01 — Creating a work item generates an audit log entry

**Type:** Happy Path  
**AC:** AC-1

**Given:** A DEVELOPER user is logged in to a project board  
**When:** They create a new work item (e.g. Story "Implement search")  
**Then:**
- The work item appears on the board
- An `audit_logs` DB record exists with `action=WORK_ITEM_CREATED`, `entityTitle` containing the displayId
- The entry's `userId` matches the DEVELOPER's user ID

---

## TC-034-02 — Moving a work item to a new status generates an audit log entry

**Type:** Happy Path  
**AC:** AC-1

**Given:** A user drags a card from TODO to IN_PROGRESS  
**When:** The drag-drop completes  
**Then:**
- An audit log entry with `action=WORK_ITEM_STATUS_CHANGED` and `metadata.from=TODO`, `metadata.to=IN_PROGRESS` is persisted

---

## TC-034-03 — Deleting a work item generates an audit log entry

**Type:** Happy Path  
**AC:** AC-1

**Given:** A PROJECT_MANAGER opens a work item modal and clicks Delete  
**When:** The deletion completes  
**Then:**
- Work item is removed from board
- Audit log entry with `action=WORK_ITEM_DELETED` and the item's `entityId` exists in DB

---

## TC-034-04 — Sprint activation generates an audit log entry

**Type:** Happy Path  
**AC:** AC-2

**Given:** A TEAM_LEAD opens Sprint Manager and activates a sprint  
**When:** Sprint is activated  
**Then:**
- Sprint status changes to ACTIVE on the board
- Audit log entry with `action=SPRINT_ACTIVATED` exists

---

## TC-034-05 — Login generates an audit log entry

**Type:** Happy Path  
**AC:** AC-4

**Given:** A user is on the login page  
**When:** They successfully log in with valid credentials  
**Then:**
- User is redirected to dashboard
- Audit log entry with `action=LOGIN`, `entity=AUTH`, and the user's `userId` exists in DB

---

## TC-034-06 — Admin can view all users' activity on /activity page

**Type:** Happy Path — RBAC  
**AC:** AC-6, AC-8

**Given:** An ADMIN is logged in  
**When:** They navigate to `/activity`  
**Then:**
- Activity Log page renders with a full feed of all users' actions
- Filter controls (user, action, entity, project, date) are visible and functional

---

## TC-034-07 — EMPLOYEE cannot access /activity page

**Type:** Negative — RBAC  
**AC:** AC-8

**Given:** An EMPLOYEE user is logged in  
**When:** They attempt to navigate to `/activity`  
**Then:**
- The sidebar does not show the "Activity Log" menu item
- Direct URL navigation redirects to `/dashboard` or shows a 403 page

---

## TC-034-08 — GET /audit-logs — EMPLOYEE receives only own logs

**Type:** Negative — RBAC  
**AC:** AC-6

**Given:** An EMPLOYEE user makes a `GET /audit-logs?userId=<other-user-id>` API request  
**When:** The request is processed  
**Then:**
- Response returns only the caller's own logs (userId override ignored)
- No other user's logs are returned

---

## TC-034-09 — Activity log filters work correctly

**Type:** Happy Path  
**AC:** AC-7

**Given:** An ADMIN is on the `/activity` page with 50+ log entries  
**When:** They apply filter: Action = "WORK_ITEM_CREATED" + Project = "Horizon"  
**Then:**
- Only `WORK_ITEM_CREATED` actions for the Horizon project are shown
- Other log entries are hidden

---

## TC-034-10 — Activity log entries display human-readable descriptions

**Type:** Happy Path  
**AC:** AC-10

**Given:** An ADMIN is viewing the activity log  
**When:** The page loads  
**Then:**
- Each entry shows: avatar, name, sentence like "Alice created work item HOR10005 — Fix login bug"
- Relative timestamp shown (e.g. "3 mins ago")
- Hovering timestamp shows absolute UTC time
