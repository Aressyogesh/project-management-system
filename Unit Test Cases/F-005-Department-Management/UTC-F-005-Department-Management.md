# Unit Test Cases — F-005: Department Management

---

### UTC-F-005-B-001
```
Unit Test ID : UTC-F-005-B-001
Title        : CreateDepartment_UniqueName_ReturnsCreatedDepartment
Layer        : Backend — DepartmentsService
AC Covered   : AC-3
Framework    : Jest

Arrange : Mock prisma.department.findFirst → null (no duplicate)
          Mock prisma.department.create   → { id, name: 'Engineering', isActive: true }
Act     : result = await service.create({ name: 'Engineering' })
Assert  : result.name === 'Engineering'
          prisma.department.create called once
```

### UTC-F-005-B-002
```
Unit Test ID : UTC-F-005-B-002
Title        : CreateDepartment_DuplicateName_ThrowsConflictException
Layer        : Backend — DepartmentsService
AC Covered   : AC-6
Framework    : Jest

Arrange : Mock prisma.department.findFirst → existing department
Act     : service.create({ name: 'Digital' })
Assert  : Throws ConflictException
          prisma.department.create never called
```

### UTC-F-005-B-003
```
Unit Test ID : UTC-F-005-B-003
Title        : UpdateDepartment_ValidName_ReturnsUpdatedDepartment
Layer        : Backend — DepartmentsService
AC Covered   : AC-4
Framework    : Jest

Arrange : Mock prisma.department.findUnique → existing dept
          Mock prisma.department.findFirst  → null (no duplicate name)
          Mock prisma.department.update     → { id, name: 'Mobile Dev', isActive: true }
Act     : result = await service.update('dept-id', { name: 'Mobile Dev' })
Assert  : result.name === 'Mobile Dev'
```

### UTC-F-005-B-004
```
Unit Test ID : UTC-F-005-B-004
Title        : UpdateDepartment_NotFound_ThrowsNotFoundException
Layer        : Backend — DepartmentsService
AC Covered   : AC-7
Framework    : Jest

Arrange : Mock prisma.department.findUnique → null
Act     : service.update('bad-id', { name: 'X' })
Assert  : Throws NotFoundException
```

### UTC-F-005-B-005
```
Unit Test ID : UTC-F-005-B-005
Title        : SetStatus_ValidId_TogglesIsActive
Layer        : Backend — DepartmentsService
AC Covered   : AC-5
Framework    : Jest

Arrange : Mock prisma.department.findUnique → active department
          Mock prisma.department.update     → { isActive: false }
Act     : result = await service.setStatus('dept-id', false)
Assert  : result.isActive === false
          prisma.department.update called with { isActive: false }
```

### UTC-F-005-B-006
```
Unit Test ID : UTC-F-005-B-006
Title        : FindAll_IncludeInactive_ReturnsAllDepartments
Layer        : Backend — DepartmentsService
AC Covered   : AC-2
Framework    : Jest

Arrange : Mock prisma.department.findMany → [activeD, inactiveD]
Act     : result = await service.findAll(true)
Assert  : result.length === 2
          prisma.department.findMany called WITHOUT where.isActive filter
```

---

## Frontend Unit Tests

### UTC-F-005-F-001
```
Unit Test ID : UTC-F-005-F-001
Title        : DepartmentsPage_Renders_DepartmentList
Layer        : Frontend
AC Covered   : AC-2
Framework    : Vitest + React Testing Library

Arrange : Mock useQuery → [{ id, name: 'Digital', isActive: true }]
Act     : render(<DepartmentsPage />)
Assert  : screen contains 'Digital'
          status badge 'Active' is visible
```

### UTC-F-005-F-002
```
Unit Test ID : UTC-F-005-F-002
Title        : DepartmentFormModal_Submit_CallsCreateMutation
Layer        : Frontend
AC Covered   : AC-3
Framework    : Vitest + React Testing Library

Arrange : Mock useMutation (createDepartment)
          Render <DepartmentFormModal mode="create" onClose={fn} />
Act     : Fill name = 'Engineering', click Save
Assert  : createDepartment mutation called with { name: 'Engineering' }
```
