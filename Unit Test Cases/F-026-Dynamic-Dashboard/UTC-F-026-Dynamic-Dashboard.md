# UTC-F-026 — Unit Test Cases: Dynamic Dashboard & Project-wise Team Progress

---

## Backend Unit Tests

---

### UTC-F026-B-001
```
Unit Test ID : UTC-F026-B-001
Title        : getStats_SuperUser_ReturnsSystemWideCounts
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-9
Framework    : Jest

Arrange:
  - Mock prisma.project.count → 5 (ACTIVE)
  - Mock prisma.task.count (total) → 40
  - Mock prisma.user.count → 20
  - Mock prisma.task.count (COMPLETED) → 18
  - Role = SUPER_USER

Act:
  - result = await dashboardService.getStats(userId, 'SUPER_USER')

Assert:
  - result.cards[0].label === 'Active Projects'
  - result.cards[0].value === 5
  - result.cards[1].label === 'Total Tasks'
  - result.cards[1].value === 40
```

---

### UTC-F026-B-002
```
Unit Test ID : UTC-F026-B-002
Title        : getStats_Employee_ReturnsOwnTaskCounts
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-9
Framework    : Jest

Arrange:
  - Mock prisma.task.findMany → 3 tasks assigned to userId
  - 1 of those has status = COMPLETED
  - Role = EMPLOYEE

Act:
  - result = await dashboardService.getStats(userId, 'EMPLOYEE')

Assert:
  - result.cards[0].label === 'My Projects'
  - result.cards[1].label === 'My Tasks', value === 3
  - result.cards[3].label === 'Completed', value === 1
```

---

### UTC-F026-B-003
```
Unit Test ID : UTC-F026-B-003
Title        : getActivityData_ReturnsLast12MonthsRealCounts
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-1
Framework    : Jest

Arrange:
  - Mock prisma.task.findMany → 3 tasks completed in Jan, 5 in Feb (current year)
  - Mock for the trailing 12 months

Act:
  - result = await dashboardService.getStats(userId, 'SUPER_USER')

Assert:
  - result.activityData has length === 12
  - Each entry has { month: string, high: number, low: number }
  - Values are derived from real DB aggregation (not hardcoded)
```

---

### UTC-F026-B-004
```
Unit Test ID : UTC-F026-B-004
Title        : getProjectsProgress_ReturnsActiveProjectsOnly
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-2, AC-8
Framework    : Jest

Arrange:
  - Mock prisma.project.findMany → 2 ACTIVE projects, 1 ARCHIVED project
  - Each project has tasks and members

Act:
  - result = await dashboardService.getProjectsProgress()

Assert:
  - result.length === 2
  - None of the results have status = ARCHIVED
```

---

### UTC-F026-B-005
```
Unit Test ID : UTC-F026-B-005
Title        : getProjectsProgress_CalculatesProgressCorrectly
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock project with 10 total tasks, 4 COMPLETED

Act:
  - result = await dashboardService.getProjectsProgress()

Assert:
  - result[0].progress === 40
  - result[0].completedTasks === 4
  - result[0].totalTasks === 10
```

---

### UTC-F026-B-006
```
Unit Test ID : UTC-F026-B-006
Title        : getProjectsProgress_ZeroTasks_ReturnsZeroProgress
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock project with 0 tasks

Act:
  - result = await dashboardService.getProjectsProgress()

Assert:
  - result[0].progress === 0
```

---

### UTC-F026-B-007
```
Unit Test ID : UTC-F026-B-007
Title        : getProjectsProgress_IncludesTeamSizeAndOpenBugs
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - Mock project with 3 ProjectMembers
  - Mock 5 open bugs (status = OPEN or IN_PROGRESS or REOPEN)

Act:
  - result = await dashboardService.getProjectsProgress()

Assert:
  - result[0].teamSize === 3
  - result[0].openBugs === 5
```

---

### UTC-F026-B-008
```
Unit Test ID : UTC-F026-B-008
Title        : getTodayTask_ReturnsFirstTaskDueTodayNotCompleted
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-7
Framework    : Jest

Arrange:
  - Mock prisma.task.findFirst → task due today, status = IN_PROGRESS

Act:
  - result = await dashboardService.getStats(userId, 'EMPLOYEE')

Assert:
  - result.todayTask !== null
  - result.todayTask.name === 'Test Task'
```

---

### UTC-F026-B-009
```
Unit Test ID : UTC-F026-B-009
Title        : getTodayTask_NoTaskDueToday_ReturnsNull
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-7
Framework    : Jest

Arrange:
  - Mock prisma.task.findFirst → null

Act:
  - result = await dashboardService.getStats(userId, 'EMPLOYEE')

Assert:
  - result.todayTask === null
```

---

### UTC-F026-B-010
```
Unit Test ID : UTC-F026-B-010
Title        : getTeamPerformance_CalculatesAvgCompletionRatio
Layer        : Backend
Class / File : DashboardService
AC Covered   : AC-8
Framework    : Jest

Arrange:
  - Project A: 10 tasks, 6 completed (60%)
  - Project B: 20 tasks, 10 completed (50%)
  - Avg = 55%

Act:
  - result = await dashboardService.getStats(userId, 'SUPER_USER')

Assert:
  - result.teamPerformance.score === 55
```

---

## Frontend Unit Tests

---

### UTC-F026-F-001
```
Unit Test ID : UTC-F026-F-001
Title        : ProjectProgressPanel_RendersProjectCards
Layer        : Frontend
Class / File : ProjectProgressPanel.tsx
AC Covered   : AC-2, AC-3
Framework    : Vitest + React Testing Library

Arrange:
  - Mock projects array with 2 entries

Act:
  - render(<ProjectProgressPanel projects={mockProjects} />)

Assert:
  - screen.getAllByTestId('project-card').length === 2
```

---

### UTC-F026-F-002
```
Unit Test ID : UTC-F026-F-002
Title        : ProjectProgressPanel_ShowsProgressBar
Layer        : Frontend
Class / File : ProjectProgressPanel.tsx
AC Covered   : AC-3, AC-4
Framework    : Vitest + React Testing Library

Arrange:
  - Mock project with progress = 75

Act:
  - render(<ProjectProgressPanel projects={[mockProject]} />)

Assert:
  - Progress bar element has width = '75%'
  - '75%' text is visible
```

---

### UTC-F026-F-003
```
Unit Test ID : UTC-F026-F-003
Title        : DashboardPage_SuperUser_ShowsProjectsProgressPanel
Layer        : Frontend
Class / File : DashboardPage.tsx
AC Covered   : AC-2, AC-5
Framework    : Vitest + React Testing Library

Arrange:
  - Mock user.systemRole = 'SUPER_USER'
  - Mock useQuery for dashboard stats
  - Mock useQuery for projects progress

Act:
  - render(<DashboardPage />)

Assert:
  - 'Projects Progress' heading is visible
```

---

### UTC-F026-F-004
```
Unit Test ID : UTC-F026-F-004
Title        : DashboardPage_Employee_DoesNotShowProjectsPanel
Layer        : Frontend
Class / File : DashboardPage.tsx
AC Covered   : AC-5
Framework    : Vitest + React Testing Library

Arrange:
  - Mock user.systemRole = 'EMPLOYEE'

Act:
  - render(<DashboardPage />)

Assert:
  - 'Projects Progress' heading is NOT in the document
```

---

### UTC-F026-F-005
```
Unit Test ID : UTC-F026-F-005
Title        : ProjectProgressPanel_ZeroTasks_ShowsZeroPercent
Layer        : Frontend
Class / File : ProjectProgressPanel.tsx
AC Covered   : AC-4
Framework    : Vitest + React Testing Library

Arrange:
  - Mock project with totalTasks = 0, completedTasks = 0, progress = 0

Act:
  - render(<ProjectProgressPanel projects={[mockProject]} />)

Assert:
  - '0%' is visible
  - Progress bar width = '0%'
```

---

### UTC-F026-F-006
```
Unit Test ID : UTC-F026-F-006
Title        : ActivityChart_RendersWithDynamicData
Layer        : Frontend
Class / File : ActivityChart.tsx
AC Covered   : AC-1
Framework    : Vitest + React Testing Library

Arrange:
  - Mock activityData with 12 months of real data

Act:
  - render(<ActivityChart data={mockActivityData} />)

Assert:
  - 12 data points rendered in the chart
  - 'Team Activity Summary' heading visible
```
