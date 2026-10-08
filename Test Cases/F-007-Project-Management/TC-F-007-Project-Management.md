# E2E Test Cases — F-007: Project Management

Feature ID : F-007
Framework  : Playwright / Manual

---

## TC-F-007-001
Title   : Admin creates a new project successfully
Type    : Happy Path | AC: AC-1, AC-2
Given   : Admin logged in, on /projects
When    : Clicks 'New Project', fills name='Alpha App', type=Dedicated, clicks Save
Then    : Project card 'Alpha App' appears on grid with Dedicated badge

## TC-F-007-002
Title   : Summary panel reflects correct counts
Type    : Happy Path | AC: AC-3
Given   : 2 Active, 1 Archive projects exist
When    : Admin views /projects
Then    : Summary shows Active: 2, Archive: 1

## TC-F-007-003
Title   : Admin edits a project
Type    : Happy Path | AC: AC-4
Given   : 'Alpha App' project exists
When    : Clicks edit, changes name to 'Alpha App v2', saves
Then    : Card updates to 'Alpha App v2'

## TC-F-007-004
Title   : Admin archives an active project
Type    : Happy Path | AC: AC-5
Given   : 'Alpha App' is Active
When    : Clicks archive action
Then    : Status badge changes to Archive; Active count decreases by 1

## TC-F-007-005
Title   : Admin restores an archived project
Type    : Happy Path | AC: AC-6
Given   : 'Alpha App' is Archive
When    : Clicks restore action
Then    : Status badge changes to Active

## TC-F-007-006
Title   : End date before start date is rejected
Type    : Negative | AC: AC-10
When    : Sets startDate=2026-07-01, endDate=2026-06-01, clicks Save
Then    : Error 'End date must be on or after start date' shown

## TC-F-007-007
Title   : Project card shows client and department
Type    : Happy Path | AC: AC-7
Given   : Project linked to client 'Acme Corp' and dept 'Digital'
When    : Admin views project card
Then    : 'Acme Corp' and 'Digital' visible on card

## TC-F-007-008
Title   : EMPLOYEE can view projects but cannot create
Type    : RBAC | AC: AC-8
Given   : EMPLOYEE is logged in
When    : Visits /projects
Then    : Project list visible; 'New Project' button not shown; POST /projects returns 403

## TC-F-007-009
Title   : Empty state shown when no projects exist
Type    : Edge Case | AC: AC-9
Given   : No projects in system
When    : Admin visits /projects
Then    : Empty state message displayed
