Feature ID   : F-081
Feature Name : Work Item Tags on Create

─────────────────────────────────────────
TC-F081-001
─────────────────────────────────────────
Title        : Create a Task with tags — tags persist and are visible on reopen
AC Covered   : AC-1, AC-2, AC-5
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : A logged-in Project Manager is on a project's Kanban board
  And  : Clicks "Create Work Item" and selects type "Task"

When   : They fill Title, Parent, Assignee, dates, billing status, estimated hours
  And  : They type "hotfix" into the Labels field and press Enter
  And  : They type "tech-debt" into the Labels field and press Enter
  And  : They click "Create Item"

Then   : The item is created (success toast shown, modal closes)
  And  : Reopening the created item shows "hotfix" and "tech-debt" as label chips in the
         detail sidebar

Expected Response : HTTP 201 from POST /api/v1/work-items with `labels: ["hotfix","tech-debt"]`
                     in the response body

─────────────────────────────────────────
TC-F081-002
─────────────────────────────────────────
Title        : Create a work item with no tags — unchanged behaviour
AC Covered   : AC-4
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : A logged-in Team Lead has the Create Work Item modal open for a Bug

When   : They fill all required fields and click "Create Item" without touching the Labels
         field

Then   : The item is created successfully, identical to pre-feature behaviour
  And  : Reopening the item shows no label chips (empty state)

Expected Response : HTTP 201; `labels` is `[]` in the response body

─────────────────────────────────────────
TC-F081-003
─────────────────────────────────────────
Title        : Remove a pending tag before submitting
AC Covered   : AC-3
Priority     : Medium
Type         : Happy Path
Framework    : Playwright

Given  : The Create Work Item modal is open with labels "hotfix" and "urgent" already added
         as pending chips

When   : The user clicks the × on the "hotfix" chip
  And  : Submits the form

Then   : Only "urgent" is present on the created item; "hotfix" was never sent

Expected Response : HTTP 201; `labels: ["urgent"]`

─────────────────────────────────────────
TC-F081-004
─────────────────────────────────────────
Title        : Whitespace-only tag input is rejected client-side
AC Covered   : AC-6
Priority     : Medium
Type         : Negative
Framework    : Playwright

Given  : The Create Work Item modal is open

When   : The user types "   " into the Labels field and presses Enter

Then   : No chip is added
  And  : The Labels field remains empty of chips

Expected Response : N/A — no API call triggered by this action

─────────────────────────────────────────
TC-F081-005
─────────────────────────────────────────
Title        : Duplicate tag input is rejected client-side
AC Covered   : AC-7
Priority     : Medium
Type         : Negative / Edge Case
Framework    : Playwright

Given  : The Create Work Item modal is open with "hotfix" already added as a pending chip

When   : The user types "hotfix" again and presses Enter

Then   : Only one "hotfix" chip exists in the pending list

Expected Response : N/A — no API call triggered by this action

─────────────────────────────────────────
TC-F081-006
─────────────────────────────────────────
Title        : "Save & Add New" resets tags for the next item
AC Covered   : AC-8
Priority     : Low
Type         : Edge Case
Framework    : Playwright

Given  : The Create Work Item modal is open; the user adds label "hotfix" and clicks
         "Save & Add New"

When   : The form resets and the user immediately types a new Title for a second item
         without adding any label

Then   : The second item is created with `labels: []` — "hotfix" is not carried over
  And  : The first item created retains `labels: ["hotfix"]`

Expected Response : Two HTTP 201 responses; first has `labels: ["hotfix"]`, second has
                     `labels: []`

─────────────────────────────────────────
TC-F081-007
─────────────────────────────────────────
Title        : User without create permission for a type still cannot create — Labels field
               grants no extra access (RBAC)
AC Covered   : AC-9
Priority     : High
Type         : RBAC / Security
Framework    : Playwright

Given  : A logged-in Developer (project role DEVELOPER) who is not permitted to create a
         Bug directly assigned to a non-PM member without an estimate (existing rule),
         or an unauthenticated/expired-session user attempting POST /api/v1/work-items
         directly with a `labels` field in the body

When   : The disallowed create request is attempted (via UI where the option is hidden/
         disabled, and directly via API call bypassing the UI)

Then   : The existing 401/403 behaviour is unchanged — presence of `labels` in the payload
         does not bypass any existing authorization check

Expected Response : HTTP 401 (no/invalid token) or 403 (role not permitted) — unchanged from
                     pre-feature behaviour

Execution Gate
--------------
Run E2E tests:    cd frontend && npx playwright test tests/e2e/f081-work-item-tags.spec.ts
Result:           ALL PASS  →  proceed to Step 4/5 (already completed — no schema/API change)
                  ANY FAIL  →  fix failures before continuing
