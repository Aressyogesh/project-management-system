# UTC-F-024 — Unit Test Cases: JIRA Board Enhancement + Bug Management

**Feature:** F-024  
**Date:** 2026-05-29  

---

## Backend Unit Tests (work-items.service)

| ID | Test Name | Arrange | Act | Assert |
|----|-----------|---------|-----|--------|
| UT-BE-01 | createWorkItem saves bugFlag when type is BUG | dto with type=BUG, bugFlag=INTERNAL | service.create() | returned item.bugFlag === 'INTERNAL' |
| UT-BE-02 | createWorkItem saves bugStatus when type is BUG | dto with type=BUG, bugStatus=OPEN | service.create() | returned item.bugStatus === 'OPEN' |
| UT-BE-03 | createWorkItem saves bugReproducibility | dto with bugReproducibility=ALWAYS | service.create() | returned item.bugReproducibility === 'ALWAYS' |
| UT-BE-04 | createWorkItem saves responsibleUserId | dto with responsibleUserId=uuid | service.create() | returned item.responsibleUserId === uuid |
| UT-BE-05 | createWorkItem saves billingStatus | dto with billingStatus=BILLABLE | service.create() | returned item.billingStatus === 'BILLABLE' |
| UT-BE-06 | createWorkItem saves affectedBuildVersion | dto with affectedBuildVersion='v1.2.3' | service.create() | returned item.affectedBuildVersion === 'v1.2.3' |
| UT-BE-07 | createWorkItem saves module field | dto with module='Auth' | service.create() | returned item.module === 'Auth' |
| UT-BE-08 | createWorkItem saves reminderType | dto with reminderType=ONE_DAY | service.create() | returned item.reminderType === 'ONE_DAY' |
| UT-BE-09 | createWorkItem links releaseMilestoneId | dto with releaseMilestoneId=uuid | service.create() | returned item.releaseMilestoneId === uuid |
| UT-BE-10 | updateWorkItem patches bugStatus | existing item, dto with bugStatus=CLOSED | service.update() | returned item.bugStatus === 'CLOSED' |
| UT-BE-11 | updateWorkItem patches bugFlag to EXTERNAL | existing item, dto with bugFlag=EXTERNAL | service.update() | returned item.bugFlag === 'EXTERNAL' |
| UT-BE-12 | getWorkItem includes responsibleUser relation | item with responsibleUserId set | service.findOne() | returned item.responsibleUser is not null |
| UT-BE-13 | getWorkItem includes releaseMilestone relation | item with releaseMilestoneId set | service.findOne() | returned item.releaseMilestone.description is string |
| UT-BE-14 | createWorkItem with parentId links child to parent | dto with parentId=storyId | service.create() | returned item.parentId === storyId |
| UT-BE-15 | null bugFlag is allowed for non-BUG types | dto with type=TASK, no bugFlag | service.create() | returned item.bugFlag === null |

---

## Frontend Unit Tests (board components)

| ID | Test Name | Arrange | Act | Assert |
|----|-----------|---------|-----|--------|
| UT-FE-01 | Sidebar renders "Leaves Management" label | mount Sidebar with any role | render | contains text "Leaves Management"; does not contain "Leave & OT" |
| UT-FE-02 | ProjectDetailPage omits Task Lists section | mount with mock data | render | no element with text "Task Lists" exists |
| UT-FE-03 | ProjectDetailPage omits Tasks section | mount with mock data | render | no element with text heading "Tasks" exists |
| UT-FE-04 | ProjectDetailPage omits Task Allocations section | mount with mock data | render | no element with text "Task Allocations" exists |
| UT-FE-05 | ProjectDetailPage still renders Team Members | mount with mock data | render | element with text "Team Members" exists |
| UT-FE-06 | ProjectDetailPage still renders Milestones | mount with mock data | render | element with text "Milestones" exists |
| UT-FE-07 | WorkItemModal renders assignee as dropdown for BUG | item with type=BUG, members list | render | select element with id/role assignee exists |
| UT-FE-08 | WorkItemModal renders Bug Details section for BUG type | item with type=BUG | render | section heading "Bug Details" is present |
| UT-FE-09 | WorkItemModal hides Bug Details for non-BUG types | item with type=TASK | render | no "Bug Details" section present |
| UT-FE-10 | WorkItemModal bug status dropdown shows 8 options | item with type=BUG | render | 8 options in bugStatus select (OPEN through ON_HOLD) |
| UT-FE-11 | WorkItemModal bug flag radio shows Internal/External | item with type=BUG | render | options "Internal" and "External" exist |
| UT-FE-12 | WorkItemModal bugReproducibility has 6 options | item with type=BUG | render | 6 options in reproducibility select |
| UT-FE-13 | Child Items tab shows Add Child form for USER_STORY | item with type=USER_STORY | click "Child Items" tab | inline form with type selector + title input visible |
| UT-FE-14 | CreateWorkItemModal shows parent selector for TASK type | open modal, select type=TASK | render | parent dropdown exists with project epics/stories |
| UT-FE-15 | CreateWorkItemModal parent selector hidden for EPIC | open modal, select type=EPIC | render | no parent dropdown present |
| UT-FE-16 | TypeBadge renders BUG with red styling | type=BUG | render | badge has red color class |
| UT-FE-17 | WorkItemModal "Assign to me" sets assignee | click "Assign to me" | mutation called | updateMut.mutate called with current user id |
| UT-FE-18 | WorkItemModal shows parent breadcrumb when parentId set | item with parent set | render | parent title appears in header area |
| UT-FE-19 | BugClassification dropdown has >= 10 options | item with type=BUG | render | classification select has at least 10 options |
| UT-FE-20 | WorkItemModal reminderType has 5 options | item with type=BUG | render | 5 options in reminder select |
