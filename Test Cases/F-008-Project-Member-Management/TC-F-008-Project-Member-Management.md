# E2E Test Cases — F-008: Project Member Management

**Feature ID:** F-008  
**Date:** 2026-05-26

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TC-F-008-001 | View project detail page | Click on a project card from `/projects` | Detail page loads at `/projects/:id` with project name, status, type, dates, client, department |
| TC-F-008-002 | View member list | Open any project detail page | "Team Members" section shows existing members with their role and joined date |
| TC-F-008-003 | Add first member | Click "Add Member", select user, choose role "Developer", confirm | New row appears in member list with correct name and role |
| TC-F-008-004 | Add duplicate member | Try to add same user a second time | Error: user already in project; no duplicate row |
| TC-F-008-005 | Change member role | Click role dropdown on a member row, select "Team Lead", save | Row updates to show "Team Lead" |
| TC-F-008-006 | Remove member | Click remove icon on a member, confirm dialog | Member row disappears from the list |
| TC-F-008-007 | Non-admin cannot add member | Log in as EMPLOYEE, open project detail | "Add Member" button not visible; no edit/remove icons on member rows |
| TC-F-008-008 | Back navigation | Click "Back to Projects" | Returns to `/projects` list page |
| TC-F-008-009 | Empty member list | Open a project with no members | "No members yet" empty state shown |
