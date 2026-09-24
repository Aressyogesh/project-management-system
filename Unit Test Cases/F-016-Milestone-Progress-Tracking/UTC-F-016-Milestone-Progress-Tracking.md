# Unit Test Cases — F-016: Milestone Progress Tracking

---

## Backend Unit Tests — MilestonesService

---

```
Unit Test ID : UTC-F016-B-001
Title        : findAll_MilestoneWithPartialCompletion_ReturnsCorrectProgress
Layer        : Backend
Class / File : MilestonesService (milestones.service.spec.ts)
AC Covered   : AC-1, AC-3
Framework    : Jest

Arrange:
  - Mock prisma.project.findUnique → returns a project
  - Mock prisma.milestone.findMany → returns one milestone with
      _count: { tasks: 5 }, tasks: [{ id: 't1' }, { id: 't2' }, { id: 't3' }]
Act:
  - result = await service.findAll('project-1')
Assert:
  - result[0].totalTasks === 5
  - result[0].completedTasks === 3
  - result[0].progressPercent === 60
```

---

```
Unit Test ID : UTC-F016-B-002
Title        : findAll_MilestoneWithNoTasks_ReturnsZeroProgress
Layer        : Backend
Class / File : MilestonesService (milestones.service.spec.ts)
AC Covered   : AC-2, AC-7
Framework    : Jest

Arrange:
  - Mock prisma.project.findUnique → returns a project
  - Mock prisma.milestone.findMany → returns one milestone with
      _count: { tasks: 0 }, tasks: []
Act:
  - result = await service.findAll('project-1')
Assert:
  - result[0].totalTasks === 0
  - result[0].completedTasks === 0
  - result[0].progressPercent === 0
```

---

```
Unit Test ID : UTC-F016-B-003
Title        : findAll_AllTasksCompleted_Returns100Percent
Layer        : Backend
Class / File : MilestonesService (milestones.service.spec.ts)
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock prisma.project.findUnique → returns a project
  - Mock prisma.milestone.findMany → returns one milestone with
      _count: { tasks: 3 }, tasks: [{ id: 't1' }, { id: 't2' }, { id: 't3' }]
Act:
  - result = await service.findAll('project-1')
Assert:
  - result[0].progressPercent === 100
  - result[0].completedTasks === 3
  - result[0].totalTasks === 3
```

---

```
Unit Test ID : UTC-F016-B-004
Title        : findAll_MultipleMillestones_EachHasIndependentProgress
Layer        : Backend
Class / File : MilestonesService (milestones.service.spec.ts)
AC Covered   : AC-1
Framework    : Jest

Arrange:
  - Mock prisma.project.findUnique → returns a project
  - Mock prisma.milestone.findMany → returns two milestones:
      ms1: _count: { tasks: 4 }, tasks: [{ id: 't1' }, { id: 't2' }]
      ms2: _count: { tasks: 2 }, tasks: [{ id: 't3' }, { id: 't4' }]
Act:
  - result = await service.findAll('project-1')
Assert:
  - result[0].progressPercent === 50
  - result[1].progressPercent === 100
```

---

```
Unit Test ID : UTC-F016-B-005
Title        : findAll_ProgressPercent_RoundsToNearestInteger
Layer        : Backend
Class / File : MilestonesService (milestones.service.spec.ts)
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - Mock prisma.project.findUnique → returns a project
  - Mock prisma.milestone.findMany → returns one milestone with
      _count: { tasks: 3 }, tasks: [{ id: 't1' }]   (1 of 3 = 33.33%)
Act:
  - result = await service.findAll('project-1')
Assert:
  - result[0].progressPercent === 33
```

---

## Frontend Unit Tests — MilestoneProgressBar

---

```
Unit Test ID : UTC-F016-F-001
Title        : MilestoneRow_WithProgress_RendersProgressBar
Layer        : Frontend
Class / File : ProjectDetailPage (ProjectDetailMilestones.test.tsx)
AC Covered   : AC-5, AC-6
Framework    : Jest + React Testing Library

Arrange:
  - Mock milestonesApi.list → returns milestone with
      totalTasks: 5, completedTasks: 3, progressPercent: 60
Act:
  - render(<ProjectDetailPage />) with projectId param
Assert:
  - progress bar element has width style '60%'
  - text "3 / 5 tasks" is present in the document
```

---

```
Unit Test ID : UTC-F016-F-002
Title        : MilestoneRow_ZeroTasks_ShowsEmptyProgressBar
Layer        : Frontend
Class / File : ProjectDetailPage (ProjectDetailMilestones.test.tsx)
AC Covered   : AC-7
Framework    : Jest + React Testing Library

Arrange:
  - Mock milestonesApi.list → returns milestone with
      totalTasks: 0, completedTasks: 0, progressPercent: 0
Act:
  - render(<ProjectDetailPage />) with projectId param
Assert:
  - progress bar element has width style '0%'
  - text "0 / 0 tasks" is present in the document
```
