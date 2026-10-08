# Unit Test Cases — F-007: Project Management

Feature ID : F-007
Framework  : Jest (BE), Vitest + RTL (FE)

---

## Backend Unit Tests

### UTC-F-007-B-001
Title     : CreateProject_ValidData_ReturnsCreatedProject
AC        : AC-1, AC-2
Arrange   : create mock resolves with new project
Act       : service.create({ name: 'Alpha', projectType: 'DEDICATED' })
Assert    : result.name === 'Alpha'; create called once

### UTC-F-007-B-002
Title     : CreateProject_EndDateBeforeStartDate_ThrowsBadRequestException
AC        : AC-10
Arrange   : dto has startDate > endDate
Act       : service.create({ ..., startDate: '2026-06-10', endDate: '2026-06-01' })
Assert    : throws BadRequestException

### UTC-F-007-B-003
Title     : UpdateProject_ValidData_ReturnsUpdatedProject
AC        : AC-4
Arrange   : findUnique returns existing; update returns updated
Act       : service.update('proj-001', { name: 'Beta' })
Assert    : result.name === 'Beta'

### UTC-F-007-B-004
Title     : UpdateProject_NotFound_ThrowsNotFoundException
AC        : AC-4
Arrange   : findUnique returns null
Act       : service.update('bad-id', { name: 'X' })
Assert    : throws NotFoundException

### UTC-F-007-B-005
Title     : SetStatus_Archive_UpdatesStatusToArchive
AC        : AC-5
Arrange   : findUnique returns active project; update returns archived
Act       : service.setStatus('proj-001', 'ARCHIVE')
Assert    : result.status === 'ARCHIVE'

### UTC-F-007-B-006
Title     : GetSummary_ReturnsCorrectCounts
AC        : AC-3
Arrange   : findMany mock returns mixed projects
Act       : service.getSummary()
Assert    : active, archive, dedicated, overdue counts match expected

### UTC-F-007-B-007
Title     : FindAll_WithStatusFilter_ReturnsFilteredProjects
AC        : AC-8
Arrange   : findMany returns only ACTIVE projects
Act       : service.findAll({ status: 'ACTIVE' })
Assert    : all returned projects have status ACTIVE

---

## Frontend Unit Tests

### UTC-F-007-FE-001
Title  : ProjectsPage_LoadsProjects_DisplaysCards
AC     : AC-2, AC-7
Arrange: mock returns 2 projects
Assert : 2 project cards visible with name and type badge

### UTC-F-007-FE-002
Title  : ProjectsPage_EmptyState_ShowsNoProjectsMessage
AC     : AC-9
Arrange: mock returns []
Assert : 'No projects yet' text visible

### UTC-F-007-FE-003
Title  : ProjectsPage_SummaryPanel_ShowsCounts
AC     : AC-3
Arrange: mock summary returns { active: 3, archive: 1, ... }
Assert : '3' visible in Active count card

### UTC-F-007-FE-004
Title  : ProjectsPage_AddButtonClick_OpensCreateForm
AC     : AC-1
Act    : click 'New Project'
Assert : form/modal with 'Create Project' heading visible

### UTC-F-007-FE-005
Title  : ProjectsPage_ArchiveButton_CallsSetStatus
AC     : AC-5
Arrange: mock returns one active project
Act    : click archive action on card
Assert : setStatus called with 'ARCHIVE'
