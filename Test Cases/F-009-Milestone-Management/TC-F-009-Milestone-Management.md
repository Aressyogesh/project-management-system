# E2E Test Cases — F-009: Milestone Management

**Feature ID:** F-009  
**Date:** 2026-05-26

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TC-F-009-001 | View milestones section | Open project detail page | "Milestones" section visible below Team Members |
| TC-F-009-002 | Empty milestone list | Open project with no milestones | "No milestones yet." empty state |
| TC-F-009-003 | Create milestone — valid | Click "Add Milestone", fill description, submit | New row appears in milestone list |
| TC-F-009-004 | Create milestone — missing description | Submit with empty description | Inline error; no API call |
| TC-F-009-005 | Create milestone — due before start | Set dueDate before startDate, submit | Error "Due date must be on or after start date" |
| TC-F-009-006 | Edit milestone | Click edit icon, change description, save | Row updates with new description |
| TC-F-009-007 | Change milestone status | Edit milestone, change status to IN_PROGRESS, save | Status badge updates |
| TC-F-009-008 | Delete milestone | Click delete icon, confirm | Row disappears from list |
| TC-F-009-009 | Non-admin read-only | Log in as EMPLOYEE, open project detail | No "Add Milestone" button; no edit/delete icons |
