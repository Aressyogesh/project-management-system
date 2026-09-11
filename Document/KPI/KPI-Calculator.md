# KPI Calculator — Digital Appraisal System
## How Your Monthly Score Is Calculated

Your monthly KPI score is made up of **14 parameters** across 5 core values. The maximum total score is **100 points**. Some parameters are calculated automatically from your board activity; others are entered manually by your Project Manager.

---

## Score Badges

| Badge | Meaning |
|---|---|
| **AUTO** | Calculated automatically from your board, timesheet, and leave data |
| **MANUAL** | Your PM enters this score at the end of the month |
| **SELF** | Driven by your own activity in the Learn & Innovate module |

---

## Parameter 1 — Sprint Reliability
**Weight: 10% · Max: 10 pts · Badge: AUTO**

### What it measures
How reliably you move your assigned work items into the QA stage.

### Formula
```
(Work Items that have reached IN QA or beyond) ÷ (Total Assigned − Blocked − Epics) × 10
```

### Rules
- Items currently in **IN QA**, **QA Done**, or **Closed** all count — score persists as the card moves forward
- If a card is **pulled back** from IN QA to IN Review or IN Progress, it no longer counts (score recalculates)
- **Blocked** items are excluded from both numerator and denominator
- **Epics** are excluded entirely

### Example
You have 15 work items assigned this month:

| Item | Status | Counts? |
|---|---|---|
| TASK-01 to 05 | IN QA | ✅ Yes (5 items) |
| TASK-06, 07 | QA Done (moved forward from IN QA) | ✅ Yes (2 items) |
| TASK-08 | Closed (moved forward from IN QA) | ✅ Yes (1 item) |
| TASK-09 | Pulled back from IN QA → IN Progress | ❌ No (recalculated) |
| TASK-10, 11 | IN Review | ❌ No |
| TASK-12, 13 | IN Progress | ❌ No |
| TASK-14 | BLOCKED | ❌ Excluded from total |
| TASK-15 | EPIC | ❌ Excluded from total |

```
Numerator  = 5 + 2 + 1 = 8 (items in IN QA or beyond)
Denominator = 15 − 1 (Blocked) − 1 (Epic) = 13
Score = 8 ÷ 13 × 10 = 6.2 pts
```

---

## Parameter 2 — Delivery Timeliness
**Weight: 10% · Max: 10 pts · Badge: AUTO**

### What it measures
Whether you deliver your work to review (move cards from IN Progress → IN Review) on or before the due date.

### Formula
```
(Work Items moved to IN Review on or before due date) ÷ (Total Assigned − Blocked − Epics) × 10
```

### Rules
- An item is "delivered" the moment it is **moved from IN Progress to IN Review**
- Score persists as the card moves forward (IN Review → IN QA → QA Done → Closed)
- If a card is **pulled back** from IN Review to IN Progress, the delivery timestamp is cleared and the item no longer counts
- **Blocked** items excluded. **Epics** excluded.

### Example
You have 12 tasks with due dates this month:

| Item | Due Date | Moved to IN Review | On Time? |
|---|---|---|---|
| TASK-01 | Jun 10 | Jun 8 | ✅ Yes |
| TASK-02 | Jun 15 | Jun 15 | ✅ Yes (same day counts) |
| TASK-03 | Jun 20 | Jun 22 | ❌ Late |
| TASK-04 | Jun 25 | Still IN Progress | ❌ Not delivered |
| TASK-05 | Jun 18 | Jun 16, then pulled back Jun 18, pushed again Jun 20 | ❌ Final move was after due date |
| TASK-06–10 | Various | On time | ✅ Yes (5 items) |
| TASK-11 | — | — | BLOCKED (excluded) |
| TASK-12 | — | — | EPIC (excluded) |

```
Numerator  = TASK-01 + TASK-02 + TASK-06 to 10 = 7 items on time
Denominator = 12 − 1 (Blocked) − 1 (Epic) = 10
Score = 7 ÷ 10 × 10 = 7.0 pts
```

---

## Parameter 3 — Estimation Accuracy
**Weight: 10% · Max: 10 pts · Badge: AUTO**

### What it measures
How accurately you estimated the time needed for your work items vs actual hours logged.

### Formula
```
Variance % = |Actual Hours − Estimated Hours| ÷ Estimated Hours × 100
```

| Variance | Score |
|---|---|
| ≤ 15% | 10 pts |
| 16% – 30% | 7 pts |
| 31% – 50% | 4 pts |
| > 50% | 0 pts |

### Rules
- Uses ALL assigned work items in the month (not just sprint items)
- Estimated hours = sum of estimated hours set on work items
- Actual hours = sum of timesheet hours logged against those items

### Examples

**Example A — Excellent:**
```
Estimated: 80 hrs  |  Actual logged: 85 hrs
Variance = |85 − 80| ÷ 80 = 6.25%  →  ≤ 15%  →  10 pts
```

**Example B — Good:**
```
Estimated: 80 hrs  |  Actual logged: 100 hrs
Variance = |100 − 80| ÷ 80 = 25%  →  16–30%  →  7 pts
```

**Example C — Poor:**
```
Estimated: 40 hrs  |  Actual logged: 70 hrs
Variance = |70 − 40| ÷ 40 = 75%  →  > 50%  →  0 pts
```

---

## Parameter 4 — Throughput & Complexity Handling
**Weight: 10% · Max: 10 pts · Badge: AUTO**

### What it measures
The volume of work you fully close (move to Closed status) during the month.

### Formula
```
(Work Items in "Closed" status) ÷ (Total Assigned − Blocked − Epics) × 10
```

### Rules
- Only items with status **Closed** count in the numerator
- If a card is pulled back from Closed to any earlier column, it no longer counts
- **Blocked** and **Epic** items are excluded from both numerator and denominator

### Example
```
Total assigned: 20 items
- Closed:    12 items  ✅ Count
- QA Done:    3 items  ❌ Not yet Closed
- IN QA:      2 items  ❌ Not yet Closed
- BLOCKED:    2 items  ❌ Excluded
- EPIC:       1 item   ❌ Excluded

Denominator = 20 − 2 (Blocked) − 1 (Epic) = 17
Score = 12 ÷ 17 × 10 = 7.1 pts
```

---

## Parameter 5 — Internal Rework Ratio
**Weight: 5% · Max: 5 pts · Badge: AUTO**

### What it measures
How often your work items are sent back from QA to IN Progress, indicating rework was needed.

### Formula
```
(Tasks dragged from IN QA → IN Progress) ÷ (Total Completed tasks) → stepped score
```

| Ratio | Score |
|---|---|
| 0% (no rework) | 5 pts |
| ≤ 10% | 3 pts |
| > 10% | 0 pts |

### Rules
- **Only** the specific move of **IN QA → IN Progress** counts as rework
- Moving a card from IN Review → IN Progress does NOT count as rework here
- "Total Completed" = items in QA Done or Closed status
- If 0 tasks are completed yet, score defaults to 5 pts

### Example
You completed 20 tasks this month (status: QA Done or Closed):

| Scenario | Rework Tasks | Ratio | Score |
|---|---|---|---|
| No tasks were sent back from QA | 0 | 0% | **5 pts** |
| 2 tasks were dragged IN QA → IN Progress | 2 | 2÷20 = 10% | **3 pts** |
| 3 tasks were dragged IN QA → IN Progress | 3 | 3÷20 = 15% | **0 pts** |

**Note:** If a task is sent back from IN QA to IN Progress and then successfully re-reviewed, it still counts as 1 rework task.

---

## Parameter 6 — Technical Defect Leakage
**Weight: 10% · Max: 10 pts · Badge: AUTO**

### What it measures
Time spent fixing bugs that originated from code review issues, as a proportion of your total working hours.

### Formula
```
10 − (Hours logged on Code Review bugs ÷ Total working hours in month × 10)
```

### Rules
- Only counts **Bug** work items where `Classification = Code Review`
- Hours = timesheet hours YOU logged against those specific bug items
- Total working hours = all timesheet hours you logged in the month
- If no Code Review bugs exist → **10 pts** (perfect score)

### Example
```
Total hours worked this month = 160 hrs
Hours spent on Code Review bugs:
  - BUG-01 (Code Review): 6 hrs
  - BUG-02 (Code Review): 4 hrs
  Total Code Review bug hours = 10 hrs

Score = 10 − (10 ÷ 160 × 10)
      = 10 − 0.625
      = 9.375 pts
```

**Another example:**
```
Total hours = 160 hrs, Code Review bug hours = 40 hrs
Score = 10 − (40 ÷ 160 × 10) = 10 − 2.5 = 7.5 pts
```

---

## Parameter 7 — Functional Defect Leakage
**Weight: 10% · Max: 10 pts · Badge: AUTO**

### What it measures
Time spent on rework (tasks pulled back from QA) plus bugs NOT classified as Code Review issues.

### Formula
```
10 − ((Rework hours + Functional bug hours) ÷ Total working hours × 10)
```

### Rules
- **Functional bugs** = Bug work items where Classification is anything **other than** Code Review
- **Rework hours** = timesheet hours logged on tasks that were dragged from IN QA → IN Progress
- Total working hours = all timesheet hours you logged in the month
- If no rework and no functional bugs → **10 pts**

### Example
```
Total hours worked = 160 hrs

Functional bugs (non-Code Review):
  - BUG-03 (New Bug):      8 hrs
  - BUG-04 (UI Usability): 5 hrs
  Functional bug hours = 13 hrs

Rework (tasks dragged IN QA → IN Progress):
  - TASK-07 (rework):  7 hrs
  Rework hours = 7 hrs

Combined = 13 + 7 = 20 hrs

Score = 10 − (20 ÷ 160 × 10)
      = 10 − 1.25
      = 8.75 pts
```

---

## Parameter 8 — Attendance
**Weight: 5% · Max: 5 pts · Badge: AUTO**

### What it measures
Your leave discipline — whether you took planned or unplanned leave during the month.

### Scoring

| Leave Situation | Score |
|---|---|
| Any **Unplanned** leave taken (isPlanned = No) | **0 pts** |
| Total **Planned** approved leave ≤ 1 day | **5 pts** |
| Total **Planned** approved leave = 1.5 days | **3 pts** |
| Total **Planned** approved leave > 1.5 days | **0 pts** |

### Rules
- Only **Approved** leave requests are considered
- The **Planned/Unplanned flag** set on your leave request determines the 0 pt condition
- Unapproved or rejected leaves do not affect the score

### Examples

| Scenario | Score |
|---|---|
| No leave taken | **5 pts** |
| 1 planned, approved leave day | **5 pts** |
| 1.5 planned, approved leave days | **3 pts** |
| 2 planned, approved leave days | **0 pts** |
| 1 unplanned approved leave (regardless of days) | **0 pts** |

---

## Parameter 9 — Timeliness
**Weight: 5% · Max: 5 pts · Badge: MANUAL**

### What it measures
Your punctuality — late comings tracked by PM / HR.

### Scoring (PM enters)
| Situation | Score |
|---|---|
| Zero late comings | 5 pts |
| Less than 3 late comings, under 10 minutes each | 3 pts |
| 3 or more late comings, or any late coming > 10 minutes | 0 pts |

*This score is entered by your Project Manager based on HR / office records.*

---

## Parameter 10 — Team Collaboration
**Weight: 5% · Max: 5 pts · Badge: MANUAL**

### What it measures
Your teamwork, communication, and peer support as observed by your Project Manager.

### Scoring (PM enters: 5, 3, or 0)
| Rating | Meaning |
|---|---|
| **5 pts** | Proactively helped teammates, shared knowledge, participated actively in standups |
| **3 pts** | Adequate communication, no major issues |
| **0 pts** | Isolated, caused friction, or poor communication |

*PM can add notes explaining the score.*

---

## Parameter 11 — Reporting & Documentation
**Weight: 5% · Max: 5 pts · Badge: MANUAL**

### What it measures
Quality and timeliness of status reports, technical documentation, and KT notes.

### Scoring (PM enters: 5, 3, or 0)
| Rating | Meaning |
|---|---|
| **5 pts** | All reports on time, accurate documentation, detailed sprint notes |
| **3 pts** | Occasional missing updates, minor formatting issues |
| **0 pts** | No documentation, critical gaps or incorrect information |

*PM can add multiple notes throughout the month.*

---

## Parameter 12 — Learning Velocity
**Weight: 5% · Max: 5 pts · Badge: SELF**

### What it measures
Whether you completed your assigned monthly upskilling pathway via the Learn & Innovate module.

### Scoring

| Assignment Status | Score |
|---|---|
| Assignment **Approved** by PM | **5 pts** |
| Assignment **Declined / Rejected** by PM | **3 pts** |
| Assignment **not submitted** for the month | **0 pts** |

> **Note:** Assignments that are still Submitted/Pending review, In Progress, or Assigned (not yet acted upon) score **0 pts** until approved or rejected.

### Example
You were assigned a learning pathway for June:
- You submitted your assignment → PM reviewed and **Approved** → **5 pts**
- You submitted your assignment → PM **Rejected** it (needs revision) → **3 pts**
- You did not submit anything for the month → **0 pts**

---

## Parameter 13 — Positive Behaviour & Conduct
**Weight: 5% · Max: 5 pts · Badge: MANUAL**

### What it measures
Your professionalism, flexibility, adaptability, and overall workplace conduct as observed by your PM.

### Scoring (PM enters: 5, 3, or 0)
| Rating | Meaning |
|---|---|
| **5 pts** | Stayed positive under pressure, adapted gracefully to scope changes |
| **3 pts** | Generally professional, occasional pushback |
| **0 pts** | Regular complaints, resistant to change, unprofessional conduct |

---

## Parameter 14 — Gratitude
**Weight: 5% · Max: 5 pts · Badge: MANUAL**

### What it measures
Whether you actively recognise and appreciate your colleagues' contributions.

### Scoring (PM enters: 5, 3, or 0)
| Rating | Meaning |
|---|---|
| **5 pts** | Publicly thanked teammates, sent appreciation messages, fostered recognition |
| **3 pts** | Occasional verbal thanks |
| **0 pts** | No visible appreciation shown to peers |

---

## Total Score Summary

| Parameter | Max | Type |
|---|---|---|
| Sprint Reliability | 10 | AUTO |
| Delivery Timeliness | 10 | AUTO |
| Estimation Accuracy | 10 | AUTO |
| Throughput & Complexity | 10 | AUTO |
| Internal Rework Ratio | 5 | AUTO |
| Technical Defect Leakage | 10 | AUTO |
| Functional Defect Leakage | 10 | AUTO |
| Attendance | 5 | AUTO |
| Timeliness | 5 | MANUAL |
| Team Collaboration | 5 | MANUAL |
| Reporting & Documentation | 5 | MANUAL |
| Learning Velocity | 5 | SELF |
| Positive Behaviour | 5 | MANUAL |
| Gratitude | 5 | MANUAL |
| **Total** | **100** | |

## Grade Scale

| Grade | Score Range | Label |
|---|---|---|
| A | ≥ 90 | Excellent |
| B | 75 – 89 | Good |
| C | 60 – 74 | Average |
| D | < 60 | Needs Improvement |
