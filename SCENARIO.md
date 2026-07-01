# PMS Scenario Reference

> Last updated: 2026-07-01
> Covers: KPI Metrics, Projects Page filters, Timesheet redesign, Billing flag governance

---

## 1. KPI Metrics Reference

> Source: Digital Appraisal System.xlsx — Action column formulas
> **100 points total · 14 metrics · 5 Core Values**

---

### 1.1 Grade Thresholds

| Grade | Range  | Label     |
|-------|--------|-----------|
| A     | ≥ 90   | Excellent |
| B     | 75–89  | Good      |
| C     | 60–74  | Average   |
| D     | < 60   | Poor      |

---

### 1.2 Badge Types

| Badge  | Who enters it | When |
|--------|---------------|------|
| AUTO   | System        | Computed automatically from work item / timesheet data |
| MANUAL | PM            | PM enters score at end of month |
| SELF   | Employee      | Employee submits via Learn & Innovate module |

---

### 1.3 All Metrics at a Glance

| #  | Metric                       | Core Value          | Max | Badge  |
|----|------------------------------|---------------------|-----|--------|
| 1  | Sprint Reliability           | Diligent            | 10  | AUTO   |
| 2  | Delivery Timeliness          | Diligent            | 10  | AUTO   |
| 3  | Estimation Accuracy          | Diligent            | 10  | AUTO   |
| 4  | Throughput & Complexity      | Diligent            | 10  | AUTO   |
| 5  | Internal Rework Ratio        | Diligent            | 5   | AUTO   |
| 6  | Technical Defect Leakage     | Diligent            | 10  | AUTO   |
| 7  | Functional Defect Leakage    | Diligent            | 10  | AUTO   |
| 8  | Attendance                   | Diligent            | 5   | AUTO   |
| 9  | Timeliness                   | Diligent            | 5   | MANUAL |
| 10 | Team Collaboration           | Collaboration       | 5   | MANUAL |
| 11 | Reporting & Documentation    | Collaboration       | 5   | MANUAL |
| 12 | Learning Velocity            | Continuous Learning | 5   | SELF   |
| 13 | Positive Behaviour & Conduct | Optimism            | 5   | MANUAL |
| 14 | Gratitude                    | Gratitude           | 5   | MANUAL |
|    | **Total**                    |                     | **100** |    |

---

### 1.4 Metric Details

---

#### Core Value 1 — Diligent and Committed · 75 pts

##### Delivery & Execution — 40 pts

---

**Metric 1 — Sprint Reliability · 10 pts · AUTO**

| Field   | Detail |
|---------|--------|
| Purpose | How consistently work items are moved into the QA stage within the sprint |
| Formula | `IN_QA items ÷ Total assigned (excl. BLOCKED) × 10` |
| Example | 8 items in IN_QA, 10 non-blocked assigned → 8 ÷ 10 × 10 = **8.0 pts** |

| Score | Condition                     |
|-------|-------------------------------|
| 0–10  | Proportional (continuous)     |

> Only items with exact status **IN_QA** count in the numerator. BLOCKED items are excluded from both numerator and denominator.

---

**Metric 2 — Delivery Timeliness · 10 pts · AUTO**

| Field   | Detail |
|---------|--------|
| Purpose | How often work is delivered on or before the committed due date |
| Formula | `On-time items ÷ Total assigned (excl. BLOCKED) × 10` |
| Example | 7 items completed on/before due date, 10 non-blocked → 7 ÷ 10 × 10 = **7.0 pts** |

| Score | Condition                     |
|-------|-------------------------------|
| 0–10  | Proportional (continuous)     |

> "On-time" = `completedAt ≤ dueDate`. Items with no `dueDate` or no `completedAt` are excluded from the numerator.

---

**Metric 3 — Estimation Accuracy · 10 pts · AUTO**

| Field   | Detail |
|---------|--------|
| Purpose | How accurately the developer estimated effort vs actual hours logged |
| Formula | `variance = |actualHours − estimatedHours| ÷ estimatedHours` |
| Example | Estimated 10h, logged 12h → variance = 20% → **7 pts** |

| Score | Condition                      |
|-------|--------------------------------|
| 10    | variance ≤ 15%                 |
| 7     | 16% ≤ variance ≤ 30%           |
| 4     | 31% ≤ variance ≤ 50%           |
| 0     | variance > 50%                 |

---

**Metric 4 — Throughput & Complexity · 10 pts · AUTO**

| Field   | Detail |
|---------|--------|
| Purpose | Volume of work items fully completed (Closed) in the month |
| Formula | `CLOSED items ÷ Total assigned (excl. BLOCKED) × 10` |
| Example | 6 closed, 10 non-blocked → 6 ÷ 10 × 10 = **6.0 pts** |

| Score | Condition                     |
|-------|-------------------------------|
| 0–10  | Proportional (continuous)     |

> Only **CLOSED** status counts. BLOCKED items are excluded from both numerator and denominator.

---

##### Quality & Engineering Excellence — 25 pts

---

**Metric 5 — Internal Rework Ratio · 5 pts · AUTO**

| Field   | Detail |
|---------|--------|
| Purpose | How often work items are dragged back from In QA to In Progress due to quality issues |
| Formula | `rework ratio = reopened items (IN_QA → IN_PROGRESS) ÷ total completed (QA_DONE + CLOSED)` |
| Example | 1 reopened, 10 completed → 10% → **3 pts** |

| Score | Condition              |
|-------|------------------------|
| 5     | rework ratio = 0%      |
| 3     | ratio ≤ 10%            |
| 0     | ratio > 10%            |

---

**Metric 6 — Technical Defect Leakage · 10 pts · AUTO**

| Field   | Detail |
|---------|--------|
| Purpose | Effort lost to bugs discovered during code review — lower bug hours = higher score |
| Formula | `10 − (codeReviewBugHours ÷ totalHours × 10)`  clamped to [0, 10] |
| Example | 2h code review bugs, 40h total → 10 − (2 ÷ 40 × 10) = **9.5 pts** |

| Score | Condition                                           |
|-------|-----------------------------------------------------|
| 0–10  | Continuous (inverted — fewer bug hours = higher score) |

> Only bugs with classification **CODE_REVIEW** count.

---

**Metric 7 — Functional Defect Leakage · 10 pts · AUTO**

| Field   | Detail |
|---------|--------|
| Purpose | Effort lost to functional bugs and rework hours combined — lower hours = higher score |
| Formula | `10 − ((functionalBugHours + reworkHours) ÷ totalHours × 10)`  clamped to [0, 10] |
| Example | 3h functional bugs + 2h rework, 40h total → 10 − (5 ÷ 40 × 10) = **8.75 pts** |

| Score | Condition                                                    |
|-------|--------------------------------------------------------------|
| 0–10  | Continuous (inverted — fewer defect/rework hours = higher score) |

> Functional bugs = all bug classifications **except** CODE_REVIEW.

---

##### Attendance — 10 pts

---

**Metric 8 — Attendance · 5 pts · AUTO**

| Field   | Detail |
|---------|--------|
| Purpose | Approved leave days taken in the month; any unapproved absence results in 0 immediately |
| Formula | Count approved leave days overlapping the period from leave records |
| Example | 1 approved leave day → **5 pts** · 2 approved leave days → **3 pts** |

| Score | Condition                                            |
|-------|------------------------------------------------------|
| 5     | ≤ 1 approved leave day, no unapproved absence        |
| 3     | > 1 and ≤ 1.5 approved days, no unapproved           |
| 0     | > 1.5 approved days **or** any unapproved absence    |

---

**Metric 9 — Timeliness · 5 pts · MANUAL**

| Field   | Detail |
|---------|--------|
| Purpose | Punctuality based on office login records |
| Formula | PM records number of late comings and duration from office login system |
| Example | 0 late comings → **5 pts** · 1 late coming under 10 min → **3 pts** |

| Score | Condition                                               |
|-------|---------------------------------------------------------|
| 5     | 0 late comings                                          |
| 3     | 1–2 late comings, each under 10 minutes                 |
| 0     | 3 or more late comings, or any late coming > 10 minutes |

---

#### Core Value 2 — Collaboration · 10 pts

---

**Metric 10 — Team Collaboration · 5 pts · MANUAL**

| Field   | Detail |
|---------|--------|
| Purpose | How well the employee communicates, supports teammates and contributes to team success |
| Formula | PM observes daily interactions, standups, peer support and communication quality |
| Example | Proactively helps others, resolves blockers → **5 pts** |

| Score | Condition                                               |
|-------|---------------------------------------------------------|
| 5     | Excellent — proactive, collaborative, helpful           |
| 3     | Adequate — no issues, participates when needed          |
| 0     | Poor — creates friction, isolated, unresponsive         |

---

**Metric 11 — Reporting & Documentation · 5 pts · MANUAL**

| Field   | Detail |
|---------|--------|
| Purpose | Quality and consistency of status updates, technical docs, KT notes and sprint reports |
| Formula | PM reviews all documentation submitted during the month |
| Example | All reports submitted on time, complete and clear → **5 pts** |

| Score | Condition                                               |
|-------|---------------------------------------------------------|
| 5     | All documentation on time and complete                  |
| 3     | Inconsistent or missing some reports                    |
| 0     | Critical gaps or no documentation at all                |

---

#### Core Value 3 — Continuous Learning · 5 pts

---

**Metric 12 — Learning Velocity · 5 pts · SELF**

| Field   | Detail |
|---------|--------|
| Purpose | Employee initiative in professional growth via the Learn & Innovate upskilling module |
| Formula | Employee submits a LEARNING upskill assignment; PM approves, rejects, or it remains pending |
| Example | Assignment approved → **5 pts** · Submitted but under review → **3 pts** · Nothing submitted → **0 pts** |

| Score | Condition                                                      |
|-------|----------------------------------------------------------------|
| 5     | Assignment status = **APPROVED**                               |
| 3     | Assignment status = **PENDING** or **REJECTED** (was submitted)|
| 0     | No assignment submitted at all                                 |

> There is no self-log fallback. Only Learn & Innovate module submissions count.

---

#### Core Value 4 — Optimism · 5 pts

---

**Metric 13 — Positive Behaviour & Conduct · 5 pts · MANUAL**

| Field   | Detail |
|---------|--------|
| Purpose | Professionalism, flexibility under pressure, and overall attitude toward team and work |
| Formula | PM evaluates demeanour, adaptability to change, handling of criticism and conduct |
| Example | Adapts to scope changes without friction, stays professional → **5 pts** |

| Score | Condition                                               |
|-------|---------------------------------------------------------|
| 5     | Professional, flexible, cooperative throughout the month|
| 3     | Occasional minor issues, generally positive             |
| 0     | Unprofessional conduct or repeatedly negative attitude  |

---

#### Core Value 5 — Gratitude · 5 pts

---

**Metric 14 — Gratitude · 5 pts · MANUAL**

| Field   | Detail |
|---------|--------|
| Purpose | Whether the employee actively recognises and appreciates colleagues' contributions |
| Formula | PM observes verbal/written appreciation, acknowledgements in standups or messages |
| Example | Regularly thanks teammates in standups and messages → **5 pts** |

| Score | Condition                                               |
|-------|---------------------------------------------------------|
| 5     | Actively and consistently recognises peers              |
| 3     | Occasional thanks shown                                 |
| 0     | No appreciation shown at all                            |

---

### 1.5 Key Calculation Rules (Quick Reference)

```
SPRINT RELIABILITY
  Numerator  : work items where status = IN_QA
  Denominator: all assigned items — EXCLUDING BLOCKED
  Score      : (N ÷ D) × 10   →   range 0–10

DELIVERY TIMELINESS
  Numerator  : items where completedAt ≤ dueDate
  Denominator: all assigned items — EXCLUDING BLOCKED
  Score      : (N ÷ D) × 10   →   range 0–10

THROUGHPUT & COMPLEXITY
  Numerator  : items where status = CLOSED
  Denominator: all assigned items — EXCLUDING BLOCKED
  Score      : (N ÷ D) × 10   →   range 0–10

ESTIMATION ACCURACY
  variance = |actualHours − estimatedHours| ÷ estimatedHours
  ≤ 15%  →  10 pts
  ≤ 30%  →   7 pts
  ≤ 50%  →   4 pts
  > 50%  →   0 pts

INTERNAL REWORK RATIO
  ratio = reopened items ÷ completed items (QA_DONE + CLOSED)
  = 0%   →  5 pts
  ≤ 10%  →  3 pts
  > 10%  →  0 pts

TECHNICAL DEFECT LEAKAGE
  Score = 10 − (codeReviewBugHours ÷ totalWorkingHours × 10)
  clamped to [0, 10]
  bug classification must be CODE_REVIEW

FUNCTIONAL DEFECT LEAKAGE
  Score = 10 − ((functionalBugHours + reworkHours) ÷ totalWorkingHours × 10)
  clamped to [0, 10]
  functional bugs = all bug classifications except CODE_REVIEW

ATTENDANCE
  ≤ 1 approved leave day, no unapproved   →  5
  > 1 and ≤ 1.5 approved days             →  3
  > 1.5 approved days or any unapproved   →  0

LEARNING VELOCITY  (Learn & Innovate module only)
  APPROVED                →  5
  PENDING or REJECTED     →  3  (something was submitted)
  Nothing submitted       →  0
```

---

## 2. Projects Page

### 2.1 Filters

| Filter        | Admin / Super                                 | Employee / Others                       |
|---------------|-----------------------------------------------|-----------------------------------------|
| Business Unit | Visible — searchable combobox                 | Hidden                                  |
| BU selection  | Narrows Client dropdown to that BU's clients  | N/A                                     |
| Client        | Searchable combobox with typing               | Searchable combobox with typing         |
| Clear filters | Resets BU + Client + quick filter             | Resets Client + quick filter            |

### 2.2 Project Card Click

| Role                                                   | Behaviour |
|--------------------------------------------------------|-----------|
| Super User / Admin                                     | Navigates to `/dashboard?projectId=<id>` — Dashboard opens with that project pre-selected, showing Project Risk Score + Team Activity |
| Employee / TL / Developer / QA / Designer / DevOps     | Navigates to `/projects/:id/board` (Kanban board) |

---

## 3. Timesheet

### 3.1 Filters

| Filter   | Who sees it                                         | Behaviour |
|----------|-----------------------------------------------------|-----------|
| Year     | All                                                 | Dynamic — starts 2024, auto-adds current year each January |
| Month    | All                                                 | Jan–Dec |
| Project  | All                                                 | All non-archived projects |
| Employee | Admin / Super / PM / TL only, when project selected | Filters calendar to that person |

### 3.2 Summary Bar

| Metric       | Colour | Description |
|--------------|--------|-------------|
| Total Logged | Gray   | All hours in selected month |
| Billable     | Green  | Hours where billingStatus = BILLABLE (excluding rework and bugs) |
| Non-Billable | Orange | Hours where billingStatus = NON_BILLABLE + all rework + all bug hours |
| Rework       | Purple | Hours on items dragged back from IN_QA |
| Bug Fix      | Red    | Hours on BUG type work items |

> **Rule:** Total = Billable + Non-Billable always. Rework and Bug Fix are visible subsets of Non-Billable.

### 3.3 Calendar View — Day Cell

| Badge             | Colour | When shown |
|-------------------|--------|------------|
| Total hours (plain) | Gray   | Always (if any hours logged that day) |
| `B`               | Green  | Always shown with total |
| `NB`              | Orange | Always shown with total |
| `RW`              | Purple | Only when rework hours > 0 |
| `Bug`             | Red    | Only when bug fix hours > 0 |

### 3.4 Team Breakdown (Managers Only)

| Condition | Behaviour |
|-----------|-----------|
| Project selected, no employee filter, user is Admin/Super/PM/TL | Shows per-member row with B / NB / RW / Bug / Total hours |
| Click a member row | Filters calendar to that employee |
| No project selected | Team breakdown hidden |

---

## 4. Billing Metric Rules (Timesheet)

| Work Item Type                      | Billing Flag | Billable | Non-Billable | Rework | Bug Fix |
|-------------------------------------|--------------|:--------:|:------------:|:------:|:-------:|
| Normal task / story / epic          | BILLABLE     | ✓        |              |        |         |
| Normal task / story / epic          | NON_BILLABLE |          | ✓            |        |         |
| Dragged back from IN_QA             | BILLABLE     |          | ✓ forced     | ✓      |         |
| Dragged back from IN_QA             | NON_BILLABLE |          | ✓            | ✓      |         |
| BUG type                            | BILLABLE     |          | ✓ forced     |        | ✓       |
| BUG type                            | NON_BILLABLE |          | ✓            |        | ✓       |
| BUG + dragged back from IN_QA       | Any          |          | ✓ forced     | ✓      | ✓       |

> **Rework definition:** A work item that has a `workItemActivity` record where `oldValue = IN_QA` and `newValue` is any earlier column (`IN_PROGRESS`, `IN_REVIEW`, `READY_FOR_QA`, `TODO`, `BLOCKED`).

---

## 5. Billing Flag — Who Can Set / Change

| Action                           | Super / Admin | Project Manager | Team Lead         | Developer / QA / Designer / DevOps |
|----------------------------------|:-------------:|:---------------:|:-----------------:|:-----------------------------------:|
| Set billing on **create**        | ✓             | ✓               | ✓                 | ✓                                   |
| Change billing on **edit** (UI)  | ✓ Dropdown    | ✓ Dropdown      | ✗ Read-only badge | ✗ Read-only badge                   |
| Change billing on **edit** (API) | ✓             | ✓               | ✗ 403 Forbidden   | ✗ 403 Forbidden                     |

> The backend enforces this at the API level — a 403 is returned even if someone bypasses the UI.

---

## 6. Rework End-to-End Scenario

| Step | Action | Result |
|------|--------|--------|
| 1 | Card sitting in IN_QA | Normal state, no rework flag |
| 2 | Anyone drags card back to IN_PROGRESS | `workItemActivity` records `oldValue = IN_QA` → item is now a rework item |
| 3 | Developer logs 2h of work | Time entry created against the work item |
| 4 | Timesheet calendar (that day) | `2.0h · 0.0B · 2.0NB · 2.0RW` |
| 5 | PM changes billing flag to BILLABLE on the card | Flag saved on work item (only PM can do this) |
| 6 | Timesheet calendar after PM change | Still `2.0h · 0.0B · 2.0NB · 2.0RW` — rework always forced Non-Billable |
| 7 | TL tries to change billing flag | Read-only badge shown in UI, API returns 403 |

---

## 7. Bug End-to-End Scenario

| Step | Action | Result |
|------|--------|--------|
| 1 | Any role creates a BUG work item, sets billing = BILLABLE | Bug created with BILLABLE flag |
| 2 | Developer logs 3h against the bug | Time entry created |
| 3 | Timesheet calendar (that day) | `3.0h · 0.0B · 3.0NB · 3.0Bug` |
| 4 | PM opens bug card, changes billing to NON_BILLABLE | Flag updated (only PM/Admin/Super can do this) |
| 5 | TL tries to change billing flag on the bug | Read-only badge shown, API returns 403 |
| 6 | Timesheet regardless of billing flag | Bug hours always Non-Billable + Bug Fix — billing flag has no effect |

---

## 8. Combined Rework + Bug Scenario

| Step | Action | Result |
|------|--------|--------|
| 1 | BUG card is in IN_QA | Normal bug state |
| 2 | Dragged back to IN_PROGRESS | Now both a bug AND a rework item |
| 3 | Developer logs 4h | Time entry created |
| 4 | Timesheet calendar | `4.0h · 0.0B · 4.0NB · 4.0RW · 4.0Bug` |

---

## 9. Quick Reference — Billing Governance

```
CREATE work item  →  All roles can set Billable / Non-Billable (required field)
EDIT billing      →  Only PM / Admin / Super (UI dropdown)
                     TL / Dev / QA / Designer / DevOps → read-only badge "(PM only)"
EDIT via API      →  403 Forbidden for anyone not PM / Admin / Super

TIMESHEET FORCED OVERRIDES (billing flag is ignored):
  isRework = true              →  always Non-Billable + Rework
  type = BUG                   →  always Non-Billable + Bug Fix
  isRework = true AND type=BUG →  Non-Billable + Rework + Bug Fix
```
